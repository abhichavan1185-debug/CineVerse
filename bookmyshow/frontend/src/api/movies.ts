import { api } from "./client";
import type { MovieDetail, MovieFacets, MoviesQuery, MovieSuggestion, PaginatedMovies, Review } from "../types";

/** Builds the querystring for GET /api/movies/ from a typed filter object. */
function buildParams(query: MoviesQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status?.length) params.set("status", query.status.join(","));
  if (query.genre?.length) params.set("genre", query.genre.join(","));
  if (query.language?.length) params.set("language", query.language.join(","));
  if (query.sort) params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  return params;
}

export async function fetchMovies(query: MoviesQuery): Promise<PaginatedMovies> {
  const params = buildParams(query);
  const { data } = await api.get<PaginatedMovies>(`/movies/?${params.toString()}`);
  return data;
}

export async function fetchMovieDetail(slug: string): Promise<MovieDetail> {
  const { data } = await api.get<MovieDetail>(`/movies/${slug}/`);
  return data;
}

export async function fetchMovieFacets(): Promise<MovieFacets> {
  const { data } = await api.get<MovieFacets>("/movies/facets/");
  return data;
}

export async function fetchMovieSuggestions(q: string): Promise<MovieSuggestion[]> {
  if (q.trim().length < 2) return [];
  const { data } = await api.get<{ results: MovieSuggestion[] }>(
    `/movies/suggest/?q=${encodeURIComponent(q.trim())}`,
  );
  return data.results;
}

/** e.g. 38452 -> "38.4K", 900 -> "900" — matches the compact vote-count style on movie cards. */
export function formatVoteCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export const MOVIE_SORTS: { value: NonNullable<MoviesQuery["sort"]>; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "popular", label: "Popular" },
  { value: "trending", label: "Trending" },
  { value: "top_rated", label: "Top Rated" },
  { value: "new_releases", label: "New Releases" },
];

export async function fetchReviews(movieId: string): Promise<Review[]> {
  const { data } = await api.get<Review[] | { results: Review[] }>(`/movies/${movieId}/reviews/`);
  return Array.isArray(data) ? data : data.results;
}

export async function postReview(
  movieId: string,
  payload: { rating: number; title: string; comment: string },
): Promise<Review> {
  const { data } = await api.post<Review>(`/movies/${movieId}/reviews/`, { movie: movieId, ...payload });
  return data;
}
