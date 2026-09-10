import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { fetchMovies } from "../api/movies";
import { useCity } from "../hooks/useCity";
import MovieCard from "../components/MovieCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ErrorState from "../components/ErrorState";
import type { MoviesQuery, MovieListItem } from "../types";

const QUICK_CATEGORIES = [
  { label: "Movies", icon: "🎬", to: "/movies" },
  { label: "Marathi Special", icon: "🚩", to: "/movies?language=Marathi" },
  { label: "Now Showing", icon: "🍿", to: "/movies?status=now_showing" },
  { label: "Coming Soon", icon: "📅", to: "/movies?status=coming_soon" },
  { label: "Offers & Deals", icon: "🏷️", to: "/offers" },
  { label: "Events & Plays", icon: "🎭", to: "/events" },
];

/** One horizontal, scrollable shelf of movies */
function MovieShelf({
  title,
  subtitle,
  query,
  seeAllHref,
  highlight = false,
}: {
  title: string;
  subtitle?: string;
  query: MoviesQuery;
  seeAllHref: string;
  highlight?: boolean;
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["home-shelf", query],
    queryFn: () => fetchMovies(query),
  });

  if (!isLoading && !isError && (data?.results.length ?? 0) === 0) return null;

  return (
    <section className={`mb-10 ${highlight ? "p-5 rounded-3xl bg-brand-50/50 border border-brand-100/60" : ""}`}>
      <div className="flex items-end justify-between px-4 md:px-0 mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-neutral-900 flex items-center gap-2">
            {highlight && <span className="text-brand">★</span>}
            {title}
          </h2>
          {subtitle && <p className="text-xs text-neutral-500 font-medium mt-0.5">{subtitle}</p>}
        </div>
        <Link
          to={seeAllHref}
          className="text-xs font-bold text-brand hover:text-brand-700 bg-white hover:bg-brand-50 border border-neutral-200 px-3 py-1.5 rounded-full transition-all flex items-center gap-1 shadow-sm"
        >
          See All <span>›</span>
        </Link>
      </div>

      {isLoading && (
        <div className="px-4 md:px-0">
          <LoadingSkeleton count={1} />
        </div>
      )}

      {isError && <ErrorState message="Couldn't load movies." onRetry={() => refetch()} />}

      {data && data.results.length > 0 && (
        <div className="flex gap-4 overflow-x-auto px-4 md:px-0 pb-3 scrollbar-none scroll-smooth">
          {data.results.map((m) => (
            <MovieCard key={m.id} movie={m} className="w-44 md:w-52 flex-shrink-0" />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const { city } = useCity();
  const navigate = useNavigate();
  const [trailerModal, setTrailerModal] = useState<string | null>(null);

  // Fetch featured movies for hero section
  const { data: featuredData } = useQuery({
    queryKey: ["hero-featured"],
    queryFn: () => fetchMovies({ status: ["now_showing"], sort: "recommended", page_size: 5 }),
  });

  const featuredMovie: MovieListItem | undefined = featuredData?.results?.[0];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      {/* 1. HERO SECTION: Cinematic Blockbuster Banner */}
      {featuredMovie ? (
        <div className="relative rounded-3xl overflow-hidden shadow-2xl mb-10 border border-neutral-800 bg-neutral-950">
          {/* Background backdrop */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 scale-105 filter blur-[1px]"
            style={{ backgroundImage: `url(${featuredMovie.poster_url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/90 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent" />

          {/* Hero Content */}
          <div className="relative z-10 p-6 md:p-12 flex flex-col md:flex-row items-center gap-8 max-w-5xl">
            <img
              src={featuredMovie.poster_url}
              alt={featuredMovie.title}
              className="w-44 md:w-64 aspect-[2/3] object-cover rounded-2xl shadow-2xl border-2 border-white/20 flex-shrink-0"
            />

            <div className="text-white flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/30 border border-brand/50 text-brand-200 text-xs font-bold mb-3">
                <span>🔥</span> FEATURED BLOCKBUSTER IN {city.toUpperCase()}
              </div>

              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight mb-2 text-white">
                {featuredMovie.title}
              </h1>

              {/* Tags */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs text-neutral-300 font-medium mb-4">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                  ★ {featuredMovie.average_rating} ({featuredMovie.review_count} votes)
                </span>
                <span>•</span>
                <span>{featuredMovie.languages.map((l) => l.name).join(", ")}</span>
                <span>•</span>
                <span>{featuredMovie.certificate}</span>
                <span>•</span>
                <span>
                  {Math.floor(featuredMovie.duration_minutes / 60)}h {featuredMovie.duration_minutes % 60}m
                </span>
                <span>•</span>
                <span>{featuredMovie.genres.map((g) => g.name).join(", ")}</span>
              </div>

              <p className="text-sm text-neutral-300 line-clamp-3 mb-6 max-w-2xl leading-relaxed">
                Experience the biggest theatrical phenomenon on the giant screen with immersive Dolby Atmos sound and luxury recliner seating.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <button
                  onClick={() => navigate(`/movies/${featuredMovie.slug}`)}
                  className="btn-primary h-12 px-8 text-base font-bold shadow-glow"
                >
                  🎟️ Book Tickets
                </button>
                <button
                  onClick={() => navigate(`/movies/${featuredMovie.slug}`)}
                  className="btn-outline h-12 px-6 text-sm font-semibold bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Fallback Hero Banner */
        <div className="mb-10 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white p-8 md:p-12 border border-neutral-800 shadow-xl">
          <span className="px-3 py-1 rounded-full bg-brand text-xs font-bold uppercase tracking-wider">
            CineVerse Maharashtra
          </span>
          <h1 className="text-3xl md:text-5xl font-black mt-3">Maharashtra's Premier Cinema Platform</h1>
          <p className="mt-2 text-neutral-300 max-w-xl">
            Book the best seats at top multiplexes across <span className="text-gold font-bold">{city}</span> with 100% real-time seat availability.
          </p>
          <button
            onClick={() => navigate("/movies")}
            className="btn-primary mt-6 h-11 px-8 text-sm"
          >
            Explore All Movies
          </button>
        </div>
      )}

      {/* 2. Quick Category Tiles */}
      <div className="mb-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {QUICK_CATEGORIES.map((cat) => (
          <Link
            key={cat.to}
            to={cat.to}
            className="card flex items-center justify-center gap-2 p-4 text-center hover:border-brand hover:shadow-md transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
            <span className="text-xs font-bold text-neutral-800 group-hover:text-brand">{cat.label}</span>
          </Link>
        ))}
      </div>

      {/* 3. Maharashtra Cinema Special: Marathi Movies */}
      <MovieShelf
        title="Marathi Blockbusters"
        subtitle="Celebrate the finest Marathi cinema across Maharashtra"
        query={{ language: ["Marathi"], status: ["now_showing"], sort: "popular" }}
        seeAllHref="/movies?language=Marathi"
        highlight
      />

      {/* 4. Now Showing */}
      <MovieShelf
        title="Now Showing"
        subtitle="Currently lighting up screens in Maharashtra"
        query={{ status: ["now_showing"], sort: "new_releases" }}
        seeAllHref="/movies?status=now_showing"
      />

      {/* 5. Recommended For You */}
      <MovieShelf
        title="Recommended For You"
        subtitle="Handpicked movies trending in your city"
        query={{ sort: "recommended", status: ["now_showing"] }}
        seeAllHref="/movies?status=now_showing&sort=recommended"
      />

      {/* 6. Coming Soon */}
      <MovieShelf
        title="Coming Soon"
        subtitle="Upcoming major releases to watch out for"
        query={{ status: ["coming_soon"], sort: "new_releases" }}
        seeAllHref="/movies?status=coming_soon"
      />

      {/* 7. Hindi Movies */}
      <MovieShelf
        title="Hindi Movies"
        subtitle="Bollywood and multi-language blockbusters"
        query={{ language: ["Hindi"], status: ["now_showing"], sort: "popular" }}
        seeAllHref="/movies?language=Hindi"
      />

      {/* 8. English Movies */}
      <MovieShelf
        title="English / Hollywood Movies"
        subtitle="Global cinematic spectacles on giant screens"
        query={{ language: ["English"], status: ["now_showing"], sort: "popular" }}
        seeAllHref="/movies?language=English"
      />

      {/* 9. Telugu Movies */}
      <MovieShelf
        title="Telugu Movies"
        subtitle="High-octane Telugu pan-India thrillers"
        query={{ language: ["Telugu"], status: ["now_showing"], sort: "popular" }}
        seeAllHref="/movies?language=Telugu"
      />

      {/* 10. Tamil Movies */}
      <MovieShelf
        title="Tamil Movies"
        subtitle="Powerhouse Kollywood cinematic experiences"
        query={{ language: ["Tamil"], status: ["now_showing"], sort: "popular" }}
        seeAllHref="/movies?language=Tamil"
      />

      {/* 11. Top Rated */}
      <MovieShelf
        title="Top Rated by Audiences"
        subtitle="Highest audience satisfaction ratings"
        query={{ sort: "top_rated", status: ["now_showing"] }}
        seeAllHref="/movies?sort=top_rated"
      />
    </div>
  );
}
