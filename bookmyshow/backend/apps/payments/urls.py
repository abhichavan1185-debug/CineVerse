from django.urls import path

from . import views

urlpatterns = [
    path("initiate/", views.InitiatePaymentView.as_view()),
    path("create-order/", views.InitiatePaymentView.as_view()),
    path("mock-checkout/", views.MockCheckoutView.as_view()),
    path("verify/", views.VerifyPaymentView.as_view()),
    path("refunds/my/", views.MyRefundsView.as_view()),
]
