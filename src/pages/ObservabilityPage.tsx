/**
 * Page Observabilité — tableau de bord temps réel
 * ------------------------------------------------
 * Affiche :
 *  - Métriques clés (requêtes totales, taux erreur, p95, events frontend)
 *  - Flux d'événements en temps réel (backend + frontend)
 *  - Filtres : kind, méthode HTTP, chemin, user_id
 *  - Rafraîchissement automatique toutes les 5 secondes
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { enGB } from "date-fns/locale";
import { fr } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Globe,
  MonitorSmartphone,
  Navigation,
  Radio,
  RefreshCw,
  Search,
  ServerCrash,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import type { AppLocale } from "@/lib/locale";
import { tracker } from "@/lib/observability/tracker";
import type { ObservabilityEvent, TelemetryListResponse, TelemetryStats } from "@/lib/observability/types";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

type KindFilter = "all" | "http" | "ui" | "nav" | "error" | "perf";

// ── Helpers ───────────────────────────────────────────────────────────────

function kindIcon(kind: string) {
  switch (kind) {
    case "http":
      return <Globe className="h-3.5 w-3.5" />;
    case "nav":
      return <Navigation className="h-3.5 w-3.5" />;
    case "ui":
      return <MonitorSmartphone className="h-3.5 w-3.5" />;
    case "error":
      return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
    default:
      return <Activity className="h-3.5 w-3.5" />;
  }
}

function statusBadge(status: number | null): React.ReactNode {
  if (status === null) return null;
  if (status === 0) return <Badge variant="destructive">ERR</Badge>;
  if (status < 300) return <Badge className="bg-emerald-500 text-white">{status}</Badge>;
  if (status < 400) return <Badge className="bg-sky-500 text-white">{status}</Badge>;
  if (status < 500) return <Badge variant="secondary">{status}</Badge>;
  return <Badge variant="destructive">{status}</Badge>;
}

function methodBadge(method: string) {
  if (!method) return null;
  const colors: Record<string, string> = {
    GET: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
    POST: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    PUT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    PATCH: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
    DELETE: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  };
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
        colors[method] ?? "bg-muted text-muted-foreground",
      )}
    >
      {method}
    </span>
  );
}

function fmtMs(ms: number | null) {
  if (ms === null) return "–";
  if (ms < 10) return `${ms.toFixed(1)} ms`;
  return `${Math.round(ms)} ms`;
}

function durationClass(ms: number | null): string {
  if (ms === null) return "";
  if (ms > 1000) return "text-rose-500";
  if (ms > 300) return "text-amber-500";
  return "text-emerald-600";
}

function eventKey(ev: ObservabilityEvent): string {
  return ev.id ?? `${ev.ts}|${ev.kind}|${ev.path}|${ev.request_id ?? ""}|${ev.action}`;
}

function fmtTs(iso: string, locale: AppLocale) {
  try {
    return format(new Date(iso), "HH:mm:ss.SSS", { locale: locale === "fr" ? fr : enGB });
  } catch {
    return iso;
  }
}

// ── Métrique card ─────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  sub,
  icon,
  color = "default",
}: Readonly<{
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: "default" | "green" | "red" | "amber";
}>) {
  const ring = {
    default: "ring-border",
    green: "ring-emerald-200 dark:ring-emerald-800",
    red: "ring-rose-200 dark:ring-rose-800",
    amber: "ring-amber-200 dark:ring-amber-800",
  }[color];

  return (
    <Card className={cn("ring-1", ring)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent className="pb-3 pt-0">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Row d'événement ───────────────────────────────────────────────────────

function EventRow({
  ev,
  locale,
}: Readonly<{ ev: ObservabilityEvent; locale: AppLocale }>) {
  const [open, setOpen] = useState(false);
  return (
    <div className="group border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted/50",
          ev.kind === "error" && "bg-rose-50 dark:bg-rose-950/30",
        )}
      >
        <span className="w-[84px] shrink-0 font-mono text-[10px] text-muted-foreground">
          {fmtTs(ev.ts, locale)}
        </span>
        <span className="shrink-0">{kindIcon(ev.kind)}</span>
        {methodBadge(ev.method)}
        <span className="min-w-0 flex-1 truncate font-mono">{ev.resource || ev.path || ev.action}</span>
        {statusBadge(ev.status_code)}
        {ev.duration_ms !== null && (
          <span
            className={cn(
              "shrink-0 font-mono text-[10px]",
              durationClass(ev.duration_ms),
            )}
          >
            {fmtMs(ev.duration_ms)}
          </span>
        )}
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform",
            open && "rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="bg-muted/30 px-3 pb-3 pt-1">
          <div className="grid gap-0.5 font-mono text-[10px]">
            {ev.user_id && (
              <div className="flex gap-2">
                <span className="w-24 text-muted-foreground">user_id</span>
                <span>{ev.user_id}</span>
              </div>
            )}
            {ev.request_id && (
              <div className="flex gap-2">
                <span className="w-24 text-muted-foreground">request_id</span>
                <span className="text-sky-600 dark:text-sky-400">{ev.request_id}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="w-24 text-muted-foreground">kind</span>
              <span>{ev.kind}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-24 text-muted-foreground">action</span>
              <span>{ev.action}</span>
            </div>
            {ev.path && ev.path !== ev.resource && (
              <div className="flex gap-2">
                <span className="w-24 text-muted-foreground">path</span>
                <span>{ev.path}</span>
              </div>
            )}
            {Object.entries(ev.meta ?? {}).map(([k, v]) => {
              const display = v !== null && typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
              return (
                <div key={k} className="flex gap-2">
                  <span className="w-24 text-muted-foreground">{k}</span>
                  <span className="break-all">{display}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────

export default function ObservabilityPage() {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [pathFilter, setPathFilter] = useState("");
  const [liveEvents, setLiveEvents] = useState<ObservabilityEvent[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Stats backend ────────────────────────────────────────────────────────
  const { data: stats } = useQuery<TelemetryStats>({
    queryKey: ["telemetry-stats"],
    queryFn: () => api.get<TelemetryStats>("/telemetry/stats"),
    refetchInterval: 5000,
  });

  // ── Events backend ───────────────────────────────────────────────────────
  const { data: serverList, isFetching } = useQuery<TelemetryListResponse>({
    queryKey: ["telemetry-events", kindFilter, pathFilter],
    queryFn: () =>
      api.get<TelemetryListResponse>("/telemetry/events", {
        kind: kindFilter !== "all" ? kindFilter : undefined,
        limit: 200,
      }),
    refetchInterval: 5000,
  });

  // ── Events temps réel (côté client) ──────────────────────────────────────
  useEffect(() => {
    // Charge le buffer local existant
    setLiveEvents(tracker.getLocalEvents(500));

    const unsub = tracker.subscribe((ev) => {
      setLiveEvents((prev) => {
        const next = [ev, ...prev];
        return next.slice(0, 500);
      });
      // Invalide le cache des stats en temps réel
      queryClient.invalidateQueries({ queryKey: ["telemetry-stats"] });
    });
    return unsub;
  }, [queryClient]);

  // ── Merge events (backend + local) ───────────────────────────────────────
  const allEvents: ObservabilityEvent[] = useMemo(() => {
    const serverItems = serverList?.items ?? [];
    const serverKeys = new Set(serverItems.map((e) => eventKey(e)));
    const localOnly = liveEvents.filter((e) => !serverKeys.has(eventKey(e)));
    const merged = [...localOnly, ...serverItems].sort(
      (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
    );
    return merged.slice(0, 300);
  }, [serverList?.items, liveEvents]);

  const filtered = allEvents.filter((ev) => {
    if (kindFilter !== "all" && ev.kind !== kindFilter) return false;
    if (pathFilter && !ev.path?.includes(pathFilter) && !ev.resource?.includes(pathFilter))
      return false;
    return true;
  });

  const errorCount = allEvents.filter(
    (e) => e.kind === "error" || (e.status_code !== null && e.status_code >= 400),
  ).length;
  const httpCount = liveEvents.filter((e) => e.kind === "http").length;
  const navCount = liveEvents.filter((e) => e.kind === "nav").length;

  const totalServer = serverList?.total ?? 0;

  return (
    <div className="animate-fade-in space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.06] via-card to-slate-500/[0.05] px-6 py-7 shadow-sm sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.12)_1px,transparent_0)] [background-size:20px_20px]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Radio className="h-7 w-7" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary/80">{t("observability.heroEyebrow")}</p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("observability.heroTitle")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("observability.heroDesc")}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2 border-border/80 bg-background/60 backdrop-blur-sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["telemetry-stats"] });
              queryClient.invalidateQueries({ queryKey: ["telemetry-events"] });
            }}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            {t("observability.refresh")}
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          title={t("observability.metric.requests")}
          value={stats?.total_requests ?? httpCount}
          sub={t("observability.metric.requestsSub")}
          icon={<Globe className="h-4 w-4" />}
          color="default"
        />
        <MetricCard
          title={t("observability.metric.errorRate")}
          value={`${stats?.error_rate_pct ?? 0} %`}
          sub={t("observability.metric.errorRateSub")}
          icon={<ServerCrash className="h-4 w-4" />}
          color={(stats?.error_rate_pct ?? 0) > 5 ? "red" : "green"}
        />
        <MetricCard
          title={t("observability.metric.avg")}
          value={fmtMs(stats?.avg_duration_ms ?? null)}
          sub={t("observability.metric.avgSub")}
          icon={<Clock className="h-4 w-4" />}
          color="default"
        />
        <MetricCard
          title={t("observability.metric.p95")}
          value={fmtMs(stats?.p95_duration_ms ?? null)}
          sub={t("observability.metric.p95Sub")}
          icon={<Zap className="h-4 w-4" />}
          color={(stats?.p95_duration_ms ?? 0) > 1000 ? "amber" : "default"}
        />
        <MetricCard
          title={t("observability.metric.frontend")}
          value={stats?.frontend_events ?? liveEvents.length}
          sub={t("observability.metric.frontendSub")}
          icon={<MonitorSmartphone className="h-4 w-4" />}
          color="default"
        />
        <MetricCard
          title={t("observability.metric.jsErrors")}
          value={errorCount}
          sub={t("observability.metric.jsErrorsSub")}
          icon={<AlertTriangle className="h-4 w-4" />}
          color={errorCount > 0 ? "red" : "green"}
        />
      </section>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          {t("observability.bar.http", { count: httpCount })}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          {t("observability.bar.nav", { count: navCount })}
        </span>
        <span className="flex items-center gap-1">
          {errorCount === 0 ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-rose-500" />
          )}
          {errorCount === 0 ? t("observability.bar.noErrors") : t("observability.bar.errors", { count: errorCount })}
        </span>
        <span className="ml-auto flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          {t("observability.bar.live")}
        </span>
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("audit.filters")}</CardTitle>
          <CardDescription>{t("observability.filtersHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as KindFilter)}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder={t("observability.filter.kind")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("observability.filter.kindAll")}</SelectItem>
                <SelectItem value="http">{t("observability.filter.kindHttp")}</SelectItem>
                <SelectItem value="ui">{t("observability.filter.kindUi")}</SelectItem>
                <SelectItem value="nav">{t("observability.filter.kindNav")}</SelectItem>
                <SelectItem value="error">{t("observability.filter.kindError")}</SelectItem>
                <SelectItem value="perf">{t("observability.filter.kindPerf")}</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("observability.filter.path")}
                value={pathFilter}
                onChange={(e) => setPathFilter(e.target.value)}
                className="h-9 w-full min-w-[220px] pl-8 pr-3 sm:w-72"
              />
            </div>

            <span className="ml-auto text-xs text-muted-foreground">
              {t("observability.count", { filtered: filtered.length, total: totalServer })}
            </span>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border"
              />
              {t("observability.autoScroll")}
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 py-3 pl-4 pr-4">
          <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="w-[84px]">{t("observability.table.time")}</span>
            <span className="w-4" />
            <span className="w-16">{t("observability.table.method")}</span>
            <span className="flex-1">{t("observability.table.resource")}</span>
            <span className="w-12">{t("observability.table.status")}</span>
            <span className="w-16 text-right">{t("observability.table.duration")}</span>
            <span className="w-4" />
          </div>
        </CardHeader>
        <ScrollArea className="h-[min(520px,70vh)]" ref={scrollRef}>
          {filtered.length === 0 ? (
            <div className="flex h-40 items-center justify-center px-4 text-sm text-muted-foreground">
              {t("observability.empty")}
            </div>
          ) : (
            <div>
              {filtered.map((ev) => (
                <EventRow key={eventKey(ev)} ev={ev} locale={locale} />
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Globe className="h-3 w-3" /> {t("observability.legend.http")}
        </span>
        <span className="flex items-center gap-1">
          <MonitorSmartphone className="h-3 w-3" /> {t("observability.legend.ui")}
        </span>
        <span className="flex items-center gap-1">
          <Navigation className="h-3 w-3" /> {t("observability.legend.nav")}
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-destructive" /> {t("observability.legend.error")}
        </span>
        <span className="ml-auto">{t("observability.legend.duration")}</span>
      </div>
    </div>
  );
}
