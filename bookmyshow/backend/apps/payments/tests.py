from decimal import Decimal
import uuid
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.bookings.models import Booking, BookingSeat, Ticket
from apps.cinemas.models import Cinema, City, District, Screen, Seat, SeatCategory
from apps.cinemas.services import generate_exact_200_seats_for_screen
from apps.movies.models import Movie
from apps.payments.models import Payment
from apps.payments.services import _sign
from apps.shows.models import Show, ShowSeat

User = get_user_model()


class PaymentToTicketFlowTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@cineverse.in", password="testpassword123"
        )
        self.staff_user = User.objects.create_user(
            username="staffuser", email="staff@cineverse.in", password="staffpassword123", is_staff=True
        )

        district = District.objects.create(name="Pune District", state="Maharashtra")
        city = City.objects.create(name="Pune", district=district, is_major=True)
        self.cinema = Cinema.objects.create(name="CineVerse Phoenix Pune", city=city, address="Viman Nagar, Pune")
        self.screen = Screen.objects.create(cinema=self.cinema, name="Screen 1 - Atmos")
        generate_exact_200_seats_for_screen(self.screen)

        self.movie = Movie.objects.create(
            title="Dune: Part Two",
            slug="dune-part-two",
            language="English",
            certificate="UA",
            duration_minutes=166,
            release_date=timezone.localdate(),
            status="now_showing",
        )

        self.show = Show.objects.create(
            movie=self.movie,
            screen=self.screen,
            date=timezone.localdate(),
            start_time="18:00:00",
            end_time="20:46:00",
            format="2D",
            base_price=Decimal("200.00"),
        )

        all_seats = list(self.screen.seats.all())
        show_seats = [
            ShowSeat(show=self.show, seat=st, price=Decimal("350.00") if st.category.name.lower() == "platinum" else Decimal("220.00"))
            for st in all_seats
        ]
        ShowSeat.objects.bulk_create(show_seats)

        # Lock two seats for user
        self.seats_to_book = list(ShowSeat.objects.filter(show=self.show)[:2])
        for s in self.seats_to_book:
            s.status = "locked"
            s.locked_by = self.user
            s.locked_until = timezone.now() + timezone.timedelta(minutes=5)
            s.save()

        # Create pending booking
        self.booking = Booking.objects.create(
            booking_ref="CV-2026-TEST01",
            user=self.user,
            show=self.show,
            status="pending_payment",
            seats_subtotal=Decimal("440.00"),
            total_amount=Decimal("480.00"),
        )
        for s in self.seats_to_book:
            BookingSeat.objects.create(booking=self.booking, show_seat=s, price=s.price)

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_order_and_verify_flow(self):
        # 1. Create order
        res = self.client.post("/api/payments/create-order/", {"booking_id": str(self.booking.id), "method": "upi"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("gateway_order_id", res.data)
        order_id = res.data["gateway_order_id"]

        # 2. Mock payment gateway signature
        payment_id = "pay_test12345"
        valid_signature = _sign(order_id, payment_id)

        # 3. Verify payment on server
        verify_res = self.client.post("/api/payments/verify/", {
            "gateway_order_id": order_id,
            "gateway_payment_id": payment_id,
            "gateway_signature": valid_signature,
        })
        self.assertEqual(verify_res.status_code, 200)
        self.assertTrue(verify_res.data["success"])
        self.assertEqual(verify_res.data["booking_status"], "CONFIRMED")
        self.assertEqual(verify_res.data["payment_status"], "SUCCESS")
        self.assertIn("/ticket/", verify_res.data["redirect"])

        # 4. Check DB states
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "confirmed")
        for s in self.seats_to_book:
            s.refresh_from_db()
            self.assertEqual(s.status, "booked")

        # Ticket must exist
        self.assertTrue(hasattr(self.booking, "ticket"))
        ticket = self.booking.ticket
        self.assertEqual(ticket.status, "valid")

        # 5. Turnstile validation by staff
        staff_client = APIClient()
        staff_client.force_authenticate(user=self.staff_user)

        qr_data = f"CINEVERSE:TICKET:{self.booking.booking_ref}:{ticket.qr_token}"
        val_res = staff_client.post("/api/tickets/validate/", {"qr_data": qr_data})
        self.assertEqual(val_res.status_code, 200)
        self.assertTrue(val_res.data["valid"])
        self.assertEqual(val_res.data["code"], "VALID")
        self.assertEqual(val_res.data["booking_ref"], self.booking.booking_ref)

        # 6. Customer admitted (use ticket)
        use_res = staff_client.post("/api/tickets/use/", {"qr_data": qr_data})
        self.assertEqual(use_res.status_code, 200)
        self.assertTrue(use_res.data["success"])
        self.assertEqual(use_res.data["ticket_status"], "USED")

        # 7. Second attempt to use must fail
        reuse_res = staff_client.post("/api/tickets/use/", {"qr_data": qr_data})
        self.assertEqual(reuse_res.status_code, 400)
        self.assertFalse(reuse_res.data.get("success", False))

        # 8. Second attempt to validate shows already used
        val_reuse = staff_client.post("/api/tickets/validate/", {"qr_data": qr_data})
        self.assertEqual(val_reuse.status_code, 400)
        self.assertEqual(val_reuse.data["code"], "ALREADY_USED")

    def test_invalid_signature_fails_payment(self):
        res = self.client.post("/api/payments/create-order/", {"booking_id": str(self.booking.id), "method": "card"})
        order_id = res.data["gateway_order_id"]

        # Send invalid signature
        verify_res = self.client.post("/api/payments/verify/", {
            "gateway_order_id": order_id,
            "gateway_payment_id": "pay_fake123",
            "gateway_signature": "invalid-signature-hash",
        })
        self.assertEqual(verify_res.status_code, 400)

        # Booking must NOT be confirmed
        self.booking.refresh_from_db()
        self.assertNotEqual(self.booking.status, "confirmed")
        self.assertEqual(self.booking.status, "payment_failed")

        # Seats must NOT be booked (released)
        for s in self.seats_to_book:
            s.refresh_from_db()
            self.assertEqual(s.status, "available")
