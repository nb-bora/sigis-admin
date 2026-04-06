import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Role, User, PaginatedResponse } from "@/types/api";
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
  ChevronLeft,
  ChevronRight,
  UserPlus,
  UsersRound,
  Search,
  Filter,
  X,
  Mail,
  Calendar,
} from "lucide-react";
import { ROLE_ORDER, roleLabel } from "@/lib/rbac";
import { useLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { UserExcelImport } from "@/components/import/UserExcelImport";

const limit = 20;

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatCreatedAt(iso: string, locale: "fr" | "en"): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type StatusFilter = "all" | "active" | "inactive";

function statusFilterLabel(s: StatusFilter, t: (key: string) => string) {
  switch (s) {
    case "all":
      return t("users.page.statusFilterAll");
    case "active":
      return t("users.page.statusFilterActive");
    case "inactive":
      return t("users.page.statusFilterInactive");
    default:
      return s;
  }
}

const SKELETON_ROWS = ["sr0", "sr1", "sr2", "sr3", "sr4", "sr5"] as const;
const SKELETON_COLS = ["sc0", "sc1", "sc2", "sc3", "sc4"] as const;

export default function UsersPage() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [skip, setSkip] = useState(0);
  const [nameInput, setNameInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(nameInput.trim()), 320);
    return () => clearTimeout(t);
  }, [nameInput]);

  const listParams = useMemo(() => {
    const p: Record<string, string | number | boolean | undefined> = { skip, limit };
    if (debouncedQ) p.q = debouncedQ;
    if (roleFilter !== "all") p.role = roleFilter;
    if (statusFilter === "active") p.is_active = true;
    if (statusFilter === "inactive") p.is_active = false;
    return p;
  }, [debouncedQ, roleFilter, skip, statusFilter]);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["users", listParams],
    queryFn: () => api.get<PaginatedResponse<User>>("/users", listParams),
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(skip / limit) + 1;
  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(skip + items.length, total);

  const hasActiveFilters =
    debouncedQ !== "" || roleFilter !== "all" || statusFilter !== "all";

  const resetFilters = () => {
    setNameInput("");
    setDebouncedQ("");
    setRoleFilter("all");
    setStatusFilter("all");
    setSkip(0);
  };

  useEffect(() => {
    setSkip(0);
  }, [debouncedQ, roleFilter, statusFilter]);

  return (
    <div className="animate-fade-in space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.06] via-card to-violet-500/[0.05] px-6 py-7 shadow-sm sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.12)_1px,transparent_0)] [background-size:20px_20px]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <UsersRound className="h-7 w-7" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary/80">{t("users.page.heroEyebrow")}</p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("users.page.heroTitle")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("users.page.heroDesc")}</p>
            </div>
          </div>
          {hasPermission("AUTH_REGISTER_USER") && (
            <div className="flex flex-wrap items-center gap-2">
              <UserExcelImport />
              <Button
                size="lg"
                className="shrink-0 shadow-md shadow-primary/20"
                onClick={() => navigate("/utilisateurs/nouveau")}
              >
                <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                {t("users.page.newAccount")}
              </Button>
            </div>
          )}
        </div>
      </header>

      <section aria-labelledby="users-kpi-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="users-kpi-heading" className="text-lg font-semibold tracking-tight text-foreground">
              {t("users.page.kpiTitle")}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("users.page.kpiDesc")}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>{t("users.page.kpiMatching")}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{isLoading ? "—" : total}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {t("users.page.kpiMatchingFoot")}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>{t("users.page.kpiRoleTitle")}</CardDescription>
              <CardTitle className="text-base font-semibold leading-snug">
                {roleFilter === "all" ? t("users.allRoles") : roleLabel(roleFilter as Role, t)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {t("users.page.kpiRoleFoot")}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/80 shadow-sm sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardDescription>{t("users.page.kpiStatusTitle")}</CardDescription>
              <CardTitle className="text-base font-semibold">{statusFilterLabel(statusFilter, t)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {t("users.page.statusInactiveHint")}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="users-filters-heading">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="users-filters-heading" className="text-sm font-semibold text-foreground">
            {t("users.page.filters")}
          </h2>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground" onClick={resetFilters}>
              <X className="h-3.5 w-3.5" aria-hidden />
              {t("users.page.resetFilters")}
            </Button>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="user-search">{t("users.page.searchLabel")}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="user-search"
                placeholder={t("users.page.searchPlaceholder")}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="h-11 rounded-xl pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-role">{t("users.page.roleLabel")}</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger id="user-role" className="h-11 rounded-xl">
                <SelectValue placeholder={t("users.page.rolePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("users.allRoles")}</SelectItem>
                {ROLE_ORDER.map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabel(r, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-status">{t("users.page.statusLabel")}</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger id="user-status" className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("users.page.statusAll")}</SelectItem>
                <SelectItem value="active">{t("users.page.statusActive")}</SelectItem>
                <SelectItem value="inactive">{t("users.page.statusInactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="data-table-wrapper relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        {isFetching && !isLoading && (
          <div
            className="pointer-events-none absolute inset-0 z-10 bg-background/40 backdrop-blur-[1px]"
            aria-hidden
          />
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("users.page.colUser")}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  {t("users.page.colContact")}
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  {t("users.page.colRole")}
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground xl:table-cell">
                  {t("users.page.colCreated")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("users.page.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                SKELETON_ROWS.map((rowId) => (
                  <tr key={rowId} className="border-b border-border/60">
                    {SKELETON_COLS.map((colId) => (
                      <td key={`${rowId}-${colId}`} className="px-4 py-3">
                        <Skeleton className="h-5 w-full rounded-md" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading && isError && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-destructive">
                    {error instanceof Error ? error.message : t("users.page.loadError")}
                  </td>
                </tr>
              )}
              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <UsersRound className="mx-auto h-10 w-10 text-muted-foreground/40" strokeWidth={1.25} aria-hidden />
                    <p className="mt-3 font-medium text-foreground">{t("users.page.emptyTitle")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("users.page.emptyDesc")}</p>
                  </td>
                </tr>
              )}
              {!isLoading &&
                !isError &&
                items.length > 0 &&
                items.map((u) => (
                  <tr
                    key={u.id}
                    tabIndex={0}
                    className={cn(
                      "border-b border-border/60 transition-colors",
                      "cursor-pointer hover:bg-muted/35 focus-visible:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                    onClick={() => navigate(`/utilisateurs/${u.id}`)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        navigate(`/utilisateurs/${u.id}`);
                      }
                    }}
                    aria-label={t("users.page.openProfileAria", { name: u.full_name })}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                          aria-hidden
                        >
                          {initials(u.full_name)}
                        </div>
                        <span className="font-medium text-foreground">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1.5 break-all font-mono text-xs">
                          <Mail className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                          {u.email}
                        </span>
                        <span className="font-mono text-xs">{u.phone_number || "—"}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <Badge variant="secondary" className="max-w-[14rem] truncate font-normal">
                        {roleLabel(u.role, t)}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground xl:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                        {formatCreatedAt(u.created_at, locale)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.is_active ? "status-badge-success" : "status-badge-neutral"}>
                        {u.is_active ? t("userDetail.active") : t("userDetail.inactive")}
                      </span>
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
                ? t("users.page.pagination", { from, to, total })
                : t("users.page.paginationPlural", { from, to, total })}
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
    </div>
  );
}
