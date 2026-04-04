import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Establishment } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function EstablishmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = hasPermission("ESTABLISHMENT_UPDATE");

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
  const [etype, setEtype] = useState("");
  const [minesec, setMinesec] = useState("");
  const [terr, setTerr] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!est) return;
    setName(est.name);
    setCenterLat(String(est.center_lat));
    setCenterLon(String(est.center_lon));
    setRs(String(est.radius_strict_m));
    setRr(String(est.radius_relaxed_m));
    setEtype(est.establishment_type);
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
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!est) {
    return <p className="text-muted-foreground">Établissement introuvable.</p>;
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate("/etablissements")}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Retour
      </Button>

      <div className="page-header">
        <h1 className="page-title">{est.name}</h1>
        <p className="page-description">
          GET/PATCH /v1/establishments/{"{"}id{"}"} — géométrie v{est.geometry_version}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="n">Nom</Label>
          <Input id="n" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Latitude</Label>
            <Input type="number" step="any" value={centerLat} onChange={(e) => setCenterLat(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Longitude</Label>
            <Input type="number" step="any" value={centerLon} onChange={(e) => setCenterLon(e.target.value)} disabled={!canEdit} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Rayon strict (m)</Label>
            <Input type="number" step="any" value={rs} onChange={(e) => setRs(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Rayon élargi (m)</Label>
            <Input type="number" step="any" value={rr} onChange={(e) => setRr(e.target.value)} disabled={!canEdit} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Input value={etype} onChange={(e) => setEtype(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>MINESEC</Label>
            <Input value={minesec} onChange={(e) => setMinesec(e.target.value)} disabled={!canEdit} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Territoire</Label>
          <Input value={terr} onChange={(e) => setTerr(e.target.value)} disabled={!canEdit} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canEdit} />
          </div>
        </div>

        {canEdit && (
          <div className="pt-4">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
