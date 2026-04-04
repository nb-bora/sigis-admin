import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import UserDetailPage from "@/pages/UserDetailPage";

/**
 * Aligné sur GET /v1/users/{id} : soi-même ou administrateurs nationaux / super.
 */
export function UserDetailRouteGuard() {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  if (!id || !user) return <Navigate to="/" replace />;
  const admin = hasRole("SUPER_ADMIN") || hasRole("NATIONAL_ADMIN");
  if (user.userId !== id && !admin) return <Navigate to="/" replace />;
  return <UserDetailPage />;
}
