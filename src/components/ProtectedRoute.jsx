import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";

/**
 * Route guard with two operating modes:
 *
 *  adminOnly   — only admins may enter; everyone else goes to /dashboard.
 *                Used for all /admin/* routes.
 *
 *  customerOnly — admins are redirected to /admin so they never accidentally
 *                use the customer panel. Used for /dashboard/* routes.
 *                (Regular customers pass through freely.)
 */
export default function ProtectedRoute({ children, adminOnly = false, customerOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner full />;

  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  if (adminOnly && !user.isAdmin)
    return <Navigate to="/dashboard" replace />;

  if (customerOnly && user.isAdmin)
    return <Navigate to="/admin" replace />;

  return children;
}
