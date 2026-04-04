import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { RegisterUserPayload, RegisterUserResponse, Role } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function RegisterUserPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("INSPECTOR");

  const mutation = useMutation({
    mutationFn: (body: RegisterUserPayload) =>
      api.post<RegisterUserResponse>("/auth/register", body),
    onSuccess: () => {
      toast.success("Compte créé");
      navigate("/utilisateurs");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!hasPermission("AUTH_REGISTER_USER")) {
    return <Navigate to="/utilisateurs" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    mutation.mutate({
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      phone_number: phone.trim(),
      password,
      role,
    });
  };

  return (
    <div className="animate-fade-in max-w-lg">
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate("/utilisateurs")}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Retour
      </Button>

      <div className="page-header">
        <h1 className="page-title">Nouvel utilisateur</h1>
        <p className="page-description">POST /v1/auth/register — rôle unique</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fn">Nom complet *</Label>
          <Input
            id="fn"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
            maxLength={255}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ph">Téléphone (Cameroun) *</Label>
          <Input
            id="ph"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="699000000 ou +237699000000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">Mot de passe *</Label>
          <Input
            id="pw"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <Label>Rôle *</Label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="bg-background">
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
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Créer le compte
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/utilisateurs")}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
