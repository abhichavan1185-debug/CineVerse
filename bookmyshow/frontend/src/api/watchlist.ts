import { api } from "./client";
import type { WatchlistItem } from "../types";

export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const { data } = await api.get<WatchlistItem[] | { results: WatchlistItem[] }>("/movies/watchlist/");
  return Array.isArray(data) ? data : data.results;
}

export async function toggleWatchlist(movieId: string): Promise<{ watching: boolean }> {
  const { data } = await api.post<{ watching: boolean }>("/movies/watchlist/toggle/", { movie_id: movieId });
  return data;
}
