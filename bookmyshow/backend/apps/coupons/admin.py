from django.contrib import admin

from .models import Coupon, CouponUsage


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ["code", "discount_type", "discount_value", "is_active", "valid_until"]
    list_filter = ["is_active", "discount_type"]


admin.site.register(CouponUsage)
