from decimal import Decimal, InvalidOperation

from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Coupon
from .serializers import CouponSerializer
from .services import CouponError, validate_and_price_coupon


class OfferListView(generics.ListAPIView):
    """GET /api/coupons/offers/ — public, currently-valid offers for the Offers page."""

    serializer_class = CouponSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        now = timezone.now()
        return Coupon.objects.filter(
            is_active=True, valid_from__lte=now, valid_until__gte=now
        ).order_by("-is_featured", "-valid_until")


class ValidateCouponView(APIView):
    """
    POST {"code": "SAVE100", "order_amount": "450.00"}
    Used to preview a discount before checkout. The authoritative check
    happens again inside BookingCheckoutView so nothing here is trusted
    at payment time.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            order_amount = Decimal(str(request.data.get("order_amount", "0")))
        except InvalidOperation:
            return Response({"error": "Invalid order_amount."}, status=400)

        try:
            coupon, discount = validate_and_price_coupon(
                request.data.get("code", ""), request.user, order_amount
            )
        except CouponError as exc:
            return Response({"error": str(exc)}, status=400)

        return Response({
            "code": coupon.code,
            "discount": str(discount),
            "final_amount": str(order_amount - discount),
        })
