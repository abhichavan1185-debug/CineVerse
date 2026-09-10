from decimal import Decimal

from django.utils import timezone

from .models import Coupon, CouponUsage


class CouponError(Exception):
    pass


def validate_and_price_coupon(code: str, user, order_amount: Decimal) -> tuple[Coupon, Decimal]:
    """
    Returns (coupon, discount_amount) or raises CouponError with a
    user-facing message. Always re-validated server-side at payment time,
    never trusted from a value the frontend already showed.
    """
    try:
        coupon = Coupon.objects.get(code__iexact=code, is_active=True)
    except Coupon.DoesNotExist:
        raise CouponError("Invalid coupon code.")

    now = timezone.now()
    if not (coupon.valid_from <= now <= coupon.valid_until):
        raise CouponError("This coupon has expired.")

    if order_amount < coupon.min_order_amount:
        raise CouponError(f"Minimum order amount is ₹{coupon.min_order_amount} for this coupon.")

    if coupon.usage_limit_total is not None:
        total_used = CouponUsage.objects.filter(coupon=coupon).count()
        if total_used >= coupon.usage_limit_total:
            raise CouponError("This coupon has reached its usage limit.")

    user_used = CouponUsage.objects.filter(coupon=coupon, user=user).count()
    if user_used >= coupon.usage_limit_per_user:
        raise CouponError("You've already used this coupon the maximum number of times.")

    if coupon.discount_type == "flat":
        discount = coupon.discount_value
    else:
        discount = order_amount * (coupon.discount_value / Decimal("100"))
        if coupon.max_discount is not None:
            discount = min(discount, coupon.max_discount)

    discount = min(discount, order_amount)
    return coupon, discount
