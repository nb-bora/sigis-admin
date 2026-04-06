import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type {
  Mission,
  MissionOutcome,
  SiteVisit,
  ExceptionRequest,
  MissionStatusApi,
  Establishment,
  UpdateMissionPayload,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ClipboardList,
  Building2,
  User,
  CalendarRange,
  Pencil,
  MessageSquare,
} from "lucide-react";
import { isoToLocalDatetime, localDatetimeToIso } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { ConfirmSubmitDialog } from "@/components/ConfirmSubmitDialog";

const statusLabels: Record<MissionStatusApi, string> = {
  draft: "Brouillon",
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

const statusBadgeVariant: Record<
  MissionStatusApi,
  "secondary" | "default" | "outline" | "destructive"
> = {
  draft: "secondary",
  planned: "outline",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
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

function formatDt(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const confirmActionRef = useRef<null | (() => void)>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState<string | null>(null);
  const [confirmConfirmLabel, setConfirmConfirmLabel] = useState("Confirmer");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [newInspectorId, setNewInspectorId] = useState("");
  const [outcomeSummary, setOutcomeSummary] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [complianceLevel, setComplianceLevel] = useState("");
  const [hostQrToken, setHostQrToken] = useState<string | null>(null);

  const [editWindowStart, setEditWindowStart] = useState("");
  const [editWindowEnd, setEditWindowEnd] = useState("");
  const [editObjective, setEditObjective] = useState("");
  const [editPlanRef, setEditPlanRef] = useState("");
  const [editSms, setEditSms] = useState("");
  const [editDesignatedHost, setEditDesignatedHost] = useState("");

  const { data: mission, isLoading } = useQuery({
    queryKey: ["mission", id],
    queryFn: () => api.get<Mission>(`/missions/${id}`),
    enabled: !!id,
  });

  const { data: establishment } = useQuery({
    queryKey: ["establishment", mission?.establishment_id],
    queryFn: () => {
      const eid = mission?.establishment_id;
      if (!eid) throw new Error("Missing establishment id");
      return api.get<Establishment>(`/establishments/${eid}`);
    },
    enabled: !!mission?.establishment_id && hasPermission("ESTABLISHMENT_READ"),
  });

  useEffect(() => {
    setShowCancel(false);
    setCancelReason("");
    setHostQrToken(null);
    setNewInspectorId("");
    setOutcomeSummary("");
    setOutcomeNotes("");
    setComplianceLevel("");
  }, [id]);

  useEffect(() => {
    if (!mission) return;
    setEditWindowStart(isoToLocalDatetime(mission.window_start));
    setEditWindowEnd(isoToLocalDatetime(mission.window_end));
    setEditObjective(mission.objective ?? "");
    setEditPlanRef(mission.plan_reference ?? "");
    setEditSms(mission.sms_code ?? "");
    setEditDesignatedHost(mission.designated_host_user_id ?? "");
  }, [mission]);

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

  const updateMutation = useMutation({
    mutationFn: (body: UpdateMissionPayload) => api.patch<Mission>(`/missions/${id}`, body),
    onSuccess: () => {
      toast.success("Modifications enregistrées");
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
      toast.success("Réaffectation effectuée");
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
        toast.success(`Jeton copié (expire ~${data.expires_in_minutes} min)`);
      } catch {
        toast.success("Jeton affiché ci-dessous — copiez-le manuellement.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSaveEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mission) return;
    try {
      const ws = localDatetimeToIso(editWindowStart);
      const we = localDatetimeToIso(editWindowEnd);
      if (new Date(we) <= new Date(ws)) {
        toast.error("La fin de fenêtre doit être après le début.");
        return;
      }
      const body: UpdateMissionPayload = {
        window_start: ws,
        window_end: we,
        objective: editObjective.trim() || null,
        plan_reference: editPlanRef.trim() || null,
        sms_code: editSms.trim() || null,
        designated_host_user_id: editDesignatedHost.trim() || null,
      };
      confirmActionRef.current = () => updateMutation.mutate(body);
      setConfirmTitle("Enregistrer ces modifications ?");
      setConfirmDesc("Les informations de la mission seront mises à jour.");
      setConfirmConfirmLabel("Enregistrer");
      setConfirmOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dates invalides");
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in w-full space-y-6">
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!mission) {
    return (
      <Card className="mx-auto max-w-lg rounded-2xl border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">Mission introuvable.</CardContent>
      </Card>
    );
  }

  const canCancel = mission.status !== "cancelled" && mission.status !== "completed";
  const canReassign =
    hasPermission("MISSION_REASSIGN") && mission.status !== "completed" && mission.status !== "cancelled";
  const canWriteOutcome =
    hasPermission("MISSION_OUTCOME_WRITE") && outcomeResolved && outcome === null;
  const canEdit =
    hasPermission("MISSION_UPDATE") && mission.status !== "cancelled" && mission.status !== "completed";
  const anyPending =
    approveMutation.isPending ||
    updateMutation.isPending ||
    cancelMutation.isPending ||
    reassignMutation.isPending ||
    outcomeMutation.isPending ||
    hostQrMutation.isPending;

  const objectiveTrimmed = mission.objective?.trim() ?? "";
  let title: string;
  if (!objectiveTrimmed) {
    title = `Mission ${mission.id.slice(0, 8)}…`;
  } else if (objectiveTrimmed.length > 120) {
    title = `${objectiveTrimmed.slice(0, 120)}…`;
  } else {
    title = objectiveTrimmed;
  }

  return (
    <div className="animate-fade-in w-full space-y-8">
      <ConfirmSubmitDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!anyPending) setConfirmOpen(o);
        }}
        title={confirmTitle}
        description={confirmDesc}
        confirmLabel={confirmConfirmLabel}
        cancelLabel="Annuler"
        confirmDisabled={anyPending}
        onConfirm={() => {
          confirmActionRef.current?.();
          confirmActionRef.current = null;
          setConfirmOpen(false);
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => navigate("/missions")}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux missions
      </Button>

      <header className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.07] via-card to-sky-500/[0.05] px-6 py-7 shadow-sm sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.12)_1px,transparent_0)] [background-size:20px_20px]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <ClipboardList className="h-7 w-7" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-primary/80">Fiche mission</p>
              <h1 className="mt-1 text-xl font-bold leading-snug text-foreground sm:text-2xl">{title}</h1>
              <p className="mt-2 font-mono text-xs text-muted-foreground">ID · {mission.id}</p>
            </div>
          </div>
          <Badge variant={statusBadgeVariant[mission.status]} className="shrink-0 px-3 py-1 text-sm font-medium">
            {statusLabels[mission.status]}
          </Badge>
        </div>
      </header>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
        <CardHeader className="border-b border-border/60 bg-muted/25">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
            Informations
          </CardTitle>
          <CardDescription>Établissement, inspecteur et créneau</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" aria-hidden />
              Établissement
            </div>
            <p className="mt-2 font-medium text-foreground">{establishment?.name ?? "—"}</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{mission.establishment_id}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <User className="h-3.5 w-3.5" aria-hidden />
              Inspecteur
            </div>
            <p className="mt-2 break-all font-mono text-xs text-foreground">{mission.inspector_id}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/15 p-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CalendarRange className="h-3.5 w-3.5" aria-hidden />
              Fenêtre horaire
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {formatDt(mission.window_start)}
              <span className="text-muted-foreground"> → </span>
              {formatDt(mission.window_end)}
            </p>
          </div>
          {mission.plan_reference && (
            <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Réf. plan</span>
              <p className="mt-2 font-medium">{mission.plan_reference}</p>
            </div>
          )}
          {mission.requires_approval && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Validation
              </span>
              <p className="mt-2 text-sm text-foreground">Approbation requise avant exécution</p>
            </div>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
          <CardHeader className="border-b border-border/60 bg-muted/25">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pencil className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
              Modifier la mission
            </CardTitle>
            <CardDescription>
              Report de fenêtre, objectif, référence plan, code SMS ou hôte désigné (selon vos droits).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSaveEdits} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-ws">Début de fenêtre</Label>
                  <Input
                    id="edit-ws"
                    type="datetime-local"
                    value={editWindowStart}
                    onChange={(e) => setEditWindowStart(e.target.value)}
                    className="h-11 rounded-xl font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-we">Fin de fenêtre</Label>
                  <Input
                    id="edit-we"
                    type="datetime-local"
                    value={editWindowEnd}
                    onChange={(e) => setEditWindowEnd(e.target.value)}
                    className="h-11 rounded-xl font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-obj">Objectif</Label>
                <Textarea
                  id="edit-obj"
                  value={editObjective}
                  onChange={(e) => setEditObjective(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  className="min-h-[100px] rounded-xl"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-plan">Référence plan</Label>
                  <Input
                    id="edit-plan"
                    value={editPlanRef}
                    onChange={(e) => setEditPlanRef(e.target.value)}
                    maxLength={256}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sms" className="inline-flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Code SMS
                  </Label>
                  <Input
                    id="edit-sms"
                    value={editSms}
                    onChange={(e) => setEditSms(e.target.value)}
                    maxLength={32}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-host">Hôte désigné (UUID)</Label>
                <Input
                  id="edit-host"
                  value={editDesignatedHost}
                  onChange={(e) => setEditDesignatedHost(e.target.value)}
                  className="h-11 rounded-xl font-mono text-xs"
                  placeholder="Vide = comportement par défaut"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  className="h-11 min-w-[180px] rounded-xl"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                  Enregistrer les modifications
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-6">
          {hasPermission("MISSION_APPROVE") && mission.status === "draft" && (
            <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending} className="rounded-xl">
              <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
              Valider (planifier)
            </Button>
          )}
          {hasPermission("MISSION_READ") && (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => hostQrMutation.mutate()}
              disabled={hostQrMutation.isPending}
            >
              {hostQrMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <QrCode className="mr-2 h-4 w-4" aria-hidden />
              )}
              Jeton QR hôte
            </Button>
          )}
          {hasPermission("MISSION_CANCEL") && canCancel && (
            <Button
              variant="outline"
              className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setShowCancel(!showCancel)}
            >
              <XCircle className="mr-2 h-4 w-4" aria-hidden />
              Annuler la mission
            </Button>
          )}
        </CardContent>
        {hostQrToken && (
          <CardContent className="border-t border-border/60 bg-muted/20 pt-4">
            <Label className="text-xs text-muted-foreground">Jeton copié dans le presse-papiers</Label>
            <p className="mt-2 break-all font-mono text-xs">{hostQrToken}</p>
          </CardContent>
        )}
        {showCancel && (
          <CardContent className="border-t border-border/60 space-y-3">
            <Textarea
              placeholder="Motif d'annulation…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="rounded-xl"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                className="rounded-xl"
                onClick={() => cancelMutation.mutate()}
                disabled={!cancelReason.trim() || cancelMutation.isPending}
              >
                Confirmer l&apos;annulation
              </Button>
              <Button variant="ghost" className="rounded-xl" onClick={() => setShowCancel(false)}>
                Fermer
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {canReassign && (
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
          <CardHeader className="border-b border-border/60 bg-muted/25">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCog className="h-5 w-5 text-primary" aria-hidden />
              Réaffectation
            </CardTitle>
            <CardDescription>
              Crée une nouvelle mission planifiée et clôt l&apos;actuelle (motif « Réaffectation »).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="new-insp">UUID du nouvel inspecteur</Label>
              <Input
                id="new-insp"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={newInspectorId}
                onChange={(e) => setNewInspectorId(e.target.value)}
                className="h-11 rounded-xl font-mono text-xs"
              />
            </div>
            <Button
              className="h-11 shrink-0 rounded-xl"
              onClick={() => reassignMutation.mutate()}
              disabled={reassignMutation.isPending || !/^[0-9a-f-]{36}$/i.test(newInspectorId.trim())}
            >
              {reassignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Réaffecter
            </Button>
          </CardContent>
        </Card>
      )}

      {canWriteOutcome && (
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
          <CardHeader className="border-b border-border/60 bg-muted/25">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" aria-hidden />
              Rapport de mission
            </CardTitle>
            <CardDescription>Synthèse après clôture terrain</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="osum">Résumé</Label>
              <Textarea
                id="osum"
                value={outcomeSummary}
                onChange={(e) => setOutcomeSummary(e.target.value)}
                rows={4}
                placeholder="Synthèse de la mission…"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onotes">Notes (optionnel)</Label>
              <Textarea
                id="onotes"
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                rows={3}
                className="rounded-xl"
              />
            </div>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="ocomp">Niveau de conformité (optionnel)</Label>
              <Input
                id="ocomp"
                value={complianceLevel}
                onChange={(e) => setComplianceLevel(e.target.value)}
                placeholder="ex. satisfactory"
                className="h-11 rounded-xl"
              />
            </div>
            <Button
              className="rounded-xl"
              onClick={() => outcomeMutation.mutate()}
              disabled={outcomeMutation.isPending || !outcomeSummary.trim()}
            >
              {outcomeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Enregistrer le rapport
            </Button>
          </CardContent>
        </Card>
      )}

      {visit && (
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
          <CardHeader className="border-b border-border/60 bg-muted/25">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" aria-hidden />
              Visite terrain
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground">Statut visite</span>
              <p className="mt-1 font-medium">{visitStatusLabels[visit.status] ?? visit.status}</p>
            </div>
            {visit.host_validation_mode && (
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground">Mode hôte</span>
                <p className="mt-1 font-medium">{visit.host_validation_mode}</p>
              </div>
            )}
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground">Check-in</span>
              <p className="mt-1">{visit.checked_in_at ? formatDt(visit.checked_in_at) : "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground">Check-out</span>
              <p className="mt-1">{visit.checked_out_at ? formatDt(visit.checked_out_at) : "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {outcome && (
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
          <CardHeader className="border-b border-border/60 bg-muted/25">
            <CardTitle className="text-lg">Rapport enregistré</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6 text-sm">
            <div>
              <span className="text-muted-foreground">Résumé</span>
              <p className="mt-2 whitespace-pre-wrap text-foreground">{outcome.summary}</p>
            </div>
            {outcome.notes && (
              <div>
                <span className="text-muted-foreground">Notes</span>
                <p className="mt-2 whitespace-pre-wrap">{outcome.notes}</p>
              </div>
            )}
            {outcome.compliance_level && (
              <div>
                <span className="text-muted-foreground">Conformité</span>
                <p className="mt-2">{outcome.compliance_level}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {exceptions && exceptions.length > 0 && (
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
          <CardHeader className="border-b border-border/60 bg-muted/25">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
              Signalements ({exceptions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/60 p-0">
            {exceptions.map((ex) => (
              <div
                key={ex.id}
                className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm text-foreground">{ex.message}</span>
                <span className={cn("shrink-0", excStatusBadge[ex.status] ?? "status-badge-neutral")}>
                  {ex.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
