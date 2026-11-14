import { Navigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

export default function RequirePlatformAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="d-flex vh-100 justify-content-center align-items-center"><div className="spinner-border text-primary" /></div>;
  if (!user || !user.isPlatformAdmin) return <Navigate to="/platform/login" replace />;
  return children;
}
