from django.urls import path

from . import views

urlpatterns = [
    path("lock-seats/", views.LockSeatsView.as_view()),
    path("release-seats/", views.ReleaseSeatsView.as_view()),
    path("checkout/", views.CheckoutView.as_view()),
    path("my/", views.MyBookingsView.as_view()),
    path("tickets/validate/", views.ValidateTicketView.as_view()),
    path("tickets/use/", views.UseTicketView.as_view()),
    path("tickets/<str:id_or_ref>/", views.TicketDetailView.as_view()),
    path("<str:id_or_ref>/", views.BookingDetailView.as_view()),
    path("<str:id_or_ref>/cancel/", views.CancelBookingView.as_view()),
    path("ticket-transfers/<uuid:ticket_id>/transfer/", views.TransferTicketView.as_view()),
    path("transfers/<int:transfer_id>/respond/", views.RespondTicketTransferView.as_view()),
]
