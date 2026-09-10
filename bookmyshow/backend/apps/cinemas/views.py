from django.db.models import Count
from rest_framework import generics, permissions

from .models import Cinema, City, District
from .serializers import CinemaListSerializer, CitySerializer, DistrictSerializer


class DistrictListView(generics.ListAPIView):
    """GET /api/cinemas/districts/ â€” all Maharashtra districts in the catalog."""

    queryset = District.objects.annotate(city_count=Count("cities")).order_by("name")
    serializer_class = DistrictSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class CityListView(generics.ListAPIView):
    serializer_class = CitySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = City.objects.select_related("district").order_by("-is_popular", "name")
        district = self.request.query_params.get("district")
        if district:
            qs = qs.filter(district__name__iexact=district)
        return qs


class CinemaListView(generics.ListAPIView):
    """GET /api/cinemas/?city=Mumbai&district=Mumbai%20City"""

    serializer_class = CinemaListSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = Cinema.objects.select_related("city", "city__district").filter(is_active=True)
        city = self.request.query_params.get("city")
        if city:
            qs = qs.filter(city__name__iexact=city)
        district = self.request.query_params.get("district")
        if district:
            qs = qs.filter(city__district__name__iexact=district)
        return qs


class CinemaDetailView(generics.RetrieveAPIView):
    """GET /api/cinemas/<uuid:id>/"""
    queryset = Cinema.objects.select_related("city", "city__district").filter(is_active=True)
    serializer_class = CinemaListSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "id"

