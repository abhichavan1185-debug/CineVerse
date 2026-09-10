# ShowTime — Maharashtra Movie, Events & Sports Booking

A full-stack Maharashtra ticket-booking app: Django + DRF + PostgreSQL (SQLite
fallback for local inspection only) backend, React + TypeScript + Tailwind frontend. Original branding
("ShowTime") — no copyrighted logos/assets used.

This has been run and verified end-to-end in a sandbox (migrations generated
and applied cleanly, demo data seeded, every endpoint below hit via Django's
test client, `tsc -b` and `vite build` both pass with zero errors).

## What's fully built and working end-to-end

**Backend** (`/backend`):
- Auth: register, OTP email verification, login (JWT), forgot/reset password, profile
- Movies: catalog, search/filter, facets, instant search-suggestions, detail page,
  reviews (one-per-user, rating rollup), watchlist (add/remove/list)
- Maharashtra location catalog with all 36 districts, district/city filters,
  cinemas, configurable screens/seats, and per-show pricing
- Default demo screens have 200 seats: Platinum rows A-E (50) and Gold rows
  F-T (150), separated by a central aisle. The layout is stored as database rows.
- **Events vertical** (`apps/events`) — a single unified app covering
  Music/Comedy/Sports/Plays/Activities: Venues, Events, Schedules, quantity-based
  Ticket Tiers, and a **concurrency-safe booking service** (`apps/events/services.py`)
  using `select_for_update` on the tier row, same pattern as movie seat-locking
- **Seat-locking booking engine** (`apps/bookings/services.py`) for movies — the
  concurrency-safe core: `select_for_update`, fixed lock ordering, TTL holds,
  atomic checkout with server-recomputed pricing/food/coupons, payment-gated
  confirmation, refund-policy cancellation. Each pending booking keeps its exact
  checkout-seat snapshot, so it cannot confirm another hold by the same user.
- Mock payment gateway with **HMAC-signed server-side verification** — a booking is
  only ever confirmed by `payments.services.verify_payment`, never by a frontend event
  claiming success
- Food & coupons with real validation (expiry, min order, usage limits); a public
  Offers endpoint for the Offers page
- Ticket QR issuance + transfer flow
- Django admin wired up for every model, including Events
- **Automated concurrency test** (`apps/bookings/tests/test_seat_concurrency.py`):
  spawns two real threads racing for the same seat and asserts exactly one wins.
  Note: this test is flaky under SQLite specifically, because SQLite serializes
  all writes at the file level and doesn't support real row-level locking across
  threads — it passes reliably against Postgres (see `docker-compose.yml`). This
  is a SQLite testing limitation, not a bug in the locking logic itself.

**Frontend** (`/frontend`, Vite + React + TS + Tailwind + TanStack Query):
- Maharashtra city selector (`useCity` context + `/location` picker), including
  district search, persisted and used to scope cinema/event listings
- Home: quick-links grid (Movies/Events/Sports/Plays/Activities/Offers) + movie shelves
- Full movie booking happy path: Home → Movie Details (watchlist heart, reviews +
  write-a-review) → cinema/date/show picker → Seat Selection (live seat map,
  5-minute countdown, 409-conflict handling) → Food & Coupon → Order Summary →
  Payment (mock gateway) → Confirmation with QR ticket → My Bookings (tabs, cancel)
- Events/Sports/Plays/Activities: category-tabbed listing page, event detail page
  with schedule + ticket-tier picker and quantity selector, booking confirmation
- Offers page (copy-to-clipboard codes), Watchlist page, Profile page (edit
  name/avatar/preferred city/DOB)
- Search-with-suggestions (movie titles + cast/director names, debounced, with
  recent-search history)
- Responsive: desktop nav + search, dedicated mobile header/bottom-nav/sticky CTAs

## What is NOT built (scoped out)

Gift cards, rewards/loyalty points, a notifications center, admin report CSV
export, Swagger/OpenAPI docs, and a custom React admin dashboard (Django admin
covers this today). Event bookings don't yet have a cancel/refund flow (movie
bookings do) — `apps/events/services.cancel_booking()` exists server-side but
isn't wired to a frontend button yet.

## Running it

```bash
# Backend
cd backend
python -m venv venv
# macOS/Linux: source venv/bin/activate
# Windows PowerShell: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
# macOS/Linux: cp .env.example .env
# Windows PowerShell: Copy-Item .env.example .env
# Edit .env as needed; PostgreSQL is recommended for shared booking environments.
python manage.py migrate
python manage.py seed_demo_data
python manage.py createsuperuser
python manage.py runserver   # http://localhost:8000, admin at /admin/

# Run the booking suite:
python manage.py test apps.bookings.tests

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                  # http://localhost:5173, proxies /api to :8000
```

Or via Docker (Postgres + Redis + backend + Celery worker/beat + frontend):
```bash
docker compose up --build
```

## Architecture notes worth knowing before you demo this

- **Seat concurrency**: `ShowSeat` has `unique_together=(show, seat)`. Every lock/
  confirm operation opens an explicit transaction and does
  `SELECT ... FOR UPDATE` on those exact rows, sorted by id (prevents deadlocks
  when two multi-seat requests overlap). The losing request gets a 409, never a
  stale success.
- **Checkout snapshot**: `BookingSeat` records are created before payment.
  Confirmation validates and books only those exact rows; a failed or expired
  checkout releases only its own hold and restores limited food inventory.
- **Event ticket concurrency**: `TicketTier` has `booked_quantity`/`total_quantity`
  counters; booking locks that single row with `select_for_update` before checking
  and incrementing — same guarantee, simpler because tickets aren't seat-mapped.
- **Payment trust boundary**: `POST /api/payments/verify/` independently
  recomputes an HMAC signature server-side before calling `confirm_booking()`.
  Swapping the mock gateway for Razorpay/Stripe means replacing
  `create_gateway_order`/`verify_gateway_signature` in `apps/payments/services.py` —
  nothing else in the trust chain changes.
- **Pricing is never trusted from the client**: `Checkout` view recomputes seat
  subtotal, food subtotal, convenience fee, tax, and coupon discount from DB state
  every time.
- **List endpoint pagination**: catalog/grid endpoints (`/movies/`, `/events/`)
  are paginated (`{count, next, previous, results}`); small, naturally-bounded
  lists (cities, cinemas-by-city, my-bookings, watchlist, offers) explicitly set
  `pagination_class = None` and return plain arrays — check a new endpoint's
  `pagination_class` before assuming its response shape on the frontend.
