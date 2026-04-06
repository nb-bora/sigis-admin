import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ExcelImportDialog } from "@/components/import/ExcelImportDialog";
import {
  ESTABLISHMENT_TEMPLATE_HEADERS,
  ESTABLISHMENT_TEMPLATE_SAMPLE,
  validateEstablishmentRow,
  importEstablishmentRow,
} from "@/components/import/establishmentImport";
import { FileSpreadsheet } from "lucide-react";

type Props = {
  disabled?: boolean;
};

export function EstablishmentExcelImport({ disabled }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const validateRow = useCallback((row: Record<string, string>, excelRow: number) => validateEstablishmentRow(row, excelRow), []);

  const importRow = useCallback(async (row: Record<string, string>) => {
    await importEstablishmentRow(row);
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
        title="Importer des établissements"
        description="Première feuille : une ligne d’en-têtes puis une ligne par établissement. Colonnes : name, center_lat, center_lon, radius_strict_m, radius_relaxed_m (obligatoires), puis optionnellement establishment_type, territory_code, minesec_code, contact_email, contact_phone, parent_establishment_id, designated_host_user_id."
        templateFilename="modele_etablissements_sigis"
        templateHeaders={ESTABLISHMENT_TEMPLATE_HEADERS}
        templateSampleRows={ESTABLISHMENT_TEMPLATE_SAMPLE}
        validateRow={validateRow}
        importRow={(row) => importRow(row)}
        onImported={() => {
          void qc.invalidateQueries({ queryKey: ["establishments"] });
          void qc.invalidateQueries({ queryKey: ["establishments-summary"] });
        }}
      />
    </>
  );
}
