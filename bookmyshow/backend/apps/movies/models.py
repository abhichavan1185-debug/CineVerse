import uuid

from django.conf import settings
from django.db import models


class Genre(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class Language(models.Model):
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return self.name


class Person(models.Model):
    """Shared table for actors & directors — avoids duplicate-purpose tables."""

    ROLE_CHOICES = [("actor", "Actor"), ("director", "Director")]
    name = models.CharField(max_length=150)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    photo_url = models.URLField(blank=True)

    def __str__(self):
        return f"{self.name} ({self.role})"


class Movie(models.Model):
    CERTIFICATE_CHOICES = [("U", "U"), ("UA", "UA"), ("A", "A"), ("S", "S")]
    STATUS_CHOICES = [
        ("now_showing", "Now Showing"),
        ("coming_soon", "Coming Soon"),
        ("archived", "Archived"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, db_index=True)
    slug = models.SlugField(max_length=220, unique=True)
    poster_url = models.URLField()
    banner_url = models.URLField(blank=True)
    trailer_url = models.URLField(blank=True)
    description = models.TextField()
    genres = models.ManyToManyField(Genre, related_name="movies")
    languages = models.ManyToManyField(Language, related_name="movies")
    cast = models.ManyToManyField(Person, related_name="acted_in", limit_choices_to={"role": "actor"}, blank=True)
    directors = models.ManyToManyField(Person, related_name="directed", limit_choices_to={"role": "director"}, blank=True)
    duration_minutes = models.PositiveIntegerField()
    certificate = models.CharField(max_length=5, choices=CERTIFICATE_CHOICES)
    release_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="now_showing")
    average_rating = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    review_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["status", "release_date"])]

    def __str__(self):
        return self.title


class Watchlist(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="watchlist")
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "movie")


class Review(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField()  # 1-5
    title = models.CharField(max_length=150, blank=True)
    comment = models.TextField(blank=True)
    is_approved = models.BooleanField(default=True)  # admin moderation
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # A user can review a given movie only once (enforced at DB level too).
        unique_together = ("user", "movie")
        indexes = [models.Index(fields=["movie", "is_approved"])]
