from rest_framework import serializers

from .models import FoodItem


class FoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItem
        fields = ["id", "name", "image_url", "description", "price", "category", "is_available"]
