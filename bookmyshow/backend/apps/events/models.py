import uuid

from django.conf import settings
from django.db import models

from apps.cinemas.models import City


class EventCategory(models.TextChoices):
    """
    A single 'Event' vertical covers everything BookMyShow lists outside of
    movies: gigs, stand-up, sport fixtures, theatre and workshops/activities.
    Modeling them as one table with a category field (rather than five
    near-identical tables) means listing, search, and booking code is shared,
    while the frontend can still filter/route by category tab.
    """

    MUSIC = "music", "Music"
    COMEDY = "comedy", "Comedy"
    SPORTS = "sports", "Sports"
    PLAYS = "plays", "Plays"
    ACTIVITIES = "activities", "Activities"


class Venue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name="venues")
    address = models.CharField(max_length=300)

    class Meta:
        indexes = [models.Index(fields=["city"])]

    def __str__(self):
        return f"{self.name}, {self.city.name}"


class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, db_index=True)
    slug = models.SlugField(max_length=220, unique=True)
    category = models.CharField(max_length=20, choices=EventCategory.choices, db_index=True)
    poster_url = models.URLField()
    banner_url = models.URLField(blank=True)
    description = models.TextField()
    language = models.CharField(max_length=50, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    is_featured = models.BooleanField(default=False)
    average_rating = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    review_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["category"])]

    def __str__(self):
        return f"{self.title} ({self.category})"


class EventSchedule(models.Model):
    """One date/time/venue occurrence of an Event — an event can run at
    several venues and dates (e.g. a touring comedy show)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="schedules")
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name="schedules")
    date = models.DateField(db_index=True)
    start_time = models.TimeField()
    is_cancelled = models.BooleanField(default=False)

    class Meta:
        unique_together = ("venue", "date", "start_time")
        indexes = [models.Index(fields=["event", "date"])]
        ordering = ["date", "start_time"]

    def __str__(self):
        return f"{self.event.title} @ {self.venue.name} {self.date} {self.start_time}"


class TicketTier(models.Model):
    """
    A priced ticket category for a schedule (General/Fan Pit/VIP, etc).
    Events are quantity-based ("50 VIP tickets left"), not seat-mapped like
    movies — this mirrors how BookMyShow actually sells most non-cinema
    events, and keeps booking a single atomic counter update rather than a
    per-seat lock table.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schedule = models.ForeignKey(EventSchedule, on_delete=models.CASCADE, related_name="tiers")
    name = models.CharField(max_length=50)  # "General", "Fan Pit", "VIP", "Ringside"
    price = models.DecimalField(max_digits=9, decimal_places=2)
    total_quantity = models.PositiveIntegerField()
    booked_quantity = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("schedule", "name")

    @property
    def available_quantity(self) -> int:
        return max(self.total_quantity - self.booked_quantity, 0)

    def __str__(self):
        return f"{self.schedule} / {self.name}"


class EventBooking(models.Model):
    STATUS_CHOICES = [
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_code = models.CharField(max_length=12, unique=True, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="event_bookings")
    schedule = models.ForeignKey(EventSchedule, on_delete=models.PROTECT, related_name="bookings")
    tier = models.ForeignKey(TicketTier, on_delete=models.PROTECT, related_name="bookings")
    quantity = models.PositiveIntegerField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="confirmed")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "-created_at"])]

    def __str__(self):
        return f"{self.booking_code} ({self.status})"
