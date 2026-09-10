from django.urls import path
from . import views

urlpatterns = [
    path("stats/", views.AdminStatsView.as_view(), name="admin-stats"),
    path("movies/", views.AdminMovieListView.as_view(), name="admin-movies"),
    path("movies/<uuid:id>/", views.AdminMovieDetailView.as_view(), name="admin-movie-detail"),
    path("cinemas/", views.AdminCinemaListView.as_view(), name="admin-cinemas"),
    path("cinemas/<uuid:id>/", views.AdminCinemaDetailView.as_view(), name="admin-cinema-detail"),
    path("screens/", views.AdminScreenCreateView.as_view(), name="admin-screens"),
    path("shows/", views.AdminShowListView.as_view(), name="admin-shows"),
    path("shows/<uuid:id>/", views.AdminShowDetailView.as_view(), name="admin-show-detail"),
    path("bookings/", views.AdminBookingListView.as_view(), name="admin-bookings"),
    path("users/", views.AdminUserListView.as_view(), name="admin-users"),
]
