import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth";
import { useLocale, type AppLocale } from "@/lib/locale";
import { api } from "@/lib/api";
import type { HealthResponse, Permission, Role, User } from "@/types/api";
import { ROLE_PERMISSIONS } from "@/types/api";
import {
  PERMISSIONS_ORDER,
  permissionDescription,
  permissionLabel,
  permissionPrefix,
  permissionPrefixLabel,
  roleDescription,
  roleLabel as roleLabelFromRbac,
} from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Activity,
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Languages,
  LogOut,
  Monitor,
  Moon,
  RefreshCw,
  Shield,
  Sparkles,
  Sun,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PREFIX_ORDER = [...new Set(PERMISSIONS_ORDER.map((p) => permissionPrefix(p)))];

function effectivePermissions(role: Role): Permission[] {
  if (role === "SUPER_ADMIN") return [...PERMISSIONS_ORDER];
  const raw = ROLE_PERMISSIONS[role] ?? [];
  return [...raw].sort((a, b) => PERMISSIONS_ORDER.indexOf(a) - PERMISSIONS_ORDER.indexOf(b));
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "permissions" | "system">(
    "profile",
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Persiste la tab dans l'URL : /parametres?tab=security
  useEffect(() => {
    const raw = (searchParams.get("tab") ?? "").trim();
    const next =
      raw === "profile" || raw === "security" || raw === "permissions" || raw === "system"
        ? raw
        : "profile";
    setActiveTab(next);
  }, [searchParams]);

  const onTabChange = (v: string) => {
    const next =
      v === "profile" || v === "security" || v === "permissions" || v === "system"
        ? v
        : "profile";
    setActiveTab(next);
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", next);
    setSearchParams(sp, { replace: true });
  };

  const copyId = useCallback(
    async (id: string) => {
      try {
        await navigator.clipboard.writeText(id);
        toast.success(t("settings.toastIdCopied"));
      } catch {
        toast.error(t("settings.toastCopyError"));
      }
    },
    [t],
  );

  const formatCreatedAt = useCallback(
    (iso: string) => {
      if (!iso) return "—";
      try {
        return new Date(iso).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
          dateStyle: "long",
          timeStyle: "short",
        });
      } catch {
        return iso;
      }
    },
    [locale],
  );

  const roleLabel = useCallback((r: User["role"]) => roleLabelFromRbac(r, t), [t]);

  const { data: health, isFetching: healthFetching, refetch: refetchHealth } = useQuery({
    queryKey: ["api-health"],
    queryFn: () => api.get<HealthResponse>("/health"),
    staleTime: 30_000,
    retry: 1,
  });

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useQuery({
    queryKey: ["user", user?.userId],
    queryFn: () => {
      const uid = user?.userId;
      if (!uid) throw new Error("Missing user id");
      return api.get<User>(`/users/${uid}`);
    },
    enabled: !!user?.userId,
  });

  const activeTheme = useMemo(() => {
    if (!mounted) return "light";
    if (theme === "system") return resolvedTheme ?? "light";
    return theme ?? "light";
  }, [mounted, theme, resolvedTheme]);

  const permsByPrefix = useMemo(() => {
    if (!user) return new Map<string, Permission[]>();
    const eff = effectivePermissions(user.role);
    const m = new Map<string, Permission[]>();
    for (const p of eff) {
      const pref = permissionPrefix(p);
      m.set(pref, [...(m.get(pref) ?? []), p]);
    }
    return m;
  }, [user]);

  const onPasswordFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!currentPwd.trim()) {
      toast.error(t("settings.passwordCurrentRequired"));
      return;
    }
    if (newPwd.length < 8) {
      toast.error(t("settings.passwordMinHint"));
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }
    setPasswordConfirmOpen(true);
  };

  const executePasswordChange = async () => {
    if (!user) return;
    setPwdSubmitting(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPwd,
        new_password: newPwd,
      });
      toast.success(t("settings.passwordSuccess"));
      setPasswordConfirmOpen(false);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPwdSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="animate-fade-in w-full space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.07] via-card to-amber-500/[0.05] px-6 py-7 shadow-sm sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.12)_1px,transparent_0)] [background-size:20px_20px]"
          aria-hidden
        />
        <div className="relative flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sparkles className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary/80">{t("settings.heroEyebrow")}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("settings.heroTitle")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{t("settings.heroSubtitle")}</p>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1.5 sm:grid-cols-4">
          <TabsTrigger value="profile" className="gap-2 rounded-lg py-2.5 data-[state=active]:shadow-sm">
            <UserRound className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{t("settings.tabProfile")}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 rounded-lg py-2.5 data-[state=active]:shadow-sm">
            <KeyRound className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{t("settings.tabSecurity")}</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2 rounded-lg py-2.5 data-[state=active]:shadow-sm">
            <Shield className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{t("settings.tabPermissions")}</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2 rounded-lg py-2.5 data-[state=active]:shadow-sm">
            <Activity className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{t("settings.tabSystem")}</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Profil ───────────────────────────────────────────────────── */}
        <TabsContent value="profile" className="mt-6 space-y-8 focus-visible:outline-none">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
            <section aria-labelledby="settings-lang-heading" className="min-w-0">
              <Card className="flex h-full flex-col overflow-hidden rounded-2xl border-border/80 shadow-md">
                <CardHeader className="border-b border-border/60 bg-muted/25">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
                      <Languages className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </div>
                    <div>
                      <CardTitle id="settings-lang-heading" className="text-lg">
                        {t("settings.langSectionTitle")}
                      </CardTitle>
                      <CardDescription>{t("settings.langSectionDesc")}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col pt-6">
                  <RadioGroup
                    value={locale}
                    onValueChange={(v) => setLocale(v as AppLocale)}
                    className="grid flex-1 gap-3 grid-cols-2"
                  >
                    <label
                      htmlFor="locale-fr"
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                        locale === "fr"
                          ? "border-primary bg-primary/[0.06] shadow-sm"
                          : "border-border/80 hover:bg-muted/40",
                      )}
                    >
                      <RadioGroupItem value="fr" id="locale-fr" className="sr-only" />
                      <span className="text-lg" aria-hidden>
                        🇫🇷
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{t("settings.langFr")}</p>
                      </div>
                    </label>
                    <label
                      htmlFor="locale-en"
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                        locale === "en"
                          ? "border-primary bg-primary/[0.06] shadow-sm"
                          : "border-border/80 hover:bg-muted/40",
                      )}
                    >
                      <RadioGroupItem value="en" id="locale-en" className="sr-only" />
                      <span className="text-lg" aria-hidden>
                        🇬🇧
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{t("settings.langEn")}</p>
                      </div>
                    </label>
                  </RadioGroup>
                </CardContent>
              </Card>
            </section>

            <section aria-labelledby="settings-appearance-heading" className="min-w-0">
              <Card className="flex h-full flex-col overflow-hidden rounded-2xl border-border/80 shadow-md">
                <CardHeader className="border-b border-border/60 bg-muted/25">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300">
                      <Monitor className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </div>
                    <div>
                      <CardTitle id="settings-appearance-heading" className="text-lg">
                        {t("settings.appearanceTitle")}
                      </CardTitle>
                      <CardDescription>{t("settings.appearanceDesc")}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col pt-6">
                  {mounted ? (
                    <RadioGroup
                      value={theme ?? "light"}
                      onValueChange={(v) => setTheme(v)}
                      className="grid flex-1 gap-3 grid-cols-2"
                    >
                      <label
                        htmlFor="theme-light"
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                          activeTheme === "light"
                            ? "border-primary bg-primary/[0.06] shadow-sm"
                            : "border-border/80 hover:bg-muted/40",
                        )}
                      >
                        <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                        <Sun className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                        <div>
                          <p className="font-medium text-foreground">{t("settings.themeLight")}</p>
                          <p className="text-xs text-muted-foreground">{t("settings.themeLightHint")}</p>
                        </div>
                      </label>
                      <label
                        htmlFor="theme-dark"
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                          activeTheme === "dark"
                            ? "border-primary bg-primary/[0.06] shadow-sm"
                            : "border-border/80 hover:bg-muted/40",
                        )}
                      >
                        <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                        <Moon className="h-5 w-5 shrink-0 text-violet-400" aria-hidden />
                        <div>
                          <p className="font-medium text-foreground">{t("settings.themeDark")}</p>
                          <p className="text-xs text-muted-foreground">{t("settings.themeDarkHint")}</p>
                        </div>
                      </label>
                    </RadioGroup>
                  ) : (
                    <Skeleton className="h-24 w-full rounded-xl" />
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          <section aria-labelledby="settings-profile-heading">
            <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
              <CardHeader className="border-b border-border/60 bg-muted/25">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div>
                    <CardTitle id="settings-profile-heading" className="text-lg">
                      {t("settings.accountTitle")}
                    </CardTitle>
                    <CardDescription>{t("settings.accountDesc")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                {profileLoading && (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-48 rounded-md" />
                    <Skeleton className="h-4 w-full max-w-md rounded-md" />
                    <Skeleton className="h-10 w-40 rounded-xl" />
                  </div>
                )}
                {!profileLoading && profileError && (
                  <p className="text-sm text-muted-foreground">{t("settings.profileLoadError")}</p>
                )}
                {!profileLoading && profile && (
                  <>
                    <div className="flex flex-col gap-1">
                      <p className="text-xl font-semibold tracking-tight text-foreground">{profile.full_name}</p>
                      <p className="break-all font-mono text-sm text-muted-foreground">{profile.email}</p>
                      <p className="font-mono text-xs text-muted-foreground">{profile.phone_number}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="font-normal">
                        {roleLabel(profile.role)}
                      </Badge>
                      <Badge variant={profile.is_active ? "outline" : "destructive"} className="font-normal">
                        {profile.is_active ? t("settings.badgeActive") : t("settings.badgeInactive")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.accountCreatedPrefix")} {formatCreatedAt(profile.created_at)}
                    </p>
                  </>
                )}
                <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("settings.techIdLabel")}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="break-all rounded-md bg-background px-2 py-1 font-mono text-xs">{user.userId}</code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg"
                      onClick={() => void copyId(user.userId)}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      {t("settings.copy")}
                    </Button>
                  </div>
                </div>
                <Button type="button" className="h-11 rounded-xl" onClick={() => navigate(`/utilisateurs/${user.userId}`)}>
                  {t("settings.editProfile")}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        {/* ── Sécurité ─────────────────────────────────────────────────── */}
        <TabsContent value="security" className="mt-6 space-y-8 focus-visible:outline-none">
          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
            <CardHeader className="border-b border-border/60 bg-muted/25">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <KeyRound className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("settings.passwordSectionTitle")}</CardTitle>
                  <CardDescription>{t("settings.passwordSectionDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={onPasswordFormSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-pwd">{t("settings.currentPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="current-pwd"
                      type={showCurrent ? "text" : "password"}
                      autoComplete="current-password"
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      disabled={pwdSubmitting}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowCurrent((v) => !v)}
                      aria-label={showCurrent ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pwd">{t("settings.newPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="new-pwd"
                      type={showNew ? "text" : "password"}
                      autoComplete="new-password"
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      disabled={pwdSubmitting}
                      className="pr-10"
                      minLength={8}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNew((v) => !v)}
                      aria-label={showNew ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("settings.passwordMinHint")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pwd">{t("settings.confirmPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="confirm-pwd"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      disabled={pwdSubmitting}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="submit" className="h-11 rounded-xl sm:w-auto" disabled={pwdSubmitting}>
                    {t("settings.passwordSubmit")}
                  </Button>
                  <Link
                    to="/auth/forgot-password"
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {t("settings.passwordForgotLink")}
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
            <CardHeader className="border-b border-border/60 bg-muted/25">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-200">
                  <Shield className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("settings.sessionTitle")}</CardTitle>
                  <CardDescription>{t("settings.sessionDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm leading-relaxed text-muted-foreground">{t("settings.sessionPasswordHint")}</p>
              <Separator />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Label className="text-sm font-medium text-foreground">{t("settings.sessionEndLabel")}</Label>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="mr-2 h-4 w-4" aria-hidden />
                      {t("settings.logout")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("settings.logoutDialogTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("settings.logoutDialogDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">{t("settings.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => {
                          logout();
                          queryClient.clear();
                          navigate("/login", { replace: true });
                        }}
                      >
                        {t("settings.logout")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Mes droits ───────────────────────────────────────────────── */}
        <TabsContent value="permissions" className="mt-6 focus-visible:outline-none">
          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
            <CardHeader className="border-b border-border/60 bg-muted/25">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-200">
                  <Shield className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("settings.permissionsSectionTitle")}</CardTitle>
                  <CardDescription>{t("settings.permissionsSectionDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("settings.permissionsRoleTitle")}</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{roleLabelFromRbac(user.role, t)}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{roleDescription(user.role, t)}</p>
              </div>
              {user.role === "SUPER_ADMIN" && (
                <p className="rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2 text-sm text-foreground">{t("settings.permissionsSuperNote")}</p>
              )}
              <p className="text-xs text-muted-foreground">{t("settings.permissionsGroupedHint")}</p>
              <div className="space-y-8">
                {PREFIX_ORDER.map((prefix) => {
                  const list = permsByPrefix.get(prefix);
                  if (!list?.length) return null;
                  return (
                    <div key={prefix}>
                      <h3 className="mb-3 border-b border-border/60 pb-2 text-sm font-semibold tracking-tight text-foreground">
                        {permissionPrefixLabel(prefix, t)}
                      </h3>
                      <ul className="space-y-4">
                        {list.map((p) => (
                          <li key={p} className="rounded-lg border border-border/50 bg-card/50 px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{p}</code>
                            </div>
                            <p className="mt-1.5 text-sm font-medium text-foreground">{permissionLabel(p, t)}</p>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{permissionDescription(p, t)}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Système ──────────────────────────────────────────────────── */}
        <TabsContent value="system" className="mt-6 focus-visible:outline-none">
          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
            <CardHeader className="border-b border-border/60 bg-muted/25">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <Activity className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t("settings.apiTitle")}</CardTitle>
                    <CardDescription>{t("settings.apiDesc")}</CardDescription>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-xl"
                  onClick={() => void refetchHealth()}
                  disabled={healthFetching}
                >
                  <RefreshCw className={cn("mr-2 h-4 w-4", healthFetching && "animate-spin")} aria-hidden />
                  {t("settings.apiTest")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {health ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="status-badge-success">
                    {health.status === "ok" ? t("settings.apiOperational") : health.status}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {health.service}
                    {health.version ? ` · v${health.version}` : ""}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {healthFetching ? t("settings.apiChecking") : t("settings.apiUnavailable")}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={passwordConfirmOpen} onOpenChange={(open) => !pwdSubmitting && setPasswordConfirmOpen(open)}>
        <DialogContent
          className={cn(
            "max-w-[460px] gap-0 overflow-hidden border border-primary/15 bg-background p-0 shadow-2xl shadow-primary/[0.08]",
            "sm:rounded-2xl [&>button]:hidden",
          )}
          onPointerDownOutside={(e) => pwdSubmitting && e.preventDefault()}
          onEscapeKeyDown={(e) => pwdSubmitting && e.preventDefault()}
        >
          <div className="relative">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.18] via-primary/[0.06] to-amber-500/[0.12]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.45] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.2)_1px,transparent_0)] [background-size:18px_18px]"
              aria-hidden
            />
            <div className="relative px-6 pb-2 pt-10 text-center">
              <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-lg shadow-primary/20 ring-4 ring-primary/10">
                <KeyRound className="h-9 w-9" strokeWidth={1.5} aria-hidden />
              </div>
              <DialogTitle className="mt-6 text-balance text-xl font-bold tracking-tight text-foreground">
                {t("settings.passwordConfirmTitle")}
              </DialogTitle>
              <DialogDescription className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
                {t("settings.passwordConfirmDesc")}
              </DialogDescription>
            </div>
          </div>

          <div className="border-t border-border/60 bg-muted/30 px-6 py-5">
            <ul className="space-y-3 text-left text-sm text-foreground/90">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="leading-snug">{t("settings.passwordConfirmBullet1")}</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-400">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="leading-snug">{t("settings.passwordConfirmBullet2")}</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-400">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="leading-snug">{t("settings.passwordConfirmBullet3")}</span>
              </li>
            </ul>
          </div>

          <DialogFooter className="flex-col gap-2 border-t border-border/50 bg-muted/20 px-6 py-5 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl border-border/80 sm:w-auto"
              disabled={pwdSubmitting}
              onClick={() => setPasswordConfirmOpen(false)}
            >
              {t("settings.passwordConfirmCancel")}
            </Button>
            <Button
              type="button"
              className="h-11 w-full rounded-xl shadow-md shadow-primary/15 sm:w-auto"
              disabled={pwdSubmitting}
              onClick={() => void executePasswordChange()}
            >
              {pwdSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  {t("settings.passwordConfirmWorking")}
                </>
              ) : (
                t("settings.passwordConfirmAction")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
