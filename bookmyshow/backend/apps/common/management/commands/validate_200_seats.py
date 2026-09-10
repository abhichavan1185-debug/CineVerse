from django.core.management.base import BaseCommand
from apps.cinemas.models import Screen, Seat


class Command(BaseCommand):
    help = "Validates that all screens strictly follow the exact 200-seat specification (80 Platinum, 120 Gold)."

    def handle(self, *args, **options):
        screens = Screen.objects.all()
        if not screens.exists():
            self.stdout.write(self.style.WARNING("No screens found in database to validate."))
            return

        validated_count = 0
        for screen in screens:
            total_seats = screen.seats.count()
            platinum_seats = screen.seats.filter(category__name="Platinum").count()
            gold_seats = screen.seats.filter(category__name="Gold").count()
            unique_seat_ids = screen.seats.values_list("id", flat=True).distinct().count()

            # Critical assertions per requirement 31
            assert total_seats == 200, (
                f"FAIL on {screen}: total_seats is {total_seats}, expected 200"
            )
            assert platinum_seats == 80, (
                f"FAIL on {screen}: platinum_seats is {platinum_seats}, expected 80"
            )
            assert gold_seats == 120, (
                f"FAIL on {screen}: gold_seats is {gold_seats}, expected 120"
            )
            assert platinum_seats + gold_seats == 200, (
                f"FAIL on {screen}: sum is {platinum_seats + gold_seats}, expected 200"
            )
            assert unique_seat_ids == 200, (
                f"FAIL on {screen}: unique_seat_ids is {unique_seat_ids}, expected 200"
            )

            validated_count += 1
            self.stdout.write(
                f"[PASS] Screen '{screen.name}' at '{screen.cinema.name}': "
                f"200 seats (80 Platinum, 120 Gold, {unique_seat_ids} unique IDs)"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nSUCCESS: All {validated_count} screen(s) successfully passed critical 200-seat validation!"
            )
        )
