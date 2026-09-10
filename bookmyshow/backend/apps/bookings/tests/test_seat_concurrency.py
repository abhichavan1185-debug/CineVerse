"""
THE most important test in this codebase (per product requirement):
two users simultaneously trying to lock/book the same seat must never
both succeed.

Uses TransactionTestCase (not TestCase) because TestCase wraps each test
in an outer atomic block and rolls it back — which would hide the very
row-locking behaviour under test. Threads each open their own DB
connection, exactly like two real concurrent HTTP requests would.
"""
import threading

from django.contrib.auth import get_user_model
from django.db import OperationalError
from django.test import TransactionTestCase
from django.utils import timezone

from apps.bookings.services import SeatUnavailableError, lock_seats
from apps.cinemas.models import Cinema, City, Screen, Seat, SeatCategory
from apps.movies.models import Movie
from apps.shows.models import Show, ShowSeat

User = get_user_model()


class SeatConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        city = City.objects.create(name="Hyderabad")
        cinema = Cinema.objects.create(name="Test PVR", city=city, address="x")
        screen = Screen.objects.create(cinema=cinema, name="Screen 1", supported_formats=["2D"])
        category = SeatCategory.objects.create(name="Regular")
        self.seat = Seat.objects.create(screen=screen, category=category, row_label="A", seat_number=1)
        movie = Movie.objects.create(
            title="Test Movie", slug="test-movie", poster_url="http://x/y.jpg",
            description="d", duration_minutes=120, certificate="UA",
            release_date=timezone.now().date(),
        )
        self.show = Show.objects.create(
            movie=movie, screen=screen, date=timezone.now().date(),
            start_time="18:00", end_time="20:00", format="2D",
        )
        self.show_seat = ShowSeat.objects.create(show=self.show, seat=self.seat, price=200)

        self.user_a = User.objects.create_user(
            username="alice", email="alice@test.com", password="pass12345"
        )
        self.user_b = User.objects.create_user(
            username="bob", email="bob@test.com", password="pass12345"
        )

    def test_only_one_user_wins_the_race_for_the_same_seat(self):
        results = {}
        barrier = threading.Barrier(2)

        def attempt(user, key):
            barrier.wait()  # maximize the chance both threads hit select_for_update together
            try:
                lock_seats(self.show.id, [self.show_seat.id], user)
                results[key] = "won"
            except (SeatUnavailableError, OperationalError):
                # SQLite serializes writers at table scope and can raise
                # "database table is locked" instead of blocking as Postgres
                # SELECT ... FOR UPDATE does.  Either way, this contender did
                # not obtain the seat; production uses Postgres row locks.
                results[key] = "lost"
            finally:
                from django.db import connection
                connection.close()  # each thread must close its own connection

        t1 = threading.Thread(target=attempt, args=(self.user_a, "a"))
        t2 = threading.Thread(target=attempt, args=(self.user_b, "b"))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        outcomes = sorted(results.values())
        self.assertEqual(outcomes, ["lost", "won"], f"Both threads must not win: {results}")

        self.show_seat.refresh_from_db()
        self.assertEqual(self.show_seat.status, "locked")
        winner = self.user_a if results["a"] == "won" else self.user_b
        self.assertEqual(self.show_seat.locked_by_id, winner.id)

    def test_second_lock_attempt_after_first_succeeds_is_rejected(self):
        lock_seats(self.show.id, [self.show_seat.id], self.user_a)
        with self.assertRaises(SeatUnavailableError):
            lock_seats(self.show.id, [self.show_seat.id], self.user_b)

    def test_expired_lock_can_be_reclaimed_by_another_user(self):
        lock_seats(self.show.id, [self.show_seat.id], self.user_a)
        # Simulate TTL expiry.
        self.show_seat.refresh_from_db()
        self.show_seat.locked_until = timezone.now() - timezone.timedelta(seconds=1)
        self.show_seat.save(update_fields=["locked_until"])

        rows = lock_seats(self.show.id, [self.show_seat.id], self.user_b)
        self.assertEqual(rows[0].locked_by_id, self.user_b.id)
