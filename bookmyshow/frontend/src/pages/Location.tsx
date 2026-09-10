import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCity } from "../hooks/useCity";

const POPULAR_MAHARASHTRA_CITIES = [
  { name: "Mumbai", icon: "🏙️" },
  { name: "Pune", icon: "🏰" },
  { name: "Nagpur", icon: "🍊" },
  { name: "Nashik", icon: "🍇" },
  { name: "Chhatrapati Sambhajinagar", icon: "🏛️" },
  { name: "Kolhapur", icon: "🚩" },
  { name: "Thane", icon: "🌆" },
  { name: "Navi Mumbai", icon: "🌉" },
  { name: "Solapur", icon: "🧵" },
  { name: "Kalyan", icon: "🚆" },
  { name: "Panvel", icon: "🛣️" },
  { name: "Nanded", icon: "✨" },
  { name: "Amravati", icon: "🌾" },
  { name: "Jalgaon", icon: "🍌" },
  { name: "Ratnagiri", icon: "🏖️" },
];

export default function Location() {
  const { city, cities, setCity, loading } = useCity();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = query
    ? cities.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.district?.toLowerCase().includes(query.toLowerCase())
      )
    : cities;

  function choose(name: string) {
    setCity(name);
    navigate(-1);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
      <div className="mb-6">
        <span className="text-xs font-black uppercase tracking-wider text-brand">
          Location System
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight mt-1">
          Select Your Maharashtra City
        </h1>
        <p className="text-xs text-neutral-500 font-medium mt-1">
          Currently browsing cinema listings for{" "}
          <span className="font-bold text-brand">{city}</span>.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any Maharashtra city or district (e.g. Pune, Kolhapur, Nashik)..."
          className="input pl-11 text-sm shadow-sm"
          autoFocus
        />
        <span className="absolute left-4 top-3 text-neutral-400 text-base">🔍</span>
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-3 text-xs text-neutral-400 hover:text-neutral-600 font-bold"
          >
            Clear
          </button>
        )}
      </div>

      {loading && <p className="text-xs text-neutral-500 font-semibold py-4">Loading cities…</p>}

      {/* Popular Cities Quick Grid (when not searching) */}
      {!query && (
        <div className="mb-10">
          <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3">
            Popular Maharashtra Hubs
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {POPULAR_MAHARASHTRA_CITIES.map((c) => {
              const isSelected = c.name.toLowerCase() === city.toLowerCase();
              return (
                <button
                  key={c.name}
                  onClick={() => choose(c.name)}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 group ${
                    isSelected
                      ? "border-brand bg-brand-50/70 text-brand shadow-sm"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm"
                  }`}
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{c.icon}</span>
                  <span className="text-xs font-bold truncate max-w-full">{c.name}</span>
                  {isSelected && <span className="text-[10px] font-extrabold text-brand">Selected</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* All / Filtered Cities List */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3">
          {query ? `Matching Cities (${filtered.length})` : "All Maharashtra Cities & Districts"}
        </h2>

        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm divide-y divide-neutral-100 overflow-hidden">
          {filtered.map((c) => {
            const isSelected = c.name.toLowerCase() === city.toLowerCase();
            return (
              <button
                key={c.id}
                onClick={() => choose(c.name)}
                className={`w-full text-left px-5 py-3.5 text-xs hover:bg-neutral-50 flex items-center justify-between transition-colors ${
                  isSelected ? "bg-brand-50/40 text-brand font-black" : "text-neutral-800 font-semibold"
                }`}
              >
                <div>
                  <span className="text-sm">{c.name}</span>
                  {c.district && (
                    <span className="ml-2 text-[11px] font-normal text-neutral-400">
                      ({c.district} District)
                    </span>
                  )}
                </div>

                {isSelected ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-brand text-white text-[10px] font-bold">
                    Active
                  </span>
                ) : (
                  <span className="text-neutral-300 text-sm">›</span>
                )}
              </button>
            );
          })}

          {!loading && filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-neutral-500">
              No Maharashtra city found matching "<span className="font-bold text-neutral-700">{query}</span>".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
