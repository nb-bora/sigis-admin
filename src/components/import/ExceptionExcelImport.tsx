import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ExcelImportDialog } from "@/components/import/ExcelImportDialog";
import {
  EXCEPTION_TEMPLATE_HEADERS,
  EXCEPTION_TEMPLATE_SAMPLE,
  validateExceptionRow,
  importExceptionRow,
} from "@/components/import/exceptionImport";
import { FileSpreadsheet } from "lucide-react";

type Props = {
  disabled?: boolean;
};

export function ExceptionExcelImport({ disabled }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const validateRow = useCallback((row: Record<string, string>, excelRow: number) => validateExceptionRow(row, excelRow), []);

  const importRow = useCallback(async (row: Record<string, string>) => {
    await importExceptionRow(row);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl gap-1.5"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <FileSpreadsheet className="h-4 w-4" aria-hidden />
        Importer Excel
      </Button>
      <ExcelImportDialog
        open={open}
        onOpenChange={setOpen}
        title="Importer des signalements"
        description="Chaque ligne crée un signalement sur la mission indiquée (mission_id UUID). Le texte du message est limité à 4000 caractères. L’auteur est l’utilisateur connecté."
        templateFilename="modele_signalements_sigis"
        templateHeaders={EXCEPTION_TEMPLATE_HEADERS}
        templateSampleRows={EXCEPTION_TEMPLATE_SAMPLE}
        validateRow={validateRow}
        importRow={(row) => importRow(row)}
        onImported={() => {
          void qc.invalidateQueries({ queryKey: ["exceptions"] });
          void qc.invalidateQueries({ queryKey: ["exceptions-summary"] });
        }}
      />
    </>
  );
}
