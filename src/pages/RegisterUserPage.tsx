import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { RegisterUserPayload, RegisterUserResponse, Role } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, UserPlus, Shield } from "lucide-react";
import { toast } from "sonner";
import { ROLE_ORDER, roleBadge, roleDescription, roleLabel } from "@/lib/rbac";
import { useLocale } from "@/lib/locale";
import { ConfirmSubmitDialog } from "@/components/ConfirmSubmitDialog";

const ROLES: Role[] = ROLE_ORDER;

export default function RegisterUserPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<RegisterUserPayload | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("INSPECTOR");

  const mutation = useMutation({
    mutationFn: (body: RegisterUserPayload) =>
      api.post<RegisterUserResponse>("/auth/register", body),
    onSuccess: () => {
      toast.success(t("register.toastSuccess"));
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
      toast.error(t("register.toastPassword"));
      return;
    }
    const payload: RegisterUserPayload = {
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      phone_number: phone.trim(),
      password,
      role,
    };
    setPendingPayload(payload);
    setConfirmOpen(true);
  };

  return (
    <div className="animate-fade-in w-full space-y-8">
      <ConfirmSubmitDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!mutation.isPending) setConfirmOpen(o);
        }}
        title={t("register.confirmTitle")}
        description={t("register.confirmDesc")}
        confirmLabel={t("register.confirmAction")}
        cancelLabel={t("register.confirmCancel")}
        confirmDisabled={mutation.isPending}
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
        onClick={() => navigate("/utilisateurs")}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("register.back")}
      </Button>

      <header className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.06] via-card to-emerald-500/[0.05] px-6 py-7 shadow-sm sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.12)_1px,transparent_0)] [background-size:20px_20px]"
          aria-hidden
        />
        <div className="relative flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <UserPlus className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary/80">{t("register.eyebrow")}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("register.title")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{t("register.subtitle")}</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
          <CardHeader className="border-b border-border/60 bg-muted/25">
            <CardTitle className="text-lg">{t("register.cardTitle")}</CardTitle>
            <CardDescription>{t("register.cardDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t("register.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fn">{t("register.fullName")}</Label>
              <Input
                id="fn"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                maxLength={255}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ph">{t("register.phone")}</Label>
              <Input
                id="ph"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder={t("register.phonePlaceholder")}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">{t("register.password")}</Label>
              <Input
                id="pw"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">{t("register.passwordHint")}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" aria-hidden />
                <Label className="text-base font-semibold">{t("register.roleSigis")}</Label>
              </div>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      <span className="font-medium">{roleLabel(r, t)}</span>
                      <span className="ml-2 text-muted-foreground">({r})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded-xl border border-border/60 bg-muted/15 p-4 text-sm leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground">{roleLabel(role, t)}</p>
                <p className="mt-1 text-xs">{roleBadge(role, t)}</p>
                <p className="mt-2 text-sm">{roleDescription(role, t)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-11 rounded-xl sm:min-w-[120px]" onClick={() => navigate("/utilisateurs")}>
                {t("register.cancel")}
              </Button>
              <Button type="submit" className="h-11 min-w-[160px] rounded-xl" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                {t("register.submit")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
