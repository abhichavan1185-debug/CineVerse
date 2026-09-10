from django.urls import path

from . import views

urlpatterns = [
    path("", views.FoodItemListView.as_view()),
]
