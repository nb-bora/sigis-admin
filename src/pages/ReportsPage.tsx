import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Download, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const { hasPermission } = useAuth();

  const handleExportCSV = async () => {
    try {
      await api.downloadFile("/reports/missions.csv", `missions_export_${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Export téléchargé");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'export");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Pilotage & Rapports</h1>
        <p className="page-description">Exports et indicateurs de suivi</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Export des missions</h3>
              <p className="text-xs text-muted-foreground">Télécharger les données au format CSV</p>
            </div>
          </div>
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Télécharger le CSV
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-info" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Indicateurs synthétiques</h3>
              <p className="text-xs text-muted-foreground">Consultez le tableau de bord pour les KPIs</p>
            </div>
          </div>
          <Button onClick={() => window.location.href = "/"} variant="outline" size="sm">
            Voir le tableau de bord
          </Button>
        </div>
      </div>
    </div>
  );
}
