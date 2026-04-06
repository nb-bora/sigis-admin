import { api } from "@/lib/api";
import type { CreateMissionPayload } from "@/types/api";
import { pickColumn } from "@/lib/excel/columnPick";
import { cellToBool } from "@/lib/excel/parseWorkbook";

export const MISSION_TEMPLATE_HEADERS = [
  "establishment_id",
  "inspector_id",
  "window_start",
  "window_end",
  "requires_approval",
  "sms_code",
  "objective",
  "plan_reference",
  "designated_host_user_id",
];

export const MISSION_TEMPLATE_SAMPLE = [
  [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
    "2026-04-10T08:00:00+01:00",
    "2026-04-10T17:00:00+01:00",
    "false",
    "",
    "Inspection pédagogique",
    "",
    "",
  ],
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}

export function validateMissionRow(row: Record<string, string>, _excelRow: number): string | null {
  const est = pickColumn(row, ["establishment_id", "etablissement_id", "establishment"]);
  const ins = pickColumn(row, ["inspector_id", "inspecteur_id", "inspector"]);
  if (!isUuid(est)) return "establishment_id UUID invalide";
  if (!isUuid(ins)) return "inspector_id UUID invalide";
  const ws = pickColumn(row, ["window_start", "debut", "start"]).trim();
  const we = pickColumn(row, ["window_end", "fin", "end"]).trim();
  if (!ws || !we) return "Fenêtre horaire manquante";
  const d1 = new Date(ws);
  const d2 = new Date(we);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return "Dates invalides (ISO 8601)";
  if (d2 <= d1) return "window_end doit être après window_start";
  return null;
}

export function rowToMissionPayload(row: Record<string, string>): CreateMissionPayload {
  const establishment_id = pickColumn(row, ["establishment_id", "etablissement_id"]).trim();
  const inspector_id = pickColumn(row, ["inspector_id", "inspecteur_id"]).trim();
  const window_start = pickColumn(row, ["window_start", "debut"]).trim();
  const window_end = pickColumn(row, ["window_end", "fin"]).trim();
  const reqRaw = pickColumn(row, ["requires_approval", "approbation", "draft"]);
  const requires_approval = reqRaw ? cellToBool(reqRaw) : false;
  const sms_code = pickColumn(row, ["sms_code", "code_sms"]).trim() || null;
  const objective = pickColumn(row, ["objective", "objectif"]).trim() || null;
  const plan_reference = pickColumn(row, ["plan_reference", "ref_plan"]).trim() || null;
  const designated_host_user_id = pickColumn(row, ["designated_host_user_id", "host_id"]).trim() || null;

  return {
    establishment_id,
    inspector_id,
    window_start,
    window_end,
    requires_approval,
    sms_code,
    objective,
    plan_reference,
    designated_host_user_id,
  };
}

export async function importMissionRow(row: Record<string, string>): Promise<void> {
  const body = rowToMissionPayload(row);
  await api.post("/missions", body);
}
