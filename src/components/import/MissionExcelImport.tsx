import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ExcelImportDialog } from "@/components/import/ExcelImportDialog";
import {
  MISSION_TEMPLATE_HEADERS,
  MISSION_TEMPLATE_SAMPLE,
  validateMissionRow,
  importMissionRow,
} from "@/components/import/missionImport";
import { FileSpreadsheet } from "lucide-react";

type Props = {
  disabled?: boolean;
};

export function MissionExcelImport({ disabled }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const validateRow = useCallback((row: Record<string, string>, excelRow: number) => validateMissionRow(row, excelRow), []);

  const importRow = useCallback(async (row: Record<string, string>) => {
    await importMissionRow(row);
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
        title="Importer des missions"
        description="Colonnes : establishment_id, inspector_id (UUID), window_start et window_end en ISO 8601, requires_approval (true/false), puis optionnellement sms_code, objective, plan_reference, designated_host_user_id."
        templateFilename="modele_missions_sigis"
        templateHeaders={MISSION_TEMPLATE_HEADERS}
        templateSampleRows={MISSION_TEMPLATE_SAMPLE}
        validateRow={validateRow}
        importRow={(row) => importRow(row)}
        onImported={() => {
          void qc.invalidateQueries({ queryKey: ["missions"] });
          void qc.invalidateQueries({ queryKey: ["missions-summary"] });
        }}
      />
    </>
  );
}
