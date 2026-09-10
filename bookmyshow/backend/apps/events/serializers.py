from rest_framework import serializers

from .models import Event, EventBooking, EventSchedule, TicketTier, Venue


class VenueSerializer(serializers.ModelSerializer):
    city = serializers.CharField(source="city.name", read_only=True)

    class Meta:
        model = Venue
        fields = ["id", "name", "city", "address"]


class TicketTierSerializer(serializers.ModelSerializer):
    available_quantity = serializers.IntegerField(read_only=True)

    class Meta:
        model = TicketTier
        fields = ["id", "name", "price", "total_quantity", "available_quantity"]


class EventScheduleSerializer(serializers.ModelSerializer):
    venue = VenueSerializer(read_only=True)
    tiers = TicketTierSerializer(many=True, read_only=True)

    class Meta:
        model = EventSchedule
        fields = ["id", "date", "start_time", "venue", "tiers", "is_cancelled"]


class EventListSerializer(serializers.ModelSerializer):
    """Lean shape for grid/card listings — city comes from the nearest upcoming schedule."""

    city = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id", "title", "slug", "category", "poster_url", "language",
            "average_rating", "review_count", "is_featured", "city", "min_price",
        ]

    def get_city(self, obj):
        schedule = obj.schedules.select_related("venue__city").order_by("date").first()
        return schedule.venue.city.name if schedule else None

    def get_min_price(self, obj):
        tier = TicketTier.objects.filter(schedule__event=obj).order_by("price").first()
        return str(tier.price) if tier else None


class EventDetailSerializer(serializers.ModelSerializer):
    schedules = EventScheduleSerializer(many=True, read_only=True)

    class Meta:
        model = Event
        fields = [
            "id", "title", "slug", "category", "poster_url", "banner_url",
            "description", "language", "duration_minutes", "average_rating",
            "review_count", "schedules",
        ]


class EventBookingCreateSerializer(serializers.Serializer):
    tier_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=10)


class EventBookingSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source="schedule.event.title", read_only=True)
    event_poster_url = serializers.URLField(source="schedule.event.poster_url", read_only=True)
    venue = serializers.CharField(source="schedule.venue.name", read_only=True)
    date = serializers.DateField(source="schedule.date", read_only=True)
    start_time = serializers.TimeField(source="schedule.start_time", read_only=True)
    tier_name = serializers.CharField(source="tier.name", read_only=True)

    class Meta:
        model = EventBooking
        fields = [
            "id", "booking_code", "event_title", "event_poster_url", "venue",
            "date", "start_time", "tier_name", "quantity", "total_amount",
            "status", "created_at",
        ]
