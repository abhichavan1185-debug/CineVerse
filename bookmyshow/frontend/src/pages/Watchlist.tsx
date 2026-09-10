import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWatchlist, toggleWatchlist } from "../api/watchlist";
import MovieCard from "../components/MovieCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";

export default function Watchlist() {
  const queryClient = useQueryClient();
  const { data: watchlist, isLoading, isError, refetch } = useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
  });

  async function handleRemove(movieId: string) {
    await toggleWatchlist(movieId);
    queryClient.invalidateQueries({ queryKey: ["watchlist"] });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl md:text-2xl font-extrabold mb-1">My Watchlist</h1>
      <p className="text-sm text-neutral-500 mb-6">Movies you've saved to watch later.</p>

      {isLoading && <LoadingSkeleton count={6} />}
      {isError && <ErrorState message="Couldn't load your watchlist." onRetry={() => refetch()} />}
      {watchlist && watchlist.length === 0 && (
        <EmptyState title="Your watchlist is empty." subtitle="Tap the ♡ on any movie to save it here." />
      )}
      {watchlist && watchlist.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {watchlist.map((w) => (
            <div key={w.id} className="relative">
              <MovieCard movie={w.movie} />
              <button
                onClick={() => handleRemove(w.movie.id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center"
                title="Remove from watchlist"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
