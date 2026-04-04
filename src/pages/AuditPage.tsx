import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";
import type { AppLocale } from "@/lib/locale";
import type { TranslateFn } from "@/lib/rbac";
import type { AuditLog, PaginatedResponse } from "@/types/api";
import { localDateEndIso, localDateStartIso } from "@/lib/datetime";
import {
  auditActionLabel,
  auditResourceTypeLabel,
  KNOWN_AUDIT_ACTIONS,
  KNOWN_AUDIT_RESOURCE_TYPES,
} from "@/lib/auditLabels";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Search,
  Filter,
  X,
  RefreshCw,
  Download,
  Copy,
  ExternalLink,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const limit = 25;

const SK_ROWS = ["a1", "a2", "a3", "a4", "a5", "a6"] as const;
const SK_COLS = ["c1", "c2", "c3", "c4", "c5"] as const;

function formatWhen(iso: string, locale: AppLocale): string {
  try {
    return new Date(iso).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim());
}

function PayloadBlock({ raw, t }: { readonly raw: string | null | undefined; t: TranslateFn }) {
  if (!raw?.trim()) {
    return <p className="text-sm text-muted-foreground">{t("audit.noPayload")}</p>;
  }
  let pretty = raw;
  try {
    pretty = JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    /* keep raw */
  }
  return (
    <pre className="max-h-[min(50vh,320px)] overflow-auto rounded-lg border border-border/60 bg-muted/30 p-3 text-xs font-mono leading-relaxed">
      {pretty}
    </pre>
  );
}

export default function AuditPage() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("audit.clipboardOk"));
    } catch {
      toast.error(t("audit.clipboardFail"));
    }
  };

  const [skip, setSkip] = useState(0);
  const [qInput, setQInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [actorInput, setActorInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const debounceTimer = setTimeout(() => setDebouncedQ(qInput.trim()), 320);
    return () => clearTimeout(debounceTimer);
  }, [qInput]);

  const filterParams = useMemo(() => {
    const p: Record<string, string | number | boolean | undefined> = {};
    if (debouncedQ) p.q = debouncedQ;
    if (actionFilter !== "all") p.action = actionFilter;
    if (resourceFilter !== "all") p.resource_type = resourceFilter;
    const actor = actorInput.trim();
    if (actor && isUuid(actor)) p.actor_user_id = actor;
    if (dateFrom) p.created_from = localDateStartIso(dateFrom);
    if (dateTo) p.created_to = localDateEndIso(dateTo);
    return p;
  }, [debouncedQ, actionFilter, resourceFilter, actorInput, dateFrom, dateTo]);

  const listParams = useMemo(() => ({ ...filterParams, skip, limit }), [filterParams, skip]);

  const { data, isLoading, isFetching, isError, error, dataUpdatedAt } = useQuery({
    queryKey: ["audit-logs", listParams],
    queryFn: () => api.get<PaginatedResponse<AuditLog>>("/audit-logs", listParams),
  });

  useEffect(() => {
    setSkip(0);
  }, [filterParams]);

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(skip / limit) + 1;
  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(skip + items.length, total);

  const hasActiveFilters =
    debouncedQ !== "" ||
    actionFilter !== "all" ||
    resourceFilter !== "all" ||
    actorInput.trim() !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  const resetFilters = () => {
    setQInput("");
    setDebouncedQ("");
    setActionFilter("all");
    setResourceFilter("all");
    setActorInput("");
    setDateFrom("");
    setDateTo("");
    setSkip(0);
  };

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await api.downloadFile("/audit-logs/export.csv", `sigis_audit_${stamp}.csv`, filterParams);
      toast.success(t("audit.exportOk"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("audit.exportFail"));
    } finally {
      setExporting(false);
    }
  };

  const openDetail = (log: AuditLog) => {
    setSelected(log);
    setSheetOpen(true);
  };

  const actorInvalid = actorInput.trim() !== "" && !isUuid(actorInput.trim());

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
              <FileSearch className="h-7 w-7" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary/80">{t("audit.heroEyebrow")}</p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("audit.heroTitle")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("audit.heroDesc")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", (isLoading || isFetching) && "animate-spin")} aria-hidden />
              {t("audit.refresh")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-xl shadow-md shadow-primary/15"
              onClick={() => void handleExport()}
              disabled={exporting || (!isLoading && total === 0)}
            >
              {exporting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="mr-2 h-4 w-4" aria-hidden />
              )}
              {t("audit.exportCsv")}
            </Button>
          </div>
        </div>
      </header>

      <section aria-labelledby="audit-kpi-heading">
        <div className="mb-4">
          <h2 id="audit-kpi-heading" className="text-lg font-semibold tracking-tight text-foreground">
            {t("audit.volumeTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("audit.volumeDesc")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>{t("audit.kpi.matching")}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{isLoading ? "—" : total}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {t("audit.kpi.matchingFoot", { limit })}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>{t("audit.kpi.lastRefresh")}</CardDescription>
              <CardTitle className="text-base font-semibold tabular-nums">
                {dataUpdatedAt
                  ? new Date(dataUpdatedAt).toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{t("audit.kpi.lastRefreshFoot")}</CardContent>
          </Card>
          <Card className="rounded-2xl border-border/80 shadow-sm sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardDescription>{t("audit.kpi.tipTitle")}</CardDescription>
              <CardTitle className="text-base font-semibold leading-snug">{t("audit.kpi.tipCorrelation")}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed text-muted-foreground">{t("audit.kpi.tipBody")}</CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="audit-filters-heading">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="audit-filters-heading" className="text-sm font-semibold text-foreground">
            {t("audit.filters")}
          </h2>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground" onClick={resetFilters}>
              <X className="h-3.5 w-3.5" aria-hidden />
              {t("audit.resetFilters")}
            </Button>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 md:col-span-2 xl:col-span-2">
            <Label htmlFor="audit-q">{t("audit.searchLabel")}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="audit-q"
                placeholder={t("audit.searchPlaceholder")}
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                className="h-11 rounded-xl pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-action">{t("audit.actionFilter")}</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger id="audit-action" className="h-11 rounded-xl">
                <SelectValue placeholder={t("audit.placeholderAny")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("audit.allActions")}</SelectItem>
                {KNOWN_AUDIT_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {auditActionLabel(a, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-res">{t("audit.resourceType")}</Label>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger id="audit-res" className="h-11 rounded-xl">
                <SelectValue placeholder={t("audit.placeholderAnyType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("audit.allTypes")}</SelectItem>
                {KNOWN_AUDIT_RESOURCE_TYPES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {auditResourceTypeLabel(r, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="audit-actor">{t("audit.actorLabel")}</Label>
            <Input
              id="audit-actor"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={actorInput}
              onChange={(e) => setActorInput(e.target.value)}
              className={cn("h-11 rounded-xl font-mono text-sm", actorInvalid && "border-destructive")}
            />
            {actorInvalid && <p className="text-xs text-destructive">{t("audit.actorInvalid")}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-from">{t("audit.dateFrom")}</Label>
            <Input
              id="audit-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-to">{t("audit.dateTo")}</Label>
            <Input
              id="audit-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
        </div>
      </section>

      <div className="data-table-wrapper relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        {isFetching && !isLoading && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-background/40 backdrop-blur-[1px]" aria-hidden />
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("audit.colWhen")}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  {t("audit.colActor")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("audit.colAction")}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  {t("audit.colResource")}
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  {t("audit.colRequestId")}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                SK_ROWS.map((rowId) => (
                  <tr key={rowId} className="border-b border-border/60">
                    {SK_COLS.map((colId) => (
                      <td key={`${rowId}-${colId}`} className="px-4 py-3">
                        <Skeleton className="h-5 w-full rounded-md" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading && isError && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-destructive">
                    {error instanceof Error ? error.message : t("audit.loadError")}
                  </td>
                </tr>
              )}
              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" strokeWidth={1.25} aria-hidden />
                    <p className="mt-3 font-medium text-foreground">{t("audit.emptyTitle")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("audit.emptyDesc")}</p>
                  </td>
                </tr>
              )}
              {!isLoading &&
                !isError &&
                items.map((log) => (
                  <tr
                    key={log.id}
                    tabIndex={0}
                    className={cn(
                      "border-b border-border/60 transition-colors",
                      "cursor-pointer hover:bg-muted/35 focus-visible:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                    onClick={() => openDetail(log)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        openDetail(log);
                      }
                    }}
                    aria-label={t("audit.ariaEntryDetail", {
                      action: auditActionLabel(log.action, t),
                    })}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatWhen(log.created_at, locale)}
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-foreground sm:table-cell">
                      {log.actor_user_id ? (
                        <span title={log.actor_user_id}>{log.actor_user_id.slice(0, 8)}…</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="max-w-[14rem] truncate font-normal">
                        {auditActionLabel(log.action, t)}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      <span className="font-medium text-foreground">{auditResourceTypeLabel(log.resource_type, t)}</span>
                      {log.resource_id ? (
                        <span className="mt-0.5 block font-mono text-xs text-muted-foreground" title={log.resource_id}>
                          {log.resource_id.length > 14 ? `${log.resource_id.slice(0, 14)}…` : log.resource_id}
                        </span>
                      ) : null}
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground lg:table-cell">
                      {log.request_id ? (
                        <span title={log.request_id}>
                          {log.request_id.length > 16 ? `${log.request_id.slice(0, 16)}…` : log.request_id}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-border/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              {total === 1
                ? t("audit.pagination", { from, to, total })
                : t("audit.paginationPlural", { from, to, total })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                disabled={skip === 0}
                onClick={() => setSkip(Math.max(0, skip - limit))}
                aria-label={t("audit.pagePrev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[5rem] text-center text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                disabled={skip + limit >= total}
                onClick={() => setSkip(skip + limit)}
                aria-label={t("audit.pageNext")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setSelected(null);
        }}
      >
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-lg">
          <SheetHeader className="border-b border-border/60 pb-4 text-left">
            <SheetTitle>{t("audit.sheetTitle")}</SheetTitle>
            <SheetDescription>
              {selected ? auditActionLabel(selected.action, t) : ""}
              {selected?.created_at ? ` · ${formatWhen(selected.created_at, locale)}` : ""}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto py-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("audit.idLabel")}</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md bg-muted px-2 py-1.5 font-mono text-xs">{selected.id}</code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => void copyToClipboard(selected.id)}
                    aria-label={t("audit.copyId")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("audit.actorSection")}</Label>
                {selected.actor_user_id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="break-all rounded-md bg-muted px-2 py-1.5 font-mono text-xs">{selected.actor_user_id}</code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => {
                        const id = selected.actor_user_id;
                        if (id) void copyToClipboard(id);
                      }}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      {t("audit.copy")}
                    </Button>
                    {hasPermission("USER_LIST") && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => {
                          navigate(`/utilisateurs/${selected.actor_user_id}`);
                          setSheetOpen(false);
                        }}
                      >
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        {t("audit.userSheet")}
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("audit.actorUnknown")}</p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("audit.actionTechnical")}</Label>
                  <p className="font-mono text-xs">{selected.action}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("audit.resourceTypeLabel")}</Label>
                  <p className="text-sm">{auditResourceTypeLabel(selected.resource_type, t)}</p>
                </div>
              </div>

              {selected.resource_id && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("audit.resourceLabel")}</Label>
                  <code className="block break-all rounded-md bg-muted px-2 py-1.5 font-mono text-xs">{selected.resource_id}</code>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-muted-foreground">{t("audit.colRequestId")}</Label>
                  {selected.request_id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        const rid = selected.request_id;
                        if (rid) void copyToClipboard(rid);
                      }}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      {t("audit.copy")}
                    </Button>
                  )}
                </div>
                <p className="font-mono text-xs text-muted-foreground">{selected.request_id ?? "—"}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("audit.payloadLabel")}</Label>
                <PayloadBlock raw={selected.payload_json} t={t} />
                {selected.payload_json && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit rounded-lg"
                    onClick={() => {
                      const pj = selected.payload_json;
                      if (pj) void copyToClipboard(pj);
                    }}
                  >
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    {t("audit.copyRawJson")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
