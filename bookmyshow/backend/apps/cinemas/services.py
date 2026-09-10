from typing import Tuple
from django.db.models import ProtectedError
from apps.cinemas.models import Screen, Seat, SeatCategory

PLATINUM_ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"]  # 8 rows x 10 = 80 seats
GOLD_ROWS = ["J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U"]  # 12 rows x 10 = 120 seats
TOTAL_REQUIRED_SEATS = 200
PLATINUM_COUNT = 80
GOLD_COUNT = 120

VALID_PLATINUM_PAIRS = {(r, n) for r in PLATINUM_ROWS for n in range(1, 11)}
VALID_GOLD_PAIRS = {(r, n) for r in GOLD_ROWS for n in range(1, 11)}
VALID_ALL_PAIRS = VALID_PLATINUM_PAIRS | VALID_GOLD_PAIRS


def generate_exact_200_seats_for_screen(screen: Screen) -> Tuple[int, int]:
    """
    Ensures the screen has EXACTLY 200 seats according to the platform specification:
    - 80 Platinum seats: Rows A-H, seats 1-10
    - 120 Gold seats: Rows J-U, seats 1-10
    - Aisle at seats 1 and 6
    - Total: 200 unique seats.

    Returns:
        tuple (platinum_count, gold_count)
    """
    platinum_cat, _ = SeatCategory.objects.get_or_create(name="Platinum", defaults={"display_order": 0})
    gold_cat, _ = SeatCategory.objects.get_or_create(name="Gold", defaults={"display_order": 1})

    # 1. Delete any out-of-spec seats that aren't part of standard 200 layout if unreferenced
    current_seats = list(screen.seats.all())
    for s in current_seats:
        pair = (s.row_label, s.seat_number)
        if pair not in VALID_ALL_PAIRS:
            try:
                s.delete()
            except ProtectedError:
                # If protected by an old test booking, ignore deletion
                pass

    # 2. Update category & aisle on valid existing seats
    for s in screen.seats.all():
        pair = (s.row_label, s.seat_number)
        expected_cat = platinum_cat if pair in VALID_PLATINUM_PAIRS else gold_cat
        expected_aisle = s.seat_number in (1, 6)
        updates = []
        if s.category_id != expected_cat.id:
            s.category = expected_cat
            updates.append("category")
        if s.is_aisle_start != expected_aisle:
            s.is_aisle_start = expected_aisle
            updates.append("is_aisle_start")
        if updates:
            s.save(update_fields=updates)

    # 3. Create missing seats in Platinum (A-H, 1-10) and Gold (J-U, 1-10)
    existing_pairs = set(screen.seats.values_list("row_label", "seat_number"))
    seats_to_create = []

    for row, num in VALID_PLATINUM_PAIRS:
        if (row, num) not in existing_pairs:
            seats_to_create.append(
                Seat(
                    screen=screen,
                    row_label=row,
                    seat_number=num,
                    category=platinum_cat,
                    is_aisle_start=(num in (1, 6)),
                )
            )

    for row, num in VALID_GOLD_PAIRS:
        if (row, num) not in existing_pairs:
            seats_to_create.append(
                Seat(
                    screen=screen,
                    row_label=row,
                    seat_number=num,
                    category=gold_cat,
                    is_aisle_start=(num in (1, 6)),
                )
            )

    if seats_to_create:
        Seat.objects.bulk_create(seats_to_create)

    # 4. Critical validations per requirement 31
    total = screen.seats.count()
    platinum = screen.seats.filter(category__name="Platinum").count()
    gold = screen.seats.filter(category__name="Gold").count()
    unique_ids = screen.seats.values_list("id", flat=True).distinct().count()

    assert total == TOTAL_REQUIRED_SEATS, f"Screen {screen} total seats is {total}, expected 200"
    assert platinum == PLATINUM_COUNT, f"Screen {screen} platinum seats is {platinum}, expected 80"
    assert gold == GOLD_COUNT, f"Screen {screen} gold seats is {gold}, expected 120"
    assert platinum + gold == TOTAL_REQUIRED_SEATS, f"Sum mismatch {platinum} + {gold} != 200"
    assert unique_ids == TOTAL_REQUIRED_SEATS, f"Unique seat IDs {unique_ids} != 200"

    return platinum, gold
