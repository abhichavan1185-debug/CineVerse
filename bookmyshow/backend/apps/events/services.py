"""
Event ticket booking.

Unlike movie seats (per-seat lock rows), event tickets are quantity-based:
a TicketTier has total_quantity/booked_quantity counters. The concurrency
guarantee is the same idea as seat-locking, just on a single row instead of
many: SELECT ... FOR UPDATE on the TicketTier row means two requests racing
for the last few tickets are serialized by the DB, and the second one sees
the true post-commit booked_quantity rather than a stale read.
"""
import random
import string
import uuid

from django.db import transaction

from .models import EventBooking, TicketTier


class TicketsUnavailableError(Exception):
    def __init__(self, available: int):
        self.available = available
        super().__init__(f"Only {available} ticket(s) left for this tier.")


def _generate_booking_code() -> str:
    return "EVT" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


@transaction.atomic
def book_tickets(tier_id: uuid.UUID, quantity: int, user) -> EventBooking:
    """
    Locks the TicketTier row, checks remaining capacity, and — only if
    enough tickets are free — atomically increments booked_quantity and
    creates the EventBooking. Raises TicketsUnavailableError otherwise,
    leaving booked_quantity untouched (no partial bookings).
    """
    tier = TicketTier.objects.select_for_update().select_related("schedule__event").get(pk=tier_id)

    if tier.available_quantity < quantity:
        raise TicketsUnavailableError(tier.available_quantity)

    tier.booked_quantity += quantity
    tier.save(update_fields=["booked_quantity"])

    booking = EventBooking.objects.create(
        id=uuid.uuid4(),
        booking_code=_generate_booking_code(),
        user=user,
        schedule=tier.schedule,
        tier=tier,
        quantity=quantity,
        total_amount=tier.price * quantity,
        status="confirmed",
    )
    return booking


@transaction.atomic
def cancel_booking(booking: EventBooking) -> EventBooking:
    """Releases the booked quantity back to the tier and marks the booking cancelled."""
    if booking.status == "cancelled":
        return booking

    tier = TicketTier.objects.select_for_update().get(pk=booking.tier_id)
    tier.booked_quantity = max(tier.booked_quantity - booking.quantity, 0)
    tier.save(update_fields=["booked_quantity"])

    booking.status = "cancelled"
    booking.save(update_fields=["status"])
    return booking
