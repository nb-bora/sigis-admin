import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";
import { roleLabel } from "@/lib/rbac";
import type { ReportSummary, Permission, Role } from "@/types/api";
import type { AppLocale } from "@/lib/locale";
import type { TranslateFn } from "@/lib/rbac";
import {
  ClipboardList,
  Building2,
  AlertTriangle,
  Users,
  FileSearch,
  ArrowRight,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  Info,
  RefreshCw,
  Compass,
  Radio,
  KeyRound,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { sortQuickLinksByPath, tRoleAware } from "@/lib/personalization";

const missionBarColor: Record<string, string> = {
  draft: "bg-slate-400 dark:bg-slate-500",
  planned: "bg-sky-500",
  in_progress: "bg-primary",
  completed: "bg-emerald-500",
  cancelled: "bg-rose-400",
};

type QuickLink = {
  label: string;
  hint: string;
  path: string;
  permission: Permission | "always";
  icon: typeof ClipboardList;
  rolesOnly?: Role[];
};

const QUICK_DEFS: Array<{
  labelKey: string;
  hintKey: string;
  path: string;
  permission: Permission | "always";
  icon: typeof ClipboardList;
  rolesOnly?: Role[];
}> = [
  { labelKey: "dashboard.quick.missions", hintKey: "dashboard.quick.missionsHint", path: "/missions", permission: "MISSION_READ", icon: ClipboardList },
  { labelKey: "dashboard.quick.establishments", hintKey: "dashboard.quick.establishmentsHint", path: "/etablissements", permission: "ESTABLISHMENT_READ", icon: Building2 },
  { labelKey: "dashboard.quick.exceptions", hintKey: "dashboard.quick.exceptionsHint", path: "/signalements", permission: "EXCEPTION_READ", icon: AlertTriangle },
  { labelKey: "dashboard.quick.users", hintKey: "dashboard.quick.usersHint", path: "/utilisateurs", permission: "USER_LIST", icon: Users },
  {
    labelKey: "dashboard.quick.roles",
    hintKey: "dashboard.quick.rolesHint",
    path: "/roles",
    permission: "always",
    icon: KeyRound,
    rolesOnly: ["SUPER_ADMIN", "NATIONAL_ADMIN"],
  },
  { labelKey: "dashboard.quick.pilotage", hintKey: "dashboard.quick.pilotageHint", path: "/pilotage", permission: "REPORT_READ", icon: TrendingUp },
  { labelKey: "dashboard.quick.audit", hintKey: "dashboard.quick.auditHint", path: "/audit", permission: "AUDIT_READ", icon: FileSearch },
  {
    labelKey: "dashboard.quick.observability",
    hintKey: "dashboard.quick.observabilityHint",
    path: "/observabilite",
    permission: "TELEMETRY_READ",
    icon: Radio,
  },
  { labelKey: "dashboard.quick.settings", hintKey: "dashboard.quick.settingsHint", path: "/parametres", permission: "always", icon: Sparkles },
];

function kpiGridClass(n: number) {
  if (n <= 0) return "hidden";
  if (n === 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-1 sm:grid-cols-2";
  if (n === 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
}

function formatTime(iso: number, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

function StatCard({
  label,
  value,
  icon: Icon,
  accentClass,
  iconBgClass,
  tooltip,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accentClass: string;
  iconBgClass: string;
  tooltip: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-[0.12] transition-opacity motion-safe:duration-300 group-hover:opacity-20"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(201 96% 32%))" }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
        </div>
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-inner transition-transform motion-safe:duration-300 group-hover:scale-105",
            iconBgClass,
            accentClass,
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </div>
      </div>
    </>
  );

  const className = cn(
    "group relative min-h-[120px] overflow-hidden rounded-2xl border border-border/80 bg-card p-6 text-left shadow-sm transition-all motion-safe:duration-300",
    onClick &&
      "cursor-pointer hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5",
  );

  const card = onClick ? (
    <button type="button" onClick={onClick} className={className} aria-label={tooltip}>
      {inner}
    </button>
  ) : (
    <div className={className}>{inner}</div>
  );

  if (!onClick) return card;

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px] text-xs leading-snug">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function StatSkeleton() {
  return (
    <Card className="min-h-[120px] overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-14" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardHero({
  subtitle,
  role,
  dataUpdatedAt,
  isLoading,
  showDataRefresh = true,
  t,
  locale,
}: {
  subtitle: string;
  role: Role;
  dataUpdatedAt?: number;
  isLoading?: boolean;
  showDataRefresh?: boolean;
  t: TranslateFn;
  locale: AppLocale;
}) {
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const dateStr = new Intl.DateTimeFormat(loc, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const timeStr = new Intl.DateTimeFormat(loc, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  let dataStatusInner: React.ReactNode;
  if (dataUpdatedAt != null && !isLoading) {
    dataStatusInner = <>{t("dashboard.dataUpdated", { time: formatTime(dataUpdatedAt, locale) })}</>;
  } else if (isLoading) {
    dataStatusInner = <>{t("dashboard.dataLoading")}</>;
  } else {
    dataStatusInner = <>{t("dashboard.indicators")}</>;
  }

  return (
    <header className="relative mb-8 overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.07] via-card to-sky-500/[0.06] px-6 py-8 shadow-sm sm:px-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.15)_1px,transparent_0)] [background-size:24px_24px]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <LayoutDashboard className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-normal text-muted-foreground">
                {roleLabel(role, t)}
              </Badge>
              <span className="font-mono text-[11px] text-muted-foreground/70">· {role}</span>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary/80">{t("dashboard.hero.eyebrow")}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("dashboard.hero.title")}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:items-end">
          <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-right shadow-sm backdrop-blur-sm">
            <p className="text-xs font-medium text-muted-foreground">{t("dashboard.today")}</p>
            <p className="text-sm font-semibold capitalize leading-tight text-foreground">{dateStr}</p>
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">{timeStr}</p>
          </div>
          {showDataRefresh && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground sm:justify-end">
              <RefreshCw className={cn("h-3.5 w-3.5 shrink-0", isLoading && "animate-spin")} aria-hidden />
              <span>{dataStatusInner}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function QuickAccessGrid({
  links,
  navigate,
}: {
  links: QuickLink[];
  navigate: (path: string) => void;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" role="list">
      {links.map((l) => {
        const Icon = l.icon;
        return (
          <li key={l.path}>
            <button
              type="button"
              onClick={() => navigate(l.path)}
              className="group flex w-full items-start gap-3 rounded-xl border border-border/80 bg-card px-4 py-4 text-left shadow-sm transition-all motion-safe:duration-200 hover:border-primary/25 hover:bg-muted/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground">{l.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{l.hint}</span>
              </span>
              <ArrowRight
                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
      <Compass className="h-10 w-10 text-muted-foreground/50" strokeWidth={1.25} aria-hidden />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { t, locale } = useLocale();
  const { hasPermission, user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? "INSPECTOR";

  const quickLinkMeta: QuickLink[] = useMemo(
    () => QUICK_DEFS.map((d) => ({ ...d, label: t(d.labelKey), hint: t(d.hintKey) })),
    [t],
  );

  const { data, isLoading, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ["report-summary"],
    queryFn: () => api.get<ReportSummary>("/reports/summary"),
    enabled: hasPermission("REPORT_READ"),
    retry: 1,
  });

  const visibleQuick = useMemo(() => {
    const filtered = quickLinkMeta.filter((l) => {
      if (l.rolesOnly?.length && (!user || !l.rolesOnly.includes(user.role))) return false;
      return l.permission === "always" || hasPermission(l.permission);
    });
    return sortQuickLinksByPath(filtered, role);
  }, [quickLinkMeta, user, hasPermission, role]);

  const showMissionChart = hasPermission("MISSION_READ");
  const showExceptionChart = hasPermission("EXCEPTION_READ");

  const kpiDefs = useMemo(
    () =>
      [
        {
          permission: "MISSION_READ" as const,
          path: "/missions",
          label: t("dashboard.stat.missions"),
          tooltip: t("dashboard.tooltip.missions"),
          icon: ClipboardList,
          accentClass: "text-primary",
          iconBgClass: "bg-primary/12",
          value: data?.missions_total ?? 0,
        },
        {
          permission: "ESTABLISHMENT_READ" as const,
          path: "/etablissements",
          label: t("dashboard.stat.establishments"),
          tooltip: t("dashboard.tooltip.establishments"),
          icon: Building2,
          accentClass: "text-sky-700 dark:text-sky-300",
          iconBgClass: "bg-sky-500/12",
          value: data?.establishments_total ?? 0,
        },
        {
          permission: "EXCEPTION_READ" as const,
          path: "/signalements",
          label: t("dashboard.stat.exceptions"),
          tooltip: t("dashboard.tooltip.exceptions"),
          icon: AlertTriangle,
          accentClass: "text-amber-700 dark:text-amber-300",
          iconBgClass: "bg-amber-500/12",
          value: data?.exception_requests_total ?? 0,
        },
        {
          permission: "USER_LIST" as const,
          path: "/utilisateurs",
          label: t("dashboard.stat.users"),
          tooltip: t("dashboard.tooltip.users"),
          icon: Users,
          accentClass: "text-emerald-700 dark:text-emerald-300",
          iconBgClass: "bg-emerald-500/12",
          value: data?.users_total ?? 0,
        },
      ].filter((row) => hasPermission(row.permission)),
    [t, data, hasPermission],
  );

  const missionStatusLabel = (s: string) => t(`mission.status.${s}`);
  const exceptionStatusLabel = (s: string) => t(`exception.status.${s}`);

  const subtitleNoReport = tRoleAware(t, "dashboard.hero.subtitleNoReport", role, "dashboard.hero.subtitleNoReport");
  const subtitleFull = tRoleAware(t, "dashboard.hero.subtitleFull", role, "dashboard.hero.subtitleFull");
  const kpiHintPersonalized = tRoleAware(t, "dashboard.kpiHint", role, "dashboard.kpiHint");

  if (!hasPermission("REPORT_READ")) {
    return (
      <div className="animate-fade-in space-y-8">
        <DashboardHero
          subtitle={subtitleNoReport}
          role={role}
          showDataRefresh={false}
          t={t}
          locale={locale}
        />

        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
          <CardHeader className="border-b border-border/60 bg-muted/30 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                <FileSearch className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} aria-hidden />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-lg">{t("dashboard.noReportCardTitle")}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {t("dashboard.noReportCardDesc", { perm: "REPORT_READ" })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{t("dashboard.quickWhere")}</p>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={t("dashboard.quickHelpAria")}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs leading-relaxed">{t("dashboard.quickHelp")}</TooltipContent>
              </Tooltip>
            </div>
            <QuickAccessGrid links={visibleQuick} navigate={navigate} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const missionsTotal = data?.missions_total ?? 0;
  const exceptionsTotal = data?.exception_requests_total ?? 0;
  const missionRows = Object.entries(data?.missions_by_status ?? {});
  const exceptionRows = Object.entries(data?.exception_requests_by_status ?? {});

  return (
    <div className="animate-fade-in space-y-8">
      <DashboardHero
        subtitle={subtitleFull}
        role={role}
        dataUpdatedAt={dataUpdatedAt}
        isLoading={isLoading || isFetching}
        t={t}
        locale={locale}
      />

      {kpiDefs.length > 0 && (
        <section aria-labelledby="dashboard-kpi-heading">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="dashboard-kpi-heading" className="text-lg font-semibold tracking-tight text-foreground">
                {t("dashboard.kpiTitle")}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{kpiHintPersonalized}</p>
            </div>
          </div>

          <div className={cn("grid gap-4", kpiGridClass(kpiDefs.length))}>
            {isLoading ? (
              Array.from({ length: kpiDefs.length }).map((_, i) => <StatSkeleton key={i} />)
            ) : (
              <>
                {kpiDefs.map((row) => (
                  <StatCard
                    key={row.permission}
                    label={row.label}
                    value={row.value}
                    icon={row.icon}
                    accentClass={row.accentClass}
                    iconBgClass={row.iconBgClass}
                    tooltip={row.tooltip}
                    onClick={() => navigate(row.path)}
                  />
                ))}
              </>
            )}
          </div>
        </section>
      )}

      {(showMissionChart || showExceptionChart) && (
        <>
          <Separator className="my-2 bg-border/60" />

          <div
            className={cn(
              "grid grid-cols-1 gap-6",
              showMissionChart && showExceptionChart && "lg:grid-cols-2",
            )}
          >
            {showMissionChart && (
        <section aria-labelledby="missions-status-heading">
          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
            <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
                    <CardTitle id="missions-status-heading" className="text-base font-semibold">
                      {t("dashboard.missionsByStatus")}
                    </CardTitle>
                  </div>
                  <CardDescription className="mt-1.5">
                    {t("dashboard.missionsByStatusDesc")}
                    {missionsTotal > 0 ? (
                      <span className="text-foreground">
                        {" "}
                        ·{" "}
                        {missionsTotal > 1
                          ? t("dashboard.missionCountPlural", { count: missionsTotal })
                          : t("dashboard.missionCount", { count: missionsTotal })}
                      </span>
                    ) : null}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : missionsTotal === 0 || missionRows.length === 0 ? (
                <EmptyChartState message={t("dashboard.emptyMissions")} />
              ) : (
                <div className="space-y-5">
                  {missionRows.map(([status, count]) => {
                    const total = Math.max(missionsTotal, 1);
                    const pct = Math.round(((count ?? 0) / total) * 100);
                    const label = missionStatusLabel(status);
                    const barColor = missionBarColor[status] ?? "bg-primary/60";
                    return (
                      <div key={status} className="space-y-2">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="font-medium text-foreground">{label}</span>
                          <span className="tabular-nums text-muted-foreground">
                            <span className="font-semibold text-foreground">{count}</span>
                            <span className="text-muted-foreground/80"> · {pct}%</span>
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out",
                              barColor,
                            )}
                            style={{ width: `${pct}%` }}
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${label} : ${pct}%`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
            )}

            {showExceptionChart && (
        <section aria-labelledby="exceptions-status-heading">
          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
            <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={1.75} aria-hidden />
                    <CardTitle id="exceptions-status-heading" className="text-base font-semibold">
                      {t("dashboard.exceptionsByStatus")}
                    </CardTitle>
                  </div>
                  <CardDescription className="mt-1.5">
                    {t("dashboard.exceptionsField")}
                    {exceptionsTotal > 0 ? (
                      <span className="text-foreground">
                        {" "}
                        ·{" "}
                        {exceptionsTotal > 1
                          ? t("dashboard.exceptionCountPlural", { count: exceptionsTotal })
                          : t("dashboard.exceptionCount", { count: exceptionsTotal })}
                      </span>
                    ) : null}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : exceptionsTotal === 0 || exceptionRows.length === 0 ? (
                <EmptyChartState message={t("dashboard.emptyExceptions")} />
              ) : (
                <ul className="divide-y divide-border/60">
                  {exceptionRows.map(([status, count]) => {
                    const colorMap: Record<string, string> = {
                      new: "status-badge-warning",
                      acknowledged: "status-badge-info",
                      resolved: "status-badge-success",
                      escalated: "status-badge-neutral",
                    };
                    const label = exceptionStatusLabel(status);
                    return (
                      <li
                        key={status}
                        className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                      >
                        <span className={colorMap[status] ?? "status-badge-neutral"}>{label}</span>
                        <span className="text-xl font-bold tabular-nums text-foreground">{count}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
            )}
          </div>
        </>
      )}

      <Card className="rounded-2xl border border-primary/15 bg-gradient-to-br from-muted/40 to-card shadow-sm">
        <CardContent className="flex flex-col gap-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md">
            <p className="text-sm font-semibold text-foreground">{t("dashboard.shortcutsTitle")}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("dashboard.shortcutsDesc")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasPermission("REPORT_READ") && (
              <Button type="button" variant="default" size="default" onClick={() => navigate("/pilotage")}>
                {t("dashboard.btnPilotage")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
            {hasPermission("AUDIT_READ") && (
              <Button type="button" variant="outline" onClick={() => navigate("/audit")}>
                {t("dashboard.btnAudit")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
            {hasPermission("TELEMETRY_READ") && (
              <Button type="button" variant="outline" onClick={() => navigate("/observabilite")}>
                {t("dashboard.btnObservability")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => navigate("/parametres")}>
              {t("dashboard.btnSettings")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
