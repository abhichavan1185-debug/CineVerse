import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiErrorMessage } from "../api/client";
import { fetchMyEventBookings } from "../api/events";
import type { Booking } from "../types";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";

const TABS = [
  { id: "upcoming", label: "Upcoming Shows", icon: "🎟️" },
  { id: "past", label: "Completed", icon: "✅" },
  { id: "cancelled", label: "Cancelled", icon: "✕" },
];

export default function MyBookings() {
  const [tab, setTab] = useState("upcoming");
  const queryClient = useQueryClient();

  const { data: bookings, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-bookings", tab],
    queryFn: async () => (await api.get<Booking[]>(`/bookings/my/?tab=${tab}`)).data,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/bookings/${id}/cancel/`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-bookings"] }),
  });

  const { data: eventBookings } = useQuery({
    queryKey: ["event-bookings"],
    queryFn: fetchMyEventBookings,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <div className="mb-6">
        <span className="text-xs font-black uppercase tracking-wider text-brand">My Account</span>
        <h1 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight mt-1">
          My Bookings & Tickets
        </h1>
        <p className="text-xs text-neutral-500 font-medium mt-0.5">
          View your confirmed cinema passes, download tickets, or manage reservations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2.5 mb-8 overflow-x-auto pb-2 scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              tab === t.id
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {isLoading && <LoadingSkeleton count={3} />}
      {isError && <ErrorState message="Couldn't load your bookings." onRetry={() => refetch()} />}
      {bookings && bookings.length === 0 && (
        <EmptyState
          title={`No ${tab} bookings found.`}
          subtitle="When you book tickets for movies, they will appear here with QR codes."
        />
      )}

      {/* Booking Cards */}
      <div className="space-y-4">
        {bookings?.map((b) => (
          <div key={b.id} className="card p-6 border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                    ID: {b.booking_ref}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    b.status === "confirmed"
                      ? b.ticket?.status === "used"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-neutral-100 text-neutral-600"
                  }`}>
                    {b.ticket?.status === "used" ? "ADMITTED (USED)" : b.status.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-lg font-black text-neutral-900 mt-1">{b.movie_title}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  📍 {b.cinema_name} • {b.screen_name}
                </p>
                <p className="text-xs font-semibold text-neutral-700 mt-1">
                  📅 {b.date} at {b.start_time?.slice(0, 5)}
                </p>

                {/* Seats */}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-neutral-500">Seats:</span>
                  {b.seats.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-neutral-900 text-white text-[11px] font-bold">
                      {s.row_label}{s.seat_number}
                    </span>
                  ))}
                  <span className="text-xs font-black text-brand ml-2">₹{b.total_amount}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col items-center sm:items-end gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                <Link
                  to={`/ticket/${b.id}`}
                  className="btn-primary h-10 px-5 text-xs font-bold w-full sm:w-auto text-center shadow-sm"
                >
                  🎟️ View E-Ticket
                </Link>

                {tab === "upcoming" && b.status === "confirmed" && (
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to cancel this booking? Your seats will be released immediately.")) {
                        cancelMutation.mutate(b.id);
                      }
                    }}
                    disabled={cancelMutation.isPending}
                    className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline px-2 py-1"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>

            {cancelMutation.isError && (
              <p className="text-xs text-red-600 mt-2 font-medium">{apiErrorMessage(cancelMutation.error)}</p>
            )}
          </div>
        ))}
      </div>

      {/* Events Section if any */}
      {eventBookings && eventBookings.length > 0 && (
        <div className="mt-12 pt-8 border-t border-neutral-200">
          <h2 className="text-sm font-black uppercase tracking-wider text-neutral-400 mb-4">
            Events & Experiences
          </h2>
          <div className="space-y-4">
            {eventBookings.map((b) => (
              <div key={b.id} className="card p-4 border-neutral-200 flex gap-4">
                <img src={b.event_poster_url} alt={b.event_title} className="w-16 h-20 object-cover rounded-xl flex-shrink-0 bg-neutral-200" />
                <div>
                  <h4 className="font-extrabold text-sm text-neutral-900">{b.event_title}</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">{b.venue}</p>
                  <p className="text-xs text-neutral-500">{b.date} at {b.start_time?.slice(0, 5)}</p>
                  <p className="text-xs font-bold text-brand mt-1">₹{b.total_amount} • {b.tier_name} ({b.quantity})</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
