from django.urls import path

from . import views

urlpatterns = [
    path("", views.MovieListView.as_view()),
    # Static routes must come before the <slug:slug> catch-all, or DRF will
    # try to look up a movie literally titled "facets" / "suggest".
    path("facets/", views.MovieFacetsView.as_view()),
    path("suggest/", views.MovieSuggestView.as_view()),
    path("watchlist/", views.WatchlistListView.as_view()),
    path("watchlist/toggle/", views.WatchlistToggleView.as_view()),
    path("id/<uuid:id>/", views.MovieIdDetailView.as_view()),
    path("<slug:slug>/", views.MovieDetailView.as_view()),
    path("<uuid:movie_id>/reviews/", views.ReviewListCreateView.as_view()),
]
