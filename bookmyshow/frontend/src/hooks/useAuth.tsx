import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore } from "../api/client";

interface Me {
  email: string;
  phone: string | null;
  full_name: string;
  preferred_city: string;
  avatar_url: string;
  date_of_birth: string | null;
  is_admin?: boolean;
  is_staff?: boolean;
}

interface AuthContextShape {
  me: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextShape | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    if (!tokenStore.getAccess()) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<Me>("/auth/me/");
      setMe(res.data);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login/", { email, password });
    tokenStore.set(res.data.access, res.data.refresh);
    await refreshMe();
  };

  const logout = () => {
    tokenStore.clear();
    setMe(null);
  };

  return (
    <AuthContext.Provider value={{ me, loading, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
