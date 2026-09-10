import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMovieSuggestions } from "../api/movies";

const RECENT_KEY = "showtime_recent_searches";
const MAX_RECENT = 5;

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function pushRecent(term: string) {
  const next = [term, ...getRecent().filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export default function SearchBar({
  placeholder = "Search for movies, actors, directors...",
  className = "",
  autoFocus = false,
}: {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const { data: suggestions, isFetching } = useQuery({
    queryKey: ["movie-suggestions", debounced],
    queryFn: () => fetchMovieSuggestions(debounced),
    enabled: debounced.trim().length >= 2,
  });

  function goToSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    pushRecent(trimmed);
    setOpen(false);
    navigate(`/movies?search=${encodeURIComponent(trimmed)}`);
  }

  function onFocus() {
    setRecent(getRecent());
    setOpen(true);
  }

  const showSuggestions = debounced.trim().length >= 2;
  const showRecent = !showSuggestions && recent.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToSearch(query);
        }}
      >
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={onFocus}
            placeholder={placeholder}
            autoFocus={autoFocus}
            aria-label="Search movies"
            className="input rounded-pill h-10 w-full pr-8"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setDebounced("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-sm"
            >
              ✕
            </button>
          )}
        </div>
      </form>

      {open && (showSuggestions || showRecent) && (
        <div className="absolute mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-popover z-50 overflow-hidden max-h-80 overflow-y-auto">
          {showRecent && (
            <div className="p-2">
              <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-neutral-400">Recent searches</p>
              {recent.map((term) => (
                <button
                  key={term}
                  onClick={() => goToSearch(term)}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-neutral-100 text-sm text-neutral-700"
                >
                  🕐 {term}
                </button>
              ))}
            </div>
          )}

          {showSuggestions && isFetching && (
            <p className="px-4 py-3 text-sm text-neutral-500">Searching…</p>
          )}

          {showSuggestions && !isFetching && suggestions && suggestions.length === 0 && (
            <p className="px-4 py-3 text-sm text-neutral-500">No matches for "{debounced}"</p>
          )}

          {showSuggestions && !isFetching && suggestions && suggestions.length > 0 && (
            <div className="p-2">
              {suggestions.map((s) =>
                s.type === "movie" ? (
                  <button
                    key={`movie-${s.id}`}
                    onClick={() => {
                      pushRecent(s.label);
                      setOpen(false);
                      navigate(`/movies/${s.slug}`);
                    }}
                    className="w-full flex items-center gap-3 text-left px-2 py-2 rounded-lg hover:bg-neutral-100"
                  >
                    {s.poster_url && (
                      <img src={s.poster_url} alt="" className="w-8 h-11 object-cover rounded" />
                    )}
                    <span className="text-sm text-neutral-800">{s.label}</span>
                  </button>
                ) : (
                  <button
                    key={`person-${s.id}`}
                    onClick={() => goToSearch(s.label)}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-neutral-100 text-sm text-neutral-600"
                  >
                    🎭 {s.label} <span className="text-neutral-400">({s.role})</span>
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
