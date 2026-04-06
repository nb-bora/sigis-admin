import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Establishment } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Building2,
  MapPin,
  MapPinned,
  Mail,
  Hash,
  Layers,
  Pencil,
  ClipboardList,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmSubmitDialog } from "@/components/ConfirmSubmitDialog";

const TYPE_LABELS: Record<string, string> = {
  other: "Autre",
  lycee: "Lycée",
  college: "Collège",
  primaire: "Primaire",
  formation: "Formation",
  admin: "Administratif",
};

const TYPE_OPTIONS = [
  { value: "lycee", label: "Lycée" },
  { value: "college", label: "Collège" },
  { value: "primaire", label: "Primaire" },
  { value: "formation", label: "Formation" },
  { value: "admin", label: "Administratif" },
  { value: "other", label: "Autre" },
];

function typeLabel(t: string) {
  return TYPE_LABELS[t] ?? t;
}

export default function EstablishmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = hasPermission("ESTABLISHMENT_UPDATE");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: est, isLoading } = useQuery({
    queryKey: ["establishment", id],
    queryFn: () => api.get<Establishment>(`/establishments/${id}`),
    enabled: !!id,
  });

  const [name, setName] = useState("");
  const [centerLat, setCenterLat] = useState("");
  const [centerLon, setCenterLon] = useState("");
  const [rs, setRs] = useState("");
  const [rr, setRr] = useState("");
  const [etype, setEtype] = useState("other");
  const [minesec, setMinesec] = useState("");
  const [terr, setTerr] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    setName("");
    setCenterLat("");
    setCenterLon("");
    setRs("");
    setRr("");
    setEtype("other");
    setMinesec("");
    setTerr("");
    setEmail("");
    setPhone("");
  }, [id]);

  useEffect(() => {
    if (!est) return;
    setName(est.name);
    setCenterLat(String(est.center_lat));
    setCenterLon(String(est.center_lon));
    setRs(String(est.radius_strict_m));
    setRr(String(est.radius_relaxed_m));
    setEtype(est.establishment_type || "other");
    setMinesec(est.minesec_code ?? "");
    setTerr(est.territory_code ?? "");
    setEmail(est.contact_email ?? "");
    setPhone(est.contact_phone ?? "");
  }, [est]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch<Establishment>(`/establishments/${id}`, {
        name: name.trim(),
        center_lat: Number(centerLat),
        center_lon: Number(centerLon),
        radius_strict_m: Number(rs),
        radius_relaxed_m: Number(rr),
        establishment_type: etype.trim() || undefined,
        minesec_code: minesec.trim() || null,
        territory_code: terr.trim() || null,
        contact_email: email.trim() || null,
        contact_phone: phone.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Établissement mis à jour");
      queryClient.invalidateQueries({ queryKey: ["establishment", id] });
      queryClient.invalidateQueries({ queryKey: ["establishments"] });
      queryClient.invalidateQueries({ queryKey: ["establishments-summary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(centerLat);
    const lon = Number(centerLon);
    const a = Number(rs);
    const b = Number(rr);
    if (!name.trim()) {
      toast.error("Le nom est obligatoire.");
      return;
    }
    if (Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(a) || Number.isNaN(b) || a <= 0 || b <= 0) {
      toast.error("Coordonnées ou rayons invalides.");
      return;
    }
    if (b < a) {
      toast.error("Le rayon élargi doit être supérieur ou égal au rayon strict.");
      return;
    }
    setConfirmOpen(true);
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in w-full space-y-6">
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!est) {
    return (
      <Card className="mx-auto max-w-lg rounded-2xl border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">Établissement introuvable.</CardContent>
      </Card>
    );
  }

  return (
    <div className="animate-fade-in w-full space-y-8">
      <ConfirmSubmitDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!saveMutation.isPending) setConfirmOpen(o);
        }}
        title="Enregistrer les modifications ?"
        description="Les informations de l’établissement seront mises à jour."
        confirmLabel="Enregistrer"
        cancelLabel="Annuler"
        confirmDisabled={saveMutation.isPending}
        onConfirm={() => {
          saveMutation.mutate();
          setConfirmOpen(false);
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => navigate("/etablissements")}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux établissements
      </Button>

      <header className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.07] via-card to-emerald-500/[0.05] px-6 py-7 shadow-sm sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.12)_1px,transparent_0)] [background-size:20px_20px]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Building2 className="h-7 w-7" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-primary/80">Fiche établissement</p>
              <h1 className="mt-1 text-xl font-bold leading-snug text-foreground sm:text-2xl">{est.name}</h1>
              <p className="mt-2 font-mono text-xs text-muted-foreground">ID · {est.id}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="px-3 py-1 font-mono text-xs tabular-nums">
              Géométrie v{est.geometry_version}
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              {typeLabel(est.establishment_type)}
            </Badge>
          </div>
        </div>
      </header>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
        <CardHeader className="border-b border-border/60 bg-muted/25">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
            Informations
          </CardTitle>
          <CardDescription>Données affichées telles qu&apos;enregistrées dans le référentiel.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <MapPinned className="h-3.5 w-3.5" aria-hidden />
              Coordonnées
            </div>
            <p className="mt-2 font-mono text-sm text-foreground">
              {est.center_lat.toFixed(6)}, {est.center_lon.toFixed(6)}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Layers className="h-3.5 w-3.5" aria-hidden />
              Rayons (m)
            </div>
            <p className="mt-2 text-sm text-foreground">
              strict{" "}
              <span className="font-semibold tabular-nums">{est.radius_strict_m}</span>{" "}
              <span className="text-muted-foreground"> · </span> élargi{" "}
              <span className="font-semibold tabular-nums">{est.radius_relaxed_m}</span>
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/15 p-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Hash className="h-3.5 w-3.5" aria-hidden />
              Territoire / MINESEC
            </div>
            <p className="mt-2 text-sm text-foreground">{est.territory_code ?? "—"}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{est.minesec_code ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/15 p-4 sm:col-span-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              Contact
            </div>
            <p className="mt-2 break-all text-sm text-foreground">{est.contact_email ?? "—"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{est.contact_phone ?? "—"}</p>
          </div>
          {(est.parent_establishment_id || est.designated_host_user_id) && (
            <div className="rounded-xl border border-border/60 bg-muted/15 p-4 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <UserCircle className="h-3.5 w-3.5" aria-hidden />
                Liens
              </div>
              {est.parent_establishment_id && (
                <p className="mt-2 break-all font-mono text-xs text-foreground">Parent · {est.parent_establishment_id}</p>
              )}
              {est.designated_host_user_id && (
                <p className="mt-2 break-all font-mono text-xs text-foreground">Hôte · {est.designated_host_user_id}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
          <CardHeader className="border-b border-border/60 bg-muted/25">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pencil className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
              Modifier l&apos;établissement
            </CardTitle>
            <CardDescription>
              Les changements de position ou de rayons incrémentent automatiquement la version de géométrie.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="n">Nom officiel</Label>
                <Input id="n" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={etype} onValueChange={setEtype}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minesec">Code MINESEC</Label>
                  <Input
                    id="minesec"
                    value={minesec}
                    onChange={(e) => setMinesec(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="terr">Code territoire</Label>
                <Input id="terr" value={terr} onChange={(e) => setTerr(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={centerLat}
                    onChange={(e) => setCenterLat(e.target.value)}
                    className="h-11 rounded-xl font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={centerLon}
                    onChange={(e) => setCenterLon(e.target.value)}
                    className="h-11 rounded-xl font-mono text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Rayon strict (m)</Label>
                  <Input type="number" step="any" value={rs} onChange={(e) => setRs(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Rayon élargi (m)</Label>
                  <Input type="number" step="any" value={rr} onChange={(e) => setRr(e.target.value)} className="h-11 rounded-xl" />
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="em">E-mail</Label>
                  <Input
                    id="em"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ph">Téléphone</Label>
                  <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" className="h-11 min-w-[200px] rounded-xl" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                  Enregistrer les modifications
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20">
          <CardTitle className="text-base">Navigation</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/missions")}>
            <ClipboardList className="mr-2 h-4 w-4" aria-hidden />
            Voir les missions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
