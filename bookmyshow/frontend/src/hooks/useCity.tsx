import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { City } from "../types";

const CITY_KEY = "showtime_selected_city";
const DEFAULT_CITY = "Mumbai";

interface CityContextShape {
  city: string;
  cities: City[];
  setCity: (name: string) => void;
  loading: boolean;
}

const CityContext = createContext<CityContextShape | null>(null);

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState<string>(() => localStorage.getItem(CITY_KEY) || DEFAULT_CITY);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ results: City[] } | City[]>("/cinemas/cities/")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data.results;
        setCities(list);
        // If the saved city no longer exists (fresh DB / different seed), fall
        // back to the first popular one instead of silently showing nothing.
        if (list.length && !list.some((c) => c.name === city)) {
          const fallback = list.find((c) => c.is_popular)?.name ?? list[0].name;
          setCityState(fallback);
          localStorage.setItem(CITY_KEY, fallback);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCity = (name: string) => {
    setCityState(name);
    localStorage.setItem(CITY_KEY, name);
  };

  return <CityContext.Provider value={{ city, cities, setCity, loading }}>{children}</CityContext.Provider>;
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used within CityProvider");
  return ctx;
}
