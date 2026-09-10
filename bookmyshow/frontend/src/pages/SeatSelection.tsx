import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, apiErrorMessage } from "../api/client";
import type { ShowSeat } from "../types";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ErrorState from "../components/ErrorState";

const LOCK_TTL_SECONDS = 300; // 5 minutes hold

function formatMMSS(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function SeatSelection() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number[]>([]);
  const [lockError, setLockError] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lockedRef = useRef(false);

  const { data: show } = useQuery({
    queryKey: ["show", showId],
    queryFn: async () => (await api.get(`/shows/${showId}/`)).data,
  });

  const {
    data: seats,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["show-seats", showId],
    queryFn: async () => {
      const response = await api.get<{ results: ShowSeat[] }>(`/shows/${showId}/seats/`);
      return response.data.results;
    },
    refetchInterval: lockedRef.current ? false : 8000,
  });

  // Hold countdown
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      setLockError("Your 5-minute seat hold expired. Please select your seats again.");
      lockedRef.current = false;
      setSelected([]);
      refetch();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // Group seats into Platinum (Rows A-H) and Gold (Rows J-U)
  const { platinumRows, goldRows } = useMemo(() => {
    const pMap = new Map<string, ShowSeat[]>();
    const gMap = new Map<string, ShowSeat[]>();

    (seats ?? []).forEach((s) => {
      const isPlatinum = s.category.toLowerCase() === "platinum" || ["A","B","C","D","E","F","G","H"].includes(s.row_label);
      const targetMap = isPlatinum ? pMap : gMap;
      if (!targetMap.has(s.row_label)) targetMap.set(s.row_label, []);
      targetMap.get(s.row_label)!.push(s);
    });

    const sortFn = ([a]: [string, any], [b]: [string, any]) => a.localeCompare(b);
    return {
      platinumRows: Array.from(pMap.entries()).sort(sortFn),
      goldRows: Array.from(gMap.entries()).sort(sortFn),
    };
  }, [seats]);

  const selectedSeats = (seats ?? []).filter((s) => selected.includes(s.id));
  const total = selectedSeats.reduce((sum, s) => sum + parseFloat(s.price), 0);

  const platinumPrice = (seats ?? []).find((s) => s.category.toLowerCase() === "platinum")?.price || "350";
  const goldPrice = (seats ?? []).find((s) => s.category.toLowerCase() === "gold")?.price || "220";

  const toggleSeat = (seat: ShowSeat) => {
    if (seat.effective_status !== "available") return;
    setLockError(null);
    setSelected((prev) =>
      prev.includes(seat.id)
        ? prev.filter((id) => id !== seat.id)
        : prev.length >= 10
        ? prev
        : [...prev, seat.id]
    );
  };

  const proceed = async () => {
    if (selected.length === 0) return;
    setLocking(true);
    setLockError(null);
    try {
      await api.post("/bookings/lock-seats/", { show_id: showId, show_seat_ids: selected });
      lockedRef.current = true;
      setSecondsLeft(LOCK_TTL_SECONDS);
      navigate(`/checkout/${showId}`, { state: { showSeatIds: selected } });
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setLockError("Conflict: One or more selected seats were just reserved by another user. Please pick different seats.");
        setSelected([]);
        refetch();
      } else {
        setLockError(apiErrorMessage(err));
      }
    } finally {
      setLocking(false);
    }
  };

  if (isLoading) return <div className="max-w-4xl mx-auto p-6"><LoadingSkeleton count={3} /></div>;
  if (isError || !seats) return <ErrorState message="Couldn't load the seat map." onRetry={() => refetch()} />;

  const totalSeatsCount = seats.length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-44">
      {/* Show header banner */}
      {show && (
        <div className="mb-6 p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider">
                {show.format || "2D"}
              </span>
              <h1 className="text-xl font-black text-neutral-900">{show.movie_title}</h1>
            </div>
            <p className="text-xs text-neutral-500 font-medium mt-1">
              📍 {show.cinema_name} • {show.screen_name} • {show.date} at {show.start_time?.slice(0, 5)}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 border border-violet-200">
              Platinum: ₹{platinumPrice}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
              Gold: ₹{goldPrice}
            </span>
          </div>
        </div>
      )}

      {/* Countdown notice */}
      {secondsLeft !== null && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-bold flex items-center justify-between animate-pulse">
          <span>⏱️ Seats temporarily locked for your order</span>
          <span className="text-sm font-black">{formatMMSS(secondsLeft)}</span>
        </div>
      )}

      {lockError && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          ⚠️ {lockError}
        </div>
      )}

      {/* Visual Cinema Screen */}
      <div className="my-8 text-center">
        <div className="max-w-2xl mx-auto cinema-screen-glow mb-2" />
        <div className="max-w-md mx-auto py-1 px-4 rounded-lg bg-neutral-900 text-white font-extrabold text-xs tracking-widest shadow-md">
          CINEMA SCREEN — ALL EYES THIS WAY
        </div>
        <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wider font-semibold">
          Screen Layout: Exactly {totalSeatsCount} Seats (80 Platinum + 120 Gold)
        </p>
      </div>

      {/* Seat Map Horizontal Scroll Container */}
      <div className="overflow-x-auto pb-6 border border-neutral-100 rounded-3xl bg-white p-6 shadow-sm">
        <div className="min-w-[620px] mx-auto flex flex-col items-center">
          {/* SECTION 1: PLATINUM (Rows A-H, 80 seats) */}
          <div className="w-full mb-8">
            <div className="flex items-center justify-between border-b border-violet-100 pb-2 mb-4">
              <span className="text-xs font-black uppercase tracking-wider text-violet-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-600" />
                PLATINUM SECTION (80 SEATS) — ₹{platinumPrice}
              </span>
              <span className="text-[11px] font-semibold text-neutral-400">Rows A to H</span>
            </div>

            <div className="space-y-2">
              {platinumRows.map(([row, rowSeats]) => (
                <div key={row} className="flex items-center gap-2 justify-center">
                  <span className="w-6 text-xs font-bold text-neutral-400 text-right">{row}</span>
                  <div className="flex items-center gap-1.5">
                    {rowSeats.map((seat) => {
                      const isSelected = selected.includes(seat.id);
                      const isBooked = seat.effective_status === "booked";
                      const isLocked = seat.effective_status === "locked";

                      return (
                        <button
                          key={seat.id}
                          disabled={isBooked || isLocked}
                          title={`${row}${seat.seat_number} · Platinum · ₹${seat.price}`}
                          onClick={() => toggleSeat(seat)}
                          className={`w-7 h-7 md:w-8 md:h-8 rounded-lg text-[10px] font-bold flex items-center justify-center border transition-all duration-150
                            ${seat.seat_number === 6 ? "ml-6" : ""}
                            ${
                              isSelected
                                ? "bg-brand border-brand text-white shadow-glow scale-110 z-10"
                                : isBooked || isLocked
                                ? "bg-neutral-200 border-neutral-300 text-neutral-400 cursor-not-allowed"
                                : "bg-violet-50/80 hover:bg-violet-100 border-violet-300 text-violet-900 hover:scale-105"
                            }
                          `}
                        >
                          {seat.seat_number}
                        </button>
                      );
                    })}
                  </div>
                  <span className="w-6 text-xs font-bold text-neutral-400 text-left">{row}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: GOLD (Rows J-U, 120 seats) */}
          <div className="w-full">
            <div className="flex items-center justify-between border-b border-amber-100 pb-2 mb-4">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                GOLD SECTION (120 SEATS) — ₹{goldPrice}
              </span>
              <span className="text-[11px] font-semibold text-neutral-400">Rows J to U</span>
            </div>

            <div className="space-y-2">
              {goldRows.map(([row, rowSeats]) => (
                <div key={row} className="flex items-center gap-2 justify-center">
                  <span className="w-6 text-xs font-bold text-neutral-400 text-right">{row}</span>
                  <div className="flex items-center gap-1.5">
                    {rowSeats.map((seat) => {
                      const isSelected = selected.includes(seat.id);
                      const isBooked = seat.effective_status === "booked";
                      const isLocked = seat.effective_status === "locked";

                      return (
                        <button
                          key={seat.id}
                          disabled={isBooked || isLocked}
                          title={`${row}${seat.seat_number} · Gold · ₹${seat.price}`}
                          onClick={() => toggleSeat(seat)}
                          className={`w-7 h-7 md:w-8 md:h-8 rounded-lg text-[10px] font-bold flex items-center justify-center border transition-all duration-150
                            ${seat.seat_number === 6 ? "ml-6" : ""}
                            ${
                              isSelected
                                ? "bg-brand border-brand text-white shadow-glow scale-110 z-10"
                                : isBooked || isLocked
                                ? "bg-neutral-200 border-neutral-300 text-neutral-400 cursor-not-allowed"
                                : "bg-amber-50/70 hover:bg-amber-100 border-amber-300 text-amber-900 hover:scale-105"
                            }
                          `}
                        >
                          {seat.seat_number}
                        </button>
                      );
                    })}
                  </div>
                  <span className="w-6 text-xs font-bold text-neutral-400 text-left">{row}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Seat Status Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 pt-4 border-t border-neutral-100 text-xs font-semibold text-neutral-600">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-white border-2 border-emerald-500" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-brand text-white flex items-center justify-center text-[10px]">✓</span>
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-neutral-300 border border-neutral-400" />
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-violet-100 border border-violet-400" />
              <span>Platinum</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-amber-100 border border-amber-400" />
              <span>Gold</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Summary Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-2xl p-4 z-40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left w-full sm:w-auto">
            {selectedSeats.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-neutral-500">Seats:</span>
                {selectedSeats.map((s) => (
                  <span
                    key={s.id}
                    className="px-2 py-0.5 rounded-md bg-neutral-900 text-white text-xs font-black shadow-sm"
                  >
                    {s.row_label}{s.seat_number}
                  </span>
                ))}
                <span className="text-sm font-black text-brand ml-2">₹{total.toFixed(2)}</span>
              </div>
            ) : (
              <p className="text-xs font-bold text-neutral-400">
                Please select your seats above (max 10)
              </p>
            )}
            <p className="text-[11px] text-neutral-400">Excludes taxes and convenience fee</p>
          </div>

          <button
            onClick={proceed}
            disabled={selected.length === 0 || locking}
            className="btn-primary w-full sm:w-auto h-12 px-8 text-sm font-bold shadow-glow"
          >
            {locking ? "Reserving seats..." : `Book ${selected.length} Ticket${selected.length === 1 ? "" : "s"} ›`}
          </button>
        </div>
      </div>
    </div>
  );
}
