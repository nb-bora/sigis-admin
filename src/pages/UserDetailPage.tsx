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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, UserRound, Shield, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { ROLE_ORDER, roleBadge, roleDescription, roleLabel } from "@/lib/rbac";
import { useLocale } from "@/lib/locale";
import { ConfirmSubmitDialog } from "@/components/ConfirmSubmitDialog";

const ROLES: Role[] = ROLE_ORDER;

export default function UserDetailPage() {
  const { t, locale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser, hasRole, hasPermission } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const formatCreatedAt = (iso: string): string => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
        dateStyle: "long",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };
  const queryClient = useQueryClient();

  const isAdmin = hasRole("SUPER_ADMIN") || hasRole("NATIONAL_ADMIN");
  const isSelf = authUser?.userId === id;
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
      toast.success(t("userDetail.saveSuccess"));
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="animate-fade-in max-w-lg">
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : t("userDetail.errorGeneric")}</p>
      </div>
    );
  }

  if (!u) {
    return <p className="text-muted-foreground">{t("userDetail.notFound")}</p>;
  }

  return (
    <div className="animate-fade-in w-full space-y-8">
      <ConfirmSubmitDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!saveMutation.isPending) setConfirmOpen(o);
        }}
        title={t("userDetail.confirmSaveTitle")}
        description={t("userDetail.confirmSaveDesc")}
        confirmLabel={t("userDetail.confirmSaveAction")}
        cancelLabel={t("userDetail.confirmSaveCancel")}
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
        onClick={() => navigate(hasPermission("USER_LIST") ? "/utilisateurs" : "/")}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("userDetail.back")}
      </Button>

      <header className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.06] via-card to-sky-500/[0.05] px-6 py-7 shadow-sm sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.12)_1px,transparent_0)] [background-size:20px_20px]"
          aria-hidden
        />
        <div className="relative flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <UserRound className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-primary/80">{t("userDetail.eyebrow")}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{u.full_name}</h1>
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{u.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="font-normal">
                {roleLabel(u.role, t)}
              </Badge>
              <Badge variant={u.is_active ? "outline" : "destructive"} className="font-normal">
                {u.is_active ? t("userDetail.active") : t("userDetail.inactive")}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
        <CardHeader className="border-b border-border/60 bg-muted/25">
          <CardTitle className="text-lg">{t("userDetail.identityTitle")}</CardTitle>
          <CardDescription>{t("userDetail.identityDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label>{t("userDetail.email")}</Label>
            <Input value={u.email} disabled className="h-11 rounded-xl bg-muted/40 font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fn">{t("userDetail.fullName")}</Label>
            <Input
              id="fn"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!canEditProfile}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ph">{t("userDetail.phone")}</Label>
            <Input
              id="ph"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!canEditProfile}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">{t("userDetail.createdPrefix")}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{formatCreatedAt(u.created_at)}</p>
            </div>
          </div>

          {canEditAdminFields && (
            <>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/10 p-4">
                <div>
                  <Label htmlFor="act" className="text-base">
                    {t("userDetail.accountActive")}
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("userDetail.accountActiveHint")}</p>
                </div>
                <Switch id="act" checked={active} onCheckedChange={setActive} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" aria-hidden />
                  <Label className="text-base font-semibold">{t("userDetail.roleSigis")}</Label>
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
            </>
          )}

          {canEditProfile && (
            <div className="flex justify-end pt-2">
              <Button
                className="h-11 min-w-[160px] rounded-xl"
                onClick={() => setConfirmOpen(true)}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                {t("userDetail.save")}
              </Button>
            </div>
          )}

          {!canEditProfile && (
            <p className="text-sm text-muted-foreground">{t("userDetail.readOnly")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
