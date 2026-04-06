import { api } from "@/lib/api";
import { pickColumn } from "@/lib/excel/columnPick";

export const EXCEPTION_TEMPLATE_HEADERS = ["mission_id", "message"];

export const EXCEPTION_TEMPLATE_SAMPLE = [
  ["00000000-0000-4000-8000-000000000010", "Problème de périmètre constaté sur le terrain."],
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateExceptionRow(row: Record<string, string>, _excelRow: number): string | null {
  const mid = pickColumn(row, ["mission_id", "mission"]).trim();
  const message = pickColumn(row, ["message", "texte", "description"]).trim();
  if (!UUID_RE.test(mid)) return "mission_id UUID invalide";
  if (!message || message.length < 1) return "Message manquant";
  if (message.length > 4000) return "Message trop long (max 4000)";
  return null;
}

export async function importExceptionRow(row: Record<string, string>): Promise<void> {
  const mission_id = pickColumn(row, ["mission_id", "mission"]).trim();
  const message = pickColumn(row, ["message", "texte", "description"]).trim();
  await api.post(`/missions/${mission_id}/exception-requests`, { message });
}
