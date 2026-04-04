import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Mission, PaginatedResponse, MissionStatusApi } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

const statusLabels: Record<MissionStatusApi, string> = {
  draft: "Brouillon",
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

const statusBadge: Record<MissionStatusApi, string> = {
  draft: "status-badge-neutral",
  planned: "status-badge-info",
  in_progress: "status-badge-info",
  completed: "status-badge-success",
  cancelled: "status-badge-danger",
};

export default function MissionsPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [skip, setSkip] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["missions", skip, statusFilter],
    queryFn: () =>
      api.get<PaginatedResponse<Mission>>("/missions", {
        skip,
        limit,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between page-header">
        <div>
          <h1 className="page-title">Missions</h1>
          <p className="page-description">Planification et suivi (API /v1/missions)</p>
        </div>
        {hasPermission("MISSION_CREATE") && (
          <Button onClick={() => navigate("/missions/new")} className="mt-3 sm:mt-0">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle mission
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setSkip(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-48 bg-card">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="data-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mission</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Établissement
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  Fenêtre
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Aucune mission trouvée
                  </td>
                </tr>
              ) : (
                data?.items.map((m) => (
                  <tr key={m.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {m.objective?.trim()
                          ? m.objective.slice(0, 80) + (m.objective.length > 80 ? "…" : "")
                          : `Mission ${m.id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">ID: {m.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground font-mono text-xs">
                      {m.establishment_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {new Date(m.window_start).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}{" "}
                      —{" "}
                      {new Date(m.window_end).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusBadge[m.status]}>{statusLabels[m.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/missions/${m.id}`)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {(data?.total ?? 0) > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {data?.total ?? 0} résultat{(data?.total ?? 0) > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={skip === 0}
                onClick={() => setSkip(Math.max(0, skip - limit))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={skip + limit >= (data?.total ?? 0)}
                onClick={() => setSkip(skip + limit)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
