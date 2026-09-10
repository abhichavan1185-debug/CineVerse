import { Link } from "react-router-dom";
import type { EventListItem } from "../types";

export default function EventCard({ event, className = "" }: { event: EventListItem; className?: string }) {
  return (
    <Link to={`/events/${event.slug}`} className={`group block ${className}`}>
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-neutral-200 shadow-sm">
        <img
          src={event.poster_url}
          alt={event.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
        {event.is_featured && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold bg-brand text-white px-2 py-0.5 rounded-full">
            Featured
          </span>
        )}
        {Number(event.average_rating) > 0 && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-semibold bg-black/70 text-amber-400 px-2 py-0.5 rounded-full">
            ★ {event.average_rating}
          </span>
        )}
      </div>
      <p className="mt-2 font-semibold text-sm truncate">{event.title}</p>
      <p className="text-xs text-neutral-500 truncate">
        {event.city ?? "Multiple cities"}{event.language ? ` · ${event.language}` : ""}
      </p>
      {event.min_price && <p className="text-[11px] text-neutral-400">From ₹{event.min_price}</p>}
    </Link>
  );
}
