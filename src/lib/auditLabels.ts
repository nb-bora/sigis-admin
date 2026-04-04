import type { TranslateFn } from "@/lib/rbac";

/** Valeurs connues pour les filtres (étendues par la recherche libre `q`). */
export const KNOWN_AUDIT_ACTIONS = [
  "mission.approve",
  "mission.cancel",
  "mission.reassign",
  "mission.outcome",
  "exception.patch",
] as const;

export const KNOWN_AUDIT_RESOURCE_TYPES = ["mission", "exception_request"] as const;

export function auditActionLabel(action: string, t: TranslateFn): string {
  const key = `audit.action.${action}`;
  const v = t(key);
  return v !== key ? v : action;
}

export function auditResourceTypeLabel(resourceType: string, t: TranslateFn): string {
  const key = `audit.resource.${resourceType}`;
  const v = t(key);
  return v !== key ? v : resourceType;
}
