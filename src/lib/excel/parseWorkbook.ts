import * as XLSX from "xlsx";

/** Normalise les en-têtes de colonnes pour correspondre aux clés attendues (insensible à la casse / espaces). */
export function normalizeHeaderKey(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function cellToString(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number" && Number.isFinite(v)) {
    // Excel peut stocker des dates en nombre de jours
    return String(v);
  }
  return String(v).trim();
}

export function cellToNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function cellToBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = cellToString(v).toLowerCase();
  return s === "true" || s === "1" || s === "oui" || s === "yes" || s === "o";
}

export type ParsedSheet = {
  headers: string[];
  rows: Record<string, string>[];
};

/**
 * Lit la première feuille d’un fichier .xlsx / .xls et renvoie des lignes avec clés normalisées.
 */
export function parseWorkbookFirstSheet(file: File): Promise<ParsedSheet> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target?.result;
        if (!buf || !(buf instanceof ArrayBuffer)) {
          reject(new Error("Fichier vide ou illisible."));
          return;
        }
        const data = new Uint8Array(buf);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) {
          resolve({ headers: [], rows: [] });
          return;
        }
        const sheet = wb.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
          raw: false,
        });
        if (raw.length === 0) {
          resolve({ headers: [], rows: [] });
          return;
        }
        const rawHeaders = Object.keys(raw[0]);
        const headers = rawHeaders.map((h) => normalizeHeaderKey(h));
        const rows: Record<string, string>[] = raw.map((row) => {
          const o: Record<string, string> = {};
          rawHeaders.forEach((rh, i) => {
            const key = headers[i];
            const val = row[rh];
            if (val instanceof Date) {
              o[key] = val.toISOString();
            } else if (val != null && val !== "") {
              o[key] = String(val).trim();
            } else {
              o[key] = "";
            }
          });
          return o;
        });
        resolve({ headers, rows });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsArrayBuffer(file);
  });
}
