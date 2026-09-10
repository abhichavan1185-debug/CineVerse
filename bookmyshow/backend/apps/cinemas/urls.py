from django.urls import path

from . import views

urlpatterns = [
    path("districts/", views.DistrictListView.as_view()),
    path("cities/", views.CityListView.as_view()),
    path("<uuid:id>/", views.CinemaDetailView.as_view()),
    path("", views.CinemaListView.as_view()),
]
