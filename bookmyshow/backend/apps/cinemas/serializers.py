from rest_framework import serializers

from .models import Cinema, City, District, Screen, Seat, SeatCategory


class DistrictSerializer(serializers.ModelSerializer):
    city_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = District
        fields = ["id", "name", "city_count"]


class CitySerializer(serializers.ModelSerializer):
    district = serializers.CharField(source="district.name", read_only=True, allow_null=True)

    class Meta:
        model = City
        fields = ["id", "name", "district", "is_popular"]


class CinemaListSerializer(serializers.ModelSerializer):
    city = serializers.CharField(source="city.name", read_only=True)
    district = serializers.CharField(source="city.district.name", read_only=True, allow_null=True)

    class Meta:
        model = Cinema
        fields = ["id", "name", "city", "district", "address", "facilities"]


class SeatSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Seat
        fields = ["id", "row_label", "seat_number", "category", "is_aisle_start"]


class ScreenSerializer(serializers.ModelSerializer):
    seats = SeatSerializer(many=True, read_only=True)

    class Meta:
        model = Screen
        fields = ["id", "name", "supported_formats", "seats"]
