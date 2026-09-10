from rest_framework import serializers

from apps.food.models import FoodOrderItem
from apps.shows.models import ShowSeat

from .models import Booking, BookingSeat, Ticket, TicketTransfer


class LockSeatsSerializer(serializers.Serializer):
    show_id = serializers.UUIDField()
    show_seat_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1, max_length=10)

    def validate_show_seat_ids(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError("Each seat may only be selected once.")
        return value

class FoodLineSerializer(serializers.Serializer):
    food_item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=20)


class CheckoutSerializer(serializers.Serializer):
    show_id = serializers.UUIDField()
    show_seat_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1, max_length=10)
    food_items = FoodLineSerializer(many=True, required=False, default=list)
    coupon_code = serializers.CharField(required=False, allow_blank=True)

    def validate_show_seat_ids(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError("Each seat may only be checked out once.")
        return value

    def validate_food_items(self, value):
        item_ids = [line["food_item_id"] for line in value]
        if len(set(item_ids)) != len(item_ids):
            raise serializers.ValidationError("Combine duplicate food items into one quantity.")
        return value

class BookingSeatSerializer(serializers.ModelSerializer):
    row_label = serializers.CharField(source="show_seat.seat.row_label", read_only=True)
    seat_number = serializers.IntegerField(source="show_seat.seat.seat_number", read_only=True)
    category = serializers.CharField(source="show_seat.seat.category.name", read_only=True)

    class Meta:
        model = BookingSeat
        fields = ["row_label", "seat_number", "category", "price"]


class FoodOrderItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="food_item.name", read_only=True)

    class Meta:
        model = FoodOrderItem
        fields = ["name", "quantity", "price_at_order"]


class TicketSerializer(serializers.ModelSerializer):
    qr_data = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = ["id", "qr_token", "qr_data", "status", "issued_at"]

    def get_qr_data(self, obj):
        return f"CINEVERSE:TICKET:{obj.booking.booking_ref}:{obj.qr_token}"


class BookingSerializer(serializers.ModelSerializer):
    """Full order-summary / confirmation / my-bookings shape."""

    movie_title = serializers.CharField(source="show.movie.title", read_only=True)
    movie_poster = serializers.URLField(source="show.movie.poster_url", read_only=True)
    movie_language = serializers.CharField(source="show.movie.language", read_only=True)
    movie_certificate = serializers.CharField(source="show.movie.certificate", read_only=True)
    movie_duration = serializers.IntegerField(source="show.movie.duration_minutes", read_only=True)
    cinema_name = serializers.CharField(source="show.screen.cinema.name", read_only=True)
    cinema_address = serializers.CharField(source="show.screen.cinema.address", read_only=True)
    cinema_city = serializers.CharField(source="show.screen.cinema.city.name", read_only=True)
    screen_name = serializers.CharField(source="show.screen.name", read_only=True)
    date = serializers.DateField(source="show.date", read_only=True)
    start_time = serializers.TimeField(source="show.start_time", read_only=True)
    seats = BookingSeatSerializer(source="booking_seats", many=True, read_only=True)
    food = FoodOrderItemSerializer(source="food_items", many=True, read_only=True)
    ticket = TicketSerializer(read_only=True)
    qr_data = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id", "booking_ref", "status", "movie_title", "movie_poster", "movie_language",
            "movie_certificate", "movie_duration", "cinema_name", "cinema_address", "cinema_city",
            "screen_name", "date", "start_time", "seats", "food", "seats_subtotal", "food_subtotal",
            "convenience_fee", "taxes", "discount", "total_amount", "created_at",
            "confirmed_at", "ticket", "qr_data",
        ]

    def get_qr_data(self, obj):
        ticket = getattr(obj, "ticket", None)
        if ticket and obj.status == "confirmed":
            return f"CINEVERSE:TICKET:{obj.booking_ref}:{ticket.qr_token}"
        return None


class TicketTransferSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketTransfer
        fields = ["id", "ticket", "to_email", "status", "created_at", "resolved_at"]
        read_only_fields = ["id", "status", "created_at", "resolved_at"]
