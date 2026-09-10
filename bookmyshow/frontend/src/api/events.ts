import { api } from "./client";
import type {
  EventBookingRecord,
  EventDetail,
  EventFacets,
  PaginatedEvents,
  EventCategoryValue,
} from "../types";

export interface EventsQuery {
  category?: EventCategoryValue[];
  city?: string;
  search?: string;
  page?: number;
}

function buildParams(query: EventsQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.category?.length) params.set("category", query.category.join(","));
  if (query.city) params.set("city", query.city);
  if (query.search) params.set("search", query.search);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  return params;
}

export async function fetchEvents(query: EventsQuery): Promise<PaginatedEvents> {
  const { data } = await api.get<PaginatedEvents>(`/events/?${buildParams(query).toString()}`);
  return data;
}

export async function fetchEventDetail(slug: string): Promise<EventDetail> {
  const { data } = await api.get<EventDetail>(`/events/${slug}/`);
  return data;
}

export async function fetchEventFacets(): Promise<EventFacets> {
  const { data } = await api.get<EventFacets>("/events/facets/");
  return data;
}

export async function bookEventTickets(tierId: string, quantity: number): Promise<EventBookingRecord> {
  const { data } = await api.post<EventBookingRecord>("/events/book/", { tier_id: tierId, quantity });
  return data;
}

export async function fetchMyEventBookings(): Promise<EventBookingRecord[]> {
  const { data } = await api.get<EventBookingRecord[] | { results: EventBookingRecord[] }>("/events/my-bookings/");
  return Array.isArray(data) ? data : data.results;
}

export const EVENT_CATEGORY_LABELS: Record<EventCategoryValue, string> = {
  music: "Music",
  comedy: "Comedy",
  sports: "Sports",
  plays: "Plays",
  activities: "Activities",
};
