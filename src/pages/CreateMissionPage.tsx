import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type {
  CreateMissionPayload,
  CreateMissionResponse,
  Establishment,
  PaginatedResponse,
  User,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  ClipboardPlus,
  Building2,
  CalendarRange,
  ShieldCheck,
  FileText,
  MessageSquare,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import {
  defaultWindowStart,
  defaultWindowEnd,
  localDatetimeToIso,
} from "@/lib/datetime";
import { FormStepper, FormStepperActions, type FormStepperStep } from "@/components/ui/form-stepper";
import { ConfirmSubmitDialog } from "@/components/ConfirmSubmitDialog";

function parseUuidOrNull(s: string): string | null {
  const t = s.trim();
  return t || null;
}

export default function CreateMissionPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<CreateMissionPayload | null>(null);

  const [establishmentId, setEstablishmentId] = useState<string>("");
  const [inspectorId, setInspectorId] = useState<string>("");
  const [windowStart, setWindowStart] = useState(defaultWindowStart);
  const [windowEnd, setWindowEnd] = useState(defaultWindowEnd);
  const [smsCode, setSmsCode] = useState("");
  const [objective, setObjective] = useState("");
  const [planReference, setPlanReference] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [designatedHost, setDesignatedHost] = useState("");
  const [step, setStep] = useState(0);

  const steps = useMemo<FormStepperStep[]>(
    () => [
      { id: "place", title: "Lieu & équipe", description: "Établissement et inspecteur" },
      { id: "window", title: "Créneau", description: "Fenêtre horaire" },
      { id: "approval", title: "Validation", description: "Approbation hiérarchique" },
      { id: "extra", title: "Détails", description: "Champs optionnels" },
    ],
    [],
  );
  const lastStepIndex = steps.length - 1;

  const { data: establishments, isLoading: loadEst } = useQuery({
    queryKey: ["establishments-pick", 1000],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Establishment>>("/establishments", {
        skip: 0,
        limit: 1000,
      });
      return res.items;
    },
  });

  const { data: inspectors, isLoading: loadInsp } = useQuery({
    queryKey: ["users-inspectors", 1000],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<User>>("/users", { skip: 0, limit: 1000 });
      return res.items.filter((u) => u.role === "INSPECTOR");
    },
  });

  const mutation = useMutation({
    mutationFn: (body: CreateMissionPayload) =>
      api.post<CreateMissionResponse>("/missions", body),
    onSuccess: (data) => {
      toast.success("Mission créée", {
        description: `Statut initial : ${data.status}.`,
      });
      navigate(`/missions/${data.mission_id}`, { replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!hasPermission("MISSION_CREATE")) {
    return <Navigate to="/missions" replace />;
  }

  const goNext = () => {
    if (step === 0) {
      if (!establishmentId || !inspectorId) {
        toast.error("Sélection requise", {
          description: "Choisissez un établissement et un inspecteur.",
        });
        return;
      }
    }
    if (step === 1) {
      try {
        const ws = new Date(localDatetimeToIso(windowStart));
        const we = new Date(localDatetimeToIso(windowEnd));
        if (we <= ws) {
          toast.error("Fenêtre invalide", {
            description: "La fin doit être strictement après le début.",
          });
          return;
        }
      } catch {
        toast.error("Dates invalides");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, lastStepIndex));
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== lastStepIndex) {
      goNext();
      return;
    }
    if (!establishmentId || !inspectorId) {
      toast.error("Sélection requise", {
        description: "Choisissez un établissement et un inspecteur.",
      });
      setStep(0);
      return;
    }
    try {
      const payload: CreateMissionPayload = {
        establishment_id: establishmentId,
        inspector_id: inspectorId,
        window_start: localDatetimeToIso(windowStart),
        window_end: localDatetimeToIso(windowEnd),
        requires_approval: requiresApproval,
        sms_code: smsCode.trim() || null,
        objective: objective.trim() || null,
        plan_reference: planReference.trim() || null,
        designated_host_user_id: parseUuidOrNull(designatedHost),
      };
      if (new Date(payload.window_end) <= new Date(payload.window_start)) {
        toast.error("Fenêtre invalide", {
          description: "La fin doit être strictement après le début.",
        });
        return;
      }
      setPendingPayload(payload);
      setConfirmOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Date invalide");
    }
  };

  const loading = loadEst || loadInsp;

  const stepHeaders = [
    {
      Icon: Building2,
      title: "Lieu et équipe",
      description: "Obligatoire pour créer la mission",
    },
    {
      Icon: CalendarRange,
      title: "Fenêtre horaire",
      description: "Période pendant laquelle la visite peut avoir lieu",
    },
    {
      Icon: ShieldCheck,
      title: "Validation hiérarchique",
      description: "Contrôle avant planification effective",
    },
    {
      Icon: FileText,
      title: "Détails complémentaires",
      description: "Optionnel — visibles sur la fiche mission",
    },
  ] as const;
  const StepIcon = stepHeaders[step].Icon;

  return (
    <div className="animate-fade-in w-full space-y-8">
      <ConfirmSubmitDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!mutation.isPending) setConfirmOpen(o);
        }}
        title="Créer cette mission ?"
        description="La mission sera créée avec le statut initial renvoyé par l’API."
        confirmLabel="Créer la mission"
        cancelLabel="Annuler"
        confirmDisabled={mutation.isPending || !pendingPayload}
        onConfirm={() => {
          if (!pendingPayload) return;
          mutation.mutate(pendingPayload);
          setConfirmOpen(false);
          setPendingPayload(null);
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
        <div className="relative flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <ClipboardPlus className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary/80">Création</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Nouvelle mission</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Définissez l&apos;établissement, l&apos;inspecteur et la fenêtre horaire de visite. Les champs optionnels
              précisent le contexte et les modes de validation hôte.
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <FormStepper
          steps={steps}
          currentStep={step}
          onStepClick={(i) => setStep(i)}
          allowBackNavigation
          className="rounded-2xl border border-border/60 bg-muted/10 px-3 py-4 sm:px-6"
        />

        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
          <CardHeader className="border-b border-border/60 bg-muted/25">
            <div className="flex items-center gap-2">
              <StepIcon className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
              <div>
                <CardTitle className="text-lg">{stepHeaders[step].title}</CardTitle>
                <CardDescription>{stepHeaders[step].description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className={step === 0 ? "space-y-5" : "hidden"} aria-hidden={step !== 0}>
              <div className="space-y-2">
                <Label htmlFor="est" className="text-sm font-medium">
                  Établissement <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={establishmentId}
                  onValueChange={setEstablishmentId}
                  disabled={loading || !establishments?.length}
                >
                  <SelectTrigger id="est" className="h-11 rounded-xl border-border/80 bg-background">
                    <SelectValue placeholder={loading ? "Chargement…" : "Sélectionner un établissement"} />
                  </SelectTrigger>
                  <SelectContent>
                    {establishments?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground">({e.id.slice(0, 8)}…)</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!loading && establishments?.length === 0 && (
                  <p className="text-xs text-destructive">Aucun établissement — créez-en un depuis le menu Établissements.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="insp" className="text-sm font-medium">
                  Inspecteur <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={inspectorId}
                  onValueChange={setInspectorId}
                  disabled={loading || !inspectors?.length}
                >
                  <SelectTrigger id="insp" className="h-11 rounded-xl border-border/80 bg-background">
                    <SelectValue placeholder={loading ? "Chargement…" : "Sélectionner un inspecteur"} />
                  </SelectTrigger>
                  <SelectContent>
                    {inspectors?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="font-medium">{u.full_name}</span>
                        <span className="ml-2 text-muted-foreground">{u.email}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!loading && inspectors?.length === 0 && (
                  <p className="text-xs text-destructive">Aucun compte avec le rôle inspecteur.</p>
                )}
              </div>
            </div>

            <div className={step === 1 ? "grid gap-5 sm:grid-cols-2" : "hidden"} aria-hidden={step !== 1}>
              <div className="space-y-2">
                <Label htmlFor="ws">Début</Label>
                <Input
                  id="ws"
                  type="datetime-local"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  required
                  className="h-11 rounded-xl font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="we">Fin</Label>
                <Input
                  id="we"
                  type="datetime-local"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                  required
                  className="h-11 rounded-xl font-mono text-sm"
                />
              </div>
            </div>

            <div className={step === 2 ? "" : "hidden"} aria-hidden={step !== 2}>
              <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Label htmlFor="req" className="text-base font-medium">
                    Exiger une approbation
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    La mission est créée en <span className="font-mono text-xs">draft</span> jusqu&apos;à validation par
                    un responsable.
                  </p>
                </div>
                <Switch id="req" checked={requiresApproval} onCheckedChange={setRequiresApproval} />
              </div>
            </div>

            <div className={step === 3 ? "space-y-5" : "hidden"} aria-hidden={step !== 3}>
              <div className="space-y-2">
                <Label htmlFor="obj">Objectif</Label>
                <Textarea
                  id="obj"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder="Contexte, objectifs pédagogiques ou points de contrôle…"
                  className="min-h-[100px] resize-y rounded-xl"
                />
                <p className="text-xs text-muted-foreground">{objective.length} / 4000</p>
              </div>

              <Separator />

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plan">Référence de plan</Label>
                  <Input
                    id="plan"
                    value={planReference}
                    onChange={(e) => setPlanReference(e.target.value)}
                    maxLength={256}
                    placeholder="ex. PLAN-2026-042"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sms" className="inline-flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Code SMS (mode C)
                  </Label>
                  <Input
                    id="sms"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value)}
                    maxLength={32}
                    placeholder="Si validation par SMS"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dh" className="inline-flex items-center gap-1.5">
                  <UserCog className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  Hôte désigné (UUID)
                </Label>
                <Input
                  id="dh"
                  value={designatedHost}
                  onChange={(e) => setDesignatedHost(e.target.value)}
                  className="font-mono text-xs h-11 rounded-xl"
                  placeholder="Laisser vide pour le défaut établissement"
                />
                <p className="text-xs text-muted-foreground">Identifiant utilisateur du responsable d&apos;accueil.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {step < lastStepIndex ? (
          <FormStepperActions
            currentStep={step}
            totalSteps={steps.length}
            onPrev={goPrev}
            onNext={goNext}
            nextLabel="Continuer"
            className="pt-2"
          />
        ) : (
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" className="h-11 rounded-xl text-muted-foreground" onClick={goPrev}>
              Précédent
            </Button>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => navigate("/missions")}>
                Annuler
              </Button>
              <Button
                type="submit"
                className="h-11 min-w-[200px] rounded-xl shadow-md shadow-primary/20"
                disabled={mutation.isPending || loading}
              >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Créer la mission
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
