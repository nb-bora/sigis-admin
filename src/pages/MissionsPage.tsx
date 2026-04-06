import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type {
  Mission,
  PaginatedResponse,
  MissionStatusApi,
  Establishment,
  MissionScopeSummary,
  User,
} from "@/types/api";
import { useLocale, type AppLocale } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ClipboardList,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarRange,
  Building2,
  Compass,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { localDateEndIso, localDateStartIso } from "@/lib/datetime";
import { toast } from "sonner";
import { MissionExcelImport } from "@/components/import/MissionExcelImport";

const statusBadgeVariant: Record<
  MissionStatusApi,
  "secondary" | "default" | "outline" | "destructive"
> = {
  draft: "secondary",
  planned: "outline",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
};

const missionBarColor: Record<string, string> = {
  draft: "bg-slate-400 dark:bg-slate-500",
  planned: "bg-sky-500",
  in_progress: "bg-primary",
  completed: "bg-emerald-500",
  cancelled: "bg-rose-400",
};

const STATUS_ORDER: MissionStatusApi[] = [
  "draft",
  "planned",
  "in_progress",
  "completed",
  "cancelled",
];

function formatWindow(startIso: string, endIso: string, locale: AppLocale) {
  const loc = locale === "en" ? "en-GB" : "fr-FR";
  const o: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" };
  return `${new Date(startIso).toLocaleString(loc, o)} → ${new Date(endIso).toLocaleString(loc, o)}`;
}

function missionTitle(
  m: Mission,
  tr: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (m.objective?.trim()) {
    const text = m.objective.trim();
    return text.length > 72 ? `${text.slice(0, 72)}…` : text;
  }
  return tr("missions.list.missionDefault", { id: `${m.id.slice(0, 8)}…` });
}

function missionStatusLabel(
  status: string,
  tr: (key: string, vars?: Record<string, string | number>) => string,
) {
  const key = `mission.status.${status}`;
  const s = tr(key);
  return s === key ? status : s;
}

function buildScopeParams(
  inspectorId: string,
  establishmentId: string,
  territoryCode: string,
  dateFrom: string,
  dateTo: string,
): Record<string, string> {
  const p: Record<string, string> = {};
  if (inspectorId) p.inspector_id = inspectorId;
  if (establishmentId) p.establishment_id = establishmentId;
  const terr = territoryCode.trim();
  if (terr) p.territory_code = terr;
  if (dateFrom) {
    try {
      p.window_from = localDateStartIso(dateFrom);
    } catch {
      /* ignore */
    }
  }
  if (dateTo) {
    try {
      p.window_to = localDateEndIso(dateTo);
    } catch {
      /* ignore */
    }
  }
  return p;
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
      <Compass className="h-9 w-9 text-muted-foreground/50" strokeWidth={1.25} aria-hidden />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function MissionsPage() {
  const { hasPermission } = useAuth();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [skip, setSkip] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [inspectorFilter, setInspectorFilter] = useState("");
  const [establishmentFilter, setEstablishmentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("");
  const limit = 20;

  const scopeParams = useMemo(
    () =>
      buildScopeParams(inspectorFilter, establishmentFilter, territoryFilter, dateFrom, dateTo),
    [inspectorFilter, establishmentFilter, territoryFilter, dateFrom, dateTo],
  );

  const { data: establishments, isLoading: loadEst } = useQuery({
    queryKey: ["establishments-pick-missions", 1000],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Establishment>>("/establishments", {
        skip: 0,
        limit: 1000,
      });
      return res.items;
    },
  });

  const { data: inspectors, isLoading: loadInsp } = useQuery({
    queryKey: ["users-inspectors-missions", 1000],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<User>>("/users", { skip: 0, limit: 1000 });
      return res.items.filter((u) => u.role === "INSPECTOR");
    },
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["missions-summary", scopeParams],
    queryFn: () => api.get<MissionScopeSummary>("/missions/summary", { params: scopeParams }),
    enabled: hasPermission("MISSION_READ"),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["missions", skip, statusFilter, scopeParams],
    queryFn: () =>
      api.get<PaginatedResponse<Mission>>("/missions", {
        skip,
        limit,
        ...scopeParams,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      }),
    enabled: hasPermission("MISSION_READ"),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(skip / limit) + 1;
  const hasRows = (data?.items.length ?? 0) > 0;

  const scopeTotal = summary?.total ?? 0;
  const missionRows = useMemo(() => {
    const raw = summary?.missions_by_status ?? {};
    const entries = STATUS_ORDER.map((s) => [s, raw[s] ?? 0] as const).filter(([, n]) => n > 0);
    const extra = Object.entries(raw).filter(([k]) => !STATUS_ORDER.includes(k as MissionStatusApi));
    return [...entries, ...extra.map(([k, v]) => [k, v] as const)];
  }, [summary]);

  const pickLoading = loadEst || loadInsp;

  const resetFilters = () => {
    setInspectorFilter("");
    setEstablishmentFilter("");
    setTerritoryFilter("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setSkip(0);
  };

  const applyDateRange = () => {
    if (dateFrom && dateTo) {
      try {
        if (new Date(localDateStartIso(dateFrom)) > new Date(localDateEndIso(dateTo))) {
          toast.error(t("missions.toast.invalidRangeTitle"), {
            description: t("missions.toast.invalidRangeDesc"),
          });
          return;
        }
      } catch {
        toast.error(t("missions.toast.invalidDates"));
        return;
      }
    }
    setSkip(0);
  };

  const hasActiveFilters =
    inspectorFilter ||
    establishmentFilter ||
    territoryFilter.trim() ||
    dateFrom ||
    dateTo ||
    statusFilter !== "all";

  const scopeSummaryLine = summaryLoading
    ? t("missions.page.loading")
    : scopeTotal === 1
      ? t("missions.page.inScopeOne", { count: scopeTotal })
      : t("missions.page.inScopeMany", { count: scopeTotal });

  const listResultLine =
    total === 1 ? t("missions.page.resultOne", { count: total }) : t("missions.page.resultMany", { count: total });

  const footerResultsLine =
    total === 1 ? t("missions.page.resultOne", { count: total }) : t("missions.page.resultMany", { count: total });

  const footerPaginationText = t("missions.page.paginationLine", {
    results: footerResultsLine,
    current: currentPage,
    pages: totalPages,
  });

  return (
    <div className="animate-fade-in space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.06] via-card to-sky-500/[0.05] px-6 py-7 shadow-sm sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.12)_1px,transparent_0)] [background-size:20px_20px]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <ClipboardList className="h-7 w-7" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary/80">
                {t("missions.page.heroEyebrow")}
              </p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("missions.page.heroTitle")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {t("missions.page.heroDesc")}
              </p>
            </div>
          </div>
          {hasPermission("MISSION_CREATE") && (
            <div className="flex flex-wrap items-center gap-2">
              <MissionExcelImport />
              <Button
                size="lg"
                className="shrink-0 shadow-md shadow-primary/20"
                onClick={() => navigate("/missions/new")}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                {t("missions.page.newMission")}
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Synthèse (périmètre : inspecteur, établissement, dates — sans filtre statut) */}
      <section aria-labelledby="missions-scope-stats-heading">
        <div className="mb-4">
          <h2 id="missions-scope-stats-heading" className="text-lg font-semibold tracking-tight text-foreground">
            {t("missions.page.scopeSummaryTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("missions.page.scopeSummaryDesc")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="relative min-h-[120px] overflow-hidden rounded-2xl border-border/80 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("missions.page.kpiScopeLabel")}
                  </p>
                  {summaryLoading ? (
                    <Skeleton className="h-9 w-16" />
                  ) : (
                    <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{scopeTotal}</p>
                  )}
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-inner">
                  <TrendingUp className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm lg:col-span-2">
            <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
                <CardTitle className="text-base font-semibold">{t("missions.page.statusDistributionTitle")}</CardTitle>
              </div>
              <CardDescription>{scopeSummaryLine}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {summaryLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : scopeTotal === 0 || missionRows.length === 0 ? (
                <ChartEmpty message={t("missions.page.chartEmpty")} />
              ) : (
                <div className="space-y-5">
                  {missionRows.map(([status, count]) => {
                    const denom = Math.max(scopeTotal, 1);
                    const pct = Math.round(((count ?? 0) / denom) * 100);
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
                              barColor,
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
        </div>
      </section>

      {/* Filtres + liste */}
      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/25 pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background shadow-sm">
                  <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
                </div>
                <div>
                  <CardTitle className="text-base">{t("missions.page.listTitle")}</CardTitle>
                  <CardDescription>
                    {isLoading ? (
                      t("missions.page.loading")
                    ) : (
                      <>
                        <span className="font-semibold text-foreground">{listResultLine}</span>
                        {statusFilter !== "all" && (
                          <span className="text-muted-foreground">
                            {t("missions.page.statusSuffix", {
                              status: missionStatusLabel(statusFilter, t),
                            })}
                          </span>
                        )}
                      </>
                    )}
                  </CardDescription>
                </div>
              </div>
              {hasActiveFilters && (
                <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={resetFilters}>
                  <X className="h-4 w-4" aria-hidden />
                  {t("missions.page.resetFilters")}
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">{t("missions.page.labelInspector")}</Label>
                <Select
                  value={inspectorFilter || "all"}
                  onValueChange={(v) => {
                    setInspectorFilter(v === "all" ? "" : v);
                    setSkip(0);
                  }}
                  disabled={pickLoading}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background">
                    <SelectValue placeholder={t("missions.page.placeholderAll")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("missions.page.allInspectors")}</SelectItem>
                    {inspectors?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="font-medium">{u.full_name}</span>
                        <span className="ml-2 text-muted-foreground">{u.email}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("missions.page.labelEstablishment")}
                </Label>
                <Select
                  value={establishmentFilter || "all"}
                  onValueChange={(v) => {
                    setEstablishmentFilter(v === "all" ? "" : v);
                    setSkip(0);
                  }}
                  disabled={pickLoading}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background">
                    <SelectValue placeholder={t("missions.page.placeholderAll")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("missions.page.allEstablishments")}</SelectItem>
                    {establishments?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">{t("missions.page.labelStatusList")}</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setSkip(0);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background">
                    <SelectValue placeholder={t("missions.page.filterStatusPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("missions.page.allStatuses")}</SelectItem>
                    {STATUS_ORDER.map((k) => (
                      <SelectItem key={k} value={k}>
                        {missionStatusLabel(k, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">{t("missions.page.labelTerritory")}</Label>
                <Input
                  value={territoryFilter}
                  onChange={(e) => {
                    setTerritoryFilter(e.target.value);
                    setSkip(0);
                  }}
                  placeholder={t("missions.page.territoryPlaceholder")}
                  className="h-11 rounded-xl"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2 sm:col-span-2 xl:col-span-4">
                <Label className="text-xs font-medium text-muted-foreground">{t("missions.page.dateRangeLabel")}</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setSkip(0);
                    }}
                    className="h-11 rounded-xl font-mono text-sm"
                  />
                  <span className="hidden text-center text-muted-foreground sm:block">→</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setSkip(0);
                    }}
                    className="h-11 rounded-xl font-mono text-sm"
                  />
                  <Button type="button" variant="secondary" className="h-11 shrink-0 rounded-xl sm:w-auto" onClick={applyDateRange}>
                    {t("missions.page.apply")}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">{t("missions.page.dateRangeHint")}</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Desktop / tablette : tableau */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("missions.page.colMission")}
                  </th>
                  <th className="hidden lg:table-cell px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("missions.page.colEstablishment")}
                  </th>
                  <th className="hidden xl:table-cell px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("missions.page.colWindow")}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("missions.page.colStatus")}
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("missions.page.colActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="border-b border-border/60">
                      <td className="px-5 py-4" colSpan={5}>
                        <Skeleton className="h-12 w-full rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : !hasRows ? (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                          <Compass className="h-8 w-8 text-muted-foreground/60" strokeWidth={1.25} aria-hidden />
                        </div>
                        <div className="max-w-md space-y-2">
                          <p className="text-base font-semibold text-foreground">{t("missions.page.emptyTitle")}</p>
                          <p className="text-sm text-muted-foreground">
                            {hasActiveFilters
                              ? t("missions.page.emptyWithFilters")
                              : t("missions.page.emptyNoFilters")}
                          </p>
                        </div>
                        {hasPermission("MISSION_CREATE") && (
                          <Button onClick={() => navigate("/missions/new")} className="mt-2">
                            <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                            {t("missions.page.createMission")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  data?.items.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-border/60 transition-colors hover:bg-muted/35 motion-safe:duration-150"
                    >
                      <td className="max-w-md px-5 py-4 align-top">
                        <div className="font-medium leading-snug text-foreground">{missionTitle(m, t)}</div>
                        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {t("missions.page.idPrefix", { id: `${m.id.slice(0, 8)}…` })}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-5 py-4 align-top">
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                          {establishments?.find((e) => e.id === m.establishment_id)?.name ?? m.establishment_id.slice(0, 8) + "…"}
                        </span>
                      </td>
                      <td className="hidden xl:table-cell max-w-[280px] px-5 py-4 align-top text-xs leading-relaxed text-muted-foreground">
                        <span className="inline-flex items-start gap-1.5">
                          <CalendarRange className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                          {formatWindow(m.window_start, m.window_end, locale)}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <Badge variant={statusBadgeVariant[m.status]} className="font-normal">
                          {missionStatusLabel(m.status, t)}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => navigate(`/missions/${m.id}`)}
                        >
                          <Eye className="mr-1.5 h-4 w-4" aria-hidden />
                          {t("missions.page.details")}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile : cartes */}
          <div className="md:hidden divide-y divide-border/60">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={`mb-${i}`} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            ) : !hasRows ? (
              <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
                <Compass className="h-10 w-10 text-muted-foreground/50" aria-hidden />
                <p className="text-sm text-muted-foreground">{t("missions.page.mobileEmpty")}</p>
                {hasPermission("MISSION_CREATE") && (
                  <Button size="sm" onClick={() => navigate("/missions/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("missions.page.newMission")}
                  </Button>
                )}
              </div>
            ) : (
              data?.items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => navigate(`/missions/${m.id}`)}
                  className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-snug text-foreground">{missionTitle(m, t)}</span>
                    <Badge variant={statusBadgeVariant[m.status]} className="shrink-0 font-normal">
                      {missionStatusLabel(m.status, t)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Building2 className="mr-1 inline h-3 w-3" aria-hidden />
                    {establishments?.find((e) => e.id === m.establishment_id)?.name ?? m.establishment_id.slice(0, 8) + "…"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <CalendarRange className="mr-1 inline h-3 w-3" aria-hidden />
                    {formatWindow(m.window_start, m.window_end, locale)}
                  </p>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {t("missions.page.idPrefix", { id: `${m.id.slice(0, 8)}…` })}
                  </span>
                </button>
              ))
            )}
          </div>
        </CardContent>

        {total > limit && hasRows && (
          <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{footerPaginationText}</span>
              {isFetching && !isLoading && (
                <span className="ml-2 text-xs text-primary">{t("missions.page.updating")}</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={skip === 0}
                onClick={() => setSkip(Math.max(0, skip - limit))}
                aria-label={t("audit.pagePrev")}
              >
                <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                {t("missions.page.prev")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={skip + limit >= total}
                onClick={() => setSkip(skip + limit)}
                aria-label={t("audit.pageNext")}
              >
                {t("missions.page.next")}
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
