import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import type { Permission, Role } from "@/types/api";

type Props = {
  children: ReactNode;
  /** Une permission requise. */
  permission?: Permission;
  /** Plusieurs permissions : soit toutes (`requireAll`), soit au moins une (`anyOf`). */
  permissions?: Permission[];
  /** Si true avec `permissions`, toutes les permissions sont requises. Sinon au moins une. */
  requireAll?: boolean;
  /** Restreint aux rôles listés (ex. GET /roles). */
  rolesOnly?: Role[];
  /** Redirection si accès refusé. */
  to?: string;
};

/**
 * Protège une route : aligné sur les `RequirePermissionDep` / `RequireRolesDep` du backend.
 */
export function PermissionRoute({
  children,
  permission,
  permissions,
  requireAll = false,
  rolesOnly,
  to = "/",
}: Props) {
  const { hasPermission, hasAnyPermission, user } = useAuth();

  if (rolesOnly?.length) {
    if (!user || !rolesOnly.includes(user.role)) {
      return <Navigate to={to} replace />;
    }
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to={to} replace />;
  }

  if (permissions?.length) {
    const ok = requireAll
      ? permissions.every((p) => hasPermission(p))
      : hasAnyPermission(...permissions);
    if (!ok) return <Navigate to={to} replace />;
  }

  return <>{children}</>;
}
