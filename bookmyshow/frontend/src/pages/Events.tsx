import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchEvents, EVENT_CATEGORY_LABELS } from "../api/events";
import { useCity } from "../hooks/useCity";
import EventCard from "../components/EventCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import type { EventCategoryValue } from "../types";

const ALL_CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategoryValue[];

/**
 * One page powers every non-movie vertical. `fixedCategory` locks the tab
 * bar to a single category for routes like /sports, while /events shows
 * all categories with a tab bar to switch between them.
 */
export default function Events({ fixedCategory, title }: { fixedCategory?: EventCategoryValue; title: string }) {
  const { city } = useCity();
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState<EventCategoryValue | "all">(fixedCategory ?? "all");
  const search = searchParams.get("search") ?? "";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["events", city, category, search],
    queryFn: () =>
      fetchEvents({
        city,
        category: category === "all" ? undefined : [category],
        search: search || undefined,
      }),
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl md:text-2xl font-extrabold mb-1">{title}</h1>
      <p className="text-sm text-neutral-500 mb-4">Showing listings in {city}</p>

      {!fixedCategory && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          <button
            onClick={() => setCategory("all")}
            className={`px-4 py-2 rounded-pill text-sm font-medium whitespace-nowrap border ${
              category === "all" ? "bg-brand text-white border-brand" : "border-neutral-300 text-neutral-700"
            }`}
          >
            All
          </button>
          {ALL_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-pill text-sm font-medium whitespace-nowrap border ${
                category === c ? "bg-brand text-white border-brand" : "border-neutral-300 text-neutral-700"
              }`}
            >
              {EVENT_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      )}

      {isLoading && <LoadingSkeleton count={8} />}
      {isError && <ErrorState message="Couldn't load events." onRetry={() => refetch()} />}
      {data && data.results.length === 0 && (
        <EmptyState title={`No ${title.toLowerCase()} found in ${city}`} subtitle="Try a different city or check back soon." />
      )}
      {data && data.results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {data.results.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
