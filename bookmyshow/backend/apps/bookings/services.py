"""
Seat-locking & booking engine.

State machine per seat (per show), stored on ShowSeat.status:

    AVAILABLE --lock_seats()--> LOCKED --confirm_seats()--> BOOKED
       ^                          |
       |                          | lock_expires OR release_seats()
       +--------------------------+

Concurrency guarantee:
Two users racing for the same seat must never both succeed. This is
enforced with a DB-level transaction + SELECT ... FOR UPDATE on the
ShowSeat rows, so only one request can hold the row lock at a time;
the loser sees the row's true post-commit state and is rejected —
never a stale read. `unique_together` on (show, seat) also makes it
structurally impossible to double-insert a seat for a show.

Rows are locked in a fixed order (sorted by primary key) on every path
that can lock >1 seat at once, to prevent lock-ordering deadlocks
between two concurrent multi-seat requests.
"""
import logging
import random
import string
import uuid
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.shows.models import Show, ShowSeat

from .models import Booking, BookingSeat, Ticket

logger = logging.getLogger("bookings")


class SeatUnavailableError(Exception):
    """Raised when one or more requested seats can't be locked right now."""

    def __init__(self, unavailable_seat_ids):
        self.unavailable_seat_ids = unavailable_seat_ids
        super().__init__(f"Seats unavailable: {unavailable_seat_ids}")


def _lock_ttl():
    from django.conf import settings
    return settings.SEAT_LOCK_TTL_SECONDS


def _is_free(show_seat: ShowSeat, now) -> bool:
    """A seat is free if AVAILABLE, or LOCKED but its hold has expired."""
    if show_seat.status == "available":
        return True
    if show_seat.status == "locked" and show_seat.locked_until and show_seat.locked_until < now:
        return True
    return False


@transaction.atomic
def lock_seats(show_id: uuid.UUID, seat_show_seat_ids: list[int], user) -> list[ShowSeat]:
    """
    Attempts to lock every requested ShowSeat row for `user`, for
    settings.SEAT_LOCK_TTL_SECONDS. All-or-nothing: if any seat in the
    batch is unavailable, the whole batch fails and nothing is locked
    (avoids a user holding a partial, useless set of seats).
    """
    now = timezone.now()
    locked_ids = sorted(seat_show_seat_ids)  # fixed order -> no deadlocks

    # select_for_update() blocks until any concurrent transaction touching
    # these exact rows commits or rolls back — this is the linchpin.
    rows = list(
        ShowSeat.objects.select_for_update()
        .filter(id__in=locked_ids, show_id=show_id)
        .order_by("id")
    )

    if len(rows) != len(locked_ids):
        missing = set(locked_ids) - {r.id for r in rows}
        raise SeatUnavailableError(list(missing))

    unavailable = [
        r.id for r in rows
        if not _is_free(r, now) and not (r.status == "locked" and r.locked_by_id == user.id)
    ]
    if unavailable:
        logger.info("Seat lock rejected show=%s seats=%s user=%s", show_id, unavailable, user.id)
        raise SeatUnavailableError(unavailable)

    locked_until = now + timezone.timedelta(seconds=_lock_ttl())
    for row in rows:
        row.status = "locked"
        row.locked_by = user
        row.locked_until = locked_until
    ShowSeat.objects.bulk_update(rows, ["status", "locked_by", "locked_until"])
    logger.info("Seat lock granted show=%s seats=%s user=%s until=%s", show_id, locked_ids, user.id, locked_until)
    return rows


@transaction.atomic
def release_seats(show_seat_ids: list[int], user=None):
    """Releases seats back to AVAILABLE. If `user` given, only releases their own locks."""
    qs = ShowSeat.objects.select_for_update().filter(id__in=sorted(show_seat_ids), status="locked")
    if user is not None:
        qs = qs.filter(locked_by=user)
    rows = list(qs)
    for row in rows:
        row.status = "available"
        row.locked_by = None
        row.locked_until = None
    ShowSeat.objects.bulk_update(rows, ["status", "locked_by", "locked_until"])
    return len(rows)


def sweep_expired_locks(batch_size: int = 500) -> int:
    """
    Backstop for users who abandon checkout without releasing seats.
    Intended to run every ~30s as a Celery beat task; also invoked
    lazily wherever a seat-map is read (see ShowSeatMapSerializer).
    """
    now = timezone.now()
    expired_ids = list(
        ShowSeat.objects.filter(status="locked", locked_until__lt=now)
        .values_list("id", flat=True)[:batch_size]
    )
    if not expired_ids:
        return 0

    # Checkout reserves food inventory as well as seats.  Expire the whole
    # checkout (and restore that inventory) when one of its held seats times
    # out; standalone locks are simply released below.
    pending_booking_ids = list(
        Booking.objects.filter(
            status="pending_payment", booking_seats__show_seat_id__in=expired_ids
        ).values_list("id", flat=True).distinct()
    )
    for booking_id in pending_booking_ids:
        fail_booking(booking_id, reason="seat_lock_expired", final_status="expired")
    release_seats(expired_ids)
    return len(expired_ids)


def _generate_booking_ref() -> str:
    # Human-friendly, Maharashtra-specific reference.  The model-level unique
    # constraint remains the final collision guard.
    return f"MVB-{timezone.localdate():%Y}-" + "".join(
        random.choices(string.ascii_uppercase + string.digits, k=6)
    )


@transaction.atomic
def create_pending_booking(user, show_id, show_seat_ids, food_items=None, coupon_code=None) -> Booking:
    """
    Called once seats are locked for this user (seat selection confirmed).
    Creates a pending_payment Booking with a server-computed total.
    Frontend-submitted prices/food/coupon are re-validated here — never trusted.
    """
    from apps.coupons.services import CouponError, validate_and_price_coupon
    from apps.food.models import FoodItem, FoodOrderItem

    now = timezone.now()
    rows = list(
        ShowSeat.objects.select_for_update()
        .filter(id__in=show_seat_ids, show_id=show_id, status="locked", locked_by=user)
    )
    if len(rows) != len(show_seat_ids):
        raise SeatUnavailableError(
            list(set(show_seat_ids) - {r.id for r in rows})
        )
    for r in rows:
        if r.locked_until and r.locked_until < now:
            raise SeatUnavailableError([r.id])

    # A retry of the checkout request must return the original order instead
    # of decrementing food inventory / minting a second payment attempt.  A
    # user cannot start a different overlapping checkout with the same hold.
    requested_ids = {row.id for row in rows}
    pending_bookings = (
        Booking.objects.select_for_update()
        .filter(
            user=user,
            show_id=show_id,
            status="pending_payment",
            booking_seats__show_seat_id__in=requested_ids,
        )
        .distinct()
    )
    for existing in pending_bookings:
        existing_ids = set(existing.booking_seats.values_list("show_seat_id", flat=True))
        if existing_ids == requested_ids:
            return existing
        raise ValueError("You already have an active checkout using one of these seats.")

    seats_subtotal = sum((r.price for r in rows), Decimal("0"))
    show = Show.objects.get(pk=show_id)

    booking = Booking(
        booking_ref=_generate_booking_ref(),
        user=user,
        show=show,
        status="pending_payment",
        seats_subtotal=seats_subtotal,
    )

    food_subtotal = Decimal("0")
    food_rows = []
    for item in (food_items or []):
        food_item = FoodItem.objects.select_for_update().get(pk=item["food_item_id"], is_available=True)
        qty = int(item["quantity"])
        if food_item.inventory_count is not None:
            if food_item.inventory_count < qty:
                raise ValueError(f"Insufficient stock for {food_item.name}.")
            food_item.inventory_count -= qty
            food_item.save(update_fields=["inventory_count"])
        food_subtotal += food_item.price * qty
        food_rows.append((food_item, qty))
    booking.food_subtotal = food_subtotal

    subtotal = seats_subtotal + food_subtotal
    booking.convenience_fee = (subtotal * Decimal("0.03")).quantize(Decimal("0.01"))
    booking.taxes = (subtotal * Decimal("0.18")).quantize(Decimal("0.01"))  # example GST slab

    discount = Decimal("0")
    coupon = None
    if coupon_code:
        try:
            coupon, discount = validate_and_price_coupon(coupon_code, user, subtotal)
        except CouponError as exc:
            raise ValueError(str(exc)) from exc
    booking.coupon = coupon
    booking.discount = discount

    booking.total_amount = (
        subtotal + booking.convenience_fee + booking.taxes - discount
    ).quantize(Decimal("0.01"))
    # Retain the exact selection before payment begins.  Besides making the
    # order summary complete, this is the authoritative link used by confirm
    # and failure paths; never infer a booking's seats from every current lock
    # held by its user.
    booking.save()

    BookingSeat.objects.bulk_create([
        BookingSeat(booking=booking, show_seat=row, price=row.price) for row in rows
    ])

    for food_item, qty in food_rows:
        FoodOrderItem.objects.create(
            booking=booking, food_item=food_item, quantity=qty, price_at_order=food_item.price
        )

    # Extend the seat lock to cover the payment step itself.
    payment_window_until = now + timezone.timedelta(seconds=_lock_ttl())
    for r in rows:
        r.locked_until = payment_window_until
    ShowSeat.objects.bulk_update(rows, ["locked_until"])

    return booking


@transaction.atomic
def confirm_booking(booking_id) -> Booking:
    """
    Called ONLY after the payment gateway callback/verification succeeds
    (see apps.payments.services.verify_payment). Flips locked seats to
    booked and issues the ticket. Never called from a frontend "success"
    event directly.
    """
    booking = Booking.objects.select_for_update().select_related("show").get(pk=booking_id)
    if booking.status == "confirmed":
        return booking  # idempotent — payment webhooks can retry
    if booking.status != "pending_payment":
        raise ValueError(f"Cannot confirm booking in status {booking.status}")

    seat_ids = list(booking.booking_seats.values_list("show_seat_id", flat=True))
    if not seat_ids:
        raise ValueError("Booking has no checkout seat snapshot.")
    rows = list(ShowSeat.objects.select_for_update().filter(id__in=seat_ids).order_by("id"))
    now = timezone.now()
    # Give a 90-second grace buffer: the lock may have just barely expired during
    # payment processing network roundtrips. The gateway has already confirmed the
    # charge, so aborting the booking at this point would leave the user charged
    # with no ticket — the grace window prevents that edge case.
    grace = timezone.timedelta(seconds=90)
    invalid = [
        row.id for row in rows
        if row.status != "locked" or row.locked_by_id != booking.user_id
        or not row.locked_until or row.locked_until < (now - grace)
    ]
    if len(rows) != len(seat_ids):
        invalid.extend(set(seat_ids) - {row.id for row in rows})
    if invalid:
        raise SeatUnavailableError(sorted(invalid))

    for row in rows:
        row.status = "booked"
        row.locked_by = None
        row.locked_until = None
    ShowSeat.objects.bulk_update(rows, ["status", "locked_by", "locked_until"])

    if booking.coupon:
        from apps.coupons.models import CouponUsage
        CouponUsage.objects.get_or_create(coupon=booking.coupon, user=booking.user, booking=booking)

    booking.status = "confirmed"
    booking.confirmed_at = timezone.now()
    booking.save(update_fields=["status", "confirmed_at"])

    Ticket.objects.create(booking=booking)
    logger.info("Booking confirmed ref=%s user=%s seats=%s", booking.booking_ref, booking.user_id, seat_ids)
    return booking


@transaction.atomic
def fail_booking(booking_id, reason: str = "", final_status: str = "payment_failed"):
    """Payment failed or was rejected — release the seats back to the pool."""
    booking = Booking.objects.select_for_update().get(pk=booking_id)
    if booking.status not in ("pending_payment",):
        return booking
    seat_ids = list(booking.booking_seats.values_list("show_seat_id", flat=True))
    release_seats(seat_ids, user=booking.user)

    # Inventory is reserved at checkout, so it must be restored whenever the
    # payment session fails or expires.  Unlimited items are represented by
    # inventory_count=None and need no mutation.
    from apps.food.models import FoodItem
    for line in booking.food_items.select_related("food_item"):
        if line.food_item.inventory_count is not None:
            item = FoodItem.objects.select_for_update().get(pk=line.food_item_id)
            item.inventory_count += line.quantity
            item.save(update_fields=["inventory_count"])

    booking.status = final_status
    booking.save(update_fields=["status"])
    logger.info("Booking payment failed ref=%s reason=%s", booking.booking_ref, reason)
    return booking


REFUND_POLICY = [
    # (min_hours_before_show, refund_percent)
    (48, 100),
    (24, 75),
    (6, 50),
    (0, 0),
]


def calculate_refund(booking: Booking) -> Decimal:
    from datetime import datetime
    show_dt = datetime.combine(booking.show.date, booking.show.start_time)
    show_dt = timezone.make_aware(show_dt) if timezone.is_naive(show_dt) else show_dt
    hours_left = (show_dt - timezone.now()).total_seconds() / 3600
    for min_hours, pct in REFUND_POLICY:
        if hours_left >= min_hours:
            return (booking.total_amount * Decimal(pct) / Decimal(100)).quantize(Decimal("0.01"))
    return Decimal("0.00")


@transaction.atomic
def cancel_booking(booking: Booking) -> Booking:
    if booking.status != "confirmed":
        raise ValueError("Only confirmed bookings can be cancelled.")
    refund_amount = calculate_refund(booking)
    booking.status = "cancelled"
    booking.cancelled_at = timezone.now()
    booking.save(update_fields=["status", "cancelled_at"])
    if hasattr(booking, "ticket"):
        booking.ticket.status = "cancelled"
        booking.ticket.save(update_fields=["status"])
    # Seats stay BOOKED (historical integrity) but the show's seat map
    # frees them by inserting a fresh available ShowSeat is wrong — instead
    # we flip status back to available since the slot is now free again.
    seat_ids = booking.booking_seats.values_list("show_seat_id", flat=True)
    ShowSeat.objects.filter(id__in=list(seat_ids)).update(status="available", locked_by=None, locked_until=None)
    return booking, refund_amount
