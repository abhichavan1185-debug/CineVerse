import { api } from "./client";
import type { Offer } from "../types";

export async function fetchOffers(): Promise<Offer[]> {
  const { data } = await api.get<Offer[] | { results: Offer[] }>("/coupons/offers/");
  return Array.isArray(data) ? data : data.results;
}
