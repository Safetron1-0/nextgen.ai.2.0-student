import { Navigate } from "react-router-dom";
import { auth } from "../api/api";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!auth.isLoggedIn()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
