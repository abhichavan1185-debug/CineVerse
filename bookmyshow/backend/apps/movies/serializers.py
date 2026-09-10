from rest_framework import serializers

from .models import Genre, Language, Movie, Person, Review, Watchlist


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ["id", "name"]


class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ["id", "name", "code"]


class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ["id", "name", "role", "photo_url"]


class MovieListSerializer(serializers.ModelSerializer):
    """Lean shape for movie-card grids (home page, listings)."""

    genres = GenreSerializer(many=True, read_only=True)
    languages = LanguageSerializer(many=True, read_only=True)

    class Meta:
        model = Movie
        fields = [
            "id", "title", "slug", "poster_url", "genres", "languages",
            "duration_minutes", "certificate", "release_date", "status",
            "average_rating", "review_count",
        ]


class MovieDetailSerializer(serializers.ModelSerializer):
    genres = GenreSerializer(many=True, read_only=True)
    languages = LanguageSerializer(many=True, read_only=True)
    cast = PersonSerializer(many=True, read_only=True)
    directors = PersonSerializer(many=True, read_only=True)

    class Meta:
        model = Movie
        fields = [
            "id", "title", "slug", "poster_url", "banner_url", "trailer_url",
            "description", "genres", "languages", "cast", "directors",
            "duration_minutes", "certificate", "release_date", "status",
            "average_rating", "review_count",
        ]


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "movie", "user_name", "rating", "title", "comment", "created_at"]
        read_only_fields = ["id", "user_name", "created_at"]

    def validate(self, attrs):
        request = self.context["request"]
        movie = attrs["movie"]
        if Review.objects.filter(user=request.user, movie=movie).exists():
            raise serializers.ValidationError("You've already reviewed this movie.")
        return attrs


class WatchlistSerializer(serializers.ModelSerializer):
    movie = MovieListSerializer(read_only=True)
    movie_id = serializers.PrimaryKeyRelatedField(
        source="movie", queryset=Movie.objects.all(), write_only=True
    )

    class Meta:
        model = Watchlist
        fields = ["id", "movie", "movie_id", "added_at"]
        read_only_fields = ["id", "added_at"]
