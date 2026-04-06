/** Télécharge un modèle CSV UTF-8 (avec BOM Excel) pour la première ligne d’en-têtes. */
export function downloadCsvTemplate(filename: string, headers: string[], sampleRows?: string[][]): void {
  const BOM = "\uFEFF";
  const sep = ";";
  const lines: string[] = [headers.join(sep)];
  if (sampleRows?.length) {
    for (const row of sampleRows) {
      lines.push(row.map((c) => (c.includes(sep) || c.includes('"') ? `"${c.replace(/"/g, '""')}"` : c)).join(sep));
    }
  }
  const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
