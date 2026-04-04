import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type {
  ReportSummary,
  MissionStatusApi,
  ExceptionStatusApi,
  Permission,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  TrendingUp,
  ClipboardList,
  Building2,
  AlertTriangle,
  Users,
  LayoutDashboard,
  FileSearch,
  RefreshCw,
  ArrowRight,
  Compass,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale";

const missionBarColor: Record<string, string> = {
  draft: "bg-slate-400 dark:bg-slate-500",
  planned: "bg-sky-500",
  in_progress: "bg-primary",
  completed: "bg-emerald-500",
  cancelled: "bg-rose-400",
};

const MISSION_STATUS_ORDER: MissionStatusApi[] = [
  "draft",
  "planned",
  "in_progress",
  "completed",
  "cancelled",
];

const EXCEPTION_STATUS_ORDER: ExceptionStatusApi[] = ["new", "acknowledged", "resolved", "escalated"];

function missionStatusLabel(status: string, t: (key: string) => string) {
  const key = `mission.status.${status}`;
  const s = t(key);
  return s === key ? status : s;
}

function exceptionStatusLabel(status: string, t: (key: string) => string) {
  const key = `exception.status.${status}`;
  const s = t(key);
  return s === key ? status : s;
}

function sortedMissionEntries(raw: Partial<Record<MissionStatusApi, number>>): [string, number][] {
  const base = MISSION_STATUS_ORDER.filter((s) => (raw[s] ?? 0) > 0).map((s) => [s, raw[s] ?? 0] as [string, number]);
  const extra = Object.entries(raw).filter(
    ([k]) => !MISSION_STATUS_ORDER.includes(k as MissionStatusApi) && (raw[k as MissionStatusApi] ?? 0) > 0
  );
  return [...base, ...extra];
}

function sortedExceptionEntries(raw: Partial<Record<ExceptionStatusApi, number>>): [string, number][] {
  const base = EXCEPTION_STATUS_ORDER.filter((s) => (raw[s] ?? 0) > 0).map((s) => [s, raw[s] ?? 0] as [string, number]);
  const extra = Object.entries(raw).filter(
    ([k]) => !EXCEPTION_STATUS_ORDER.includes(k as ExceptionStatusApi) && (raw[k as ExceptionStatusApi] ?? 0) > 0
  );
  return [...base, ...extra];
}

function formatTime(iso: number, locale: "fr" | "en") {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
      <Compass className="h-10 w-10 text-muted-foreground/50" strokeWidth={1.25} aria-hidden />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

type PilotageLink = {
  label: string;
  hint: string;
  path: string;
  permission: Permission;
  icon: typeof ClipboardList;
};

function KpiTile({
  label,
  ariaLabel,
  value,
  icon: Icon,
  accent,
  onClick,
  loading,
}: {
  label: string;
  ariaLabel: string;
  value: number;
  icon: typeof ClipboardList;
  accent: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  const inner = (
    <>
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-[0.1]"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(201 96% 32%))" }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-9 w-16 rounded-md" />
          ) : (
            <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-inner transition-transform motion-safe:duration-300",
            onClick && "group-hover:scale-105",
            accent
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
      "cursor-pointer hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-label={ariaLabel}>
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}

export default function ReportsPage() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [exporting, setExporting] = useState(false);

  const pilotageLinks = useMemo<PilotageLink[]>(
    () => [
      {
        label: t("nav.dashboard"),
        hint: t("pilotage.hint.dashboard"),
        path: "/",
        permission: "REPORT_READ",
        icon: LayoutDashboard,
      },
      {
        label: t("nav.missions"),
        hint: t("dashboard.quick.missionsHint"),
        path: "/missions",
        permission: "MISSION_READ",
        icon: ClipboardList,
      },
      {
        label: t("nav.establishments"),
        hint: t("dashboard.quick.establishmentsHint"),
        path: "/etablissements",
        permission: "ESTABLISHMENT_READ",
        icon: Building2,
      },
      {
        label: t("nav.reports"),
        hint: t("dashboard.quick.exceptionsHint"),
        path: "/signalements",
        permission: "EXCEPTION_READ",
        icon: AlertTriangle,
      },
      {
        label: t("nav.users"),
        hint: t("dashboard.quick.usersHint"),
        path: "/utilisateurs",
        permission: "USER_LIST",
        icon: Users,
      },
      {
        label: t("nav.audit"),
        hint: t("dashboard.quick.auditHint"),
        path: "/audit",
        permission: "AUDIT_READ",
        icon: FileSearch,
      },
    ],
    [t],
  );

  const { data, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["report-summary"],
    queryFn: () => api.get<ReportSummary>("/reports/summary"),
    enabled: hasPermission("REPORT_READ"),
    retry: 1,
  });

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await api.downloadFile("/reports/missions.csv", `sigis_missions_${stamp}.csv`);
      toast.success(t("pilotage.toastExportOk"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("pilotage.toastExportFail"));
    } finally {
      setExporting(false);
    }
  };

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["report-summary"] });
  };

  const missionsTotal = data?.missions_total ?? 0;
  const exceptionsTotal = data?.exception_requests_total ?? 0;
  const missionEntries = sortedMissionEntries(data?.missions_by_status ?? {});
  const exceptionEntries = sortedExceptionEntries(data?.exception_requests_by_status ?? {});

  const visibleLinks = pilotageLinks.filter((l) => hasPermission(l.permission));
  const loading = isLoading || isFetching;

  return (
    <div className="animate-fade-in space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.07] via-card to-amber-500/[0.06] px-6 py-7 shadow-sm sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.12)_1px,transparent_0)] [background-size:20px_20px]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <TrendingUp className="h-7 w-7" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary/80">{t("pilotage.heroEyebrow")}</p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("pilotage.heroTitle")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("pilotage.heroDesc")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => void handleRefresh()}
              disabled={loading}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} aria-hidden />
              {t("pilotage.refresh")}
            </Button>
            <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-2 text-right text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
              {dataUpdatedAt != null && !loading ? (
                <>{t("pilotage.dataUpdated", { time: formatTime(dataUpdatedAt, locale) })}</>
              ) : loading ? (
                <>{t("pilotage.loading")}</>
              ) : (
                <>{t("pilotage.indicators")}</>
              )}
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="pilotage-kpi-heading">
        <div className="mb-4">
          <h2 id="pilotage-kpi-heading" className="text-lg font-semibold tracking-tight text-foreground">
            {t("pilotage.globalSummaryTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("pilotage.globalSummaryDesc")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            label={t("nav.missions")}
            ariaLabel={t("pilotage.kpiOpenAria", { label: t("nav.missions") })}
            value={missionsTotal}
            icon={ClipboardList}
            accent="bg-primary/12 text-primary"
            loading={loading}
            onClick={() => navigate("/missions")}
          />
          <KpiTile
            label={t("nav.establishments")}
            ariaLabel={t("pilotage.kpiOpenAria", { label: t("nav.establishments") })}
            value={data?.establishments_total ?? 0}
            icon={Building2}
            accent="bg-sky-500/12 text-sky-700 dark:text-sky-300"
            loading={loading}
            onClick={() => navigate("/etablissements")}
          />
          <KpiTile
            label={t("nav.reports")}
            ariaLabel={t("pilotage.kpiOpenAria", { label: t("nav.reports") })}
            value={exceptionsTotal}
            icon={AlertTriangle}
            accent="bg-amber-500/12 text-amber-700 dark:text-amber-300"
            loading={loading}
            onClick={() => navigate("/signalements")}
          />
          <KpiTile
            label={t("nav.users")}
            ariaLabel={t("pilotage.kpiOpenAria", { label: t("nav.users") })}
            value={data?.users_total ?? 0}
            icon={Users}
            accent="bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
            loading={loading}
            onClick={() => navigate("/utilisateurs")}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="pilotage-missions-heading">
          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
            <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
                <div>
                  <CardTitle id="pilotage-missions-heading" className="text-base font-semibold">
                    {t("pilotage.missionsByStatusTitle")}
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    {t("pilotage.missionsByStatusDesc")}
                    {missionsTotal > 0 ? (
                      <span className="text-foreground">
                        {missionsTotal === 1
                          ? t("pilotage.missionCountSuffixOne", { count: missionsTotal })
                          : t("pilotage.missionCountSuffixMany", { count: missionsTotal })}
                      </span>
                    ) : null}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-4">
                  {["m1", "m2", "m3", "m4", "m5"].map((k) => (
                    <Skeleton key={k} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : missionsTotal === 0 || missionEntries.length === 0 ? (
                <EmptyChartState message={t("pilotage.missionsChartEmpty")} />
              ) : (
                <div className="space-y-5">
                  {missionEntries.map(([status, count]) => {
                    const total = Math.max(missionsTotal, 1);
                    const pct = Math.round(((count ?? 0) / total) * 100);
                    const label = missionStatusLabel(status, t);
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
                              barColor
                            )}
                            style={{ width: `${pct}%` }}
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={t("missions.page.barAria", { label, pct })}
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

        <section aria-labelledby="pilotage-exceptions-heading">
          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
            <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={1.75} aria-hidden />
                <div>
                  <CardTitle id="pilotage-exceptions-heading" className="text-base font-semibold">
                    {t("pilotage.exceptionsByStatusTitle")}
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    {t("pilotage.exceptionsByStatusDesc")}
                    {exceptionsTotal > 0 ? (
                      <span className="text-foreground">
                        {exceptionsTotal === 1
                          ? t("pilotage.exceptionCountSuffixOne", { count: exceptionsTotal })
                          : t("pilotage.exceptionCountSuffixMany", { count: exceptionsTotal })}
                      </span>
                    ) : null}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-4">
                  {["e1", "e2", "e3", "e4"].map((k) => (
                    <Skeleton key={k} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : exceptionsTotal === 0 || exceptionEntries.length === 0 ? (
                <EmptyChartState message={t("pilotage.exceptionsChartEmpty")} />
              ) : (
                <ul className="divide-y divide-border/60">
                  {exceptionEntries.map(([status, count]) => {
                    const colorMap: Record<string, string> = {
                      new: "status-badge-warning",
                      acknowledged: "status-badge-info",
                      resolved: "status-badge-success",
                      escalated: "status-badge-neutral",
                    };
                    const label = exceptionStatusLabel(status, t);
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
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-md">
        <CardHeader className="border-b border-border/60 bg-muted/25">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Download className="h-6 w-6" strokeWidth={1.75} aria-hidden />
              </div>
              <div>
                <CardTitle className="text-lg">{t("pilotage.exportCsvTitle")}</CardTitle>
                <CardDescription className="mt-1.5 max-w-2xl leading-relaxed">{t("pilotage.exportCsvDesc")}</CardDescription>
              </div>
            </div>
            <Button
              type="button"
              className="h-11 shrink-0 rounded-xl shadow-md shadow-primary/15"
              onClick={() => void handleExportCSV()}
              disabled={exporting}
            >
              {exporting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="mr-2 h-4 w-4" aria-hidden />
              )}
              {t("pilotage.download")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            {t("pilotage.exportHintBefore")}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => navigate("/missions")}
            >
              {t("nav.missions")}
            </button>
            {t("pilotage.exportHintAfter")}
          </p>
        </CardContent>
      </Card>

      <Separator className="my-2 bg-border/60" />

      <section aria-labelledby="pilotage-links-heading">
        <div className="mb-4">
          <h2 id="pilotage-links-heading" className="text-lg font-semibold tracking-tight text-foreground">
            {t("pilotage.quickLinksTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("pilotage.quickLinksDesc")}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2" role="list">
          {visibleLinks.map((l) => {
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
      </section>

      <Card className="rounded-2xl border border-primary/15 bg-gradient-to-br from-muted/40 to-card shadow-sm">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-foreground">{t("pilotage.settingsCardTitle")}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("pilotage.settingsCardDesc")}</p>
            </div>
          </div>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => navigate("/parametres")}>
            {t("pilotage.openSettings")}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
