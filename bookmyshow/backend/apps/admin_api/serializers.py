from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.movies.models import Movie, Genre, Language
from apps.cinemas.models import Cinema, City, Screen, SeatCategory
from apps.shows.models import Show, ShowSeatPrice
from apps.bookings.models import Booking

User = get_user_model()


class AdminMovieSerializer(serializers.ModelSerializer):
    genres_list = serializers.SlugRelatedField(
        many=True, slug_field="name", queryset=Genre.objects.all(), source="genres", required=False
    )
    languages_list = serializers.SlugRelatedField(
        many=True, slug_field="name", queryset=Language.objects.all(), source="languages", required=False
    )

    class Meta:
        model = Movie
        fields = [
            "id", "title", "slug", "poster_url", "banner_url", "trailer_url",
            "description", "duration_minutes", "certificate", "release_date",
            "status", "average_rating", "review_count", "genres_list", "languages_list",
            "created_at"
        ]
        read_only_fields = ["id", "slug", "average_rating", "review_count", "created_at"]


class AdminCinemaSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source="city.name", read_only=True)
    district_name = serializers.CharField(source="city.district.name", read_only=True, default="")
    screen_count = serializers.IntegerField(source="screens.count", read_only=True)

    class Meta:
        model = Cinema
        fields = [
            "id", "name", "city", "city_name", "district_name", "address",
            "latitude", "longitude", "facilities", "is_active", "screen_count"
        ]


class AdminScreenSerializer(serializers.ModelSerializer):
    cinema_name = serializers.CharField(source="cinema.name", read_only=True)
    seat_count = serializers.IntegerField(source="seats.count", read_only=True)

    class Meta:
        model = Screen
        fields = ["id", "cinema", "cinema_name", "name", "supported_formats", "seat_count"]


class AdminShowSerializer(serializers.ModelSerializer):
    movie_title = serializers.CharField(source="movie.title", read_only=True)
    cinema_name = serializers.CharField(source="screen.cinema.name", read_only=True)
    screen_name = serializers.CharField(source="screen.name", read_only=True)
    gold_price = serializers.DecimalField(max_digits=8, decimal_places=2, write_only=True, default=220)
    platinum_price = serializers.DecimalField(max_digits=8, decimal_places=2, write_only=True, default=350)
    prices = serializers.SerializerMethodField()

    class Meta:
        model = Show
        fields = [
            "id", "movie", "movie_title", "screen", "cinema_name", "screen_name",
            "date", "start_time", "end_time", "format", "is_cancelled",
            "gold_price", "platinum_price", "prices"
        ]

    def get_prices(self, obj):
        return {p.category.name: str(p.price) for p in obj.prices.all()}


class AdminBookingSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)
    movie_title = serializers.CharField(source="show.movie.title", read_only=True)
    cinema_name = serializers.CharField(source="show.screen.cinema.name", read_only=True)
    seats = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id", "booking_ref", "user_email", "movie_title", "cinema_name",
            "status", "total_amount", "created_at", "seats"
        ]

    def get_seats(self, obj):
        return [
            f"{bs.show_seat.seat.row_label}{bs.show_seat.seat.seat_number} ({bs.show_seat.seat.category.name})"
            for bs in obj.booking_seats.select_related("show_seat__seat__category").all()
        ]


class AdminUserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="profile.full_name", read_only=True, default="")
    preferred_city = serializers.CharField(source="profile.preferred_city", read_only=True, default="")
    bookings_count = serializers.IntegerField(source="bookings.count", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "phone", "full_name", "preferred_city",
            "is_active_account", "is_admin_user", "is_staff", "bookings_count", "created_at"
        ]
