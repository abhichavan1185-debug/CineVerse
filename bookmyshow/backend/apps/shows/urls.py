from django.urls import path

from . import views

urlpatterns = [
    path("", views.ShowListView.as_view()),
    path("<uuid:show_id>/", views.ShowDetailView.as_view()),
    path("<uuid:show_id>/seats/", views.ShowSeatMapView.as_view()),
]
