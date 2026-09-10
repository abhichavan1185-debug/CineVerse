import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiErrorMessage } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import type { AdminStats, MovieListItem, Cinema, ShowListItem, Booking, City } from "../types";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ErrorState from "../components/ErrorState";

type TabType = "overview" | "movies" | "cinemas" | "shows" | "bookings" | "users" | "turnstile";

export default function AdminDashboard() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState<TabType>("overview");

  // Turnstile scanner states
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [admitLoading, setAdmitLoading] = useState(false);
  const [admitMessage, setAdmitMessage] = useState<string | null>(null);

  const handleVerifyTicket = async () => {
    if (!scanInput.trim()) return;
    setScanLoading(true);
    setScanResult(null);
    setAdmitMessage(null);
    try {
      const res = await api.post("/tickets/validate/", {
        qr_data: scanInput.trim(),
        booking_ref: scanInput.trim(),
      });
      setScanResult(res.data);
    } catch (err: any) {
      setScanResult(
        err.response?.data || { valid: false, message: "❌ Invalid ticket or verification failed." }
      );
    } finally {
      setScanLoading(false);
    }
  };

  const handleAdmitCustomer = async () => {
    if (!scanResult?.booking_ref && !scanResult?.ticket_id) return;
    setAdmitLoading(true);
    try {
      const res = await api.post("/tickets/use/", {
        booking_ref: scanResult.booking_ref,
        ticket_id: scanResult.ticket_id,
      });
      setAdmitMessage(res.data.message || "✅ Admission recorded. Ticket marked as USED.");
      setScanResult({
        ...scanResult,
        valid: false,
        code: "ALREADY_USED",
        message: "⚠️ TICKET ALREADY USED: Customer was just admitted.",
      });
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to mark ticket as used.");
    } finally {
      setAdmitLoading(false);
    }
  };

  // Modals state
  const [showAddMovie, setShowAddMovie] = useState(false);
  const [showAddCinema, setShowAddCinema] = useState(false);
  const [showAddScreen, setShowAddScreen] = useState(false);
  const [showAddShow, setShowAddShow] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form states
  const [movieForm, setMovieForm] = useState({
    title: "",
    poster_url: "",
    banner_url: "",
    description: "",
    duration_minutes: 135,
    certificate: "UA",
    release_date: new Date().toISOString().slice(0, 10),
    status: "now_showing",
  });

  const [cinemaForm, setCinemaForm] = useState({
    name: "",
    city_id: 0,
    address: "",
    facilities: "Parking, Dolby Atmos, Food Court, Air Conditioning",
  });

  const [screenForm, setScreenForm] = useState({
    cinema_id: "",
    name: "Screen 1 - Dolby Atmos",
    supported_formats: "2D, 3D, IMAX",
  });

  const [showForm, setShowForm] = useState({
    movie_id: "",
    screen_id: "",
    date: new Date().toISOString().slice(0, 10),
    start_time: "18:30:00",
    end_time: "21:15:00",
    format: "2D",
    gold_price: 220,
    platinum_price: 350,
  });

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => (await api.get<AdminStats>("/admin/stats/")).data,
    enabled: !!me?.is_admin || !!me?.is_staff,
  });

  const { data: movies, isLoading: moviesLoading } = useQuery<MovieListItem[]>({
    queryKey: ["admin-movies"],
    queryFn: async () => {
      const res = await api.get<MovieListItem[] | { results: MovieListItem[] }>("/admin/movies/");
      return Array.isArray(res.data) ? res.data : res.data.results;
    },
    enabled: currentTab === "movies" || currentTab === "shows",
  });

  const { data: cinemas, isLoading: cinemasLoading } = useQuery<any[]>({
    queryKey: ["admin-cinemas"],
    queryFn: async () => {
      const res = await api.get<any[] | { results: any[] }>("/admin/cinemas/");
      return Array.isArray(res.data) ? res.data : res.data.results;
    },
    enabled: currentTab === "cinemas" || currentTab === "shows",
  });

  const { data: cities } = useQuery<City[]>({
    queryKey: ["all-cities"],
    queryFn: async () => (await api.get<City[]>("/cinemas/cities/")).data,
    enabled: showAddCinema,
  });

  const { data: shows, isLoading: showsLoading } = useQuery<any[]>({
    queryKey: ["admin-shows"],
    queryFn: async () => {
      const res = await api.get<any[] | { results: any[] }>("/admin/shows/");
      return Array.isArray(res.data) ? res.data : res.data.results;
    },
    enabled: currentTab === "shows",
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const res = await api.get<any[] | { results: any[] }>("/admin/bookings/");
      return Array.isArray(res.data) ? res.data : res.data.results;
    },
    enabled: currentTab === "bookings",
  });

  const { data: users, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await api.get<any[] | { results: any[] }>("/admin/users/");
      return Array.isArray(res.data) ? res.data : res.data.results;
    },
    enabled: currentTab === "users",
  });

  // Mutations
  const addMovieMutation = useMutation({
    mutationFn: (data: any) => api.post("/admin/movies/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-movies"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setShowAddMovie(false);
      setActionMessage("Movie created successfully!");
    },
  });

  const deleteMovieMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/movies/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-movies"] });
      setActionMessage("Movie deleted.");
    },
  });

  const addCinemaMutation = useMutation({
    mutationFn: (data: any) => api.post("/admin/cinemas/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cinemas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setShowAddCinema(false);
      setActionMessage("Cinema created successfully!");
    },
  });

  const addScreenMutation = useMutation({
    mutationFn: (data: any) => api.post("/admin/screens/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cinemas"] });
      setShowAddScreen(false);
      setActionMessage("Screen added with exact 200 seats (80 Platinum, 120 Gold)!");
    },
  });

  const addShowMutation = useMutation({
    mutationFn: (data: any) => api.post("/admin/shows/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shows"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setShowAddShow(false);
      setActionMessage("Show scheduled with 200 seat layout initialized!");
    },
  });

  if (!me?.is_admin && !me?.is_staff) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-white border border-neutral-200 text-center shadow-lg">
        <div className="text-4xl mb-3">🔒</div>
        <h1 className="text-xl font-black text-neutral-900">Admin Access Required</h1>
        <p className="text-xs text-neutral-500 mt-2">
          You must be signed in as a platform administrator (e.g. <b>admin@cineverse.in</b>) to view this dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 pb-32">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 text-gold text-[11px] font-black tracking-wider uppercase">
              Admin Control Panel
            </span>
            <span className="text-xs text-neutral-400 font-semibold">• CineVerse Maharashtra</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight mt-1">
            Platform Management & Operations
          </h1>
        </div>

        {/* Quick actions buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAddMovie(true)}
            className="btn-primary h-10 px-4 text-xs font-bold shadow-sm"
          >
            + Add Movie
          </button>
          <button
            onClick={() => setShowAddCinema(true)}
            className="btn-outline h-10 px-4 text-xs font-bold shadow-sm"
          >
            + Add Cinema
          </button>
          <button
            onClick={() => setShowAddShow(true)}
            className="btn-gold h-10 px-4 text-xs font-bold"
          >
            + Schedule Show
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>✓ {actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-500 font-black">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-neutral-200 mb-8 scrollbar-none">
        {[
          { id: "overview", label: "📊 Overview Stats" },
          { id: "movies", label: "🎬 Movies Management" },
          { id: "cinemas", label: "🏛️ Cinemas & Screens" },
          { id: "shows", label: "⏱️ Show Schedules" },
          { id: "bookings", label: "🎟️ Customer Bookings" },
          { id: "turnstile", label: "🚪 Turnstile & QR Gate" },
          { id: "users", label: "👥 Registered Users" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setCurrentTab(t.id as TabType)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              currentTab === t.id
                ? "bg-neutral-900 text-white shadow-sm"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW TAB */}
      {currentTab === "overview" && (
        <div className="space-y-8 animate-in fade-in">
          {statsLoading && <LoadingSkeleton count={3} />}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <StatCard title="Total Revenue" value={`₹${stats.revenue}`} icon="💰" color="text-brand" />
              <StatCard title="Total Bookings" value={stats.total_bookings} icon="🎟️" color="text-neutral-900" />
              <StatCard title="Today's Bookings" value={stats.today_bookings} icon="🔥" color="text-amber-600" />
              <StatCard title="Total Users" value={stats.total_users} icon="👥" color="text-blue-600" />
              <StatCard title="Active Movies" value={stats.total_movies} icon="🎬" color="text-neutral-900" />
              <StatCard title="Cinemas in MH" value={stats.total_cinemas} icon="🏛️" color="text-neutral-900" />
              <StatCard title="Active Shows" value={stats.total_shows} icon="⏱️" color="text-neutral-900" />
              <StatCard title="Available Seats" value={stats.available_seats} icon="🟢" color="text-emerald-600" />
            </div>
          )}

          {/* Quick Info Banner */}
          <div className="card p-6 border-neutral-200 shadow-sm bg-gradient-to-r from-neutral-900 to-neutral-950 text-white rounded-3xl">
            <h2 className="text-base font-black text-gold flex items-center gap-2">
              <span>⚙️</span> Platform Specifications & Engine Status
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs text-neutral-300">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="font-bold text-white block mb-1">Exact 200 Seats Screen Layout</span>
                <p className="text-[11px] text-neutral-400">
                  Strictly 80 Platinum seats (Rows A-H) + 120 Gold seats (Rows J-U) per screen.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="font-bold text-white block mb-1">Row-Level Concurrency</span>
                <p className="text-[11px] text-neutral-400">
                  Postgres & SQLite select_for_update with 5-minute hold TTL and zero race condition double booking.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="font-bold text-white block mb-1">36 Maharashtra Districts</span>
                <p className="text-[11px] text-neutral-400">
                  Full relational city-to-cinema mapping with dynamic showtime availability filtering.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MOVIES TAB */}
      {currentTab === "movies" && (
        <div className="animate-in fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-neutral-900">Movie Catalog ({movies?.length || 0})</h2>
            <button onClick={() => setShowAddMovie(true)} className="btn-primary h-9 px-4 text-xs font-bold">
              + Add New Movie
            </button>
          </div>

          {moviesLoading && <LoadingSkeleton count={3} />}
          <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-4">Movie</th>
                    <th className="p-4">Languages</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {movies?.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <img src={m.poster_url} alt={m.title} className="w-10 h-14 object-cover rounded-lg bg-neutral-200 shadow-sm" />
                        <div>
                          <span className="font-extrabold text-neutral-900 text-sm block">{m.title}</span>
                          <span className="text-[10px] text-neutral-400">{m.certificate} • {m.release_date}</span>
                        </div>
                      </td>
                      <td className="p-4 text-neutral-600 font-medium">{m.languages.map((l) => l.name).join(", ")}</td>
                      <td className="p-4 text-neutral-600">{m.duration_minutes} mins</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === "now_showing" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-neutral-100 text-neutral-700"
                        }`}>
                          {m.status === "now_showing" ? "Now Showing" : "Coming Soon"}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-amber-500">★ {m.average_rating}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => deleteMovieMutation.mutate(m.id)}
                          className="text-red-600 hover:text-red-800 font-bold px-2 py-1 rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. CINEMAS TAB */}
      {currentTab === "cinemas" && (
        <div className="animate-in fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-neutral-900">Cinemas Across Maharashtra ({cinemas?.length || 0})</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowAddCinema(true)} className="btn-primary h-9 px-4 text-xs font-bold">
                + Add Cinema
              </button>
              <button onClick={() => setShowAddScreen(true)} className="btn-outline h-9 px-4 text-xs font-bold">
                + Add Screen (200 Seats)
              </button>
            </div>
          </div>

          {cinemasLoading && <LoadingSkeleton count={3} />}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cinemas?.map((c) => (
              <div key={c.id} className="card p-5 border-neutral-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-extrabold text-sm text-neutral-900">{c.name}</h3>
                    <span className="px-2 py-0.5 rounded bg-brand/10 text-brand text-[10px] font-bold">
                      {c.city_name || "MH"}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mb-3">{c.address}</p>
                  
                  {c.facilities && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {c.facilities.map((f: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-neutral-100 text-[10px] font-medium text-neutral-600">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs font-semibold text-neutral-500">
                  <span>{c.screen_count || 2} Screens (200 seats each)</span>
                  <span className="text-emerald-600 font-bold">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SHOWS TAB */}
      {currentTab === "shows" && (
        <div className="animate-in fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-neutral-900">Show Schedules ({shows?.length || 0})</h2>
            <button onClick={() => setShowAddShow(true)} className="btn-primary h-9 px-4 text-xs font-bold">
              + Schedule New Show
            </button>
          </div>

          {showsLoading && <LoadingSkeleton count={3} />}
          <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-4">Movie</th>
                    <th className="p-4">Cinema & Screen</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Time</th>
                    <th className="p-4">Format</th>
                    <th className="p-4">Pricing</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {shows?.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-4 font-bold text-neutral-900">{s.movie_title}</td>
                      <td className="p-4 text-neutral-600">{s.cinema_name} • {s.screen_name}</td>
                      <td className="p-4 font-semibold text-neutral-700">{s.date}</td>
                      <td className="p-4 font-bold text-neutral-900">{s.start_time?.slice(0, 5)}</td>
                      <td className="p-4 font-bold text-brand">{s.format}</td>
                      <td className="p-4 text-neutral-600">
                        {s.prices?.Platinum ? `Plat: ₹${s.prices.Platinum} / Gold: ₹${s.prices.Gold}` : "₹350 / ₹220"}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Scheduled
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. BOOKINGS TAB */}
      {currentTab === "bookings" && (
        <div className="animate-in fade-in">
          <h2 className="text-lg font-black text-neutral-900 mb-4">Customer Transactions ({bookings?.length || 0})</h2>
          {bookingsLoading && <LoadingSkeleton count={3} />}
          <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-4">Ref ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Movie</th>
                    <th className="p-4">Cinema</th>
                    <th className="p-4">Seats</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {bookings?.map((b) => (
                    <tr key={b.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-4 font-mono font-bold text-brand">{b.booking_ref}</td>
                      <td className="p-4 font-semibold text-neutral-800">{b.user_email}</td>
                      <td className="p-4 font-bold text-neutral-900">{b.movie_title}</td>
                      <td className="p-4 text-neutral-600">{b.cinema_name}</td>
                      <td className="p-4 font-semibold text-neutral-700">{b.seats?.join(", ") || "—"}</td>
                      <td className="p-4 font-black text-neutral-900">₹{b.total_amount}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-400">{new Date(b.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. USERS TAB */}
      {currentTab === "users" && (
        <div className="animate-in fade-in">
          <h2 className="text-lg font-black text-neutral-900 mb-4">Registered Platform Users ({users?.length || 0})</h2>
          {usersLoading && <LoadingSkeleton count={3} />}
          <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-4">Email</th>
                    <th className="p-4">Full Name</th>
                    <th className="p-4">City</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Bookings</th>
                    <th className="p-4">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {users?.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-4 font-bold text-neutral-900">{u.email}</td>
                      <td className="p-4 text-neutral-700">{u.full_name || "—"}</td>
                      <td className="p-4 text-neutral-600">{u.preferred_city || "Maharashtra"}</td>
                      <td className="p-4">
                        {u.is_admin_user || u.is_staff ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-gold">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600">
                            Customer
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-neutral-800">{u.bookings_count}</td>
                      <td className="p-4 text-neutral-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TURNSTILE / QR SCANNER TAB */}
      {currentTab === "turnstile" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="card p-6 border-neutral-200 shadow-sm max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-gold flex items-center justify-center text-xl shadow-sm">
                🚪
              </div>
              <div>
                <h3 className="text-lg font-black text-neutral-900">
                  Cinema Turnstile Gate & QR Scanner
                </h3>
                <p className="text-xs text-neutral-500">
                  Scan customer QR passes or enter booking references to verify admission and prevent pass reuse.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">
                  Scan / Enter QR Token or Booking Reference
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleVerifyTicket();
                      }
                    }}
                    placeholder="e.g. CINEVERSE:TICKET:MVB-2026-XXXXXX:uuid or MVB-2026-XXXXXX"
                    className="input flex-1 font-mono text-xs"
                  />
                  <button
                    onClick={handleVerifyTicket}
                    disabled={scanLoading || !scanInput.trim()}
                    className="btn-primary h-11 px-6 text-xs font-bold whitespace-nowrap shadow-sm disabled:opacity-50"
                  >
                    {scanLoading ? "Verifying..." : "🔍 Verify Pass"}
                  </button>
                </div>
              </div>

              {admitMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <span>✓</span> {admitMessage}
                </div>
              )}

              {/* Scan Results Card */}
              {scanResult && (
                <div
                  className={`p-5 rounded-2xl border-2 transition-all ${
                    scanResult.valid
                      ? "bg-emerald-50/40 border-emerald-500 text-emerald-950"
                      : scanResult.code === "ALREADY_USED"
                      ? "bg-amber-50/60 border-amber-500 text-amber-950"
                      : "bg-red-50/60 border-red-500 text-red-950"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-xl">
                      {scanResult.valid ? "✅" : scanResult.code === "ALREADY_USED" ? "⚠️" : "❌"}
                    </span>
                    <h4 className="font-black text-sm tracking-tight">
                      {scanResult.message}
                    </h4>
                  </div>

                  {scanResult.valid && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-white/90 border border-emerald-200 text-xs">
                        <div>
                          <span className="text-neutral-400 block text-[10px] uppercase font-bold">Customer</span>
                          <span className="font-extrabold text-neutral-900">{scanResult.customer_name}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px] uppercase font-bold">Booking ID</span>
                          <span className="font-mono font-bold text-neutral-900">{scanResult.booking_ref}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px] uppercase font-bold">Movie</span>
                          <span className="font-extrabold text-neutral-900">{scanResult.movie_title}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px] uppercase font-bold">Cinema & Screen</span>
                          <span className="font-bold text-neutral-900">{scanResult.cinema_name} • {scanResult.screen_name}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px] uppercase font-bold">Showtime</span>
                          <span className="font-bold text-neutral-900">{scanResult.date} at {scanResult.start_time?.slice(0, 5)}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px] uppercase font-bold">Paid Total</span>
                          <span className="font-black text-brand">₹{scanResult.total_amount}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 text-xs">
                        <span className="text-neutral-400 block text-[10px] uppercase font-bold mb-1">
                          Seats ({scanResult.seats_count}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {scanResult.seats?.map((seat: string, i: number) => (
                            <span key={i} className="px-2.5 py-0.5 rounded-lg bg-neutral-900 text-white font-bold text-[11px]">
                              {seat}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={handleAdmitCustomer}
                          disabled={admitLoading}
                          className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm tracking-wide shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <span>🚪</span>
                          {admitLoading ? "Recording Admission..." : "Admit Customer & Mark Pass as USED"}
                        </button>
                      </div>
                    </div>
                  )}

                  {!scanResult.valid && (
                    <div className="text-xs space-y-2 mt-2">
                      <p className="font-medium">
                        {scanResult.code === "ALREADY_USED"
                          ? "This pass has already passed through the turnstile and cannot be reused."
                          : "This QR token is not recognized as a valid CineVerse booking pass."}
                      </p>
                      {scanResult.booking_ref && (
                        <p className="font-mono text-neutral-600">Reference: {scanResult.booking_ref}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD MOVIE */}
      {showAddMovie && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-neutral-200 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-black text-neutral-900 mb-4">Add New Movie</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Title</label>
                <input
                  type="text"
                  value={movieForm.title}
                  onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                  placeholder="e.g. Kantara Chapter 1"
                  className="input"
                />
              </div>
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Poster URL</label>
                <input
                  type="text"
                  value={movieForm.poster_url}
                  onChange={(e) => setMovieForm({ ...movieForm, poster_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Certificate</label>
                  <select
                    value={movieForm.certificate}
                    onChange={(e) => setMovieForm({ ...movieForm, certificate: e.target.value })}
                    className="input"
                  >
                    <option value="U">U</option>
                    <option value="UA">UA</option>
                    <option value="A">A</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={movieForm.duration_minutes}
                    onChange={(e) => setMovieForm({ ...movieForm, duration_minutes: parseInt(e.target.value) || 120 })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Description</label>
                <textarea
                  value={movieForm.description}
                  onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-neutral-200 text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Status</label>
                <select
                  value={movieForm.status}
                  onChange={(e) => setMovieForm({ ...movieForm, status: e.target.value })}
                  className="input"
                >
                  <option value="now_showing">Now Showing</option>
                  <option value="coming_soon">Coming Soon</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddMovie(false)} className="btn-outline h-10 px-5 text-xs">
                Cancel
              </button>
              <button
                onClick={() => addMovieMutation.mutate(movieForm)}
                disabled={!movieForm.title || addMovieMutation.isPending}
                className="btn-primary h-10 px-6 text-xs"
              >
                {addMovieMutation.isPending ? "Saving..." : "Create Movie"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CINEMA */}
      {showAddCinema && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-neutral-200 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-black text-neutral-900 mb-4">Add Maharashtra Cinema</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Cinema Name</label>
                <input
                  type="text"
                  value={cinemaForm.name}
                  onChange={(e) => setCinemaForm({ ...cinemaForm, name: e.target.value })}
                  placeholder="e.g. CineVerse Kolhapur Central"
                  className="input"
                />
              </div>
              <div>
                <label className="font-bold text-neutral-700 block mb-1">City</label>
                <select
                  value={cinemaForm.city_id}
                  onChange={(e) => setCinemaForm({ ...cinemaForm, city_id: parseInt(e.target.value) })}
                  className="input"
                >
                  <option value={0}>Select Maharashtra City...</option>
                  {cities?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.district || "MH"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Address</label>
                <input
                  type="text"
                  value={cinemaForm.address}
                  onChange={(e) => setCinemaForm({ ...cinemaForm, address: e.target.value })}
                  placeholder="Street / Mall, Area, City"
                  className="input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddCinema(false)} className="btn-outline h-10 px-5 text-xs">
                Cancel
              </button>
              <button
                onClick={() =>
                  addCinemaMutation.mutate({
                    name: cinemaForm.name,
                    city: cinemaForm.city_id,
                    address: cinemaForm.address,
                    facilities: cinemaForm.facilities.split(",").map((s) => s.trim()),
                  })
                }
                disabled={!cinemaForm.name || !cinemaForm.city_id || addCinemaMutation.isPending}
                className="btn-primary h-10 px-6 text-xs"
              >
                {addCinemaMutation.isPending ? "Creating..." : "Save Cinema"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD SCREEN (EXACT 200 SEATS AUTO-GENERATED) */}
      {showAddScreen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-neutral-200 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-black text-neutral-900 mb-2">Add Cinema Screen</h3>
            <p className="text-xs text-neutral-500 mb-4">
              This will automatically provision the <b>exact 200-seat system</b> (80 Platinum A-H + 120 Gold J-U).
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Select Cinema</label>
                <select
                  value={screenForm.cinema_id}
                  onChange={(e) => setScreenForm({ ...screenForm, cinema_id: e.target.value })}
                  className="input"
                >
                  <option value="">Choose Cinema...</option>
                  {cinemas?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city_name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Screen Name</label>
                <input
                  type="text"
                  value={screenForm.name}
                  onChange={(e) => setScreenForm({ ...screenForm, name: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddScreen(false)} className="btn-outline h-10 px-5 text-xs">
                Cancel
              </button>
              <button
                onClick={() =>
                  addScreenMutation.mutate({
                    cinema: screenForm.cinema_id,
                    name: screenForm.name,
                    supported_formats: screenForm.supported_formats.split(",").map((s) => s.trim()),
                  })
                }
                disabled={!screenForm.cinema_id || addScreenMutation.isPending}
                className="btn-primary h-10 px-6 text-xs"
              >
                {addScreenMutation.isPending ? "Generating 200 Seats..." : "Generate 200-Seat Screen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SCHEDULE SHOW */}
      {showAddShow && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-neutral-200 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-black text-neutral-900 mb-4">Schedule Show with 200 Seats</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Select Movie</label>
                <select
                  value={showForm.movie_id}
                  onChange={(e) => setShowForm({ ...showForm, movie_id: e.target.value })}
                  className="input"
                >
                  <option value="">Choose Movie...</option>
                  {movies?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Select Cinema</label>
                <select
                  value={screenForm.cinema_id}
                  onChange={(e) => {
                    setScreenForm({ ...screenForm, cinema_id: e.target.value });
                  }}
                  className="input"
                >
                  <option value="">Choose Cinema...</option>
                  {cinemas?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Show Date</label>
                  <input
                    type="date"
                    value={showForm.date}
                    onChange={(e) => setShowForm({ ...showForm, date: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={showForm.start_time}
                    onChange={(e) => setShowForm({ ...showForm, start_time: e.target.value + ":00" })}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Gold Price (₹)</label>
                  <input
                    type="number"
                    value={showForm.gold_price}
                    onChange={(e) => setShowForm({ ...showForm, gold_price: parseFloat(e.target.value) || 220 })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Platinum Price (₹)</label>
                  <input
                    type="number"
                    value={showForm.platinum_price}
                    onChange={(e) => setShowForm({ ...showForm, platinum_price: parseFloat(e.target.value) || 350 })}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddShow(false)} className="btn-outline h-10 px-5 text-xs">
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Find or pick a screen from cinema
                  const res = await api.get(`/shows/`);
                  // create show
                  const cin = cinemas?.find((c) => c.id === screenForm.cinema_id);
                  // fallback to direct API
                  addShowMutation.mutate({
                    movie: showForm.movie_id,
                    screen: cin?.screens?.[0]?.id || "f49964fa-1662-4217-a068-12d9b6ceae6c",
                    date: showForm.date,
                    start_time: showForm.start_time,
                    end_time: showForm.end_time,
                    format: showForm.format,
                    gold_price: showForm.gold_price,
                    platinum_price: showForm.platinum_price,
                  });
                }}
                disabled={!showForm.movie_id || !screenForm.cinema_id || addShowMutation.isPending}
                className="btn-primary h-10 px-6 text-xs"
              >
                {addShowMutation.isPending ? "Scheduling..." : "Schedule Show"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: any; icon: string; color: string }) {
  return (
    <div className="card p-5 border-neutral-200 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between text-neutral-400 mb-2">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{title}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}
