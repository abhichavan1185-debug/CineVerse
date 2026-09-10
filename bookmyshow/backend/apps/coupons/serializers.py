from rest_framework import serializers

from .models import Coupon


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            "code", "title", "description", "banner_url", "is_featured",
            "discount_type", "discount_value", "max_discount", "min_order_amount",
            "valid_until",
        ]
