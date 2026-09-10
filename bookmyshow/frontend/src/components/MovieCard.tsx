import { Link, useNavigate } from "react-router-dom";
import type { MovieListItem } from "../types";
import { formatVoteCount } from "../api/movies";
import { useAuth } from "../hooks/useAuth";
import WatchlistButton from "./WatchlistButton";

export default function MovieCard({
  movie,
  className = "",
}: {
  movie: MovieListItem;
  className?: string;
}) {
  const { me } = useAuth();
  const navigate = useNavigate();

  const isComingSoon = movie.status === "coming_soon";

  return (
    <div
      className={`group relative flex flex-col rounded-2xl bg-white border border-neutral-100/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden ${className}`}
    >
      <Link to={`/movies/${movie.slug}`} className="block relative aspect-[2/3] overflow-hidden bg-neutral-900">
        <img
          src={movie.poster_url}
          alt={movie.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Gradient shadow on image bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent opacity-80" />

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
          {isComingSoon ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900/85 backdrop-blur-md text-gold border border-gold/40">
              Coming Soon
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand/90 backdrop-blur-md text-white shadow-sm">
              Now Showing
            </span>
          )}

          {me && (
            <div className="pointer-events-auto">
              <WatchlistButton
                movieId={movie.id}
                className="w-7 h-7 rounded-full bg-black/60 hover:bg-brand text-white flex items-center justify-center text-xs backdrop-blur-sm transition-colors"
              />
            </div>
          )}
        </div>

        {/* Bottom Rating and Runtime */}
        <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-xs text-white">
          {Number(movie.average_rating) > 0 ? (
            <span className="flex items-center gap-1 font-bold text-amber-300 bg-neutral-900/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[11px]">
              ★ {movie.average_rating}
              {movie.review_count > 0 && (
                <span className="text-[10px] text-white/70 font-normal">
                  ({formatVoteCount(movie.review_count)})
                </span>
              )}
            </span>
          ) : (
            <span />
          )}

          <span className="text-[10px] font-medium bg-neutral-900/70 px-1.5 py-0.5 rounded text-white/80">
            {movie.certificate}
          </span>
        </div>
      </Link>

      {/* Info Section */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <Link
            to={`/movies/${movie.slug}`}
            className="font-bold text-sm text-neutral-900 line-clamp-1 hover:text-brand transition-colors"
            title={movie.title}
          >
            {movie.title}
          </Link>

          <p className="text-[11px] font-medium text-neutral-500 line-clamp-1 mt-0.5">
            {movie.languages.map((l) => l.name).join(", ")}
          </p>

          <p className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
            {movie.genres.map((g) => g.name).join(" · ")}
          </p>
        </div>

        {/* Book Now Button */}
        <div className="mt-3">
          <button
            onClick={() => navigate(`/movies/${movie.slug}`)}
            className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm ${
              isComingSoon
                ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
                : "bg-brand hover:bg-brand-600 active:scale-95 text-white shadow-glow/30"
            }`}
          >
            {isComingSoon ? "View Details" : "Book Tickets"}
          </button>
        </div>
      </div>
    </div>
  );
}
