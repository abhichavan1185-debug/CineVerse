import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCity } from "../hooks/useCity";
import Logo from "./Logo";
import SearchBar from "./SearchBar";

const NAV_LINKS = [
  { label: "Movies", to: "/movies" },
  { label: "Now Showing", to: "/movies?status=now_showing" },
  { label: "Coming Soon", to: "/movies?status=coming_soon" },
  { label: "Offers", to: "/offers" },
  { label: "Events", to: "/events" },
];

export default function Header() {
  const { me, logout } = useAuth();
  const { city } = useCity();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop header */}
      <header className="hidden md:flex items-center justify-between px-8 h-20 bg-white/95 backdrop-blur-md border-b border-neutral-100 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-8">
          <Link to="/" aria-label="CineVerse home">
            <Logo className="h-10 w-auto" />
          </Link>

          {/* Location button with Maharashtra badge */}
          <button
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100/80 hover:bg-brand-50/80 text-neutral-800 hover:text-brand border border-neutral-200/70 text-xs font-semibold transition-all group"
            onClick={() => navigate("/location")}
            title="Change Maharashtra City"
          >
            <span className="text-brand group-hover:scale-110 transition-transform">📍</span>
            <span>{city}</span>
            <span className="text-[10px] text-neutral-400 group-hover:text-brand">▼</span>
          </button>
        </div>

        {/* Global Search */}
        <div className="flex-1 max-w-xl mx-8">
          <SearchBar placeholder="Search movies, actors, genres in Maharashtra..." className="w-full" />
        </div>

        {/* Navigation links */}
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-6 text-sm font-semibold">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`transition-colors py-1 ${
                  isActive(l.to)
                    ? "text-brand border-b-2 border-brand"
                    : "text-neutral-600 hover:text-brand"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* User / Admin Controls */}
          {me ? (
            <div className="flex items-center gap-3.5 pl-3 border-l border-neutral-200">
              {me.is_admin && (
                <Link
                  to="/admin-dashboard"
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-gold text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span>⚡</span> Admin
                </Link>
              )}

              <Link
                to="/watchlist"
                className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-brand-50 text-neutral-600 hover:text-brand flex items-center justify-center text-sm transition-colors"
                title="Watchlist"
              >
                ♥
              </Link>

              <Link
                to="/bookings"
                className="text-xs font-semibold text-neutral-700 hover:text-brand transition-colors"
              >
                My Tickets
              </Link>

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 text-xs font-bold text-neutral-900 bg-neutral-100 hover:bg-neutral-200/80 px-3 py-1.5 rounded-full transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-[10px] font-black">
                    {(me.full_name || me.email)[0].toUpperCase()}
                  </span>
                  <span>{(me.full_name || me.email).split("@")[0]}</span>
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-neutral-100 py-2 z-50 animate-in fade-in slide-in-from-top-1"
                    onClick={() => setMenuOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-neutral-100">
                      <p className="text-xs text-neutral-400">Signed in as</p>
                      <p className="text-xs font-bold truncate">{me.email}</p>
                    </div>
                    {me.is_admin && (
                      <Link
                        to="/admin-dashboard"
                        className="block px-4 py-2 text-xs text-brand font-semibold hover:bg-brand-50"
                      >
                        ⚡ Admin Dashboard
                      </Link>
                    )}
                    <Link to="/profile" className="block px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50">
                      My Profile
                    </Link>
                    <Link to="/bookings" className="block px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50">
                      My Bookings & Tickets
                    </Link>
                    <Link to="/watchlist" className="block px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50">
                      Saved Movies
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 border-t border-neutral-100 mt-1 font-semibold"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link to="/login" className="btn-primary h-10 px-6 text-sm">
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white/95 backdrop-blur-md border-b border-neutral-100 shadow-sm sticky top-0 z-40">
        <Link to="/" aria-label="CineVerse home">
          <Logo className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          <button
            className="text-xs bg-neutral-100 text-neutral-700 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
            onClick={() => navigate("/location")}
          >
            <span>📍</span> {city}
          </button>
          <Link
            to={me ? "/profile" : "/login"}
            className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm"
          >
            👤
          </Link>
        </div>
      </header>
      <div className="md:hidden px-3 py-2 bg-white border-b border-neutral-100">
        <SearchBar placeholder="Search movies in Maharashtra..." />
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-neutral-200/80 flex justify-around py-2 text-[11px] font-semibold text-neutral-500 shadow-lg">
        <Link
          to="/"
          className={`flex flex-col items-center gap-0.5 ${isActive("/") ? "text-brand" : "hover:text-neutral-900"}`}
        >
          <span className="text-lg">🏠</span>Home
        </Link>
        <Link
          to="/movies"
          className={`flex flex-col items-center gap-0.5 ${isActive("/movies") ? "text-brand" : "hover:text-neutral-900"}`}
        >
          <span className="text-lg">🎬</span>Movies
        </Link>
        <Link
          to="/bookings"
          className={`flex flex-col items-center gap-0.5 ${isActive("/bookings") ? "text-brand" : "hover:text-neutral-900"}`}
        >
          <span className="text-lg">🎟️</span>Tickets
        </Link>
        <Link
          to="/offers"
          className={`flex flex-col items-center gap-0.5 ${isActive("/offers") ? "text-brand" : "hover:text-neutral-900"}`}
        >
          <span className="text-lg">🏷️</span>Offers
        </Link>
        <Link
          to={me ? (me.is_admin ? "/admin-dashboard" : "/profile") : "/login"}
          className={`flex flex-col items-center gap-0.5 ${isActive("/profile") || isActive("/admin-dashboard") ? "text-brand" : "hover:text-neutral-900"}`}
        >
          <span className="text-lg">{me?.is_admin ? "⚡" : "👤"}</span>
          {me?.is_admin ? "Admin" : "Profile"}
        </Link>
      </nav>
    </>
  );
}
