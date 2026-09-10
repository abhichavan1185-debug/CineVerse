from rest_framework import generics, permissions

from .models import Show, ShowSeat
from .serializers import ShowDetailSerializer, ShowListSerializer, ShowSeatMapSerializer


class ShowListView(generics.ListAPIView):
    """GET /api/shows/?movie=<slug>&cinema=<uuid>&date=2026-09-10"""

    serializer_class = ShowListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Show.objects.select_related("screen", "screen__cinema").filter(is_cancelled=False)
        movie = self.request.query_params.get("movie")
        cinema = self.request.query_params.get("cinema")
        date = self.request.query_params.get("date")
        if movie:
            qs = qs.filter(movie__slug=movie)
        if cinema:
            qs = qs.filter(screen__cinema_id=cinema)
        if date:
            qs = qs.filter(date=date)
        return qs.order_by("start_time")


class ShowDetailView(generics.RetrieveAPIView):
    queryset = Show.objects.select_related("movie", "screen", "screen__cinema")
    serializer_class = ShowDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_url_kwarg = "show_id"
    lookup_field = "id"


class ShowSeatMapView(generics.ListAPIView):
    """GET /api/shows/<show_id>/seats/ — full seat map with live availability."""

    serializer_class = ShowSeatMapSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return (
            ShowSeat.objects.filter(show_id=self.kwargs["show_id"])
            .select_related("seat", "seat__category")
            .order_by("seat__row_label", "seat__seat_number")
        )
