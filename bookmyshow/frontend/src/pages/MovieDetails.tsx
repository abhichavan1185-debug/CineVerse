import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useCity } from "../hooks/useCity";
import type { Cinema, MovieDetail, ShowListItem } from "../types";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import WatchlistButton from "../components/WatchlistButton";
import ReviewsSection from "../components/ReviewsSection";

const AVAILABILITY_LABEL: Record<string, string> = {
  available: "Available",
  filling_fast: "Filling Fast",
  almost_full: "Almost Full",
  sold_out: "Sold Out",
  unavailable: "Unavailable",
};

const AVAILABILITY_COLOR: Record<string, string> = {
  available: "text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100",
  filling_fast: "text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100",
  almost_full: "text-orange-800 bg-orange-50 border-orange-300 hover:bg-orange-100",
  sold_out: "text-neutral-400 bg-neutral-100 border-neutral-200 cursor-not-allowed",
  unavailable: "text-neutral-400 bg-neutral-100 border-neutral-200 cursor-not-allowed",
};

function nextSevenDays() {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export default function MovieDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { city } = useCity();
  const dates = nextSevenDays();
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [showTrailer, setShowTrailer] = useState(false);

  const { data: movie, isLoading, isError, refetch } = useQuery({
    queryKey: ["movie", slug],
    queryFn: async () => (await api.get<MovieDetail>(`/movies/${slug}/`)).data,
  });

  const { data: cinemas } = useQuery({
    queryKey: ["cinemas", city],
    queryFn: async () => {
      const res = await api.get<Cinema[] | { results: Cinema[] }>(`/cinemas/?city=${encodeURIComponent(city)}`);
      return Array.isArray(res.data) ? res.data : res.data.results;
    },
    enabled: !!movie,
  });

  if (isLoading) return <div className="max-w-5xl mx-auto p-6"><LoadingSkeleton count={3} /></div>;
  if (isError || !movie) return <ErrorState message="Couldn't load this movie." onRetry={() => refetch()} />;

  const scrollToBooking = () => {
    document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="pb-24">
      {/* 1. Large Cinematic Backdrop Banner */}
      <div
        className="h-80 md:h-[420px] bg-cover bg-center relative"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.4) 0%, rgba(15,23,42,0.95) 100%), url(${
            movie.banner_url || movie.poster_url
          })`,
        }}
      >
        <div className="max-w-6xl mx-auto h-full flex items-end gap-6 md:gap-8 px-4 md:px-6 pb-8 text-white">
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-32 md:w-52 aspect-[2/3] object-cover rounded-2xl shadow-2xl -mb-16 md:-mb-24 border-4 border-white bg-neutral-900 flex-shrink-0 z-10"
          />

          <div className="pb-2 flex-1">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full bg-brand text-[11px] font-extrabold uppercase tracking-wider">
                {movie.status === "coming_soon" ? "Coming Soon" : "Now Showing"}
              </span>
              <span className="px-2 py-0.5 rounded bg-white/20 text-xs font-bold backdrop-blur-sm">
                {movie.certificate}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <h1 className="text-2xl md:text-5xl font-black tracking-tight">{movie.title}</h1>
              <WatchlistButton
                movieId={movie.id}
                className="text-2xl text-white hover:text-brand hover:scale-110 transition-transform"
              />
            </div>

            <p className="text-xs md:text-sm text-neutral-300 font-medium mt-2">
              {movie.languages.map((l) => l.name).join(", ")} • {movie.genres.map((g) => g.name).join(", ")} •{" "}
              {Math.floor(movie.duration_minutes / 60)}h {movie.duration_minutes % 60}m •{" "}
              {new Date(movie.release_date).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-4">
              <span className="text-amber-400 font-black text-sm flex items-center gap-1 bg-black/40 px-3 py-1 rounded-xl backdrop-blur-sm">
                ★ {movie.average_rating}
                <span className="text-white/70 font-normal text-xs">({movie.review_count} ratings)</span>
              </span>

              <button
                onClick={scrollToBooking}
                className="btn-primary h-10 px-6 text-xs font-bold shadow-glow"
              >
                🎟️ Book Tickets
              </button>

              <button
                onClick={() => setShowTrailer(true)}
                className="btn-outline h-10 px-5 text-xs font-bold bg-white/15 text-white border-white/40 hover:bg-white/30"
              >
                ▶ Watch Trailer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      {showTrailer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-3xl p-6 max-w-2xl w-full text-white border border-neutral-800 shadow-2xl relative">
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white text-xl font-bold"
            >
              ✕
            </button>
            <h3 className="font-extrabold text-lg mb-3">{movie.title} — Official Trailer</h3>
            <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${movie.trailer_url?.includes("v=") ? movie.trailer_url.split("v=")[1] : "dQw4w9WgXcQ"}?autoplay=1`}
                title="Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Content Section */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-24 md:pt-32">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Left / Center: Details, Cinemas, Showtimes (8 cols) */}
          <div className="md:col-span-8">
            <h2 className="text-lg font-black text-neutral-900 mb-2">About the Movie</h2>
            <p className="text-sm text-neutral-600 leading-relaxed max-w-3xl">{movie.description}</p>

            {/* Cast & Crew Avatars */}
            <div className="mt-8 border-t border-neutral-100 pt-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400 mb-4">
                Cast & Crew
              </h3>
              <div className="flex flex-wrap gap-4">
                {movie.directors.map((d) => (
                  <div key={d.id} className="flex items-center gap-2.5 p-2 pr-4 rounded-full bg-neutral-100/80 border border-neutral-200">
                    <span className="w-8 h-8 rounded-full bg-brand/10 text-brand font-black flex items-center justify-center text-xs">
                      🎬
                    </span>
                    <div>
                      <p className="text-xs font-bold text-neutral-900">{d.name}</p>
                      <p className="text-[10px] text-neutral-500">Director</p>
                    </div>
                  </div>
                ))}
                {movie.cast.map((c) => (
                  <div key={c.id} className="flex items-center gap-2.5 p-2 pr-4 rounded-full bg-neutral-100/80 border border-neutral-200">
                    <span className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-700 font-black flex items-center justify-center text-xs">
                      👤
                    </span>
                    <div>
                      <p className="text-xs font-bold text-neutral-900">{c.name}</p>
                      <p className="text-[10px] text-neutral-500">Actor</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BOOKING / SHOWTIMES SECTION */}
            <div id="booking-section" className="mt-12 border-t border-neutral-100 pt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-neutral-900">
                  Select Date & Cinemas in <span className="text-brand">{city}</span>
                </h2>
                <button
                  onClick={() => navigate("/location")}
                  className="text-xs font-bold text-neutral-500 hover:text-brand"
                >
                  Change City
                </button>
              </div>

              {/* Date Pills */}
              <div className="flex gap-2.5 overflow-x-auto pb-3 mb-6 scrollbar-none">
                {dates.map((d) => {
                  const dateObj = new Date(d);
                  const isSelected = d === selectedDate;
                  return (
                    <button
                      key={d}
                      onClick={() => setSelectedDate(d)}
                      className={`px-4 py-2.5 rounded-2xl border text-center transition-all flex-shrink-0 ${
                        isSelected
                          ? "bg-brand text-white border-brand shadow-glow/30"
                          : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300"
                      }`}
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-wider">
                        {dateObj.toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                      <span className="block text-base font-black">
                        {dateObj.getDate()} {dateObj.toLocaleDateString(undefined, { month: "short" })}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Cinemas and Showtimes */}
              {!cinemas && <LoadingSkeleton count={3} />}
              {cinemas && cinemas.length === 0 && (
                <EmptyState title={`No cinemas found in ${city}. Try choosing another Maharashtra city.`} />
              )}
              <div className="space-y-4">
                {cinemas?.map((cinema) => (
                  <CinemaShowRow
                    key={cinema.id}
                    cinema={cinema}
                    movieSlug={movie.slug}
                    date={selectedDate}
                    onPickShow={(showId) => navigate(`/seats/${showId}`)}
                  />
                ))}
              </div>
            </div>

            {/* User Reviews */}
            <div className="mt-14 border-t border-neutral-100 pt-8">
              <ReviewsSection movieId={movie.id} />
            </div>
          </div>

          {/* Right Column: Quick Info Sidebar (4 cols) */}
          <div className="md:col-span-4">
            <div className="card p-6 border-neutral-200 shadow-sm sticky top-24">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-4">
                Cinema Highlights
              </h3>
              <ul className="space-y-3 text-xs text-neutral-600">
                <li className="flex items-center gap-2">
                  <span className="text-brand">⚡</span> Instant digital M-ticket with QR entry
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">🛋️</span> Luxury Recliner & Dolby Atmos sound
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">🔒</span> 100% Guaranteed seat reservation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">💳</span> Secure UPI, Card, & Net Banking
                </li>
              </ul>

              <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                <p className="text-xs font-bold">Maharashtra Offer</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Use code <span className="font-mono font-black">MAHA100</span> at checkout for flat ₹100 off!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CinemaShowRow({
  cinema,
  movieSlug,
  date,
  onPickShow,
}: {
  cinema: Cinema;
  movieSlug: string;
  date: string;
  onPickShow: (id: string) => void;
}) {
  const { data: shows, isLoading } = useQuery({
    queryKey: ["shows", cinema.id, movieSlug, date],
    queryFn: async () =>
      (await api.get<{ results: ShowListItem[] }>(`/shows/?movie=${movieSlug}&cinema=${cinema.id}&date=${date}`)).data.results,
  });

  if (isLoading) return null;
  if (!shows || shows.length === 0) return null;

  return (
    <div className="card p-5 border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
        <div>
          <h3 className="font-black text-sm text-neutral-900 flex items-center gap-1.5">
            <span>🏛️</span> {cinema.name}
          </h3>
          <p className="text-[11px] text-neutral-500">{cinema.address}</p>
        </div>

        {/* Facilities tags */}
        {cinema.facilities && cinema.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 sm:mt-0">
            {cinema.facilities.slice(0, 3).map((f, i) => (
              <span key={i} className="text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Showtimes Pills */}
      <div className="flex flex-wrap gap-2.5 pt-2">
        {shows.map((s) => (
          <button
            key={s.id}
            disabled={s.availability === "sold_out"}
            onClick={() => onPickShow(s.id)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
              AVAILABILITY_COLOR[s.availability]
            }`}
          >
            <div className="text-sm font-black">{s.start_time.slice(0, 5)}</div>
            <div className="text-[10px] uppercase tracking-wide opacity-80 mt-0.5">
              {s.format} • {AVAILABILITY_LABEL[s.availability]}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
