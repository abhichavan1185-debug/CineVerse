import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCity } from "../hooks/useCity";
import { api, apiErrorMessage } from "../api/client";

export default function Profile() {
  const { me, refreshMe, logout } = useAuth();
  const { cities } = useCity();

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [preferredCity, setPreferredCity] = useState("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me) {
      setFullName(me.full_name ?? "");
      setAvatarUrl(me.avatar_url ?? "");
      setPreferredCity(me.preferred_city ?? "");
      setDob(me.date_of_birth ?? "");
    }
  }, [me]);

  if (!me) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      await api.patch("/auth/me/", {
        full_name: fullName,
        avatar_url: avatarUrl,
        preferred_city: preferredCity,
        date_of_birth: dob || null,
      });
      await refreshMe();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't save your profile."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <img
          src={avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(me.email)}`}
          alt=""
          className="w-16 h-16 rounded-full object-cover bg-neutral-200"
        />
        <div>
          <h1 className="text-lg font-bold">{fullName || me.email}</h1>
          <p className="text-sm text-neutral-500">{me.email}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <Link to="/bookings" className="btn-outline flex-1 text-center text-sm h-10 flex items-center justify-center">My Bookings</Link>
        <Link to="/watchlist" className="btn-outline flex-1 text-center text-sm h-10 flex items-center justify-center">My Watchlist</Link>
      </div>

      <form onSubmit={handleSave} className="card p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-neutral-500">Full name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-500">Avatar URL</label>
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="input mt-1" placeholder="https://..." />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-500">Preferred city</label>
          <select value={preferredCity} onChange={(e) => setPreferredCity(e.target.value)} className="input mt-1">
            <option value="">Not set</option>
            {cities.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-500">Date of birth</label>
          <input type="date" value={dob ?? ""} onChange={(e) => setDob(e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-500">Phone</label>
          <p className="input mt-1 flex items-center bg-neutral-50 text-neutral-500">{me.phone || "Not linked"}</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">Saved!</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <button onClick={logout} className="mt-6 w-full text-sm text-red-600 font-medium">
        Log out
      </button>
    </div>
  );
}
