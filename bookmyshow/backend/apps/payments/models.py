import uuid

from django.db import models

from apps.bookings.models import Booking


class Payment(models.Model):
    METHOD_CHOICES = [("upi", "UPI"), ("card", "Card"), ("netbanking", "Net Banking"), ("wallet", "Wallet")]
    STATUS_CHOICES = [
        ("initiated", "Initiated"),
        ("processing", "Processing"),
        ("success", "Success"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="payment")
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="initiated")
    gateway_order_id = models.CharField(max_length=64, unique=True)
    gateway_payment_id = models.CharField(max_length=64, blank=True)
    gateway_signature = models.CharField(max_length=128, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)


class Refund(models.Model):
    STATUS_CHOICES = [("pending", "Pending"), ("processing", "Processing"), ("completed", "Completed"), ("failed", "Failed")]

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="refunds")
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, related_name="refunds")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
