import datetime
import uuid
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import generics, status, views
from rest_framework.response import Response

from apps.movies.models import Movie, Genre, Language
from apps.cinemas.models import Cinema, City, Screen, Seat, SeatCategory
from apps.cinemas.services import generate_exact_200_seats_for_screen
from apps.shows.models import Show, ShowSeat, ShowSeatPrice
from apps.bookings.models import Booking

from .permissions import IsAdminOrStaff
from .serializers import (
    AdminBookingSerializer,
    AdminCinemaSerializer,
    AdminMovieSerializer,
    AdminScreenSerializer,
    AdminShowSerializer,
    AdminUserSerializer,
)

User = get_user_model()


class AdminStatsView(views.APIView):
    """GET /api/admin/stats/ — Aggregated operational statistics for dashboard."""

    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        today = timezone.now().date()
        total_users = User.objects.count()
        total_movies = Movie.objects.count()
        total_cinemas = Cinema.objects.count()
        total_shows = Show.objects.filter(is_cancelled=False).count()
        
        bookings_qs = Booking.objects.all()
        total_bookings = bookings_qs.count()
        confirmed_bookings = bookings_qs.filter(status="confirmed")
        
        total_revenue = confirmed_bookings.aggregate(rev=Sum("total_amount"))["rev"] or Decimal("0.00")
        today_bookings = bookings_qs.filter(created_at__date=today).count()

        # Seat metrics across all shows today or upcoming
        seats_qs = ShowSeat.objects.filter(show__date__gte=today, show__is_cancelled=False)
        available_seats = seats_qs.filter(status="available").count()
        booked_seats = seats_qs.filter(status="booked").count()

        return Response({
            "total_users": total_users,
            "total_movies": total_movies,
            "total_cinemas": total_cinemas,
            "total_shows": total_shows,
            "total_bookings": total_bookings,
            "revenue": str(total_revenue),
            "today_bookings": today_bookings,
            "available_seats": available_seats,
            "booked_seats": booked_seats,
        })


class AdminMovieListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminOrStaff]
    serializer_class = AdminMovieSerializer
    queryset = Movie.objects.prefetch_related("genres", "languages").all().order_by("-created_at")

    def perform_create(self, serializer):
        title = serializer.validated_data["title"]
        base_slug = slugify(title)
        slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
        serializer.save(slug=slug)


class AdminMovieDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrStaff]
    serializer_class = AdminMovieSerializer
    queryset = Movie.objects.prefetch_related("genres", "languages").all()
    lookup_field = "id"


class AdminCinemaListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminOrStaff]
    serializer_class = AdminCinemaSerializer
    queryset = Cinema.objects.select_related("city", "city__district").prefetch_related("screens").all().order_by("name")


class AdminCinemaDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrStaff]
    serializer_class = AdminCinemaSerializer
    queryset = Cinema.objects.select_related("city").all()
    lookup_field = "id"


class AdminScreenCreateView(generics.CreateAPIView):
    permission_classes = [IsAdminOrStaff]
    serializer_class = AdminScreenSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        screen = serializer.save()
        # Automatically generate the exact 200 seats (80 Platinum, 120 Gold)
        generate_exact_200_seats_for_screen(screen)


class AdminShowListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminOrStaff]
    serializer_class = AdminShowSerializer
    queryset = Show.objects.select_related("movie", "screen", "screen__cinema").prefetch_related("prices").all().order_by("-date", "start_time")

    @transaction.atomic
    def perform_create(self, serializer):
        gold_price = serializer.validated_data.pop("gold_price", Decimal("220.00"))
        platinum_price = serializer.validated_data.pop("platinum_price", Decimal("350.00"))
        show = serializer.save()

        # Ensure screen has exact 200 seats
        screen = show.screen
        if screen.seats.count() != 200:
            generate_exact_200_seats_for_screen(screen)

        plat_cat = SeatCategory.objects.get(name="Platinum")
        gold_cat = SeatCategory.objects.get(name="Gold")

        # Save ShowSeatPrice records
        ShowSeatPrice.objects.update_or_create(show=show, category=plat_cat, defaults={"price": platinum_price})
        ShowSeatPrice.objects.update_or_create(show=show, category=gold_cat, defaults={"price": gold_price})

        # Bulk create ShowSeat entries for all 200 physical seats
        seats = screen.seats.select_related("category").all()
        show_seats = [
            ShowSeat(
                show=show,
                seat=seat,
                price=platinum_price if seat.category.name == "Platinum" else gold_price,
                status="available",
            )
            for seat in seats
        ]
        ShowSeat.objects.bulk_create(show_seats)


class AdminShowDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [IsAdminOrStaff]
    serializer_class = AdminShowSerializer
    queryset = Show.objects.all()
    lookup_field = "id"


class AdminBookingListView(generics.ListAPIView):
    permission_classes = [IsAdminOrStaff]
    serializer_class = AdminBookingSerializer
    queryset = Booking.objects.select_related("user", "show__movie", "show__screen__cinema").prefetch_related("booking_seats__show_seat__seat__category").all().order_by("-created_at")


class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsAdminOrStaff]
    serializer_class = AdminUserSerializer
    queryset = User.objects.select_related("profile").prefetch_related("bookings").all().order_by("-created_at")
