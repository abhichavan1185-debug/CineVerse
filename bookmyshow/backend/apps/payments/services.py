"""
Mock payment gateway, structured so swapping in Razorpay/Stripe later is a
drop-in: only `create_gateway_order` and `verify_gateway_signature` need to
change to real SDK calls. The important architectural rule enforced here —
never confirm a booking from a frontend-reported "success" — stays the same
regardless of gateway.
"""
import hashlib
import hmac
import secrets
import uuid

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.bookings import services as booking_services
from apps.bookings.models import Booking

from .models import Payment, Refund

MOCK_GATEWAY_SECRET = getattr(settings, "MOCK_GATEWAY_SECRET", "mock-secret-change-me")


@transaction.atomic
def create_gateway_order(booking: Booking, method: str) -> Payment:
    """
    Equivalent of calling Razorpay's /orders API. Here we just mint an id;
    a real integration returns a gateway order object to hand to the
    frontend's checkout SDK.
    """
    # Initiation is retry-safe (mobile networks commonly resend a request).
    # Payment.booking is one-to-one, so a retry must reuse the prior order,
    # not surface an IntegrityError or create a second charge attempt.
    existing = Payment.objects.select_for_update().filter(booking=booking).first()
    if existing:
        if existing.status == "initiated":
            # Extend the seat lock TTL to give the user more time on the payment screen.
            from apps.bookings.models import BookingSeat
            from apps.shows.models import ShowSeat
            extended_until = timezone.now() + timezone.timedelta(seconds=900)  # 15-min payment window
            seat_ids = list(BookingSeat.objects.filter(booking=booking).values_list("show_seat_id", flat=True))
            if seat_ids:
                ShowSeat.objects.filter(id__in=seat_ids, status="locked").update(locked_until=extended_until)
            return existing
        raise ValueError(f"Payment is already {existing.status} for this booking.")

    gateway_order_id = f"order_{uuid.uuid4().hex[:20]}"
    payment = Payment.objects.create(
        booking=booking,
        method=method,
        amount=booking.total_amount,
        status="initiated",
        gateway_order_id=gateway_order_id,
    )
    # Extend seat locks to cover the payment window (15 minutes total).
    from apps.bookings.models import BookingSeat
    from apps.shows.models import ShowSeat
    extended_until = timezone.now() + timezone.timedelta(seconds=900)
    seat_ids = list(BookingSeat.objects.filter(booking=booking).values_list("show_seat_id", flat=True))
    if seat_ids:
        ShowSeat.objects.filter(id__in=seat_ids, status="locked").update(locked_until=extended_until)
    return payment


def _sign(order_id: str, payment_id: str) -> str:
    msg = f"{order_id}|{payment_id}".encode()
    return hmac.new(MOCK_GATEWAY_SECRET.encode(), msg, hashlib.sha256).hexdigest()


def simulate_gateway_callback(payment: Payment, outcome: str) -> dict:
    """
    TEST-ONLY helper standing in for the payment gateway's own checkout UI
    (which would normally call back to our server directly). `outcome` is
    "success" or "failed" — wire this to a real gateway SDK response in
    production instead of trusting a client-supplied outcome.
    """
    gateway_payment_id = f"pay_{secrets.token_hex(10)}"
    if outcome == "success":
        signature = _sign(payment.gateway_order_id, gateway_payment_id)
    else:
        signature = ""  # a failed/cancelled payment never carries a valid signature
    return {
        "gateway_order_id": payment.gateway_order_id,
        "gateway_payment_id": gateway_payment_id,
        "gateway_signature": signature,
        "outcome": outcome,
    }


def verify_gateway_signature(order_id: str, payment_id: str, signature: str) -> bool:
    expected = _sign(order_id, payment_id)
    return hmac.compare_digest(expected, signature)


def verify_payment(order_id: str, payment_id: str, signature: str) -> Payment:
    """
    THE critical trust boundary: only this function is allowed to move a
    booking from pending_payment -> confirmed, and only after independently
    recomputing the signature server-side. A frontend "payment succeeded"
    event alone never triggers confirm_booking().
    """
    # Error state must be committed before it is reported to the client.  A
    # decorator-level atomic block would roll the failure update back whenever
    # this function raised ValueError, leaving the seat lock stranded.
    error_message = None
    with transaction.atomic():
        payment = Payment.objects.select_for_update().select_related("booking").get(gateway_order_id=order_id)

        if payment.status == "success":
            return payment  # webhook retries are intentionally idempotent
        if payment.status != "initiated":
            error_message = "This payment attempt is no longer active."
        elif not verify_gateway_signature(order_id, payment_id, signature):
            payment.status = "failed"
            payment.save(update_fields=["status"])
            booking_services.fail_booking(payment.booking_id, reason="signature_mismatch")
            error_message = "Payment verification failed."
        else:
            try:
                # The service re-locks and validates only this booking's
                # checkout snapshot before the booking can become confirmed.
                booking_services.confirm_booking(payment.booking_id)
            except (booking_services.SeatUnavailableError, ValueError):
                payment.status = "failed"
                payment.save(update_fields=["status"])
                booking_services.fail_booking(payment.booking_id, reason="seat_lock_expired")
                error_message = "Your seat hold expired before payment completed."
            else:
                payment.gateway_payment_id = payment_id
                payment.gateway_signature = signature
                payment.status = "success"
                payment.verified_at = timezone.now()
                payment.save(update_fields=["gateway_payment_id", "gateway_signature", "status", "verified_at"])

    if error_message:
        raise ValueError(error_message)
    return payment


@transaction.atomic
def mark_payment_failed(order_id: str, reason: str = "") -> Payment:
    payment = Payment.objects.select_for_update().get(gateway_order_id=order_id)
    if payment.status == "success":
        return payment
    if payment.status == "failed":
        return payment
    payment.status = "failed"
    payment.save(update_fields=["status"])
    booking_services.fail_booking(payment.booking_id, reason=reason)
    return payment


def initiate_refund(booking: Booking, amount) -> Refund:
    payment = getattr(booking, "payment", None)
    refund = Refund.objects.create(booking=booking, payment=payment, amount=amount, status="pending")
    # In production this enqueues a Celery task that calls the gateway's
    # refund API and flips status -> processing -> completed via webhook.
    # Mocked here as an immediate synchronous completion.
    refund.status = "completed"
    refund.completed_at = timezone.now()
    refund.save(update_fields=["status", "completed_at"])
    return refund
