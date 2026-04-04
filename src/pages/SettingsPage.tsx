import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { HealthResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Activity } from "lucide-react";

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Administrateur",
  NATIONAL_ADMIN: "Administrateur National",
  REGIONAL_SUPERVISOR: "Superviseur Régional",
  INSPECTOR: "Inspecteur",
  HOST: "Hôte",
};

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const { data: health } = useQuery({
    queryKey: ["api-health"],
    queryFn: () => api.get<HealthResponse>("/health"),
    staleTime: 30_000,
    retry: 1,
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Paramètres</h1>
        <p className="page-description">Compte et connectivité API</p>
      </div>

      <div className="grid gap-4 max-w-lg">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
            <Activity className="w-4 h-4" />
            API (GET /v1/health)
          </div>
          {health ? (
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Statut :</span>{" "}
                <span className="status-badge-success">{health.status}</span>
              </p>
              <p className="text-muted-foreground font-mono text-xs">{health.service}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Vérification…</p>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">ID : {user?.userId.slice(0, 12)}…</p>
              {user && (
                <p className="mt-1">
                  <span className="status-badge-info">{roleLabels[user.role] ?? user.role}</span>
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={logout}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
