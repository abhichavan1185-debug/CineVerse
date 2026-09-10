import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { fetchWatchlist, toggleWatchlist } from "../api/watchlist";

/**
 * Renders a filled/outline heart and toggles the given movie's watchlist
 * membership. Looks up current state from the cached watchlist query so a
 * MovieCard grid and the detail page's button stay in sync automatically.
 */
export default function WatchlistButton({ movieId, className = "" }: { movieId: string; className?: string }) {
  const { me } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const { data: watchlist } = useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
    enabled: !!me,
    staleTime: 30_000,
  });

  const isWatching = watchlist?.some((w) => w.movie.id === movieId) ?? false;

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!me) {
      navigate("/login");
      return;
    }
    setPending(true);
    try {
      await toggleWatchlist(movieId);
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      aria-label={isWatching ? "Remove from watchlist" : "Add to watchlist"}
      title={isWatching ? "Remove from watchlist" : "Add to watchlist"}
      className={`disabled:opacity-50 ${className}`}
    >
      {isWatching ? "♥" : "♡"}
    </button>
  );
}
