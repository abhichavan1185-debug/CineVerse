import uuid
from django.db import models
from django.http import Http404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.shows.models import ShowSeat

from . import services
from .models import Booking, Ticket, TicketTransfer
from .serializers import (
    BookingSerializer, CheckoutSerializer, LockSeatsSerializer,
    TicketSerializer, TicketTransferSerializer,
)


class LockSeatsView(APIView):
    """
    POST /api/bookings/lock-seats/
    Holds the requested seats for this user for SEAT_LOCK_TTL_SECONDS.
    All-or-nothing across the batch; returns 409 if any seat lost the race.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = LockSeatsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            rows = services.lock_seats(
                serializer.validated_data["show_id"],
                serializer.validated_data["show_seat_ids"],
                request.user,
            )
        except services.SeatUnavailableError as exc:
            return Response(
                {"error": "One or more selected seats are no longer available.",
                 "unavailable_seat_ids": exc.unavailable_seat_ids},
                status=status.HTTP_409_CONFLICT,
            )
        return Response({
            "locked_seat_ids": [r.id for r in rows],
            "locked_until": (timezone.now() + timezone.timedelta(
                seconds=services._lock_ttl())).isoformat(),
        })


class ReleaseSeatsView(APIView):
    """POST /api/bookings/release-seats/ {"show_seat_ids": [...]} — e.g. user navigates away."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ids = request.data.get("show_seat_ids", [])
        released = services.release_seats(ids, user=request.user)
        return Response({"released": released})


class CheckoutView(APIView):
    """
    POST /api/bookings/checkout/
    Creates a pending_payment Booking with a server-computed total from
    currently-locked seats + food + coupon. Returns the order summary;
    the frontend must display exactly this, never its own arithmetic.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            booking = services.create_pending_booking(
                user=request.user,
                show_id=data["show_id"],
                show_seat_ids=data["show_seat_ids"],
                food_items=data.get("food_items", []),
                coupon_code=data.get("coupon_code") or None,
            )
        except services.SeatUnavailableError as exc:
            return Response(
                {"error": "Your seat hold expired. Please reselect your seats.",
                 "unavailable_seat_ids": exc.unavailable_seat_ids},
                status=status.HTTP_409_CONFLICT,
            )
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)


class MyBookingsView(generics.ListAPIView):
    """GET /api/bookings/my/?tab=upcoming|past|cancelled"""

    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # a plain array — the frontend renders this without page controls

    def get_queryset(self):
        qs = Booking.objects.filter(user=self.request.user).select_related(
            "show", "show__movie", "show__screen", "show__screen__cinema"
        ).prefetch_related("booking_seats", "food_items", "ticket")
        tab = self.request.query_params.get("tab", "upcoming")
        now = timezone.now().date()
        if tab == "upcoming":
            qs = qs.filter(status="confirmed", show__date__gte=now)
        elif tab == "past":
            qs = qs.filter(status="confirmed", show__date__lt=now)
        elif tab == "cancelled":
            qs = qs.filter(status="cancelled")
        return qs.order_by("-created_at")


class BookingDetailView(generics.RetrieveAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        lookup = self.kwargs.get("id_or_ref") or self.kwargs.get("id")
        user = self.request.user
        qs = Booking.objects.select_related(
            "show", "show__movie", "show__screen", "show__screen__cinema", "show__screen__cinema__city"
        ).prefetch_related("booking_seats", "food_items", "ticket")

        if not user.is_staff:
            qs = qs.filter(user=user)

        booking = None
        try:
            val = uuid.UUID(str(lookup))
            booking = qs.filter(id=val).first()
        except (ValueError, AttributeError):
            pass
        if not booking:
            booking = qs.filter(booking_ref__iexact=str(lookup)).first()
        if not booking:
            raise Http404("Booking not found.")
        return booking


class CancelBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id_or_ref):
        # Look up booking by UUID or booking_ref
        qs = Booking.objects.select_related("show").filter(user=request.user)
        booking = None
        try:
            val = uuid.UUID(str(id_or_ref))
            booking = qs.filter(id=val).first()
        except (ValueError, AttributeError):
            pass
        if not booking:
            booking = qs.filter(booking_ref__iexact=str(id_or_ref)).first()
        if not booking:
            return Response({"error": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            booking, refund_amount = services.cancel_booking(booking)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=400)
        # Refund object created by payments app; imported lazily to avoid app-loading cycles.
        from apps.payments.services import initiate_refund
        initiate_refund(booking, refund_amount)
        return Response({"status": booking.status, "refund_amount": str(refund_amount)})


class TransferTicketView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, ticket_id):
        ticket = Ticket.objects.select_related("booking").get(pk=ticket_id, booking__user=request.user)
        if ticket.status != "valid":
            return Response({"error": f"Ticket cannot be transferred (status: {ticket.status})."}, status=400)
        serializer = TicketTransferSerializer(data={**request.data, "ticket": ticket.id})
        serializer.is_valid(raise_exception=True)
        transfer = serializer.save(from_user=request.user)
        return Response(TicketTransferSerializer(transfer).data, status=201)


class RespondTicketTransferView(APIView):
    """Recipient accepts/rejects — POST /api/bookings/transfers/<id>/respond/ {"accept": true}"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, transfer_id):
        transfer = TicketTransfer.objects.select_related("ticket__booking").get(
            pk=transfer_id, to_email__iexact=request.user.email, status="pending"
        )
        accept = bool(request.data.get("accept"))
        transfer.status = "accepted" if accept else "rejected"
        transfer.resolved_at = timezone.now()
        transfer.save(update_fields=["status", "resolved_at"])
        if accept:
            booking = transfer.ticket.booking
            booking.user = request.user
            booking.save(update_fields=["user"])
            transfer.ticket.status = "transferred"
            transfer.ticket.save(update_fields=["status"])
        return Response({"status": transfer.status})


class TicketDetailView(APIView):
    """GET /api/tickets/<id_or_ref>/ — retrieve ticket and booking by UUID, booking_ref, or qr_token."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id_or_ref):
        user = request.user
        ticket = None
        # Try UUID as ticket id or qr_token
        try:
            val = uuid.UUID(str(id_or_ref))
            ticket = Ticket.objects.select_related("booking").filter(models.Q(id=val) | models.Q(qr_token=val)).first()
        except (ValueError, AttributeError):
            pass

        if not ticket:
            # Try booking UUID or booking_ref
            try:
                b_val = uuid.UUID(str(id_or_ref))
                ticket = Ticket.objects.select_related("booking").filter(booking__id=b_val).first()
            except (ValueError, AttributeError):
                ticket = Ticket.objects.select_related("booking").filter(booking__booking_ref__iexact=str(id_or_ref)).first()

        if not ticket:
            return Response({"error": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)

        if not user.is_staff and ticket.booking.user_id != user.id:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        return Response({
            "ticket": TicketSerializer(ticket).data,
            "booking": BookingSerializer(ticket.booking).data,
        })


class ValidateTicketView(APIView):
    """
    POST /api/tickets/validate/
    Payload: {"qr_data": "...", "qr_token": "...", "booking_ref": "..."}
    Staff/Cinema entry point: Verifies if a ticket is legitimate, valid, already used, or cancelled.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        qr_data = request.data.get("qr_data", "").strip()
        qr_token_str = request.data.get("qr_token", "").strip()
        booking_ref = request.data.get("booking_ref", "").strip()

        # Extract token from CINEVERSE:TICKET:<booking_ref>:<qr_token>
        if qr_data.startswith("CINEVERSE:TICKET:"):
            parts = qr_data.split(":")
            if len(parts) >= 4:
                booking_ref = parts[2]
                qr_token_str = parts[3]

        ticket = None
        if qr_token_str:
            try:
                token_val = uuid.UUID(qr_token_str)
                ticket = Ticket.objects.select_related(
                    "booking", "booking__user", "booking__show", "booking__show__movie",
                    "booking__show__screen", "booking__show__screen__cinema"
                ).filter(qr_token=token_val).first()
            except (ValueError, AttributeError):
                pass

        if not ticket and booking_ref:
            ticket = Ticket.objects.select_related(
                "booking", "booking__user", "booking__show", "booking__show__movie",
                "booking__show__screen", "booking__show__screen__cinema"
            ).filter(booking__booking_ref__iexact=booking_ref).first()

        if not ticket:
            return Response({
                "valid": False,
                "code": "INVALID_TICKET",
                "message": "❌ INVALID TICKET: No matching CineVerse pass found.",
            }, status=status.HTTP_404_NOT_FOUND)

        booking = ticket.booking

        # 1. Check booking status
        if booking.status != "confirmed":
            return Response({
                "valid": False,
                "code": "BOOKING_NOT_CONFIRMED",
                "message": f"❌ INVALID TICKET: Booking status is {booking.status.upper()}.",
                "booking_ref": booking.booking_ref,
            }, status=status.HTTP_400_BAD_REQUEST)

        # 2. Check ticket status
        if ticket.status == "used":
            return Response({
                "valid": False,
                "code": "ALREADY_USED",
                "message": "⚠️ TICKET ALREADY USED: This pass was already scanned for entry.",
                "booking_ref": booking.booking_ref,
                "ticket_id": str(ticket.id),
                "issued_at": ticket.issued_at,
            }, status=status.HTTP_400_BAD_REQUEST)

        if ticket.status == "cancelled":
            return Response({
                "valid": False,
                "code": "CANCELLED",
                "message": "❌ TICKET CANCELLED: This ticket was refunded or cancelled.",
                "booking_ref": booking.booking_ref,
            }, status=status.HTTP_400_BAD_REQUEST)

        # Valid ticket!
        return Response({
            "valid": True,
            "code": "VALID",
            "message": "✅ TICKET VALID: Welcome to CineVerse!",
            "booking_ref": booking.booking_ref,
            "ticket_id": str(ticket.id),
            "qr_token": str(ticket.qr_token),
            "movie_title": booking.show.movie.title,
            "cinema_name": booking.show.screen.cinema.name,
            "screen_name": booking.show.screen.name,
            "date": str(booking.show.date),
            "start_time": str(booking.show.start_time),
            "seats_count": booking.booking_seats.count(),
            "seats": [f"{s.show_seat.seat.row_label}{s.show_seat.seat.seat_number} ({s.show_seat.seat.category.name})" for s in booking.booking_seats.all()],
            "customer_name": booking.user.username,
            "total_amount": str(booking.total_amount),
        })


class UseTicketView(APIView):
    """
    POST /api/tickets/use/
    Marks a valid ticket as USED (customer admitted at turnstile).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        qr_data = request.data.get("qr_data", "").strip()
        ticket_id = request.data.get("ticket_id", "").strip()
        booking_ref = request.data.get("booking_ref", "").strip()

        if qr_data.startswith("CINEVERSE:TICKET:"):
            parts = qr_data.split(":")
            if len(parts) >= 4:
                booking_ref = parts[2]
                ticket_id = parts[3]

        ticket = None
        if ticket_id:
            try:
                t_val = uuid.UUID(ticket_id)
                ticket = Ticket.objects.select_for_update().filter(models.Q(id=t_val) | models.Q(qr_token=t_val)).first()
            except (ValueError, AttributeError):
                pass

        if not ticket and booking_ref:
            ticket = Ticket.objects.select_for_update().filter(booking__booking_ref__iexact=booking_ref).first()

        if not ticket:
            return Response({"error": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)

        if ticket.status == "used":
            return Response({
                "success": False,
                "error": "⚠️ TICKET ALREADY USED: This ticket has already been used.",
                "ticket_status": "USED",
            }, status=status.HTTP_400_BAD_REQUEST)

        if ticket.status != "valid":
            return Response({
                "success": False,
                "error": f"Cannot admit ticket in status {ticket.status}.",
                "ticket_status": ticket.status,
            }, status=status.HTTP_400_BAD_REQUEST)

        ticket.status = "used"
        ticket.save(update_fields=["status"])
        return Response({
            "success": True,
            "message": "✅ Admission granted: Ticket marked as USED.",
            "ticket_status": "USED",
            "booking_ref": ticket.booking.booking_ref,
        })
