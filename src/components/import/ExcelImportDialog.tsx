import { useCallback, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseWorkbookFirstSheet } from "@/lib/excel/parseWorkbook";
import { runInBatches } from "@/lib/excel/runBatches";
import { downloadCsvTemplate } from "@/lib/excel/downloadTemplate";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEFAULT_BATCH = 4;

export type ExcelImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  templateFilename: string;
  templateHeaders: string[];
  templateSampleRows?: string[][];
  /**
   * Retourne une erreur lisible si la ligne est invalide, sinon `null`.
   * `excelRowNumber` : numéro de ligne dans Excel (ligne 1 = en-têtes).
   */
  validateRow: (row: Record<string, string>, excelRowNumber: number) => string | null;
  /** Importe une ligne valide (appel API). */
  importRow: (row: Record<string, string>, excelRowNumber: number) => Promise<void>;
  batchSize?: number;
  onImported?: () => void;
  /** Champ optionnel (ex. mot de passe par défaut pour l’import utilisateurs). */
  extra?: ReactNode;
};

export function ExcelImportDialog({
  open,
  onOpenChange,
  title,
  description,
  templateFilename,
  templateHeaders,
  templateSampleRows,
  validateRow,
  importRow,
  batchSize = DEFAULT_BATCH,
  onImported,
  extra,
}: ExcelImportDialogProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<
    { row: Record<string, string>; excelRow: number; error: string | null }[] | null
  >(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [doneSummary, setDoneSummary] = useState<{ ok: number; fail: number } | null>(null);

  const resetState = useCallback(() => {
    setFileName(null);
    setPreview(null);
    setProgress(0);
    setDoneSummary(null);
  }, []);

  const handleClose = useCallback(
    (v: boolean) => {
      if (!v && !importing) {
        resetState();
      }
      onOpenChange(v);
    },
    [importing, onOpenChange, resetState],
  );

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
        toast.error("Format requis : .xlsx ou .xls");
        return;
      }
      setFileName(file.name);
      setDoneSummary(null);
      try {
        const { rows } = await parseWorkbookFirstSheet(file);
        if (rows.length === 0) {
          toast.error("Aucune donnée dans la première feuille.");
          setPreview([]);
          return;
        }
        const checked = rows.map((row, i) => {
          const excelRow = i + 2;
          const error = validateRow(row, excelRow);
          return { row, excelRow, error };
        });
        setPreview(checked);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Impossible de lire le fichier Excel.");
        setPreview(null);
      }
    },
    [validateRow],
  );

  const validRows = preview?.filter((p) => !p.error) ?? [];
  const invalidCount = preview?.filter((p) => p.error).length ?? 0;

  const runImport = useCallback(async () => {
    if (validRows.length === 0) {
      toast.error("Aucune ligne valide à importer.");
      return;
    }
    setImporting(true);
    setProgress(0);
    setDoneSummary(null);
    let ok = 0;
    let fail = 0;
    const total = validRows.length;
    let completed = 0;

    try {
      await runInBatches(validRows, batchSize, async (item) => {
        try {
          await importRow(item.row, item.excelRow);
          ok++;
        } catch (e) {
          fail++;
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[import]", item.excelRow, msg);
        } finally {
          completed++;
          setProgress(Math.round((completed / total) * 100));
        }
      });
      setDoneSummary({ ok, fail });
      if (ok > 0) {
        toast.success(`Import terminé : ${ok} réussie(s)${fail ? `, ${fail} échec(s)` : ""}.`);
        onImported?.();
      } else {
        toast.error("Toutes les lignes ont échoué côté serveur.");
      }
    } finally {
      setImporting(false);
    }
  }, [batchSize, importRow, onImported, validRows]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[min(90vh,720px)] max-w-2xl gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-border/60 bg-muted/20 px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden />
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          {extra ? <div className="rounded-xl border border-border/60 bg-muted/20 p-4">{extra}</div> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => downloadCsvTemplate(templateFilename, templateHeaders, templateSampleRows)}
            >
              Télécharger le modèle (.csv)
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excel-file" className="text-sm font-medium">
              Fichier Excel
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                disabled={importing}
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
              />
              {fileName && <span className="truncate text-xs text-muted-foreground">{fileName}</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              Utilisez la première feuille ; la première ligne doit contenir les en-têtes (voir modèle CSV). Lots de{" "}
              {batchSize} requêtes parallèles maximum.
            </p>
          </div>

          {preview && preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Aperçu : {validRows.length} ligne(s) valide(s)
                {invalidCount > 0 ? (
                  <span className="text-destructive"> · {invalidCount} ligne(s) ignorée(s) (erreurs)</span>
                ) : null}
              </p>
              <ScrollArea className="h-[min(40vh,240px)] rounded-xl border border-border/60">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr className="border-b border-border/60">
                      <th className="px-2 py-2 text-left font-medium">Ligne</th>
                      <th className="px-2 py-2 text-left font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 80).map((p) => (
                      <tr key={p.excelRow} className="border-b border-border/40">
                        <td className="px-2 py-1.5 font-mono">{p.excelRow}</td>
                        <td className={cn("px-2 py-1.5", p.error ? "text-destructive" : "text-emerald-700 dark:text-emerald-400")}>
                          {p.error ?? "OK"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 80 && (
                  <p className="border-t border-border/60 bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
                    … {preview.length - 80} autre(s) ligne(s) non affichée(s)
                  </p>
                )}
              </ScrollArea>
            </div>
          )}

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-xs text-muted-foreground">{progress}%</p>
            </div>
          )}

          {doneSummary && (
            <p className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm">
              Résumé : <span className="font-medium text-emerald-700">{doneSummary.ok} réussite(s)</span>
              {doneSummary.fail > 0 && (
                <>
                  {" "}
                  · <span className="font-medium text-destructive">{doneSummary.fail} échec(s)</span>
                </>
              )}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 bg-muted/10 px-6 py-4">
          <Button type="button" variant="outline" className="rounded-xl" disabled={importing} onClick={() => handleClose(false)}>
            Fermer
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={importing || validRows.length === 0}
            onClick={() => void runImport()}
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Import…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" aria-hidden />
                Importer {validRows.length} ligne(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
