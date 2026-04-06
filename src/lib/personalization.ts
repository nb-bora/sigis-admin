import type { Role } from "@/types/api";
import type { TranslateFn } from "@/lib/rbac";

/**
 * Texte i18n spécifique au rôle : `baseKey.ROLE` si présent, sinon `fallbackKey`.
 */
export function tRoleAware(t: TranslateFn, baseKey: string, role: Role, fallbackKey: string): string {
  const roleKey = `${baseKey}.${role}`;
  const translated = t(roleKey);
  return translated === roleKey ? t(fallbackKey) : translated;
}

/** Prénom ou partie locale de l’e-mail pour salutation. */
export function shortDisplayName(fullName: string | undefined, email: string | undefined): string {
  const n = fullName?.trim();
  if (n) {
    const first = n.split(/\s+/).find((p) => p.length > 0);
    return first ?? n;
  }
  const e = email?.trim();
  if (!e) return "";
  const local = e.split("@")[0];
  return local && local.length > 0 ? local : e;
}

/** Priorise les entrées d’accès rapide selon le métier du rôle (paths). */
const QUICK_PATH_PRIORITY: Record<Role, string[]> = {
  SUPER_ADMIN: [
    "/missions",
    "/pilotage",
    "/utilisateurs",
    "/etablissements",
    "/signalements",
    "/audit",
    "/observabilite",
    "/roles",
    "/parametres",
  ],
  NATIONAL_ADMIN: [
    "/missions",
    "/pilotage",
    "/utilisateurs",
    "/etablissements",
    "/signalements",
    "/audit",
    "/observabilite",
    "/roles",
    "/parametres",
  ],
  REGIONAL_SUPERVISOR: [
    "/missions",
    "/pilotage",
    "/signalements",
    "/etablissements",
    "/utilisateurs",
    "/parametres",
  ],
  INSPECTOR: ["/missions", "/etablissements", "/signalements", "/parametres"],
  HOST: ["/missions", "/etablissements", "/signalements", "/parametres"],
};

export function sortQuickLinksByPath<T extends { path: string }>(items: T[], role: Role): T[] {
  const order = QUICK_PATH_PRIORITY[role] ?? [];
  const index = (path: string) => {
    const i = order.indexOf(path);
    return i === -1 ? 999 : i;
  };
  return [...items].sort((a, b) => index(a.path) - index(b.path));
}
