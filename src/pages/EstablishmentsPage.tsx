import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Establishment, PaginatedResponse, EstablishmentScopeSummary } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  Compass,
  Sparkles,
  TrendingUp,
  MapPin,
  X,
  Search,
  Mail,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale";

const ESTABLISHMENT_TYPE_KEYS = ["other", "lycee", "college", "primaire", "formation", "admin"] as const;

const TYPE_BAR_PALETTE = [
  "bg-sky-500",
  "bg-primary",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-400",
  "bg-teal-500",
  "bg-orange-500",
];

function establishmentTypeLabel(type: string, t: (key: string) => string) {
  const key = `establishment.type.${type}`;
  const s = t(key);
  return s === key ? type : s;
}

function contactLine(e: Establishment): string {
  const parts = [e.contact_email, e.contact_phone].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
      <Compass className="h-9 w-9 text-muted-foreground/50" strokeWidth={1.25} aria-hidden />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function buildScopeParams(territoryCode: string, nameQ: string): Record<string, string> {
  const p: Record<string, string> = {};
  if (territoryCode.trim()) p.territory_code = territoryCode.trim();
  if (nameQ.trim()) p.name_q = nameQ.trim();
  return p;
}

export default function EstablishmentsPage() {
  const { t } = useLocale();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [skip, setSkip] = useState(0);
  const limit = 20;

  const [territoryFilter, setTerritoryFilter] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(nameInput.trim()), 320);
    return () => clearTimeout(t);
  }, [nameInput]);

  const scopeParams = useMemo(
    () => buildScopeParams(territoryFilter, debouncedName),
    [territoryFilter, debouncedName],
  );

  const listParams = useMemo(() => {
    const p: Record<string, string | number> = { skip, limit, ...scopeParams };
    if (typeFilter !== "all") p.establishment_type = typeFilter;
    return p;
  }, [scopeParams, skip, typeFilter]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["establishments-summary", scopeParams],
    queryFn: () => api.get<EstablishmentScopeSummary>("/establishments/summary", scopeParams),
    enabled: hasPermission("ESTABLISHMENT_READ"),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["establishments", listParams],
    queryFn: () => api.get<PaginatedResponse<Establishment>>("/establishments", listParams),
    enabled: hasPermission("ESTABLISHMENT_READ"),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(skip / limit) + 1;
  const hasRows = (data?.items.length ?? 0) > 0;

  const scopeTotal = summary?.total ?? 0;
  const typeRows = useMemo(() => {
    const raw = summary?.by_establishment_type ?? {};
    return Object.entries(raw)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [summary]);

  const hasActiveFilters =
    territoryFilter.trim() !== "" || debouncedName !== "" || typeFilter !== "all";

  const resetFilters = () => {
    setTerritoryFilter("");
    setNameInput("");
    setDebouncedName("");
    setTypeFilter("all");
    setSkip(0);
  };

  return (
    <div className="animate-fade-in space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.06] via-card to-emerald-500/[0.05] px-6 py-7 shadow-sm sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.12)_1px,transparent_0)] [background-size:20px_20px]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Building2 className="h-7 w-7" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary/80">
                {t("establishments.page.heroEyebrow")}
              </p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("establishments.page.heroTitle")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {t("establishments.page.heroDesc")}
              </p>
            </div>
          </div>
          {hasPermission("ESTABLISHMENT_CREATE") && (
            <Button
              size="lg"
              className="shrink-0 shadow-md shadow-primary/20"
              onClick={() => navigate("/etablissements/new")}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              {t("establishments.page.newEstablishment")}
            </Button>
          )}
        </div>
      </header>

      <section aria-labelledby="est-scope-stats-heading">
        <div className="mb-4">
          <h2 id="est-scope-stats-heading" className="text-lg font-semibold tracking-tight text-foreground">
            {t("establishments.page.scopeSummaryTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("establishments.page.scopeSummaryDesc")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="relative min-h-[120px] overflow-hidden rounded-2xl border-border/80 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("establishments.page.kpiScopeLabel")}
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
                <Building2 className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
                <CardTitle className="text-base font-semibold">{t("establishments.page.typeDistributionTitle")}</CardTitle>
              </div>
              <CardDescription>
                {summaryLoading
                  ? t("establishments.page.loading")
                  : scopeTotal === 1
                    ? t("establishments.page.inScopeOne", { count: scopeTotal })
                    : t("establishments.page.inScopeMany", { count: scopeTotal })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {summaryLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={`sk-bar-${i}`} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : scopeTotal === 0 || typeRows.length === 0 ? (
                <ChartEmpty message={t("establishments.page.chartEmpty")} />
              ) : (
                <div className="space-y-5">
                  {typeRows.map(([type, count], idx) => {
                    const denom = Math.max(scopeTotal, 1);
                    const pct = Math.round(((count ?? 0) / denom) * 100);
                    const label = establishmentTypeLabel(type, t);
                    const barColor = TYPE_BAR_PALETTE[idx % TYPE_BAR_PALETTE.length];
                    return (
                      <div key={type} className="space-y-2">
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
                            aria-label={t("establishments.page.barAria", { label, pct })}
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

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/25 pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background shadow-sm">
                  <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
                </div>
                <div>
                  <CardTitle className="text-base">{t("establishments.page.listTitle")}</CardTitle>
                  <CardDescription>
                    {isLoading ? (
                      t("establishments.page.loading")
                    ) : (
                      <>
                        <span className="font-semibold text-foreground">
                          {total === 1
                            ? t("establishments.page.resultOne", { count: total })
                            : t("establishments.page.resultMany", { count: total })}
                        </span>
                        {typeFilter !== "all" && (
                          <span className="text-muted-foreground">
                            {t("establishments.page.typeSuffix", {
                              type: establishmentTypeLabel(typeFilter, t),
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
                  {t("establishments.page.resetFilters")}
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("establishments.page.searchNameLabel")}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      setSkip(0);
                    }}
                    placeholder={t("establishments.page.searchPlaceholder")}
                    className="h-11 rounded-xl border-border/80 bg-background pl-10"
                    maxLength={200}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("establishments.page.territoryCodeLabel")}
                </Label>
                <Input
                  value={territoryFilter}
                  onChange={(e) => {
                    setTerritoryFilter(e.target.value);
                    setSkip(0);
                  }}
                  placeholder={t("establishments.page.territoryPlaceholder")}
                  className="h-11 rounded-xl font-mono text-sm"
                  maxLength={64}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("establishments.page.typeListLabel")}
                </Label>
                <Select
                  value={typeFilter}
                  onValueChange={(v) => {
                    setTypeFilter(v);
                    setSkip(0);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background">
                    <SelectValue placeholder={t("establishments.page.typePlaceholderAll")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("establishments.page.allTypes")}</SelectItem>
                    {ESTABLISHMENT_TYPE_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {establishmentTypeLabel(k, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("establishments.page.colName")}
                  </th>
                  <th className="hidden lg:table-cell px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("establishments.page.colType")}
                  </th>
                  <th className="hidden xl:table-cell px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("establishments.page.colTerritory")}
                  </th>
                  <th className="hidden xl:table-cell px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("establishments.page.colContact")}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("establishments.page.colCarto")}
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("establishments.page.colActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="border-b border-border/60">
                      <td className="px-5 py-4" colSpan={6}>
                        <Skeleton className="h-12 w-full rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : !hasRows ? (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                          <Compass className="h-8 w-8 text-muted-foreground/60" strokeWidth={1.25} aria-hidden />
                        </div>
                        <div className="max-w-md space-y-2">
                          <p className="text-base font-semibold text-foreground">{t("establishments.page.emptyTitle")}</p>
                          <p className="text-sm text-muted-foreground">
                            {hasActiveFilters
                              ? t("establishments.page.emptyWithFilters")
                              : t("establishments.page.emptyNoFilters")}
                          </p>
                        </div>
                        {hasPermission("ESTABLISHMENT_CREATE") && (
                          <Button onClick={() => navigate("/etablissements/new")} className="mt-2">
                            <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                            {t("establishments.page.createEstablishment")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  data?.items.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-border/60 transition-colors hover:bg-muted/35 motion-safe:duration-150"
                    >
                      <td className="max-w-md px-5 py-4 align-top">
                        <div className="flex items-start gap-2">
                          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" aria-hidden />
                          <div>
                            <div className="font-medium leading-snug text-foreground">{e.name}</div>
                            <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                              {t("establishments.page.idPrefix", { id: `${e.id.slice(0, 8)}…` })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-5 py-4 align-top">
                        <Badge variant="secondary" className="font-normal">
                          {establishmentTypeLabel(e.establishment_type, t)}
                        </Badge>
                      </td>
                      <td className="hidden xl:table-cell px-5 py-4 align-top">
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                          {e.territory_code ?? "—"}
                        </span>
                      </td>
                      <td className="hidden xl:table-cell max-w-[220px] px-5 py-4 align-top">
                        <span className="inline-flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                          <span className="line-clamp-2 break-all">{contactLine(e)}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <span className="status-badge-neutral text-xs tabular-nums">v{e.geometry_version}</span>
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => navigate(`/etablissements/${e.id}`)}
                        >
                          <Eye className="mr-1.5 h-4 w-4" aria-hidden />
                          {t("establishments.page.details")}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
                <p className="text-sm text-muted-foreground">{t("establishments.page.mobileEmpty")}</p>
                {hasPermission("ESTABLISHMENT_CREATE") && (
                  <Button size="sm" onClick={() => navigate("/etablissements/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("establishments.page.newEstablishment")}
                  </Button>
                )}
              </div>
            ) : (
              data?.items.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => navigate(`/etablissements/${e.id}`)}
                  className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-snug text-foreground">{e.name}</span>
                    <Badge variant="secondary" className="shrink-0 font-normal">
                      {establishmentTypeLabel(e.establishment_type, t)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <MapPin className="mr-1 inline h-3 w-3" aria-hidden />
                    {e.territory_code ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{contactLine(e)}</p>
                  <span className="text-[11px] font-mono text-muted-foreground">v{e.geometry_version}</span>
                </button>
              ))
            )}
          </div>
        </CardContent>

        {total > limit && hasRows && (
          <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t("establishments.page.paginationLine", {
                results:
                  total === 1
                    ? t("establishments.page.resultOne", { count: total })
                    : t("establishments.page.resultMany", { count: total }),
                current: currentPage,
                pages: totalPages,
              })}
              {isFetching && !isLoading && (
                <span className="ml-2 text-xs text-primary">{t("establishments.page.updating")}</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={skip === 0}
                onClick={() => setSkip(Math.max(0, skip - limit))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                {t("establishments.page.prev")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={skip + limit >= total}
                onClick={() => setSkip(skip + limit)}
              >
                {t("establishments.page.next")}
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
