/** Saisie locale `<input type="datetime-local" />` ↔ ISO UTC (API). */

export function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isoToLocalDatetime(iso: string): string {
  return toLocalDatetimeValue(new Date(iso));
}

export function localDatetimeToIso(local: string): string {
  const t = Date.parse(local);
  if (Number.isNaN(t)) throw new Error("Date invalide");
  return new Date(t).toISOString();
}

export function defaultWindowStart(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return toLocalDatetimeValue(d);
}

export function defaultWindowEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return toLocalDatetimeValue(d);
}

/** `yyyy-mm-dd` → début / fin de journée locale en ISO (filtres plage missions). */
export function localDateStartIso(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) throw new Error("Date invalide");
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

export function localDateEndIso(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) throw new Error("Date invalide");
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}
