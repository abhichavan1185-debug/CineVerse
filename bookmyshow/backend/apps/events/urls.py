from django.urls import path

from . import views

urlpatterns = [
    path("", views.EventListView.as_view()),
    path("facets/", views.EventCategoryFacetsView.as_view()),
    path("book/", views.EventBookingCreateView.as_view()),
    path("my-bookings/", views.MyEventBookingsView.as_view()),
    path("<slug:slug>/", views.EventDetailView.as_view()),
]
