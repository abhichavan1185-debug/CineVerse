import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchEventDetail, bookEventTickets, EVENT_CATEGORY_LABELS } from "../api/events";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import type { EventSchedule, TicketTier } from "../types";

export default function EventDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { me } = useAuth();

  const { data: event, isLoading, isError, refetch } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => fetchEventDetail(slug!),
  });

  const [selectedSchedule, setSelectedSchedule] = useState<EventSchedule | null>(null);
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <div className="max-w-5xl mx-auto p-6"><LoadingSkeleton count={1} /></div>;
  if (isError || !event) return <ErrorState message="Couldn't load this event." onRetry={() => refetch()} />;

  const schedule = selectedSchedule ?? event.schedules[0] ?? null;
  const tier = selectedTier ?? schedule?.tiers[0] ?? null;

  async function handleBook() {
    if (!me) {
      navigate("/login");
      return;
    }
    if (!tier) return;
    setError(null);
    setBooking(true);
    try {
      const result = await bookEventTickets(tier.id, quantity);
      navigate(`/events/confirmation/${result.id}`, { state: result });
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't complete this booking."));
    } finally {
      setBooking(false);
    }
  }

  return (
    <div>
      <div
        className="h-64 md:h-80 bg-cover bg-center relative"
        style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.7)), url(${event.banner_url || event.poster_url})` }}
      >
        <div className="max-w-5xl mx-auto h-full flex items-end gap-6 px-4 pb-6 text-white">
          <img src={event.poster_url} alt={event.title} className="w-28 md:w-40 rounded-lg shadow-lg -mb-16 md:-mb-20 border-4 border-white" />
          <div className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-200">
              {EVENT_CATEGORY_LABELS[event.category]}
            </span>
            <h1 className="text-xl md:text-3xl font-extrabold">{event.title}</h1>
            <p className="text-sm md:text-base text-white/90">
              {event.language}{event.duration_minutes ? ` · ${event.duration_minutes} mins` : ""}
            </p>
            {Number(event.average_rating) > 0 && (
              <p className="text-amber-300 font-semibold mt-1">★ {event.average_rating} ({event.review_count} reviews)</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-20 md:pt-24 pb-24">
        <p className="text-neutral-700 max-w-2xl">{event.description}</p>

        <h2 className="text-lg font-bold mt-8 mb-3">Select a date & venue</h2>
        {event.schedules.length === 0 && <EmptyState title="No upcoming shows scheduled." />}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {event.schedules.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedSchedule(s);
                setSelectedTier(null);
              }}
              disabled={s.is_cancelled}
              className={`px-4 py-2 rounded-lg border text-sm whitespace-nowrap text-left disabled:opacity-40 ${
                schedule?.id === s.id ? "bg-brand text-white border-brand" : "border-neutral-300 text-neutral-700"
              }`}
            >
              <div className="font-semibold">
                {new Date(s.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                {" · "}{s.start_time.slice(0, 5)}
              </div>
              <div className="text-[11px] opacity-80">{s.venue.name}, {s.venue.city}</div>
            </button>
          ))}
        </div>

        {schedule && (
          <>
            <h2 className="text-lg font-bold mt-6 mb-3">Choose your tickets</h2>
            <div className="space-y-2 mb-4">
              {schedule.tiers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTier(t);
                    setQuantity(1);
                  }}
                  disabled={t.available_quantity === 0}
                  className={`w-full flex items-center justify-between border rounded-xl px-4 py-3 text-left disabled:opacity-40 ${
                    tier?.id === t.id ? "border-brand ring-1 ring-brand" : "border-neutral-200"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-neutral-500">
                      {t.available_quantity > 0 ? `${t.available_quantity} left` : "Sold out"}
                    </p>
                  </div>
                  <p className="font-bold text-sm">₹{t.price}</p>
                </button>
              ))}
            </div>

            {tier && tier.available_quantity > 0 && (
              <div className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Quantity</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-full border border-neutral-300 font-bold"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(10, tier.available_quantity, q + 1))}
                      className="w-8 h-8 rounded-full border border-neutral-300 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-neutral-500">Total</p>
                  <p className="font-bold">₹{(Number(tier.price) * quantity).toFixed(2)}</p>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

            <button
              onClick={handleBook}
              disabled={!tier || tier.available_quantity === 0 || booking}
              className="btn-primary w-full mt-4 disabled:opacity-40"
            >
              {booking ? "Booking…" : me ? "Book Now" : "Sign in to book"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
