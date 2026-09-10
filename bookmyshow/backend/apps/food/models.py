from django.db import models

from apps.bookings.models import Booking


class FoodItem(models.Model):
    CATEGORY_CHOICES = [
        ("popcorn", "Popcorn"), ("nachos", "Nachos"), ("beverage", "Cold Drinks"),
        ("water", "Water"), ("combo", "Combo"), ("snack", "Snacks"),
    ]
    name = models.CharField(max_length=100)
    image_url = models.URLField(blank=True)
    description = models.CharField(max_length=255, blank=True)
    price = models.DecimalField(max_digits=7, decimal_places=2)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    is_available = models.BooleanField(default=True)
    inventory_count = models.PositiveIntegerField(null=True, blank=True)  # null = unlimited

    def __str__(self):
        return self.name


class FoodOrderItem(models.Model):
    """A line item of food attached to a booking (added during checkout, before payment)."""

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="food_items")
    food_item = models.ForeignKey(FoodItem, on_delete=models.PROTECT)
    quantity = models.PositiveSmallIntegerField(default=1)
    price_at_order = models.DecimalField(max_digits=7, decimal_places=2)
