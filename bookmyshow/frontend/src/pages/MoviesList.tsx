import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMovieFacets, fetchMovies, MOVIE_SORTS } from "../api/movies";
import type { MovieSort, MovieStatus } from "../types";
import MovieCard from "../components/MovieCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";

const STATUS_TABS: { value: MovieStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "now_showing", label: "Now Showing" },
  { value: "coming_soon", label: "Coming Soon" },
];

export default function MoviesList() {
  const [params, setParams] = useSearchParams();

  const search = params.get("search") ?? "";
  const status = (params.get("status") as MovieStatus | null) ?? "";
  const sort = (params.get("sort") as MovieSort | null) ?? "recommended";
  const genres = useMemo(() => (params.get("genre")?.split(",").filter(Boolean) ?? []), [params]);
  const languages = useMemo(() => (params.get("language")?.split(",").filter(Boolean) ?? []), [params]);
  const page = Number(params.get("page") ?? "1");

  const { data: facets } = useQuery({ queryKey: ["movie-facets"], queryFn: fetchMovieFacets });

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["movies", { search, status, sort, genres, languages, page }],
    queryFn: () =>
      fetchMovies({
        search: search || undefined,
        status: status ? [status] : undefined,
        sort,
        genre: genres.length ? genres : undefined,
        language: languages.length ? languages : undefined,
        page,
      }),
  });

  /** For filter/sort/tab changes — always resets to page 1 since the result set changes. */
  function updateParams(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params);
    mutate(next);
    next.delete("page");
    setParams(next);
  }

  /** For Previous/Next — must NOT go through updateParams, which would strip the page it just set. */
  function goToPage(nextPage: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    setParams(next);
  }

  function toggleListParam(key: "genre" | "language", value: string) {
    updateParams((p) => {
      const current = p.get(key)?.split(",").filter(Boolean) ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      if (next.length) p.set(key, next.join(","));
      else p.delete(key);
    });
  }

  const totalPages = data ? Math.ceil(data.count / 20) : 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold mb-1">{search ? `Results for "${search}"` : "Movies"}</h1>
      {data && <p className="text-sm text-neutral-500 mb-4">{data.count} movies</p>}

      {/* Status tabs */}
      <div className="flex gap-2 mb-4">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => updateParams((p) => (t.value ? p.set("status", t.value) : p.delete("status")))}
            className={`px-4 h-9 rounded-pill text-sm font-medium border transition-colors ${
              status === t.value
                ? "bg-brand text-white border-brand"
                : "border-neutral-300 text-neutral-600 hover:border-brand hover:text-brand"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters sidebar */}
        <aside className="md:w-56 flex-shrink-0 space-y-6">
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase">Sort by</label>
            <select
              value={sort}
              onChange={(e) => updateParams((p) => p.set("sort", e.target.value))}
              className="input mt-1 h-10 text-sm"
            >
              {MOVIE_SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {facets && facets.genres.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase mb-2">Genre</p>
              <div className="flex flex-wrap gap-2">
                {facets.genres.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleListParam("genre", g.name)}
                    className={`px-3 h-8 rounded-pill text-xs font-medium border transition-colors ${
                      genres.includes(g.name)
                        ? "bg-brand-50 border-brand text-brand"
                        : "border-neutral-300 text-neutral-600 hover:border-brand hover:text-brand"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {facets && facets.languages.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase mb-2">Language</p>
              <div className="flex flex-wrap gap-2">
                {facets.languages.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => toggleListParam("language", l.name)}
                    className={`px-3 h-8 rounded-pill text-xs font-medium border transition-colors ${
                      languages.includes(l.name)
                        ? "bg-brand-50 border-brand text-brand"
                        : "border-neutral-300 text-neutral-600 hover:border-brand hover:text-brand"
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(genres.length > 0 || languages.length > 0 || status) && (
            <button
              onClick={() => setParams(search ? new URLSearchParams({ search }) : new URLSearchParams())}
              className="text-xs text-brand font-semibold"
            >
              Clear all filters
            </button>
          )}
        </aside>

        {/* Results */}
        <div className="flex-1">
          {isLoading && <LoadingSkeleton count={12} />}
          {isError && <ErrorState message="Couldn't load movies." onRetry={() => refetch()} />}
          {data && data.results.length === 0 && (
            <EmptyState title="No movies found." subtitle="Try a different search term or clear some filters." />
          )}

          {data && data.results.length > 0 && (
            <>
              <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${isFetching ? "opacity-60" : ""}`}>
                {data.results.map((m) => (
                  <MovieCard key={m.id} movie={m} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    disabled={!data.previous}
                    onClick={() => goToPage(page - 1)}
                    className="btn-outline h-9 px-4 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-neutral-500">Page {page} of {totalPages}</span>
                  <button
                    disabled={!data.next}
                    onClick={() => goToPage(page + 1)}
                    className="btn-outline h-9 px-4 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
