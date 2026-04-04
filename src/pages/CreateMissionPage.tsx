import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

function defaultWindowStart(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return toLocalDatetimeValue(d);
}

function defaultWindowEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return toLocalDatetimeValue(d);
}

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localDatetimeToIso(local: string): string {
  const t = Date.parse(local);
  if (Number.isNaN(t)) throw new Error("Date invalide");
  return new Date(t).toISOString();
}

function parseUuidOrNull(s: string): string | null {
  const t = s.trim();
  return t || null;
}

export default function CreateMissionPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [establishmentId, setEstablishmentId] = useState<string>("");
  const [inspectorId, setInspectorId] = useState<string>("");
  const [windowStart, setWindowStart] = useState(defaultWindowStart);
  const [windowEnd, setWindowEnd] = useState(defaultWindowEnd);
  const [smsCode, setSmsCode] = useState("");
  const [objective, setObjective] = useState("");
  const [planReference, setPlanReference] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [designatedHost, setDesignatedHost] = useState("");

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
      toast.success(`Mission créée (${data.status})`);
      navigate(`/missions/${data.mission_id}`, { replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!hasPermission("MISSION_CREATE")) {
    return <Navigate to="/missions" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!establishmentId || !inspectorId) {
      toast.error("Choisissez un établissement et un inspecteur.");
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
        toast.error("La fin de fenêtre doit être après le début.");
        return;
      }
      mutation.mutate(payload);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Date invalide");
    }
  };

  const loading = loadEst || loadInsp;

  return (
    <div className="animate-fade-in max-w-2xl">
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate("/missions")}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Retour
      </Button>

      <div className="page-header">
        <h1 className="page-title">Nouvelle mission</h1>
        <p className="page-description">POST /v1/missions — fenêtre horaire et affectation</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="space-y-2">
          <Label>Établissement *</Label>
          <Select
            value={establishmentId}
            onValueChange={setEstablishmentId}
            disabled={loading || !establishments?.length}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={loading ? "Chargement…" : "Choisir un établissement"} />
            </SelectTrigger>
            <SelectContent>
              {establishments?.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {`${e.name} (${e.id.slice(0, 8)}…)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!loading && establishments?.length === 0 && (
            <p className="text-xs text-destructive">Aucun établissement — créez-en un d&apos;abord.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Inspecteur *</Label>
          <Select
            value={inspectorId}
            onValueChange={setInspectorId}
            disabled={loading || !inspectors?.length}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={loading ? "Chargement…" : "Choisir un inspecteur"} />
            </SelectTrigger>
            <SelectContent>
              {inspectors?.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name} ({u.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!loading && inspectors?.length === 0 && (
            <p className="text-xs text-destructive">Aucun utilisateur avec le rôle INSPECTOR.</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ws">Début fenêtre *</Label>
            <Input
              id="ws"
              type="datetime-local"
              value={windowStart}
              onChange={(e) => setWindowStart(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="we">Fin fenêtre *</Label>
            <Input
              id="we"
              type="datetime-local"
              value={windowEnd}
              onChange={(e) => setWindowEnd(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
          <div>
            <Label htmlFor="req">Validation hiérarchique</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Si activé, la mission est créée en <code className="text-xs">draft</code> jusqu&apos;à
              approbation.
            </p>
          </div>
          <Switch
            id="req"
            checked={requiresApproval}
            onCheckedChange={setRequiresApproval}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="obj">Objectif</Label>
          <Textarea
            id="obj"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Optionnel"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="plan">Référence plan</Label>
            <Input
              id="plan"
              value={planReference}
              onChange={(e) => setPlanReference(e.target.value)}
              maxLength={256}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sms">Code SMS (mode C)</Label>
            <Input id="sms" value={smsCode} onChange={(e) => setSmsCode(e.target.value)} maxLength={32} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dh">Hôte désigné (UUID, optionnel)</Label>
          <Input
            id="dh"
            value={designatedHost}
            onChange={(e) => setDesignatedHost(e.target.value)}
            className="font-mono text-xs"
            placeholder="Surcharge du responsable d'accueil"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={mutation.isPending || loading}>
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Créer la mission
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/missions")}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
