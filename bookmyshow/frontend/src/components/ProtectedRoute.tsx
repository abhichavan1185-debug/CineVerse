import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!me) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}
