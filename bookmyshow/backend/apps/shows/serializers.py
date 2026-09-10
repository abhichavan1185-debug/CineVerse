from django.utils import timezone
from rest_framework import serializers

from .models import Show, ShowSeat


class ShowListSerializer(serializers.ModelSerializer):
    """
    Shown as a 'timing card' under a cinema. `availability` is computed
    server-side from real ShowSeat rows — never hardcoded on the frontend.
    """

    cinema_name = serializers.CharField(source="screen.cinema.name", read_only=True)
    screen_name = serializers.CharField(source="screen.name", read_only=True)
    price_from = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()

    class Meta:
        model = Show
        fields = [
            "id", "date", "start_time", "end_time", "format",
            "cinema_name", "screen_name", "price_from", "availability",
        ]

    def get_price_from(self, obj):
        prices = obj.prices.order_by("price").values_list("price", flat=True)
        return prices[0] if prices else None

    def get_availability(self, obj):
        total = obj.show_seats.count()
        if total == 0:
            return "unavailable"
        booked_or_locked = obj.show_seats.exclude(status="available").count()
        ratio = booked_or_locked / total
        if ratio >= 1.0:
            return "sold_out"
        if ratio >= 0.9:
            return "almost_full"
        if ratio >= 0.6:
            return "filling_fast"
        return "available"


class ShowDetailSerializer(serializers.ModelSerializer):
    movie_title = serializers.CharField(source="movie.title", read_only=True)
    movie_poster = serializers.URLField(source="movie.poster_url", read_only=True)
    cinema_name = serializers.CharField(source="screen.cinema.name", read_only=True)
    screen_name = serializers.CharField(source="screen.name", read_only=True)

    class Meta:
        model = Show
        fields = [
            "id", "movie_title", "movie_poster", "cinema_name", "screen_name",
            "date", "start_time", "end_time", "format",
        ]


class ShowSeatMapSerializer(serializers.ModelSerializer):
    row_label = serializers.CharField(source="seat.row_label", read_only=True)
    seat_number = serializers.IntegerField(source="seat.seat_number", read_only=True)
    category = serializers.CharField(source="seat.category.name", read_only=True)
    is_aisle_start = serializers.BooleanField(source="seat.is_aisle_start", read_only=True)
    # A seat locked by someone else looks BOOKED to this viewer (never reveal
    # who holds it); the frontend legend distinguishes available/selected/
    # locked-by-me/booked purely from this + the user's own selection state.
    effective_status = serializers.SerializerMethodField()

    class Meta:
        model = ShowSeat
        fields = [
            "id", "row_label", "seat_number", "category", "is_aisle_start",
            "price", "effective_status",
        ]

    def get_effective_status(self, obj):
        if obj.status == "locked" and obj.locked_until and obj.locked_until < timezone.now():
            return "available"  # lazily expired; the sweep task will confirm this soon
        return obj.status
