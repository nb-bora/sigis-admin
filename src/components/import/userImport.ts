import { api } from "@/lib/api";
import type { RegisterUserPayload, Role } from "@/types/api";
import { pickColumn } from "@/lib/excel/columnPick";

export const USER_TEMPLATE_HEADERS = ["email", "full_name", "phone_number", "password", "role"];

export const USER_TEMPLATE_SAMPLE = [
  ["nouveau.user@example.cm", "Nom Prénom", "677123456", "ChangeMe123!", "INSPECTOR"],
];

const ROLES: Role[] = ["SUPER_ADMIN", "NATIONAL_ADMIN", "REGIONAL_SUPERVISOR", "INSPECTOR", "HOST"];

function parseRole(s: string): Role | null {
  const u = s.trim().toUpperCase();
  return ROLES.includes(u as Role) ? (u as Role) : null;
}

export function validateUserRow(
  row: Record<string, string>,
  _excelRow: number,
  defaultPassword: string | null,
): string | null {
  const email = pickColumn(row, ["email", "courriel", "mail"]).trim();
  const full_name = pickColumn(row, ["full_name", "nom", "nom_complet"]).trim();
  const phone_number = pickColumn(row, ["phone_number", "telephone", "tel", "mobile"]).trim();
  const password = pickColumn(row, ["password", "mot_de_passe", "mdp"]).trim() || defaultPassword?.trim() || "";
  if (!email || !email.includes("@")) return "E-mail invalide";
  if (full_name.length < 2) return "Nom trop court";
  if (phone_number.length < 9) return "Téléphone manquant ou trop court";
  if (password.length < 8) return "Mot de passe < 8 caractères (colonne ou mot de passe par défaut)";
  const roleStr = pickColumn(row, ["role"]).trim() || "INSPECTOR";
  if (!parseRole(roleStr)) return `Rôle invalide (${ROLES.join(", ")})`;
  return null;
}

export function rowToUserPayload(row: Record<string, string>, defaultPassword: string | null): RegisterUserPayload {
  const email = pickColumn(row, ["email", "courriel"]).trim();
  const full_name = pickColumn(row, ["full_name", "nom", "nom_complet"]).trim();
  const phone_number = pickColumn(row, ["phone_number", "telephone", "tel"]).trim();
  const password = pickColumn(row, ["password", "mot_de_passe"]).trim() || defaultPassword?.trim() || "";
  const role = parseRole(pickColumn(row, ["role"]).trim() || "INSPECTOR")!;
  return { email, full_name, phone_number, password, role };
}

export async function importUserRow(row: Record<string, string>, defaultPassword: string | null): Promise<void> {
  const body = rowToUserPayload(row, defaultPassword);
  await api.post("/auth/register", body);
}
