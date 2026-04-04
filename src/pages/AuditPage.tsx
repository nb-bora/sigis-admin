import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditLog, PaginatedResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AuditPage() {
  const [skip, setSkip] = useState(0);
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", skip],
    queryFn: () => api.get<PaginatedResponse<AuditLog>>("/audit-logs", { skip, limit }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Journal d'audit</h1>
        <p className="page-description">Entrées applicatives (API /v1/audit-logs)</p>
      </div>

      <div className="data-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Acteur</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Ressource
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  Requête
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
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
                    Aucune entrée d'audit
                  </td>
                </tr>
              ) : (
                data?.items.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-foreground font-mono text-xs">
                      {log.actor_user_id ? log.actor_user_id.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="status-badge-info">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {log.resource_type}
                      {log.resource_id ? ` · ${log.resource_id.slice(0, 12)}…` : ""}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs font-mono">
                      {log.request_id ?? "—"}
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
              {data?.total ?? 0} entrée{(data?.total ?? 0) > 1 ? "s" : ""}
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
