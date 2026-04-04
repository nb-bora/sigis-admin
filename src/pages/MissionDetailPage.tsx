import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Mission, MissionOutcome, SiteVisit, ExceptionRequest, MissionStatusApi } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  MapPin,
  AlertTriangle,
  UserCog,
  QrCode,
  Loader2,
} from "lucide-react";
import { useState } from "react";

const statusLabels: Record<MissionStatusApi, string> = {
  draft: "Brouillon",
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

const visitStatusLabels: Record<string, string> = {
  scheduled: "Planifiée",
  checked_in: "Check-in",
  pending_host_validation: "Attente hôte",
  copresence_validated: "Coprésence OK",
  checked_out: "Check-out",
  completed: "Terminée",
  cancelled: "Annulée",
};

const excStatusBadge: Record<string, string> = {
  new: "status-badge-warning",
  acknowledged: "status-badge-info",
  resolved: "status-badge-success",
  escalated: "status-badge-neutral",
};

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [newInspectorId, setNewInspectorId] = useState("");
  const [outcomeSummary, setOutcomeSummary] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [complianceLevel, setComplianceLevel] = useState("");
  const [hostQrToken, setHostQrToken] = useState<string | null>(null);

  const { data: mission, isLoading } = useQuery({
    queryKey: ["mission", id],
    queryFn: () => api.get<Mission>(`/missions/${id}`),
    enabled: !!id,
  });

  const { data: outcome, isSuccess: outcomeResolved } = useQuery({
    queryKey: ["mission-outcome", id],
    queryFn: () => api.getOptional<MissionOutcome>(`/missions/${id}/outcome`),
    enabled: !!id,
    retry: false,
  });

  const { data: visit } = useQuery({
    queryKey: ["mission-visit", id],
    queryFn: () => api.getOptional<SiteVisit>(`/missions/${id}/site-visit`),
    enabled: !!id,
    retry: false,
  });

  const { data: exceptions } = useQuery({
    queryKey: ["mission-exceptions", id],
    queryFn: () => api.get<ExceptionRequest[]>(`/missions/${id}/exception-requests`),
    enabled: !!id,
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/missions/${id}/approve`),
    onSuccess: () => {
      toast.success("Mission validée");
      queryClient.invalidateQueries({ queryKey: ["mission", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/missions/${id}/cancel`, { reason: cancelReason }),
    onSuccess: () => {
      toast.success("Mission annulée");
      setShowCancel(false);
      queryClient.invalidateQueries({ queryKey: ["mission", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reassignMutation = useMutation({
    mutationFn: () =>
      api.post<Mission>(`/missions/${id}/reassign`, {
        new_inspector_id: newInspectorId.trim(),
      }),
    onSuccess: (m) => {
      toast.success("Réaffectation effectuée — ouverture de la nouvelle mission.");
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      navigate(`/missions/${m.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const outcomeMutation = useMutation({
    mutationFn: () =>
      api.post(`/missions/${id}/outcome`, {
        summary: outcomeSummary.trim(),
        notes: outcomeNotes.trim() || null,
        compliance_level: complianceLevel.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Rapport enregistré");
      setOutcomeSummary("");
      setOutcomeNotes("");
      setComplianceLevel("");
      queryClient.invalidateQueries({ queryKey: ["mission-outcome", id] });
      queryClient.invalidateQueries({ queryKey: ["mission", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hostQrMutation = useMutation({
    mutationFn: () =>
      api.get<{ host_qr_jwt: string; expires_in_minutes: number }>(`/missions/${id}/host-qr-jwt`),
    onSuccess: async (data) => {
      setHostQrToken(data.host_qr_jwt);
      try {
        await navigator.clipboard.writeText(data.host_qr_jwt);
        toast.success(`JWT copié (expire ~${data.expires_in_minutes} min)`);
      } catch {
        toast.success("JWT obtenu — copiez-le depuis le champ ci-dessous.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!mission) {
    return <p className="text-muted-foreground">Mission introuvable.</p>;
  }

  const statusBadgeColor: Record<MissionStatusApi, string> = {
    draft: "status-badge-neutral",
    planned: "status-badge-info",
    in_progress: "status-badge-info",
    completed: "status-badge-success",
    cancelled: "status-badge-danger",
  };

  const canCancel =
    mission.status !== "cancelled" && mission.status !== "completed";

  const canReassign =
    hasPermission("MISSION_REASSIGN") &&
    mission.status !== "completed" &&
    mission.status !== "cancelled";

  const canWriteOutcome =
    hasPermission("MISSION_OUTCOME_WRITE") && outcomeResolved && outcome === null;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/missions")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {mission.objective?.trim()
                ? mission.objective
                : `Mission ${mission.id.slice(0, 8)}`}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">ID : {mission.id}</p>
          </div>
          <span className={statusBadgeColor[mission.status]}>{statusLabels[mission.status]}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 text-sm">
          <div>
            <span className="text-muted-foreground">Inspecteur</span>
            <p className="font-medium text-foreground font-mono text-xs mt-1">
              {mission.inspector_id}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Établissement</span>
            <p className="font-medium text-foreground font-mono text-xs mt-1">
              {mission.establishment_id}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Fenêtre horaire</span>
            <p className="font-medium text-foreground">
              {new Date(mission.window_start).toLocaleString("fr-FR")} —{" "}
              {new Date(mission.window_end).toLocaleString("fr-FR")}
            </p>
          </div>
          {mission.plan_reference && (
            <div>
              <span className="text-muted-foreground">Réf. plan</span>
              <p className="font-medium text-foreground">{mission.plan_reference}</p>
            </div>
          )}
          {mission.requires_approval && (
            <div>
              <span className="text-muted-foreground">Validation</span>
              <p className="font-medium text-foreground">Requise avant exécution</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-border">
          {hasPermission("MISSION_APPROVE") && mission.status === "draft" && (
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              size="sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> Valider (passer en planifiée)
            </Button>
          )}
          {hasPermission("MISSION_READ") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => hostQrMutation.mutate()}
              disabled={hostQrMutation.isPending}
            >
              {hostQrMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <QrCode className="w-4 h-4 mr-1" />
              )}
              JWT QR hôte
            </Button>
          )}
          {hasPermission("MISSION_CANCEL") && canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancel(!showCancel)}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <XCircle className="w-4 h-4 mr-1" /> Annuler
            </Button>
          )}
        </div>

        {hostQrToken && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
            <Label className="text-xs text-muted-foreground">host_qr_jwt</Label>
            <p className="font-mono text-xs break-all mt-1">{hostQrToken}</p>
          </div>
        )}

        {showCancel && (
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
            <Textarea
              placeholder="Motif d'annulation…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={!cancelReason.trim() || cancelMutation.isPending}
              >
                Confirmer l'annulation
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCancel(false)}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </div>

      {canReassign && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <UserCog className="w-4 h-4 text-primary" /> Réaffectation (POST /reassign)
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Crée une nouvelle mission planifiée et annule l&apos;actuelle avec motif « Réaffectation ».
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="new-insp">UUID du nouvel inspecteur</Label>
              <Input
                id="new-insp"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={newInspectorId}
                onChange={(e) => setNewInspectorId(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <Button
              size="sm"
              onClick={() => reassignMutation.mutate()}
              disabled={
                reassignMutation.isPending || !/^[0-9a-f-]{36}$/i.test(newInspectorId.trim())
              }
            >
              {reassignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Réaffecter
            </Button>
          </div>
        </div>
      )}

      {canWriteOutcome && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Soumettre le rapport (POST /outcome)
          </h2>
          <div className="space-y-3 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="osum">Résumé</Label>
              <Textarea
                id="osum"
                value={outcomeSummary}
                onChange={(e) => setOutcomeSummary(e.target.value)}
                rows={4}
                placeholder="Synthèse de la mission…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onotes">Notes (optionnel)</Label>
              <Textarea
                id="onotes"
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="ocomp">Niveau de conformité (optionnel)</Label>
              <Input
                id="ocomp"
                value={complianceLevel}
                onChange={(e) => setComplianceLevel(e.target.value)}
                placeholder="ex. satisfactory"
              />
            </div>
            <Button
              size="sm"
              onClick={() => outcomeMutation.mutate()}
              disabled={outcomeMutation.isPending || !outcomeSummary.trim()}
            >
              {outcomeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer le rapport
            </Button>
          </div>
        </div>
      )}

      {visit && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Visite terrain
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Statut visite</span>
              <p className="font-medium mt-1">
                {visitStatusLabels[visit.status] ?? visit.status}
              </p>
            </div>
            {visit.host_validation_mode && (
              <div>
                <span className="text-muted-foreground">Mode validation hôte</span>
                <p className="font-medium mt-1">{visit.host_validation_mode}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Check-in</span>
              <p className="font-medium">
                {visit.checked_in_at
                  ? new Date(visit.checked_in_at).toLocaleString("fr-FR")
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Check-out</span>
              <p className="font-medium">
                {visit.checked_out_at
                  ? new Date(visit.checked_out_at).toLocaleString("fr-FR")
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {outcome && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Rapport de mission
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Résumé</span>
              <p className="text-foreground mt-1 whitespace-pre-wrap">{outcome.summary}</p>
            </div>
            {outcome.notes && (
              <div>
                <span className="text-muted-foreground">Notes</span>
                <p className="text-foreground mt-1 whitespace-pre-wrap">{outcome.notes}</p>
              </div>
            )}
            {outcome.compliance_level && (
              <div>
                <span className="text-muted-foreground">Niveau de conformité</span>
                <p className="text-foreground mt-1">{outcome.compliance_level}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {exceptions && exceptions.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Signalements ({exceptions.length})
          </h2>
          <div className="space-y-2">
            {exceptions.map((ex) => (
              <div
                key={ex.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-b border-border last:border-0 text-sm"
              >
                <span className="text-foreground line-clamp-2">{ex.message}</span>
                <span className={`shrink-0 ${excStatusBadge[ex.status] ?? "status-badge-neutral"}`}>
                  {ex.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
