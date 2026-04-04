import type { Permission, Role } from "@/types/api";

/** Ordre d’affichage des rôles (du plus élevé au plus opérationnel). */
export const ROLE_ORDER: Role[] = [
  "SUPER_ADMIN",
  "NATIONAL_ADMIN",
  "REGIONAL_SUPERVISOR",
  "INSPECTOR",
  "HOST",
];

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export function roleLabel(role: Role, t: TranslateFn): string {
  return t(`rbac.roles.${role}.label`);
}

export function roleBadge(role: Role, t: TranslateFn): string {
  return t(`rbac.roles.${role}.badge`);
}

export function roleDescription(role: Role, t: TranslateFn): string {
  return t(`rbac.roles.${role}.description`);
}

export function permissionPrefixLabel(prefix: string, t: TranslateFn): string {
  const key = `rbac.prefix.${prefix}`;
  const v = t(key);
  return v !== key ? v : prefix;
}

export function permissionLabel(code: string, t: TranslateFn): string {
  const p = code as Permission;
  const key = `rbac.permissions.${p}.label`;
  const v = t(key);
  return v !== key ? v : code;
}

export function permissionDescription(code: string, t: TranslateFn): string {
  const p = code as Permission;
  const key = `rbac.permissions.${p}.description`;
  return t(key);
}

/** Ordre stable pour la matrice (domaine puis code). */
export const PERMISSIONS_ORDER: Permission[] = [
  "ESTABLISHMENT_CREATE",
  "ESTABLISHMENT_READ",
  "ESTABLISHMENT_UPDATE",
  "MISSION_CREATE",
  "MISSION_READ",
  "MISSION_UPDATE",
  "MISSION_APPROVE",
  "MISSION_CANCEL",
  "MISSION_REASSIGN",
  "MISSION_OUTCOME_WRITE",
  "VISIT_CHECKIN",
  "VISIT_HOST_CONFIRM",
  "VISIT_CHECKOUT",
  "VISIT_READ",
  "EXCEPTION_CREATE",
  "EXCEPTION_READ",
  "EXCEPTION_UPDATE_STATUS",
  "EXCEPTION_MANAGE",
  "USER_LIST",
  "USER_READ",
  "USER_UPDATE",
  "USER_MANAGE_ROLES",
  "AUTH_REGISTER_USER",
  "ROLE_READ",
  "ROLE_MANAGE_PERMISSIONS",
  "REPORT_READ",
  "AUDIT_READ",
];

export function permissionPrefix(code: string): string {
  const i = code.indexOf("_");
  return i === -1 ? code : code.slice(0, i);
}
