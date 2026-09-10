from django.conf import settings
from django.db import models


class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = [("flat", "Flat"), ("percent", "Percent")]

    # Display metadata for the public "Offers" page. Optional because coupons
    # created purely for backend/testing use don't need marketing copy.
    title = models.CharField(max_length=150, blank=True)
    description = models.CharField(max_length=300, blank=True)
    banner_url = models.URLField(blank=True)
    is_featured = models.BooleanField(default=False)

    code = models.CharField(max_length=30, unique=True)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(max_digits=8, decimal_places=2)
    max_discount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    min_order_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    usage_limit_total = models.PositiveIntegerField(null=True, blank=True)
    usage_limit_per_user = models.PositiveIntegerField(default=1)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.code


class CouponUsage(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name="usages")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    booking = models.ForeignKey("bookings.Booking", on_delete=models.CASCADE)
    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("coupon", "booking")
