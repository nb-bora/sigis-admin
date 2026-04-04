import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Role, User } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const ROLES: Role[] = [
  "SUPER_ADMIN",
  "NATIONAL_ADMIN",
  "REGIONAL_SUPERVISOR",
  "INSPECTOR",
  "HOST",
];

const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  NATIONAL_ADMIN: "Admin national",
  REGIONAL_SUPERVISOR: "Superviseur régional",
  INSPECTOR: "Inspecteur",
  HOST: "Hôte",
};

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = hasRole("SUPER_ADMIN") || hasRole("NATIONAL_ADMIN");
  const isSelf = authUser?.userId === id;
  /** Aligné backend : propre profil ou admin national / super. */
  const canEditProfile = isSelf || isAdmin;
  const canEditAdminFields = isAdmin;

  const {
    data: u,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["user", id],
    queryFn: () => api.get<User>(`/users/${id}`),
    enabled: !!id,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [active, setActive] = useState(true);
  const [role, setRole] = useState<Role>("INSPECTOR");

  useEffect(() => {
    if (!u) return;
    setFullName(u.full_name);
    setPhone(u.phone_number);
    setActive(u.is_active);
    setRole(u.role);
  }, [u]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};
      if (canEditProfile) {
        body.full_name = fullName.trim();
        body.phone_number = phone.trim();
      }
      if (canEditAdminFields) {
        body.is_active = active;
        body.role = role;
      }
      return api.patch<User>(`/users/${id}`, body);
    },
    onSuccess: () => {
      toast.success("Profil mis à jour");
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-lg animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="animate-fade-in max-w-lg">
        <p className="text-destructive text-sm">{error instanceof Error ? error.message : "Erreur"}</p>
      </div>
    );
  }

  if (!u) {
    return <p className="text-muted-foreground">Utilisateur introuvable.</p>;
  }

  return (
    <div className="animate-fade-in max-w-lg">
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate("/utilisateurs")}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Retour
      </Button>

      <div className="page-header">
        <h1 className="page-title">{u.full_name}</h1>
        <p className="page-description">GET/PATCH /v1/users/{"{"}id{"}"}</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input value={u.email} disabled className="bg-muted/50" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fn">Nom complet</Label>
          <Input
            id="fn"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={!canEditProfile}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ph">Téléphone (E.164)</Label>
          <Input
            id="ph"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={!canEditProfile}
          />
        </div>

        {canEditAdminFields && (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <Label htmlFor="act">Compte actif</Label>
              <Switch id="act" checked={active} onCheckedChange={setActive} />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {canEditProfile && (
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        )}

        {!canEditProfile && (
          <p className="text-sm text-muted-foreground">Lecture seule — vous ne pouvez pas modifier ce profil.</p>
        )}
      </div>
    </div>
  );
}
