import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExcelImportDialog } from "@/components/import/ExcelImportDialog";
import {
  USER_TEMPLATE_HEADERS,
  USER_TEMPLATE_SAMPLE,
  validateUserRow,
  importUserRow,
} from "@/components/import/userImport";
import { FileSpreadsheet } from "lucide-react";

type Props = {
  disabled?: boolean;
};

export function UserExcelImport({ disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState("");
  const qc = useQueryClient();

  const validateRow = useCallback(
    (row: Record<string, string>, excelRow: number) =>
      validateUserRow(row, excelRow, defaultPassword.trim() || null),
    [defaultPassword],
  );

  const importRow = useCallback(
    async (row: Record<string, string>) => {
      await importUserRow(row, defaultPassword.trim() || null);
    },
    [defaultPassword],
  );

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
        title="Importer des utilisateurs"
        description="Colonnes : email, full_name, phone_number, password (ou laisser vide si mot de passe par défaut ci-dessous), role (INSPECTOR par défaut)."
        templateFilename="modele_utilisateurs_sigis"
        templateHeaders={USER_TEMPLATE_HEADERS}
        templateSampleRows={USER_TEMPLATE_SAMPLE}
        validateRow={validateRow}
        importRow={(row) => importRow(row)}
        onImported={() => {
          void qc.invalidateQueries({ queryKey: ["users"] });
        }}
        extra={
          <div className="space-y-2">
            <Label htmlFor="import-default-pw" className="text-sm">
              Mot de passe par défaut (si la colonne password est vide)
            </Label>
            <Input
              id="import-default-pw"
              type="password"
              autoComplete="new-password"
              placeholder="8 caractères minimum"
              value={defaultPassword}
              onChange={(e) => setDefaultPassword(e.target.value)}
              className="h-10 max-w-md rounded-lg"
            />
          </div>
        }
      />
    </>
  );
}
