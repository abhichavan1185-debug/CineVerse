import { useLocation, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMyEventBookings } from "../api/events";
import type { EventBookingRecord } from "../types";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ErrorState from "../components/ErrorState";

export default function EventConfirmation() {
  const { bookingId } = useParams();
  const location = useLocation();
  const passedBooking = location.state as EventBookingRecord | undefined;

  // The booking is passed via navigation state right after a successful
  // booking (no extra round-trip); refreshing the page falls back to
  // fetching it from "my bookings" since there's no single-booking endpoint.
  const { data: bookings, isLoading, isError, refetch } = useQuery({
    queryKey: ["event-bookings"],
    queryFn: fetchMyEventBookings,
    enabled: !passedBooking,
  });

  const booking = passedBooking ?? bookings?.find((b) => b.id === bookingId);

  if (!passedBooking && isLoading) return <div className="max-w-md mx-auto p-6"><LoadingSkeleton count={1} /></div>;
  if (!passedBooking && isError) return <ErrorState message="Couldn't load your booking." onRetry={() => refetch()} />;
  if (!booking) return <ErrorState message="Booking not found." />;

  return (
    <div className="max-w-md mx-auto px-4 py-10 text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h1 className="text-xl font-bold mb-1">Booking Confirmed!</h1>
      <p className="text-neutral-500 text-sm mb-6">Booking code: <span className="font-mono font-semibold">{booking.booking_code}</span></p>

      <div className="card p-4 text-left space-y-2">
        <div className="flex gap-3 items-center">
          <img src={booking.event_poster_url} alt={booking.event_title} className="w-14 h-20 object-cover rounded-lg" />
          <div>
            <p className="font-semibold">{booking.event_title}</p>
            <p className="text-xs text-neutral-500">{booking.venue}</p>
            <p className="text-xs text-neutral-500">
              {new Date(booking.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · {booking.start_time.slice(0, 5)}
            </p>
          </div>
        </div>
        <div className="border-t border-neutral-100 pt-2 flex justify-between text-sm">
          <span>{booking.tier_name} × {booking.quantity}</span>
          <span className="font-semibold">₹{booking.total_amount}</span>
        </div>
      </div>

      <Link to="/bookings" className="btn-outline mt-6 inline-block">View My Bookings</Link>
    </div>
  );
}
