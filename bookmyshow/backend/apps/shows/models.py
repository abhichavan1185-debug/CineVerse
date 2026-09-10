import uuid

from django.db import models

from apps.cinemas.models import Screen, Seat, SeatCategory
from apps.movies.models import Movie


class Show(models.Model):
    FORMAT_CHOICES = [("2D", "2D"), ("3D", "3D"), ("IMAX", "IMAX"), ("4DX", "4DX")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name="shows")
    screen = models.ForeignKey(Screen, on_delete=models.CASCADE, related_name="shows")
    date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default="2D")
    is_cancelled = models.BooleanField(default=False)

    class Meta:
        unique_together = ("screen", "date", "start_time")
        indexes = [models.Index(fields=["movie", "date"])]

    def __str__(self):
        return f"{self.movie.title} @ {self.screen} {self.date} {self.start_time}"


class ShowSeatPrice(models.Model):
    """Per-show, per-category price (a Recliner in an IMAX 9pm show costs more)."""

    show = models.ForeignKey(Show, on_delete=models.CASCADE, related_name="prices")
    category = models.ForeignKey(SeatCategory, on_delete=models.PROTECT)
    price = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        unique_together = ("show", "category")


class ShowSeat(models.Model):
    """
    The single source of truth for seat availability on a given show.
    This is the row every booking-concurrency operation locks with
    SELECT ... FOR UPDATE — see apps.bookings.services.SeatLockService.
    """

    STATUS_CHOICES = [
        ("available", "Available"),
        ("locked", "Locked"),      # held during checkout, expires via locked_until
        ("booked", "Booked"),
    ]

    show = models.ForeignKey(Show, on_delete=models.CASCADE, related_name="show_seats")
    seat = models.ForeignKey(Seat, on_delete=models.CASCADE, related_name="show_seats")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="available")
    locked_by = models.ForeignKey(
        "users.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    locked_until = models.DateTimeField(null=True, blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        # A seat can only appear once per show — this is what makes the
        # locking row-unique and lockable.
        unique_together = ("show", "seat")
        indexes = [
            models.Index(fields=["show", "status"]),
            models.Index(fields=["status", "locked_until"]),  # for the lock-expiry sweep
        ]

    def __str__(self):
        return f"{self.show_id}/{self.seat} [{self.status}]"
