import uuid

from django.db import models


class District(models.Model):
    """A Maharashtra administrative district used to organise selectable cities."""

    name = models.CharField(max_length=120, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class City(models.Model):
    name = models.CharField(max_length=100, unique=True)
    # Nullable only for backwards compatibility with existing local/demo
    # databases.  The seed command assigns every supported city a district.
    district = models.ForeignKey(
        District, null=True, blank=True, on_delete=models.SET_NULL, related_name="cities"
    )
    is_popular = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class Cinema(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name="cinemas")
    address = models.CharField(max_length=300)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    facilities = models.JSONField(default=list)  # ["Parking", "Food Court", "Wheelchair Access"]
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [models.Index(fields=["city"])]

    def __str__(self):
        return f"{self.name}, {self.city.name}"


class Screen(models.Model):
    cinema = models.ForeignKey(Cinema, on_delete=models.CASCADE, related_name="screens")
    name = models.CharField(max_length=50)  # "Screen 1", "Audi 3 - IMAX"
    supported_formats = models.JSONField(default=list)  # ["2D", "3D", "IMAX"]

    class Meta:
        unique_together = ("cinema", "name")

    def __str__(self):
        return f"{self.cinema.name} / {self.name}"


class SeatCategory(models.Model):
    name = models.CharField(max_length=30, unique=True)  # Regular, Premium, Recliner, VIP
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name_plural = "Seat categories"
        ordering = ["display_order"]

    def __str__(self):
        return self.name


class Seat(models.Model):
    """A physical seat on a screen. Availability per-show lives on ShowSeat, not here."""

    screen = models.ForeignKey(Screen, on_delete=models.CASCADE, related_name="seats")
    category = models.ForeignKey(SeatCategory, on_delete=models.PROTECT)
    row_label = models.CharField(max_length=2)   # "A", "B", ...
    seat_number = models.PositiveSmallIntegerField()
    is_aisle_start = models.BooleanField(default=False)  # rendering hint for aisle spacing

    class Meta:
        unique_together = ("screen", "row_label", "seat_number")
        indexes = [models.Index(fields=["screen"])]
        ordering = ["row_label", "seat_number"]

    def __str__(self):
        return f"{self.row_label}{self.seat_number}"
