import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ReportSummary, MissionStatusApi, ExceptionStatusApi, Permission } from "@/types/api";
import {
  ClipboardList,
  Building2,
  AlertTriangle,
  Users,
  FileSearch,
  ArrowRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="stat-card text-left w-full animate-fade-in"
      disabled={!onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </button>
  );
}

function StatSkeleton() {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>
    </div>
  );
}

const missionStatusLabels: Record<MissionStatusApi, string> = {
  draft: "Brouillon",
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

const exceptionStatusLabels: Record<ExceptionStatusApi, string> = {
  new: "Nouveau",
  acknowledged: "Pris en compte",
  resolved: "Résolu",
  escalated: "Escaladé",
};

type QuickLink = { label: string; path: string; permission: Permission | "always" };

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["report-summary"],
    queryFn: () => api.get<ReportSummary>("/reports/summary"),
    enabled: hasPermission("REPORT_READ"),
    retry: 1,
  });

  const quickLinks: QuickLink[] = [
    { label: "Missions", path: "/missions", permission: "MISSION_READ" },
    { label: "Établissements", path: "/etablissements", permission: "ESTABLISHMENT_READ" },
    { label: "Signalements", path: "/signalements", permission: "EXCEPTION_READ" },
    { label: "Utilisateurs", path: "/utilisateurs", permission: "USER_LIST" },
    { label: "Pilotage", path: "/pilotage", permission: "REPORT_READ" },
    { label: "Audit", path: "/audit", permission: "AUDIT_READ" },
    { label: "Paramètres", path: "/parametres", permission: "always" },
  ];

  const visibleQuick = quickLinks.filter(
    (l) => l.permission === "always" || hasPermission(l.permission)
  );

  if (!hasPermission("REPORT_READ")) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-description">Bienvenue sur SIGIS — accès selon vos permissions</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-8">
          <div className="flex items-start gap-3 mb-6">
            <FileSearch className="w-10 h-10 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-foreground font-medium">Indicateurs agrégés</p>
              <p className="text-sm text-muted-foreground mt-1">
                Les KPI et graphiques du pilotage nécessitent la permission REPORT_READ.
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Accès rapide :</p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {visibleQuick.map((l) => (
              <li key={l.path}>
                <button
                  type="button"
                  onClick={() => navigate(l.path)}
                  className="w-full flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-foreground">{l.label}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-description">Vue d'ensemble alignée sur l'API SIGIS</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Missions"
              value={data?.missions_total ?? 0}
              icon={ClipboardList}
              color="bg-primary/10 text-primary"
              onClick={() => navigate("/missions")}
            />
            <StatCard
              label="Établissements"
              value={data?.establishments_total ?? 0}
              icon={Building2}
              color="bg-info/10 text-info"
              onClick={() => navigate("/etablissements")}
            />
            <StatCard
              label="Signalements"
              value={data?.exception_requests_total ?? 0}
              icon={AlertTriangle}
              color="bg-warning/10 text-warning"
              onClick={() => navigate("/signalements")}
            />
            <StatCard
              label="Utilisateurs"
              value={data?.users_total ?? 0}
              icon={Users}
              color="bg-success/10 text-success"
              onClick={() => navigate("/utilisateurs")}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Missions par statut</h2>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(data?.missions_by_status ?? {}).map(([status, count]) => {
                const total = data?.missions_total || 1;
                const pct = Math.round(((count ?? 0) / total) * 100);
                const label = missionStatusLabels[status as MissionStatusApi] ?? status;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Signalements par statut</h2>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(data?.exception_requests_by_status ?? {}).map(([status, count]) => {
                const colorMap: Record<string, string> = {
                  new: "status-badge-warning",
                  acknowledged: "status-badge-info",
                  resolved: "status-badge-success",
                  escalated: "status-badge-neutral",
                };
                const label = exceptionStatusLabels[status as ExceptionStatusApi] ?? status;
                return (
                  <div
                    key={status}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <span className={colorMap[status] ?? "status-badge-neutral"}>{label}</span>
                    <span className="text-lg font-semibold text-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
