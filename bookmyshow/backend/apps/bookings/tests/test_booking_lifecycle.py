from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.bookings.models import BookingSeat
from apps.bookings.services import (
    cancel_booking, confirm_booking, create_pending_booking, lock_seats, sweep_expired_locks,
)
from apps.cinemas.models import Cinema, City, Screen, Seat, SeatCategory
from apps.movies.models import Movie
from apps.payments.models import Payment
from apps.payments.services import create_gateway_order, verify_payment
from apps.shows.models import Show, ShowSeat


User = get_user_model()


class BookingLifecycleTests(TestCase):
    """Regression tests for checkout snapshots and payment failure cleanup."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="booker", email="booker@example.com", password="test-pass-123"
        )
        city = City.objects.create(name="Mumbai")
        cinema = Cinema.objects.create(name="Aurora Test Cinema", city=city, address="Mumbai")
        screen = Screen.objects.create(cinema=cinema, name="Gold & Platinum", supported_formats=["2D"])
        gold = SeatCategory.objects.create(name="Gold")
        seats = [
            Seat.objects.create(screen=screen, category=gold, row_label="F", seat_number=number)
            for number in (1, 2)
        ]
        movie = Movie.objects.create(
            title="Checkout Test", slug="checkout-test", poster_url="https://example.test/poster.jpg",
            description="Test listing", duration_minutes=100, certificate="UA", release_date=timezone.localdate(),
        )
        self.show = Show.objects.create(
            movie=movie, screen=screen, date=timezone.localdate(), start_time="18:00", end_time="20:00",
        )
        self.show_seats = [
            ShowSeat.objects.create(show=self.show, seat=seat, price=180) for seat in seats
        ]

    def pending_booking(self, seat_indexes):
        seat_ids = [self.show_seats[index].id for index in seat_indexes]
        lock_seats(self.show.id, seat_ids, self.user)
        return create_pending_booking(self.user, self.show.id, seat_ids)

    def test_confirmation_changes_only_its_checkout_snapshot(self):
        first = self.pending_booking([0])
        second = self.pending_booking([1])

        confirm_booking(first.id)

        self.show_seats[0].refresh_from_db()
        self.show_seats[1].refresh_from_db()
        self.assertEqual(self.show_seats[0].status, "booked")
        self.assertEqual(self.show_seats[1].status, "locked")
        self.assertEqual(second.status, "pending_payment")

    def test_cancelled_seat_can_be_sold_again_with_history_retained(self):
        first = self.pending_booking([0])
        confirm_booking(first.id)
        first.refresh_from_db()
        cancel_booking(first)

        self.show_seats[0].refresh_from_db()
        self.assertEqual(self.show_seats[0].status, "available")

        second = self.pending_booking([0])
        confirm_booking(second.id)

        self.assertEqual(BookingSeat.objects.filter(show_seat=self.show_seats[0]).count(), 2)
        self.assertEqual(first.status, "cancelled")

    def test_invalid_payment_commits_failure_and_releases_the_hold(self):
        booking = self.pending_booking([0])
        payment = create_gateway_order(booking, "upi")

        with self.assertRaisesMessage(ValueError, "Payment verification failed"):
            verify_payment(payment.gateway_order_id, "pay_invalid", "not-a-valid-signature")

        booking.refresh_from_db()
        payment.refresh_from_db()
        self.show_seats[0].refresh_from_db()
        self.assertEqual(payment.status, "failed")
        self.assertEqual(booking.status, "payment_failed")
        self.assertEqual(self.show_seats[0].status, "available")

    def test_expired_checkout_is_marked_expired_and_releases_the_hold(self):
        booking = self.pending_booking([0])
        self.show_seats[0].locked_until = timezone.now() - timezone.timedelta(seconds=1)
        self.show_seats[0].save(update_fields=["locked_until"])

        self.assertEqual(sweep_expired_locks(), 1)

        booking.refresh_from_db()
        self.show_seats[0].refresh_from_db()
        self.assertEqual(booking.status, "expired")
        self.assertEqual(self.show_seats[0].status, "available")
