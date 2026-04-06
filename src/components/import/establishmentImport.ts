import { api } from "@/lib/api";
import type { CreateEstablishmentPayload } from "@/types/api";
import { pickColumn } from "@/lib/excel/columnPick";
import { cellToNumber } from "@/lib/excel/parseWorkbook";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}

export const ESTABLISHMENT_TEMPLATE_HEADERS = [
  "name",
  "center_lat",
  "center_lon",
  "radius_strict_m",
  "radius_relaxed_m",
  "establishment_type",
  "territory_code",
  "minesec_code",
  "contact_email",
  "contact_phone",
];

export const ESTABLISHMENT_TEMPLATE_SAMPLE = [
  [
    "Lycée exemple",
    "4.0511",
    "9.7679",
    "500",
    "800",
    "lycee",
    "CE-CENTRE",
    "M123",
    "",
    "",
  ],
];

function numFrom(row: Record<string, string>, aliases: string[]): number | null {
  const s = pickColumn(row, aliases);
  if (!s) return null;
  return cellToNumber(s);
}

export function validateEstablishmentRow(row: Record<string, string>, _excelRow: number): string | null {
  const name = pickColumn(row, ["name", "nom", "nom_officiel"]);
  if (!name.trim()) return "Nom manquant";
  const lat = numFrom(row, ["center_lat", "latitude", "lat"]);
  const lon = numFrom(row, ["center_lon", "longitude", "lon"]);
  if (lat == null || lat < -90 || lat > 90) return "Latitude invalide";
  if (lon == null || lon < -180 || lon > 180) return "Longitude invalide";
  const rs = numFrom(row, ["radius_strict_m", "rayon_strict", "rayon_strict_m"]);
  const rr = numFrom(row, ["radius_relaxed_m", "rayon_elargi", "rayon_relaxed_m"]);
  if (rs == null || rs <= 0) return "Rayon strict invalide";
  if (rr == null || rr <= 0) return "Rayon élargi invalide";
  if (rr < rs) return "Le rayon élargi doit être ≥ au rayon strict";
  const p = pickColumn(row, ["parent_establishment_id", "parent_id"]).trim();
  if (p && !isUuid(p)) return "parent_establishment_id invalide";
  const h = pickColumn(row, ["designated_host_user_id", "host_user_id"]).trim();
  if (h && !isUuid(h)) return "designated_host_user_id invalide";
  return null;
}

export function rowToEstablishmentPayload(row: Record<string, string>): CreateEstablishmentPayload {
  const name = pickColumn(row, ["name", "nom", "nom_officiel"]).trim();
  const lat = numFrom(row, ["center_lat", "latitude", "lat"])!;
  const lon = numFrom(row, ["center_lon", "longitude", "lon"])!;
  const rs = numFrom(row, ["radius_strict_m", "rayon_strict", "rayon_strict_m"])!;
  const rr = numFrom(row, ["radius_relaxed_m", "rayon_elargi", "rayon_relaxed_m"])!;
  const et = pickColumn(row, ["establishment_type", "type"]).trim() || "other";
  const territory = pickColumn(row, ["territory_code", "code_territoire", "territoire"]).trim() || null;
  const minesec = pickColumn(row, ["minesec_code", "code_minesec"]).trim() || null;
  const email = pickColumn(row, ["contact_email", "email"]).trim() || null;
  const phone = pickColumn(row, ["contact_phone", "telephone", "phone"]).trim() || null;
  const parentRaw = pickColumn(row, ["parent_establishment_id", "parent_id"]).trim();
  const hostRaw = pickColumn(row, ["designated_host_user_id", "host_user_id"]).trim();

  return {
    name,
    center_lat: lat,
    center_lon: lon,
    radius_strict_m: rs,
    radius_relaxed_m: rr,
    establishment_type: et,
    minesec_code: minesec,
    territory_code: territory,
    contact_email: email,
    contact_phone: phone,
    parent_establishment_id: parentRaw && isUuid(parentRaw) ? parentRaw : null,
    designated_host_user_id: hostRaw && isUuid(hostRaw) ? hostRaw : null,
  };
}

export async function importEstablishmentRow(row: Record<string, string>): Promise<void> {
  const body = rowToEstablishmentPayload(row);
  await api.post<{ establishment_id: string }>("/establishments", body);
}
