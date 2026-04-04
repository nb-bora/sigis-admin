import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CreateEstablishmentPayload, CreateEstablishmentResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

function parseUuidOrNull(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  return t;
}

export default function CreateEstablishmentPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [name, setName] = useState("");
  const [centerLat, setCenterLat] = useState("4.0511");
  const [centerLon, setCenterLon] = useState("9.7679");
  const [radiusStrict, setRadiusStrict] = useState("500");
  const [radiusRelaxed, setRadiusRelaxed] = useState("800");
  const [minesecCode, setMinesecCode] = useState("");
  const [establishmentType, setEstablishmentType] = useState("other");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [territoryCode, setTerritoryCode] = useState("");
  const [parentId, setParentId] = useState("");
  const [hostUserId, setHostUserId] = useState("");

  const mutation = useMutation({
    mutationFn: (body: CreateEstablishmentPayload) =>
      api.post<CreateEstablishmentResponse>("/establishments", body),
    onSuccess: (data) => {
      toast.success("Établissement créé");
      navigate(`/etablissements`, { replace: true });
      void data.establishment_id;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!hasPermission("ESTABLISHMENT_CREATE")) {
    return <Navigate to="/etablissements" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(centerLat);
    const lon = Number(centerLon);
    const rs = Number(radiusStrict);
    const rr = Number(radiusRelaxed);
    if (!name.trim()) {
      toast.error("Le nom est obligatoire.");
      return;
    }
    if (Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(rs) || Number.isNaN(rr)) {
      toast.error("Coordonnées ou rayons invalides.");
      return;
    }
    if (rs <= 0 || rr <= 0) {
      toast.error("Les rayons doivent être strictement positifs.");
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
    <div className="animate-fade-in max-w-2xl">
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate("/etablissements")}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Retour
      </Button>

      <div className="page-header">
        <h1 className="page-title">Nouvel établissement</h1>
        <p className="page-description">POST /v1/establishments — géométrie et contacts</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nom officiel *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={512}
            placeholder="Lycée de la Cité"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lat">Latitude (WGS-84) *</Label>
            <Input
              id="lat"
              type="number"
              step="any"
              value={centerLat}
              onChange={(e) => setCenterLat(e.target.value)}
              required
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
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rs">Rayon strict (m) *</Label>
            <Input
              id="rs"
              type="number"
              min={1}
              step="any"
              value={radiusStrict}
              onChange={(e) => setRadiusStrict(e.target.value)}
              required
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
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="etype">Type</Label>
            <Input
              id="etype"
              value={establishmentType}
              onChange={(e) => setEstablishmentType(e.target.value)}
              maxLength={64}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minesec">Code MINESEC</Label>
            <Input
              id="minesec"
              value={minesecCode}
              onChange={(e) => setMinesecCode(e.target.value)}
              maxLength={64}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="terr">Code territoire</Label>
          <Input
            id="terr"
            value={territoryCode}
            onChange={(e) => setTerritoryCode(e.target.value)}
            maxLength={64}
            placeholder="Région / académie / délégation"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Contact e-mail</Label>
            <Input
              id="email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Contact téléphone</Label>
            <Input
              id="phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              maxLength={32}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="parent">Établissement parent (UUID)</Label>
          <Input
            id="parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            placeholder="Optionnel"
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="host">Responsable d&apos;accueil désigné (UUID utilisateur)</Label>
          <Input
            id="host"
            value={hostUserId}
            onChange={(e) => setHostUserId(e.target.value)}
            placeholder="Optionnel"
            className="font-mono text-xs"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Créer l&apos;établissement
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/etablissements")}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
