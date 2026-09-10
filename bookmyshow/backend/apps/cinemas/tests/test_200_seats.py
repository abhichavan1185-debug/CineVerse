from django.test import TestCase
from apps.cinemas.models import Cinema, City, District, Screen, Seat
from apps.cinemas.services import generate_exact_200_seats_for_screen


class Exact200SeatsValidationTestCase(TestCase):
    def setUp(self):
        district = District.objects.create(name="Pune")
        self.city = City.objects.create(name="Pune", district=district, is_popular=True)
        self.cinema = Cinema.objects.create(name="CineVerse Phoenix Pune", city=self.city, address="Viman Nagar")
        self.screen = Screen.objects.create(cinema=self.cinema, name="Audi 1 - Laser")

    def test_exact_200_seats_generation(self):
        plat, gold = generate_exact_200_seats_for_screen(self.screen)

        total_seats = self.screen.seats.count()
        platinum_seats = self.screen.seats.filter(category__name="Platinum").count()
        gold_seats = self.screen.seats.filter(category__name="Gold").count()
        unique_seat_ids = self.screen.seats.values_list("id", flat=True).distinct().count()

        # Strict assert per requirement 31
        self.assertEqual(total_seats, 200)
        self.assertEqual(platinum_seats, 80)
        self.assertEqual(gold_seats, 120)
        self.assertEqual(platinum_seats + gold_seats, 200)
        self.assertEqual(unique_seat_ids, 200)

        # Verify Platinum rows are A-H
        platinum_rows = sorted(list(set(self.screen.seats.filter(category__name="Platinum").values_list("row_label", flat=True))))
        self.assertEqual(platinum_rows, ["A", "B", "C", "D", "E", "F", "G", "H"])

        # Verify Gold rows are J-U (12 rows)
        gold_rows = sorted(list(set(self.screen.seats.filter(category__name="Gold").values_list("row_label", flat=True))))
        self.assertEqual(gold_rows, ["J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U"])

        # Verify each row has exactly 10 seats (1 to 10)
        for row in platinum_rows + gold_rows:
            seats_in_row = list(self.screen.seats.filter(row_label=row).values_list("seat_number", flat=True).order_by("seat_number"))
            self.assertEqual(seats_in_row, list(range(1, 11)))
