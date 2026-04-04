import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth";
import { useLocale, type AppLocale } from "@/lib/locale";
import { api } from "@/lib/api";
import type { HealthResponse, User } from "@/types/api";
import { roleLabel as roleLabelFromRbac } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
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
  Copy,
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

export default function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const activeTheme = !mounted
    ? "light"
    : theme === "system"
      ? (resolvedTheme ?? "light")
      : (theme ?? "light");

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-10">
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
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("settings.heroSubtitle")}</p>
          </div>
        </div>
      </header>

      <section aria-labelledby="settings-lang-heading">
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
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
          <CardContent className="pt-6">
            <RadioGroup
              value={locale}
              onValueChange={(v) => setLocale(v as AppLocale)}
              className="grid gap-3 sm:grid-cols-2"
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
            {user && (
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
            )}
            <Button type="button" className="h-11 rounded-xl" onClick={() => navigate(`/utilisateurs/${user?.userId}`)}>
              {t("settings.editProfile")}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="settings-appearance-heading">
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
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
          <CardContent className="pt-6">
            {mounted ? (
              <RadioGroup
                value={theme ?? "light"}
                onValueChange={(v) => setTheme(v)}
                className="grid gap-3 sm:grid-cols-2"
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

      <section aria-labelledby="settings-api-heading">
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
          <CardHeader className="border-b border-border/60 bg-muted/25">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <Activity className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div>
                  <CardTitle id="settings-api-heading" className="text-lg">
                    {t("settings.apiTitle")}
                  </CardTitle>
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
                <span className="font-mono text-xs text-muted-foreground">{health.service}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {healthFetching ? t("settings.apiChecking") : t("settings.apiUnavailable")}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="settings-session-heading">
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
          <CardHeader className="border-b border-border/60 bg-muted/25">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-200">
                <Shield className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <div>
                <CardTitle id="settings-session-heading" className="text-lg">
                  {t("settings.sessionTitle")}
                </CardTitle>
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
      </section>
    </div>
  );
}
