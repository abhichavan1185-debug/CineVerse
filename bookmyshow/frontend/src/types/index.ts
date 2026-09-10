export interface Genre { id: number; name: string }
export interface Language { id: number; name: string; code: string }
export interface Person { id: number; name: string; role: "actor" | "director"; photo_url: string }

export interface MovieListItem {
  id: string; title: string; slug: string; poster_url: string;
  genres: Genre[]; languages: Language[]; duration_minutes: number;
  certificate: string; release_date: string; status: string; average_rating: string;
  review_count: number;
}

export interface MovieDetail extends MovieListItem {
  banner_url: string; trailer_url: string; description: string;
  cast: Person[]; directors: Person[];
}

export interface MovieFacets { genres: Genre[]; languages: Language[] }

export type MovieSort = "recommended" | "popular" | "trending" | "top_rated" | "new_releases";
export type MovieStatus = "now_showing" | "coming_soon" | "archived";

export interface MoviesQuery {
  search?: string;
  status?: MovieStatus[];
  genre?: string[];
  language?: string[];
  sort?: MovieSort;
  page?: number;
  page_size?: number;
}

export interface PaginatedMovies {
  count: number;
  next: string | null;
  previous: string | null;
  results: MovieListItem[];
}

export interface MovieSuggestion {
  type: "movie" | "person";
  id: string;
  label: string;
  slug: string | null;
  poster_url?: string;
  role?: "actor" | "director";
}

export interface District { id: number; name: string; city_count: number }
export interface City { id: number; name: string; district: string | null; is_popular: boolean }
export interface Cinema { id: string; name: string; city: string; district: string | null; address: string; facilities: string[] }

export type Availability = "available" | "filling_fast" | "almost_full" | "sold_out" | "unavailable";

export interface ShowListItem {
  id: string; date: string; start_time: string; end_time: string; format: string;
  cinema_name: string; screen_name: string; price_from: string | null; availability: Availability;
}

export type SeatStatus = "available" | "locked" | "booked";

export interface ShowSeat {
  id: number; row_label: string; seat_number: number; category: string;
  is_aisle_start: boolean; price: string; effective_status: SeatStatus;
}

export interface FoodItem {
  id: number; name: string; image_url: string; description: string;
  price: string; category: string; is_available: boolean;
}

export interface BookingSeatLine { row_label: string; seat_number: number; category: string; price: string }
export interface FoodOrderLine { name: string; quantity: number; price_at_order: string }
export interface Ticket {
  id: string;
  qr_token: string;
  qr_data?: string;
  status: "valid" | "used" | "expired" | "cancelled" | "transferred" | string;
  issued_at: string;
}

export interface Booking {
  id: string;
  booking_ref: string;
  status: "pending_payment" | "confirmed" | "cancelled" | "expired" | "payment_failed" | string;
  movie_title: string;
  movie_poster?: string;
  movie_language?: string;
  movie_certificate?: string;
  movie_duration?: number;
  cinema_name: string;
  cinema_address?: string;
  cinema_city?: string;
  screen_name: string;
  date: string;
  start_time: string;
  seats: BookingSeatLine[];
  food: FoodOrderLine[];
  seats_subtotal: string;
  food_subtotal: string;
  convenience_fee: string;
  taxes: string;
  discount: string;
  total_amount: string;
  created_at: string;
  confirmed_at: string | null;
  ticket: Ticket | null;
  qr_data?: string;
}

// --- Watchlist ---
export interface WatchlistItem { id: number; movie: MovieListItem; added_at: string }

// --- Events (Music/Comedy/Sports/Plays/Activities) ---
export type EventCategoryValue = "music" | "comedy" | "sports" | "plays" | "activities";

export interface EventListItem {
  id: string; title: string; slug: string; category: EventCategoryValue;
  poster_url: string; language: string; average_rating: string; review_count: number;
  is_featured: boolean; city: string | null; min_price: string | null;
}

export interface Venue { id: string; name: string; city: string; address: string }

export interface TicketTier {
  id: string; name: string; price: string; total_quantity: number; available_quantity: number;
}

export interface EventSchedule {
  id: string; date: string; start_time: string; venue: Venue; tiers: TicketTier[]; is_cancelled: boolean;
}

export interface EventDetail {
  id: string; title: string; slug: string; category: EventCategoryValue;
  poster_url: string; banner_url: string; description: string; language: string;
  duration_minutes: number | null; average_rating: string; review_count: number;
  schedules: EventSchedule[];
}

export interface PaginatedEvents {
  count: number; next: string | null; previous: string | null; results: EventListItem[];
}

export interface EventFacets {
  categories: { value: EventCategoryValue; label: string }[];
  cities: string[];
}

export interface EventBookingRecord {
  id: string; booking_code: string; event_title: string; event_poster_url: string;
  venue: string; date: string; start_time: string; tier_name: string;
  quantity: number; total_amount: string; status: string; created_at: string;
}

// --- Offers ---
export interface Offer {
  code: string; title: string; description: string; banner_url: string; is_featured: boolean;
  discount_type: "flat" | "percent"; discount_value: string; max_discount: string | null;
  min_order_amount: string; valid_until: string;
}

// --- Profile ---
export interface Profile {
  full_name: string; avatar_url: string; preferred_city: string;
  date_of_birth: string | null; email: string; phone: string | null;
  is_admin?: boolean; is_staff?: boolean;
}

// --- Admin Stats ---
export interface AdminStats {
  total_users: number;
  total_movies: number;
  total_cinemas: number;
  total_shows: number;
  total_bookings: number;
  revenue: string;
  today_bookings: number;
  available_seats: number;
  booked_seats: number;
}

// --- Reviews ---
export interface Review {
  id: number; movie: string; user_name: string; rating: number;
  title: string; comment: string; created_at: string;
}

