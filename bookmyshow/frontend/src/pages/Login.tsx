import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiErrorMessage } from "../api/client";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      const redirectTo = (location.state as any)?.from ?? "/";
      navigate(redirectTo);
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-xl font-extrabold mb-6 text-center">Sign In</h1>
      <form onSubmit={submit} className="space-y-4">
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-primary w-full">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <p className="text-sm text-center mt-4 text-neutral-500">
        <Link to="/forgot-password" className="text-brand">Forgot password?</Link>
      </p>
      <p className="text-sm text-center mt-2 text-neutral-500">
        New here? <Link to="/register" className="text-brand font-medium">Create an account</Link>
      </p>
    </div>
  );
}
