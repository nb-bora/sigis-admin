import { normalizeHeaderKey } from "./parseWorkbook";

/** Récupère la première colonne non vide parmi des synonymes (après normalisation). */
export function pickColumn(row: Record<string, string>, aliases: string[]): string {
  for (const a of aliases) {
    const k = normalizeHeaderKey(a);
    if (k in row && row[k] !== "") return row[k];
  }
  return "";
}
