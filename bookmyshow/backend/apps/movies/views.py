from django.db import models as dj_models
from django.shortcuts import get_object_or_404
from rest_framework import filters, generics, pagination, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Genre, Language, Movie, Person, Review, Watchlist
from .serializers import (
    GenreSerializer,
    LanguageSerializer,
    MovieDetailSerializer,
    MovieListSerializer,
    ReviewSerializer,
    WatchlistSerializer,
)

# Friendly "sort" query param -> actual ordering. Keeps the frontend from having
# to know Django field names, and gives us a single place to tune each section's
# definition (e.g. "trending" could later mix recency + rating instead of just one field).
SORT_MAP = {
    "recommended": ("-average_rating", "-review_count"),
    "popular": ("-review_count",),
    "trending": ("-review_count", "-release_date"),
    "top_rated": ("-average_rating",),
    "new_releases": ("-release_date",),
    "release_date": ("release_date",),
}


def _split_csv(value: str | None) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()] if value else []


class MoviePagination(pagination.PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 60


class MovieListView(generics.ListAPIView):
    """
    GET /api/movies/?status=now_showing,coming_soon&genre=Action,Comedy&language=Hindi
                     &search=avengers&sort=trending&page=1&page_size=20

    - status/genre/language accept comma-separated values (OR within a field).
    - search matches title, cast name, and director name.
    - sort maps to a curated ordering (see SORT_MAP); falls back to DRF's
      `ordering` param (e.g. ?ordering=-release_date) for anything more specific.
    Backed by DB indexes on (status, release_date); no N+1 thanks to prefetch.
    """

    serializer_class = MovieListSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = MoviePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "cast__name", "directors__name"]
    ordering_fields = ["release_date", "average_rating", "review_count", "title"]

    def get_queryset(self):
        qs = Movie.objects.prefetch_related("genres", "languages").all()
        params = self.request.query_params

        statuses = _split_csv(params.get("status"))
        genres = _split_csv(params.get("genre"))
        languages = _split_csv(params.get("language"))

        if statuses:
            qs = qs.filter(status__in=statuses)
        if genres:
            qs = qs.filter(genres__name__in=genres)
        if languages:
            qs = qs.filter(languages__name__in=languages)

        sort = params.get("sort")
        if sort in SORT_MAP and not params.get("ordering"):
            qs = qs.order_by(*SORT_MAP[sort])

        return qs.distinct()


class MovieDetailView(generics.RetrieveAPIView):
    queryset = Movie.objects.prefetch_related("genres", "languages", "cast", "directors").all()
    serializer_class = MovieDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"


class MovieIdDetailView(generics.RetrieveAPIView):
    queryset = Movie.objects.prefetch_related("genres", "languages", "cast", "directors").all()
    serializer_class = MovieDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "id"



class MovieFacetsView(APIView):
    """GET /api/movies/facets/ — every genre/language currently in use, for filter chips."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        genres = Genre.objects.filter(movies__isnull=False).distinct().order_by("name")
        languages = Language.objects.filter(movies__isnull=False).distinct().order_by("name")
        return Response(
            {
                "genres": GenreSerializer(genres, many=True).data,
                "languages": LanguageSerializer(languages, many=True).data,
            }
        )


class MovieSuggestView(APIView):
    """
    GET /api/movies/suggest/?q=aven — instant search suggestions.
    Returns a short, fast list mixing movie-title and cast/director-name matches,
    each tagged so the frontend can render "Avengers: Reset (Movie)" vs
    "J. Carter (Actor)" differently.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if len(query) < 2:
            return Response({"results": []})

        movie_matches = list(
            Movie.objects.filter(title__icontains=query)
            .order_by("-average_rating")[:6]
        )
        people_matches = list(
            Person.objects.filter(name__icontains=query).distinct()[:4]
        )

        results = [
            {"type": "movie", "id": str(m.id), "label": m.title, "slug": m.slug, "poster_url": m.poster_url}
            for m in movie_matches
        ] + [
            {
                "type": "person",
                "id": str(p.id),
                "label": p.name,
                "role": p.role,
                # jump into a title search for that person rather than a dead-end page
                "slug": None,
            }
            for p in people_matches
        ]
        return Response({"results": results[:10]})


class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        return Review.objects.filter(movie_id=self.kwargs["movie_id"], is_approved=True)

    def perform_create(self, serializer):
        review = serializer.save(user=self.request.user, movie_id=self.kwargs["movie_id"])
        # Keep denormalized average_rating/review_count in sync transactionally.
        movie = review.movie
        agg = Review.objects.filter(movie=movie, is_approved=True).aggregate(
            avg=dj_models.Avg("rating"), count=dj_models.Count("id")
        )
        Movie.objects.filter(pk=movie.pk).update(
            average_rating=round(agg["avg"] or 0, 1), review_count=agg["count"]
        )


class WatchlistListView(generics.ListAPIView):
    """GET /api/movies/watchlist/ — the logged-in user's saved movies, newest first."""

    serializer_class = WatchlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (
            Watchlist.objects.filter(user=self.request.user)
            .select_related("movie")
            .prefetch_related("movie__genres", "movie__languages")
            .order_by("-added_at")
        )


class WatchlistToggleView(APIView):
    """
    POST /api/movies/watchlist/toggle/ {"movie_id": "<uuid>"}
    Adds the movie if it isn't saved yet, removes it if it is.
    Returns {"watching": true/false} so the frontend can flip a single button's
    state without needing a separate GET.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        movie_id = request.data.get("movie_id")
        movie = get_object_or_404(Movie, pk=movie_id)
        existing = Watchlist.objects.filter(user=request.user, movie=movie).first()
        if existing:
            existing.delete()
            return Response({"watching": False})
        Watchlist.objects.create(user=request.user, movie=movie)
        return Response({"watching": True})
