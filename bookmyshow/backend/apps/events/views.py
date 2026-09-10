from rest_framework import filters, generics, pagination, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Event, EventBooking, EventCategory
from .serializers import (
    EventBookingCreateSerializer,
    EventBookingSerializer,
    EventDetailSerializer,
    EventListSerializer,
)
from .services import TicketsUnavailableError, book_tickets


def _split_csv(value):
    return [v.strip() for v in value.split(",") if v.strip()] if value else []


class EventPagination(pagination.PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 60


class EventListView(generics.ListAPIView):
    """
    GET /api/events/?category=sports,music&city=Hyderabad&search=rock

    One endpoint serves every non-movie vertical (Music/Comedy/Sports/Plays/
    Activities); the frontend's category tabs just pass a different
    `category` filter into the same listing.
    """

    serializer_class = EventListSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = EventPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "description"]

    def get_queryset(self):
        qs = Event.objects.all()
        params = self.request.query_params

        categories = _split_csv(params.get("category"))
        if categories:
            qs = qs.filter(category__in=categories)

        city = params.get("city")
        if city:
            qs = qs.filter(schedules__venue__city__name__iexact=city)

        return qs.distinct().order_by("-is_featured", "-created_at")


class EventDetailView(generics.RetrieveAPIView):
    queryset = Event.objects.prefetch_related("schedules__venue__city", "schedules__tiers")
    serializer_class = EventDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"


class EventCategoryFacetsView(APIView):
    """GET /api/events/facets/ — category labels + cities that currently have events, for tabs/filters."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cities = (
            Event.objects.filter(schedules__isnull=False)
            .values_list("schedules__venue__city__name", flat=True)
            .distinct()
        )
        return Response({
            "categories": [{"value": v, "label": l} for v, l in EventCategory.choices],
            "cities": sorted(set(filter(None, cities))),
        })


class EventBookingCreateView(APIView):
    """POST /api/events/book/ {"tier_id": "...", "quantity": 2}"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = EventBookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            booking = book_tickets(
                tier_id=serializer.validated_data["tier_id"],
                quantity=serializer.validated_data["quantity"],
                user=request.user,
            )
        except TicketsUnavailableError as exc:
            return Response({"error": str(exc)}, status=409)
        return Response(EventBookingSerializer(booking).data, status=201)


class MyEventBookingsView(generics.ListAPIView):
    serializer_class = EventBookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (
            EventBooking.objects.filter(user=self.request.user)
            .select_related("schedule__event", "schedule__venue", "tier")
            .order_by("-created_at")
        )
