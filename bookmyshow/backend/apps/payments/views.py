from django.conf import settings
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking

from . import services
from .models import Payment, Refund


class InitiatePaymentSerializer(serializers.Serializer):
    booking_id = serializers.UUIDField()
    method = serializers.ChoiceField(choices=Payment.METHOD_CHOICES)


class InitiatePaymentView(APIView):
    """POST /api/payments/initiate/ — creates a gateway order for a pending booking."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = InitiatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            booking = Booking.objects.get(
                pk=serializer.validated_data["booking_id"], user=request.user, status="pending_payment"
            )
        except Booking.DoesNotExist:
            # A double-click or a browser retry can arrive after the payment
            # has already completed.  Do not let an ORM exception become a
            # 500 response in that case.
            return Response(
                {"error": "This booking is no longer awaiting payment."},
                status=400,
            )
        try:
            payment = services.create_gateway_order(booking, serializer.validated_data["method"])
        except ValueError as exc:
            return Response({"error": str(exc)}, status=400)
        return Response({
            "payment_id": payment.id,
            "gateway_order_id": payment.gateway_order_id,
            "amount": str(payment.amount),
            "method": payment.method,
        })


class MockCheckoutView(APIView):
    """
    POST /api/payments/mock-checkout/ {"gateway_order_id": ..., "outcome": "success"|"failed"}
    Stands in for the gateway's hosted checkout UI in dev/demo/test. Returns
    the same shape a real gateway webhook payload would, which the frontend
    immediately forwards to /verify/ — mirroring the real integration shape.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not settings.MOCK_GATEWAY_ENABLED:
            return Response({"error": "Not found."}, status=404)
        try:
            payment = Payment.objects.get(
                gateway_order_id=request.data.get("gateway_order_id"), booking__user=request.user
            )
        except Payment.DoesNotExist:
            return Response({"error": "Unknown order."}, status=404)
        outcome = request.data.get("outcome", "success")
        return Response(services.simulate_gateway_callback(payment, outcome))


class VerifyPaymentView(APIView):
    """
    POST /api/payments/verify/ {"gateway_order_id", "gateway_payment_id", "gateway_signature"}
    The ONLY endpoint that can confirm a booking. Signature is recomputed
    server-side — see services.verify_payment.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("gateway_order_id", "")
        try:
            # Browser clients may only verify their own payment order.  A
            # production gateway webhook uses a separately authenticated path.
            if not Payment.objects.filter(gateway_order_id=order_id, booking__user=request.user).exists():
                return Response({"error": "Unknown order."}, status=404)
            payment = services.verify_payment(
                order_id,
                request.data.get("gateway_payment_id", ""),
                request.data.get("gateway_signature", ""),
            )
        except (Payment.DoesNotExist,):
            return Response({"error": "Unknown order."}, status=404)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=400)
        payment.booking.refresh_from_db()
        ticket = getattr(payment.booking, "ticket", None)
        return Response({
            "success": payment.status == "success" and payment.booking.status == "confirmed",
            "status": payment.status,
            "payment_status": payment.status.upper(),
            "booking_id": str(payment.booking_id),
            "booking_ref": payment.booking.booking_ref,
            "booking_status": payment.booking.status.upper(),
            "ticket_id": str(ticket.id) if ticket else None,
            "qr_token": str(ticket.qr_token) if ticket else None,
            "redirect": f"/ticket/{payment.booking_id}",
        })


class MyRefundsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        refunds = Refund.objects.filter(booking__user=request.user).order_by("-created_at")
        return Response([
            {
                "booking_ref": r.booking.booking_ref,
                "amount": str(r.amount),
                "status": r.status,
                "created_at": r.created_at,
                "completed_at": r.completed_at,
            }
            for r in refunds
        ])
