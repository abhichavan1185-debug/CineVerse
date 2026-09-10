import uuid

from django.conf import settings
from django.db import models

from apps.coupons.models import Coupon
from apps.shows.models import Show, ShowSeat


class Booking(models.Model):
    STATUS_CHOICES = [
        ("pending_payment", "Pending Payment"),
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
        ("expired", "Expired"),      # lock/session timed out before payment
        ("payment_failed", "Payment Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_ref = models.CharField(max_length=20, unique=True, editable=False)  # human-facing "Booking ID"
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="bookings")
    show = models.ForeignKey(Show, on_delete=models.PROTECT, related_name="bookings")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending_payment")

    seats_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    food_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    convenience_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    taxes = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    coupon = models.ForeignKey(Coupon, null=True, blank=True, on_delete=models.SET_NULL)
    discount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # server-computed, always

    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["booking_ref"]),
        ]

    def __str__(self):
        return self.booking_ref


class BookingSeat(models.Model):
    """Immutable seat snapshot created at checkout and retained for ticket history."""

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="booking_seats")
    # This deliberately is not OneToOne.  A cancelled seat can legitimately be
    # sold again for the same show, while the original booking must remain
    # auditable.  Current availability is enforced by ShowSeat.status instead.
    show_seat = models.ForeignKey(ShowSeat, on_delete=models.PROTECT, related_name="booking_seats")
    price = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["booking", "show_seat"], name="unique_booking_show_seat"),
        ]


class Ticket(models.Model):
    STATUS_CHOICES = [
        ("valid", "Valid"),
        ("used", "Used"),
        ("expired", "Expired"),
        ("cancelled", "Cancelled"),
        ("transferred", "Transferred"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="ticket")
    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)  # the ONLY thing encoded in the QR
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="valid")
    issued_at = models.DateTimeField(auto_now_add=True)


class TicketTransfer(models.Model):
    STATUS_CHOICES = [("pending", "Pending"), ("accepted", "Accepted"), ("rejected", "Rejected")]

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="transfers")
    from_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    to_email = models.EmailField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
