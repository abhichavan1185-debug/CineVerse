import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", phone: "", password: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/register/", form);
      setMessage(res.data.message);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not register — please check your details."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-xl font-extrabold mb-6 text-center">Create Account</h1>
      <form onSubmit={submit} className="space-y-4">
        <input required placeholder="Username" value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="w-full h-11 px-4 border border-neutral-300 rounded-lg" />
        <input type="email" required placeholder="Email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full h-11 px-4 border border-neutral-300 rounded-lg" />
        <input placeholder="Phone" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full h-11 px-4 border border-neutral-300 rounded-lg" />
        <input type="password" required placeholder="Password (min 8 chars)" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full h-11 px-4 border border-neutral-300 rounded-lg" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button disabled={loading} className="w-full h-11 rounded-full bg-brand text-white font-semibold disabled:opacity-50">
          {loading ? "Creating..." : "Register"}
        </button>
      </form>
      <p className="text-sm text-center mt-4 text-neutral-500">
        Already have an account? <Link to="/login" className="text-brand font-medium">Sign In</Link>
      </p>
    </div>
  );
}
