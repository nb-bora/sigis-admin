import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type {
  ExceptionRequest,
  PaginatedResponse,
  ExceptionStatusApi,
  ExceptionScopeSummary,
  Mission,
  User,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  Filter,
  Compass,
  Loader2,
  TrendingUp,
  X,
  Search,
  ClipboardList,
  UserRound,
  UserCheck,
  CalendarRange,
  Mail,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { localDateEndIso, localDateStartIso } from "@/lib/datetime";
import { useLocale } from "@/lib/locale";

function exceptionStatusLabel(status: string, tr: (key: string) => string) {
  const key = `exception.status.${status}`;
  const s = tr(key);
  return s === key ? status : s;
}

const statusBadgeVariant: Record<ExceptionStatusApi, "default" | "secondary" | "destructive" | "outline"> = {
  new: "destructive",
  acknowledged: "default",
  resolved: "outline",
  escalated: "secondary",
};

const STATUS_ORDER: ExceptionStatusApi[] = ["new", "acknowledged", "resolved", "escalated"];

const excBarColor: Record<string, string> = {
  new: "bg-amber-500",
  acknowledged: "bg-sky-500",
  resolved: "bg-emerald-500",
  escalated: "bg-slate-400 dark:bg-slate-500",
};

function buildScopeParams(
  missionId: string,
  authorId: string,
  assignment: string,
  dateFrom: string,
  dateTo: string,
  messageQ: string,
): Record<string, string | boolean> {
  const p: Record<string, string | boolean> = {};
  if (missionId) p.mission_id = missionId;
  if (authorId) p.author_user_id = authorId;
  if (assignment === "unassigned") p.unassigned_only = true;
  else if (assignment !== "all") p.assigned_to_user_id = assignment;
  if (dateFrom) {
    try {
      p.created_from = localDateStartIso(dateFrom);
    } catch {
      /* ignore */
    }
  }
  if (dateTo) {
    try {
      p.created_to = localDateEndIso(dateTo);
    } catch {
      /* ignore */
    }
  }
  if (messageQ.trim()) p.message_q = messageQ.trim();
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

function missionLabel(
  missions: Mission[] | undefined,
  missionId: string,
  tr: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const m = missions?.find((x) => x.id === missionId);
  if (!m) return `${missionId.slice(0, 8)}…`;
  if (m.objective?.trim()) {
    const obj = m.objective.trim();
    return obj.length > 48 ? `${obj.slice(0, 48)}…` : obj;
  }
  return tr("missions.list.missionDefault", { id: `${m.id.slice(0, 8)}…` });
}

function userLabel(users: User[] | undefined, userId: string): string {
  const u = users?.find((x) => x.id === userId);
  if (!u) return userId.slice(0, 8) + "…";
  return u.full_name;
}

export default function ExceptionsPage() {
  const { t, locale } = useLocale();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [skip, setSkip] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [missionFilter, setMissionFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [debouncedMessage, setDebouncedMessage] = useState("");
  const limit = 20;

  const [selectedEx, setSelectedEx] = useState<ExceptionRequest | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [assignUserId, setAssignUserId] = useState("");
  const [manageComment, setManageComment] = useState("");
  const [slaLocal, setSlaLocal] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedMessage(messageInput.trim()), 320);
    return () => clearTimeout(t);
  }, [messageInput]);

  useEffect(() => {
    if (!selectedEx) return;
    setAssignUserId(selectedEx.assigned_to_user_id ?? "");
    setManageComment(selectedEx.internal_comment ?? "");
    setNewStatus(selectedEx.status);
    if (selectedEx.sla_due_at) {
      const d = new Date(selectedEx.sla_due_at);
      const pad = (n: number) => String(n).padStart(2, "0");
      setSlaLocal(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    } else {
      setSlaLocal("");
    }
  }, [selectedEx]);

  const scopeParams = useMemo(
    () => buildScopeParams(missionFilter, authorFilter, assignmentFilter, dateFrom, dateTo, debouncedMessage),
    [missionFilter, authorFilter, assignmentFilter, dateFrom, dateTo, debouncedMessage],
  );

  const listParams = useMemo(() => {
    const p: Record<string, string | number | boolean> = { skip, limit, ...scopeParams };
    if (statusFilter !== "all") p.status = statusFilter;
    return p;
  }, [scopeParams, skip, statusFilter]);

  const { data: missions } = useQuery({
    queryKey: ["missions-pick-exceptions", 500],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Mission>>("/missions", { skip: 0, limit: 500 });
      return res.items;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users-pick-exceptions", 500],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<User>>("/users", { skip: 0, limit: 500 });
      return res.items;
    },
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["exceptions-summary", scopeParams],
    queryFn: () => api.get<ExceptionScopeSummary>("/exception-requests/summary", scopeParams),
    enabled: hasPermission("EXCEPTION_READ"),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["exceptions", listParams],
    queryFn: () => api.get<PaginatedResponse<ExceptionRequest>>("/exception-requests", listParams),
    enabled: hasPermission("EXCEPTION_READ"),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["exceptions"] });
    queryClient.invalidateQueries({ queryKey: ["exceptions-summary"] });
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/exception-requests/${id}/status`, { status }),
    onSuccess: () => {
      toast.success(t("exceptions.page.toastStatusUpdated"));
      invalidateAll();
      setSelectedEx(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const manageMutation = useMutation({
    mutationFn: (payload: {
      status?: ExceptionStatusApi;
      assigned_to_user_id?: string | null;
      internal_comment?: string | null;
      sla_due_at?: string | null;
    }) => api.patch<ExceptionRequest>(`/exception-requests/${selectedEx!.id}`, payload),
    onSuccess: () => {
      toast.success(t("exceptions.page.toastUpdated"));
      invalidateAll();
      setSelectedEx(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(skip / limit) + 1;
  const hasRows = (data?.items.length ?? 0) > 0;

  const scopeTotal = summary?.total ?? 0;
  const statusRows = useMemo(() => {
    const raw = summary?.by_status ?? {};
    return STATUS_ORDER.map((s) => [s, raw[s] ?? 0] as const).filter(([, n]) => n > 0);
  }, [summary]);

  const hasActiveFilters =
    missionFilter ||
    authorFilter ||
    assignmentFilter !== "all" ||
    dateFrom ||
    dateTo ||
    debouncedMessage !== "" ||
    statusFilter !== "all";

  const resetFilters = () => {
    setMissionFilter("");
    setAuthorFilter("");
    setAssignmentFilter("all");
    setDateFrom("");
    setDateTo("");
    setMessageInput("");
    setDebouncedMessage("");
    setStatusFilter("all");
    setSkip(0);
  };

  const applyDateRange = () => {
    if (dateFrom && dateTo) {
      try {
        if (new Date(localDateStartIso(dateFrom)) > new Date(localDateEndIso(dateTo))) {
          toast.error(t("exceptions.page.toastInvalidRangeTitle"), {
            description: t("exceptions.page.toastInvalidRangeDesc"),
          });
          return;
        }
      } catch {
        toast.error(t("exceptions.page.toastInvalidDates"));
        return;
      }
    }
    setSkip(0);
  };

  const openDetail = (ex: ExceptionRequest) => {
    setSelectedEx(ex);
    setNewStatus(ex.status);
  };

  const handleManageSave = () => {
    if (!selectedEx) return;
    const trimmed = assignUserId.trim();
    if (trimmed && !/^[0-9a-f-]{36}$/i.test(trimmed)) {
      toast.error(t("exceptions.page.toastInvalidAssignUuid"));
      return;
    }
    const payload: {
      status?: ExceptionStatusApi;
      assigned_to_user_id?: string | null;
      internal_comment?: string | null;
      sla_due_at?: string | null;
    } = {};
    if (newStatus !== selectedEx.status) payload.status = newStatus as ExceptionStatusApi;
    const prevAssign = selectedEx.assigned_to_user_id ?? "";
    if (trimmed !== prevAssign) {
      payload.assigned_to_user_id = trimmed || null;
    }
    if (manageComment !== (selectedEx.internal_comment ?? "")) {
      payload.internal_comment = manageComment;
    }
    if (slaLocal) {
      const iso = new Date(slaLocal).toISOString();
      const prev = selectedEx.sla_due_at ? new Date(selectedEx.sla_due_at).toISOString() : null;
      if (iso !== prev) payload.sla_due_at = iso;
    } else if (selectedEx.sla_due_at) {
      payload.sla_due_at = null;
    }
    if (Object.keys(payload).length === 0) {
      toast.message(t("exceptions.page.toastNoChange"));
      return;
    }
    manageMutation.mutate(payload);
  };

  return (
    <div className="animate-fade-in space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.06] via-card to-amber-500/[0.06] px-6 py-7 shadow-sm sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.12)_1px,transparent_0)] [background-size:20px_20px]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-lg shadow-amber-600/25 dark:bg-amber-700">
              <AlertTriangle className="h-7 w-7" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary/80">
                {t("exceptions.page.heroEyebrow")}
              </p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("exceptions.page.heroTitle")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("exceptions.page.heroDesc")}</p>
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="exc-scope-stats-heading">
        <div className="mb-4">
          <h2 id="exc-scope-stats-heading" className="text-lg font-semibold tracking-tight text-foreground">
            {t("exceptions.page.scopeSummaryTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("exceptions.page.scopeSummaryDesc")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="relative min-h-[120px] overflow-hidden rounded-2xl border-border/80 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("exceptions.page.kpiScopeLabel")}
                  </p>
                  {summaryLoading ? (
                    <Skeleton className="h-9 w-16" />
                  ) : (
                    <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{scopeTotal}</p>
                  )}
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 shadow-inner">
                  <TrendingUp className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm lg:col-span-2">
            <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={1.75} aria-hidden />
                <CardTitle className="text-base font-semibold">Répartition par statut</CardTitle>
              </div>
              <CardDescription>
                {summaryLoading ? "Chargement…" : `${scopeTotal} signalement${scopeTotal > 1 ? "s" : ""} dans ce périmètre`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {summaryLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={`sk-bar-${i}`} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : scopeTotal === 0 || statusRows.length === 0 ? (
                <ChartEmpty message={t("exceptions.page.chartEmpty")} />
              ) : (
                <div className="space-y-5">
                  {statusRows.map(([status, count]) => {
                    const denom = Math.max(scopeTotal, 1);
                    const pct = Math.round(((count ?? 0) / denom) * 100);
                    const label = exceptionStatusLabel(status, t);
                    const barColor = excBarColor[status] ?? "bg-primary/60";
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
                            aria-label={t("exceptions.page.barAria", { label, pct })}
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
                  <CardTitle className="text-base">{t("exceptions.page.listTitle")}</CardTitle>
                  <CardDescription>
                    {isLoading ? (
                      t("exceptions.page.loading")
                    ) : (
                      <>
                        <span className="font-semibold text-foreground">
                          {total === 1
                            ? t("exceptions.page.resultOne", { count: total })
                            : t("exceptions.page.resultMany", { count: total })}
                        </span>
                        {statusFilter !== "all" && (
                          <span className="text-muted-foreground">
                            {t("exceptions.page.statusSuffix", {
                              status: exceptionStatusLabel(statusFilter, t),
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
                  {t("exceptions.page.resetFilters")}
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2 sm:col-span-2 xl:col-span-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("exceptions.page.searchMessageLabel")}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      setSkip(0);
                    }}
                    placeholder={t("exceptions.page.searchPlaceholder")}
                    className="h-11 rounded-xl border-border/80 bg-background pl-10"
                    maxLength={200}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">{t("exceptions.page.missionLabel")}</Label>
                <Select
                  value={missionFilter || "all"}
                  onValueChange={(v) => {
                    setMissionFilter(v === "all" ? "" : v);
                    setSkip(0);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background">
                    <SelectValue placeholder={t("exceptions.page.missionPlaceholderAll")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("exceptions.page.missionAllMissions")}</SelectItem>
                    {missions?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="line-clamp-1">{missionLabel(missions, m.id, t)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">{t("exceptions.page.authorLabel")}</Label>
                <Select
                  value={authorFilter || "all"}
                  onValueChange={(v) => {
                    setAuthorFilter(v === "all" ? "" : v);
                    setSkip(0);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background">
                    <SelectValue placeholder={t("exceptions.page.authorPlaceholderAll")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("exceptions.page.authorAllAuthors")}</SelectItem>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("exceptions.page.assignmentLabel")}
                </Label>
                <Select
                  value={assignmentFilter}
                  onValueChange={(v) => {
                    setAssignmentFilter(v);
                    setSkip(0);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("exceptions.page.assignmentAll")}</SelectItem>
                    <SelectItem value="unassigned">{t("exceptions.page.assignmentUnassigned")}</SelectItem>
                    {users?.map((u) => (
                      <SelectItem key={`a-${u.id}`} value={u.id}>
                        {t("exceptions.page.assignmentAssignedOption", { name: u.full_name })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2 xl:col-span-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("exceptions.page.dateRangeLabel")}
                </Label>
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
                  <Button type="button" variant="secondary" className="h-11 shrink-0 rounded-xl" onClick={applyDateRange}>
                    {t("exceptions.page.apply")}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("exceptions.page.statusListLabel")}
                </Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setSkip(0);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background">
                    <SelectValue placeholder={t("exceptions.page.statusPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("exceptions.page.statusAllStatuses")}</SelectItem>
                    {STATUS_ORDER.map((k) => (
                      <SelectItem key={k} value={k}>
                        {exceptionStatusLabel(k, t)}
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
                    {t("exceptions.page.colMessage")}
                  </th>
                  <th className="hidden lg:table-cell px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("exceptions.page.colMission")}
                  </th>
                  <th className="hidden xl:table-cell px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("exceptions.page.colAuthor")}
                  </th>
                  <th className="hidden lg:table-cell px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("exceptions.page.colDate")}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("exceptions.page.colStatus")}
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("exceptions.page.colActions")}
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
                          <p className="text-base font-semibold text-foreground">{t("exceptions.page.emptyTitle")}</p>
                          <p className="text-sm text-muted-foreground">
                            {hasActiveFilters
                              ? t("exceptions.page.emptyWithFilters")
                              : t("exceptions.page.emptyNoFilters")}
                          </p>
                        </div>
                        <Button variant="outline" className="mt-2 rounded-xl" onClick={() => navigate("/missions")}>
                          <ClipboardList className="mr-2 h-4 w-4" aria-hidden />
                          {t("exceptions.page.viewMissions")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data?.items.map((ex) => (
                    <tr
                      key={ex.id}
                      className="border-b border-border/60 transition-colors hover:bg-muted/35 motion-safe:duration-150"
                    >
                      <td className="max-w-md px-5 py-4 align-top">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                          <span className="line-clamp-2 font-medium leading-snug text-foreground">{ex.message}</span>
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {t("exceptions.page.idPrefix", { id: `${ex.id.slice(0, 8)}…` })}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell max-w-[200px] px-5 py-4 align-top text-sm text-muted-foreground">
                        <span className="line-clamp-2">{missionLabel(missions, ex.mission_id, t)}</span>
                      </td>
                      <td className="hidden xl:table-cell px-5 py-4 align-top">
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <UserRound className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                          {userLabel(users, ex.author_user_id)}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-5 py-4 align-top text-xs tabular-nums text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarRange className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                          {new Date(ex.created_at).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <Badge variant={statusBadgeVariant[ex.status]} className="font-normal">
                          {exceptionStatusLabel(ex.status, t)}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => openDetail(ex)}
                        >
                          <Eye className="mr-1.5 h-4 w-4" aria-hidden />
                          {t("exceptions.page.treat")}
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
                  <Skeleton key={`mb-${i}`} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : !hasRows ? (
              <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
                <Compass className="h-10 w-10 text-muted-foreground/50" aria-hidden />
                <p className="text-sm text-muted-foreground">{t("exceptions.page.mobileEmpty")}</p>
              </div>
            ) : (
              data?.items.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => openDetail(ex)}
                  className="flex w-full flex-col gap-2 p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 font-medium text-foreground">{ex.message}</span>
                    <Badge variant={statusBadgeVariant[ex.status]} className="shrink-0 font-normal">
                      {exceptionStatusLabel(ex.status, t)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{missionLabel(missions, ex.mission_id, t)}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {new Date(ex.created_at).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")}
                  </p>
                </button>
              ))
            )}
          </div>
        </CardContent>

        {total > limit && hasRows && (
          <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t("exceptions.page.paginationLine", {
                results:
                  total === 1
                    ? t("exceptions.page.resultOne", { count: total })
                    : t("exceptions.page.resultMany", { count: total }),
                current: currentPage,
                pages: totalPages,
              })}
              {isFetching && !isLoading && (
                <span className="ml-2 text-xs text-primary">{t("exceptions.page.updating")}</span>
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
                {t("exceptions.page.prev")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={skip + limit >= total}
                onClick={() => setSkip(skip + limit)}
              >
                {t("exceptions.page.next")}
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <Dialog open={!!selectedEx} onOpenChange={(open) => !open && setSelectedEx(null)}>
        <DialogContent className="max-h-[min(90vh,720px)] max-w-lg overflow-y-auto rounded-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("exceptions.page.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("exceptions.page.dialogDescription")}</DialogDescription>
          </DialogHeader>
          {selectedEx && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusBadgeVariant[selectedEx.status]}>
                  {exceptionStatusLabel(selectedEx.status, t)}
                </Badge>
                <span className="font-mono text-[11px] text-muted-foreground">{selectedEx.id}</span>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("exceptions.page.dialogLabelMessage")}</Label>
                <p className="mt-1.5 whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/20 p-3 text-foreground">
                  {selectedEx.message}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">{t("exceptions.page.dialogLabelMission")}</Label>
                  <p className="mt-1 font-medium text-foreground">{missionLabel(missions, selectedEx.mission_id, t)}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{selectedEx.mission_id}</p>
                  <Button
                    type="button"
                    variant="link"
                    className="mt-1 h-auto px-0 text-primary"
                    onClick={() => navigate(`/missions/${selectedEx.mission_id}`)}
                  >
                    <ClipboardList className="mr-1.5 h-4 w-4" aria-hidden />
                    {t("exceptions.page.openMission")}
                  </Button>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("exceptions.page.dialogLabelAuthor")}</Label>
                  <p className="mt-1 text-foreground">{userLabel(users, selectedEx.author_user_id)}</p>
                </div>
              </div>
              {selectedEx.assigned_to_user_id && (
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/15 px-3 py-2 text-xs">
                  <UserCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span>
                    {t("exceptions.page.assignedToLine", {
                      name: userLabel(users, selectedEx.assigned_to_user_id),
                    })}
                  </span>
                </div>
              )}
              {selectedEx.internal_comment && (
                <div>
                  <Label className="text-muted-foreground">{t("exceptions.page.internalCommentLabel")}</Label>
                  <p className="mt-1 rounded-xl border border-border/60 bg-muted/20 p-3 text-foreground">{selectedEx.internal_comment}</p>
                </div>
              )}
              {selectedEx.sla_due_at && (
                <p className="text-xs text-muted-foreground">
                  {t("exceptions.page.slaDuePrefix")}{" "}
                  <span className="font-medium text-foreground">
                    {new Date(selectedEx.sla_due_at).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")}
                  </span>
                </p>
              )}

              <Separator />

              {hasPermission("EXCEPTION_UPDATE_STATUS") && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">{t("exceptions.page.changeStatusTitle")}</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((k) => (
                        <SelectItem key={k} value={k}>
                          {exceptionStatusLabel(k, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="h-11 w-full rounded-xl sm:w-auto"
                    onClick={() => updateStatusMutation.mutate({ id: selectedEx.id, status: newStatus })}
                    disabled={newStatus === selectedEx.status || updateStatusMutation.isPending}
                  >
                    {t("exceptions.page.updateStatusButton")}
                  </Button>
                </div>
              )}

              {hasPermission("EXCEPTION_MANAGE") && (
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
                  <p className="text-sm font-semibold text-foreground">{t("exceptions.page.manageSupervisionTitle")}</p>
                  <div className="space-y-2">
                    <Label htmlFor="assign">{t("exceptions.page.assignUuidLabel")}</Label>
                    <Input
                      id="assign"
                      className="h-11 rounded-xl font-mono text-xs"
                      value={assignUserId}
                      onChange={(e) => setAssignUserId(e.target.value)}
                      placeholder={t("exceptions.page.assignPlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sla">{t("exceptions.page.slaDueLabel")}</Label>
                    <Input
                      id="sla"
                      type="datetime-local"
                      className="h-11 rounded-xl font-mono text-sm"
                      value={slaLocal}
                      onChange={(e) => setSlaLocal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="icom">{t("exceptions.page.internalCommentManageLabel")}</Label>
                    <Textarea
                      id="icom"
                      value={manageComment}
                      onChange={(e) => setManageComment(e.target.value)}
                      rows={3}
                      className="rounded-xl"
                    />
                  </div>
                  <Button
                    className="h-11 w-full rounded-xl"
                    onClick={handleManageSave}
                    disabled={manageMutation.isPending}
                  >
                    {manageMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        {t("exceptions.page.saving")}
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" aria-hidden />
                        {t("exceptions.page.saveManageButton")}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
