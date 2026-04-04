import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CreateEstablishmentPayload, CreateEstablishmentResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormStepper, FormStepperActions, type FormStepperStep } from "@/components/ui/form-stepper";
import {
  ArrowLeft,
  Loader2,
  Building2,
  MapPinned,
  Users,
  ClipboardPlus,
  Mail,
  Phone,
  Hash,
} from "lucide-react";
import { toast } from "sonner";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "lycee", label: "Lycée" },
  { value: "college", label: "Collège" },
  { value: "primaire", label: "Primaire" },
  { value: "formation", label: "Formation" },
  { value: "admin", label: "Administratif" },
  { value: "other", label: "Autre" },
];

function parseUuidOrNull(s: string): string | null {
  const t = s.trim();
  return t || null;
}

export default function CreateEstablishmentPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [establishmentType, setEstablishmentType] = useState("other");
  const [minesecCode, setMinesecCode] = useState("");
  const [territoryCode, setTerritoryCode] = useState("");

  const [centerLat, setCenterLat] = useState("4.0511");
  const [centerLon, setCenterLon] = useState("9.7679");
  const [radiusStrict, setRadiusStrict] = useState("500");
  const [radiusRelaxed, setRadiusRelaxed] = useState("800");

  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [parentId, setParentId] = useState("");
  const [hostUserId, setHostUserId] = useState("");

  const steps = useMemo<FormStepperStep[]>(
    () => [
      { id: "id", title: "Identité", description: "Nom et classification" },
      { id: "geo", title: "Géolocalisation", description: "GPS et géofence" },
      { id: "extra", title: "Contacts & liens", description: "Optionnel" },
    ],
    [],
  );
  const lastStep = steps.length - 1;

  const stepHeaders = [
    { Icon: Building2, title: "Identité administrative", description: "Nom officiel, type et rattachement territorial" },
    { Icon: MapPinned, title: "Périmètre sur carte", description: "Centre WGS-84 et rayons strict / élargi" },
    { Icon: Users, title: "Contacts et rattachements", description: "Coordonnées et liens hiérarchiques" },
  ] as const;
  const StepIcon = stepHeaders[step].Icon;

  const mutation = useMutation({
    mutationFn: (body: CreateEstablishmentPayload) =>
      api.post<CreateEstablishmentResponse>("/establishments", body),
    onSuccess: (data) => {
      toast.success("Établissement créé", { description: "Ouverture de la fiche…" });
      navigate(`/etablissements/${data.establishment_id}`, { replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!hasPermission("ESTABLISHMENT_CREATE")) {
    return <Navigate to="/etablissements" replace />;
  }

  const goNext = () => {
    if (step === 0) {
      if (!name.trim()) {
        toast.error("Nom requis", { description: "Indiquez le nom officiel de l'établissement." });
        return;
      }
    }
    if (step === 1) {
      const lat = Number(centerLat);
      const lon = Number(centerLon);
      const rs = Number(radiusStrict);
      const rr = Number(radiusRelaxed);
      if (Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(rs) || Number.isNaN(rr)) {
        toast.error("Coordonnées ou rayons invalides.");
        return;
      }
      if (rs <= 0 || rr <= 0) {
        toast.error("Les rayons doivent être strictement positifs.");
        return;
      }
      if (rr < rs) {
        toast.error("Cohérence des rayons", {
          description: "Le rayon élargi doit être supérieur ou égal au rayon strict.",
        });
        return;
      }
    }
    setStep((s) => Math.min(s + 1, lastStep));
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== lastStep) {
      goNext();
      return;
    }
    if (!name.trim()) {
      toast.error("Nom requis");
      setStep(0);
      return;
    }
    const lat = Number(centerLat);
    const lon = Number(centerLon);
    const rs = Number(radiusStrict);
    const rr = Number(radiusRelaxed);
    if (Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(rs) || Number.isNaN(rr) || rs <= 0 || rr <= 0) {
      toast.error("Données géographiques invalides");
      setStep(1);
      return;
    }

    const payload: CreateEstablishmentPayload = {
      name: name.trim(),
      center_lat: lat,
      center_lon: lon,
      radius_strict_m: rs,
      radius_relaxed_m: rr,
      establishment_type: establishmentType.trim() || "other",
      minesec_code: minesecCode.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      territory_code: territoryCode.trim() || null,
      parent_establishment_id: parseUuidOrNull(parentId),
      designated_host_user_id: parseUuidOrNull(hostUserId),
    };
    mutation.mutate(payload);
  };

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-8">
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
        <div className="relative flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <ClipboardPlus className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary/80">Création</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Nouvel établissement</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Enregistrez la fiche géographique : centre GPS, géofence en deux cercles, puis contacts et liens
              hiérarchiques si besoin.
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
                <Label htmlFor="name" className="text-sm font-medium">
                  Nom officiel <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={512}
                  placeholder="Lycée de la Cité"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Type d&apos;établissement</Label>
                <Select value={establishmentType} onValueChange={setEstablishmentType}>
                  <SelectTrigger id="etype" className="h-11 rounded-xl border-border/80 bg-background">
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="minesec" className="inline-flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Code MINESEC
                  </Label>
                  <Input
                    id="minesec"
                    value={minesecCode}
                    onChange={(e) => setMinesecCode(e.target.value)}
                    maxLength={64}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="terr">Code territoire</Label>
                  <Input
                    id="terr"
                    value={territoryCode}
                    onChange={(e) => setTerritoryCode(e.target.value)}
                    maxLength={64}
                    placeholder="Région / délégation"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className={step === 1 ? "space-y-5" : "hidden"} aria-hidden={step !== 1}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude (WGS-84) *</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    value={centerLat}
                    onChange={(e) => setCenterLat(e.target.value)}
                    className="h-11 rounded-xl font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lon">Longitude *</Label>
                  <Input
                    id="lon"
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
                  <Label htmlFor="rs">Rayon strict (m) *</Label>
                  <Input
                    id="rs"
                    type="number"
                    min={1}
                    step="any"
                    value={radiusStrict}
                    onChange={(e) => setRadiusStrict(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rr">Rayon élargi (m) *</Label>
                  <Input
                    id="rr"
                    type="number"
                    min={1}
                    step="any"
                    value={radiusRelaxed}
                    onChange={(e) => setRadiusRelaxed(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <p className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                Le rayon strict définit la zone de <span className="font-medium text-foreground">présence confirmée</span>
                ; la couronne jusqu&apos;au rayon élargi correspond à une <span className="font-medium text-foreground">présence probable</span>.
              </p>
            </div>

            <div className={step === 2 ? "space-y-5" : "hidden"} aria-hidden={step !== 2}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Contact e-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Téléphone
                  </Label>
                  <Input
                    id="phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    maxLength={32}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="parent">Établissement parent (UUID)</Label>
                <Input
                  id="parent"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  placeholder="Optionnel — rattachement hiérarchique"
                  className="h-11 rounded-xl font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host">Hôte désigné (UUID utilisateur)</Label>
                <Input
                  id="host"
                  value={hostUserId}
                  onChange={(e) => setHostUserId(e.target.value)}
                  placeholder="Optionnel — responsable d'accueil par défaut"
                  className="h-11 rounded-xl font-mono text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {step < lastStep ? (
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
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => navigate("/etablissements")}>
                Annuler
              </Button>
              <Button
                type="submit"
                className="h-11 min-w-[200px] rounded-xl shadow-md shadow-primary/20"
                disabled={mutation.isPending}
              >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Créer l&apos;établissement
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
