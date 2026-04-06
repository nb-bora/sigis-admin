import { type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import type { Permission, Role } from "@/types/api";

type Props = {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  rolesOnly?: Role[];
  fallback?: ReactNode;
};

/**
 * Affiche `children` uniquement si l’utilisateur a les droits attendus (JWT + matrice ROLE_PERMISSIONS).
 * À utiliser pour masquer boutons, menus et blocs (pas seulement les désactiver).
 */
export function PermissionGate({
  children,
  permission,
  permissions,
  requireAll = false,
  rolesOnly,
  fallback = null,
}: Props) {
  const { hasPermission, user } = useAuth();

  if (rolesOnly?.length) {
    if (!user || !rolesOnly.includes(user.role)) return <>{fallback}</>;
  }

  if (permission && !hasPermission(permission)) return <>{fallback}</>;

  if (permissions?.length) {
    const ok = requireAll
      ? permissions.every((p) => hasPermission(p))
      : permissions.some((p) => hasPermission(p));
    if (!ok) return <>{fallback}</>;
  }

  return <>{children}</>;
}
