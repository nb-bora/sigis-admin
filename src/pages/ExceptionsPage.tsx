import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ExceptionRequest, PaginatedResponse, ExceptionStatusApi } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Eye, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useEffect } from "react";

const statusLabels: Record<ExceptionStatusApi, string> = {
  new: "Nouveau",
  acknowledged: "Pris en compte",
  resolved: "Résolu",
  escalated: "Escaladé",
};

const statusBadge: Record<ExceptionStatusApi, string> = {
  new: "status-badge-warning",
  acknowledged: "status-badge-info",
  resolved: "status-badge-success",
  escalated: "status-badge-neutral",
};

export default function ExceptionsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [skip, setSkip] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEx, setSelectedEx] = useState<ExceptionRequest | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [assignUserId, setAssignUserId] = useState("");
  const [manageComment, setManageComment] = useState("");
  const [slaLocal, setSlaLocal] = useState("");
  const limit = 20;

  useEffect(() => {
    if (!selectedEx) return;
    setAssignUserId(selectedEx.assigned_to_user_id ?? "");
    setManageComment(selectedEx.internal_comment ?? "");
    if (selectedEx.sla_due_at) {
      const d = new Date(selectedEx.sla_due_at);
      const pad = (n: number) => String(n).padStart(2, "0");
      setSlaLocal(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      );
    } else {
      setSlaLocal("");
    }
  }, [selectedEx]);

  const { data, isLoading } = useQuery({
    queryKey: ["exceptions", skip, statusFilter],
    queryFn: () =>
      api.get<PaginatedResponse<ExceptionRequest>>("/exception-requests", {
        skip,
        limit,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/exception-requests/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Statut mis à jour");
      queryClient.invalidateQueries({ queryKey: ["exceptions"] });
      setSelectedEx(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const manageMutation = useMutation({
    mutationFn: (payload: {
      status?: ExceptionStatusApi;
      assigned_to_user_id?: string | null;
      internal_comment?: string | null;
      sla_due_at?: string | null;
    }) => api.patch<ExceptionRequest>(`/exception-requests/${selectedEx!.id}`, payload),
    onSuccess: () => {
      toast.success("Signalement mis à jour");
      queryClient.invalidateQueries({ queryKey: ["exceptions"] });
      setSelectedEx(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Signalements</h1>
        <p className="page-description">File de supervision (API /v1/exception-requests)</p>
      </div>

      <div className="flex gap-3 mb-4">
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Message</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Mission
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  Date
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
                    Aucun signalement trouvé
                  </td>
                </tr>
              ) : (
                data?.items.map((ex) => (
                  <tr key={ex.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                        <span className="text-foreground line-clamp-2">{ex.message}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground font-mono text-xs">
                      {ex.mission_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {new Date(ex.created_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusBadge[ex.status]}>{statusLabels[ex.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEx(ex);
                          setNewStatus(ex.status);
                        }}
                      >
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

      <Dialog open={!!selectedEx} onOpenChange={() => setSelectedEx(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail du signalement</DialogTitle>
          </DialogHeader>
          {selectedEx && (
            <div className="space-y-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Message</Label>
                <p className="text-foreground mt-1 whitespace-pre-wrap">{selectedEx.message}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Mission</Label>
                <p className="font-mono text-xs mt-1">{selectedEx.mission_id}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Statut actuel</Label>
                <p className="mt-1">
                  <span className={statusBadge[selectedEx.status]}>
                    {statusLabels[selectedEx.status]}
                  </span>
                </p>
              </div>
              {selectedEx.internal_comment && (
                <div>
                  <Label className="text-muted-foreground">Commentaire interne</Label>
                  <p className="text-foreground mt-1">{selectedEx.internal_comment}</p>
                </div>
              )}

              {hasPermission("EXCEPTION_UPDATE_STATUS") && (
                <div className="border-t border-border pt-4 space-y-3">
                  <Label>Changer le statut (PATCH /status)</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() =>
                      updateStatusMutation.mutate({ id: selectedEx.id, status: newStatus })
                    }
                    disabled={newStatus === selectedEx.status || updateStatusMutation.isPending}
                  >
                    Mettre à jour le statut
                  </Button>
                </div>
              )}

              {hasPermission("EXCEPTION_MANAGE") && (
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">Supervision (PATCH /exception-requests/{"{"}id{"}"})</p>
                  <div className="space-y-2">
                    <Label htmlFor="assign">Assigné à (UUID utilisateur)</Label>
                    <input
                      id="assign"
                      className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm font-mono"
                      value={assignUserId}
                      onChange={(e) => setAssignUserId(e.target.value)}
                      placeholder="UUID ou vide pour effacer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sla">Échéance SLA</Label>
                    <input
                      id="sla"
                      type="datetime-local"
                      className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
                      value={slaLocal}
                      onChange={(e) => setSlaLocal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="icom">Commentaire interne</Label>
                    <Textarea
                      id="icom"
                      value={manageComment}
                      onChange={(e) => setManageComment(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!selectedEx) return;
                      const trimmed = assignUserId.trim();
                      if (trimmed && !/^[0-9a-f-]{36}$/i.test(trimmed)) {
                        toast.error("UUID assigné invalide");
                        return;
                      }
                      const payload: {
                        status?: ExceptionStatusApi;
                        assigned_to_user_id?: string;
                        internal_comment?: string;
                        sla_due_at?: string;
                      } = {};
                      if (newStatus !== selectedEx.status) payload.status = newStatus as ExceptionStatusApi;
                      if (trimmed && trimmed !== (selectedEx.assigned_to_user_id ?? "")) {
                        payload.assigned_to_user_id = trimmed;
                      }
                      if (manageComment !== (selectedEx.internal_comment ?? "")) {
                        payload.internal_comment = manageComment;
                      }
                      if (slaLocal) {
                        const iso = new Date(slaLocal).toISOString();
                        const prev = selectedEx.sla_due_at
                          ? new Date(selectedEx.sla_due_at).toISOString()
                          : null;
                        if (iso !== prev) payload.sla_due_at = iso;
                      }
                      if (Object.keys(payload).length === 0) {
                        toast.message("Aucun changement");
                        return;
                      }
                      manageMutation.mutate(payload);
                    }}
                    disabled={manageMutation.isPending}
                  >
                    Enregistrer (assignation / SLA / commentaire)
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
