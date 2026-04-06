import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";
import type { RolesPermissionsMap, Role } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PERMISSIONS_ORDER,
  ROLE_ORDER,
  permissionDescription,
  permissionLabel,
  permissionPrefixLabel,
  roleBadge,
  roleDescription,
  roleLabel,
} from "@/lib/rbac";
import {
  Shield,
  Search,
  Check,
  Minus,
  Lock,
  RotateCcw,
  LayoutGrid,
  ListTree,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RolesPage() {
  const { t } = useLocale();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const allowed = hasRole("SUPER_ADMIN") || hasRole("NATIONAL_ADMIN");
  const canEditMatrix = hasRole("SUPER_ADMIN");
  const [search, setSearch] = useState("");
  const [resetRole, setResetRole] = useState<Role | null>(null);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["roles-permissions"],
    queryFn: () => api.get<RolesPermissionsMap>("/roles"),
    enabled: allowed,
  });

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ["roles-permissions-catalog"],
    queryFn: () => api.get<Record<string, string[]>>("/roles/permissions/catalog"),
    enabled: allowed,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["roles-permissions"] });
    queryClient.invalidateQueries({ queryKey: ["roles-permissions-catalog"] });
  };

  const toggleMutation = useMutation({
    mutationFn: async ({
      role,
      perm,
      grant,
    }: {
      role: Role;
      perm: string;
      grant: boolean;
    }) => {
      if (grant) {
        await api.post(`/roles/${role}/permissions/${encodeURIComponent(perm)}`);
      } else {
        await api.delete(`/roles/${role}/permissions/${encodeURIComponent(perm)}`);
      }
    },
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: ["roles-permissions"] });
      const previous = queryClient.getQueryData<RolesPermissionsMap>(["roles-permissions"]);

      if (previous) {
        const next: RolesPermissionsMap = { ...previous };
        const current = new Set(next[v.role] ?? []);
        if (v.grant) current.add(v.perm);
        else current.delete(v.perm);
        next[v.role] = Array.from(current).sort();
        queryClient.setQueryData(["roles-permissions"], next);
      }

      return { previous };
    },
    onSuccess: (_, v) => {
      invalidate();
      toast.success(v.grant ? t("roles.toastGrant") : t("roles.toastRevoke"));
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["roles-permissions"], ctx.previous);
      toast.error(e.message);
    },
    onSettled: () => invalidate(),
  });

  const resetMutation = useMutation({
    mutationFn: (role: Role) => api.post(`/roles/${role}/permissions/reset`),
    onSuccess: () => {
      invalidate();
      toast.success(t("roles.toastResetOk"));
      setResetRole(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredPermissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PERMISSIONS_ORDER;
    return PERMISSIONS_ORDER.filter((p) => {
      const label = permissionLabel(p, t);
      const desc = permissionDescription(p, t);
      return (
        p.toLowerCase().includes(q) ||
        label.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q)
      );
    });
  }, [search, t]);

  const hasPerm = (role: Role, code: string) => (data?.[role] ?? []).includes(code);

  const handleToggle = (role: Role, perm: string, next: boolean) => {
    const current = hasPerm(role, perm);
    if (next === current) return;
    toggleMutation.mutate({ role, perm, grant: next });
  };

  const ToggleCell = ({
    role,
    perm,
    label,
  }: {
    role: Role;
    perm: string;
    label: string;
  }) => {
    const on = hasPerm(role, perm);
    const disabled = toggleMutation.isPending;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => handleToggle(role, perm, !on)}
        aria-label={`${roleLabel(role, t)} — ${label}`}
        aria-pressed={on}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          disabled && "cursor-not-allowed opacity-60",
          on
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
            : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/45",
        )}
      >
        {on ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Minus className="h-4 w-4" />}
      </button>
    );
  };

  if (!allowed) {
    return (
      <div className="animate-fade-in mx-auto max-w-lg">
        <Card className="rounded-2xl border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-muted-foreground" aria-hidden />
              {t("roles.restrictedTitle")}
            </CardTitle>
            <CardDescription>{t("roles.restrictedDesc")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.06] via-card to-violet-500/[0.06] px-6 py-7 shadow-sm sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.12)_1px,transparent_0)] [background-size:20px_20px]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Shield className="h-7 w-7" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary/80">{t("roles.heroEyebrow")}</p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("roles.heroTitle")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {t("roles.heroDesc", {
                  state: canEditMatrix ? t("roles.heroDescEditable") : t("roles.heroDescReadonly"),
                })}
              </p>
            </div>
          </div>
          {canEditMatrix && (
            <Badge variant="outline" className="shrink-0 gap-1.5 border-primary/30 bg-primary/5 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t("roles.badgeSuper")}
            </Badge>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error instanceof Error ? error.message : t("roles.loadError")}
        </div>
      )}

      <Tabs defaultValue="matrix" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-11 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="matrix" className="gap-2 rounded-lg px-4">
              <LayoutGrid className="h-4 w-4" aria-hidden />
              {t("roles.tabMatrix")}
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-2 rounded-lg px-4">
              <ListTree className="h-4 w-4" aria-hidden />
              {t("roles.tabCatalog")}
            </TabsTrigger>
          </TabsList>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("roles.searchPlaceholder")}
              className="h-11 rounded-xl pl-10"
            />
          </div>
        </div>

        <TabsContent value="matrix" className="mt-0 space-y-4">
          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
              <CardTitle className="text-base">{t("roles.matrixTitle")}</CardTitle>
              <CardDescription>
                {canEditMatrix ? t("roles.matrixDescEditable") : t("roles.matrixDescReadonly")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="sticky left-0 z-20 min-w-[220px] bg-muted/95 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                          {t("roles.colPermission")}
                        </th>
                        {ROLE_ORDER.map((r) => (
                          <th
                            key={r}
                            className="min-w-[100px] px-2 py-3 text-center text-xs font-semibold leading-tight text-muted-foreground"
                          >
                            <span className="block">{roleLabel(r, t)}</span>
                            <span className="mt-0.5 block font-mono text-[10px] font-normal text-muted-foreground/80">
                              {r}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPermissions.map((perm) => {
                        const plabel = permissionLabel(perm, t);
                        const pdesc = permissionDescription(perm, t);
                        return (
                          <tr key={perm} className="border-b border-border/60 transition-colors hover:bg-muted/25">
                            <td className="sticky left-0 z-10 bg-card px-4 py-3 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)]">
                              <Tooltip delayDuration={200}>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help">
                                    <p className="font-medium leading-snug text-foreground">{plabel}</p>
                                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{perm}</p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">
                                  {pdesc}
                                </TooltipContent>
                              </Tooltip>
                            </td>
                            {ROLE_ORDER.map((r) => {
                              const on = hasPerm(r, perm);
                              return (
                                <td key={`${r}-${perm}`} className="px-1 py-2 text-center align-middle">
                                  {canEditMatrix ? (
                                    <div className="flex justify-center">
                                      <ToggleCell role={r} perm={perm} label={plabel} />
                                    </div>
                                  ) : (
                                    <span
                                      className={cn(
                                        "inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs",
                                        on
                                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                          : "border-border/60 bg-muted/30 text-muted-foreground",
                                      )}
                                      aria-label={on ? t("audit.allowed") : t("audit.denied")}
                                    >
                                      {on ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Minus className="h-4 w-4" />}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {isFetching && !isLoading && (
                <p className="border-t border-border/60 bg-muted/20 px-4 py-2 text-center text-xs text-primary">
                  {t("roles.refreshing")}
                </p>
              )}
            </CardContent>
          </Card>

          {canEditMatrix && (
            <Card className="rounded-2xl border-amber-500/20 bg-amber-500/[0.04] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <RotateCcw className="h-5 w-5 text-amber-700 dark:text-amber-400" aria-hidden />
                  {t("roles.resetSectionTitle")}
                </CardTitle>
                <CardDescription>{t("roles.resetSectionDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {ROLE_ORDER.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-amber-500/30"
                    disabled={resetMutation.isPending}
                    onClick={() => setResetRole(r)}
                  >
                    <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
                    {roleLabel(r, t)}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="catalog" className="mt-0 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {catalogLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))
            ) : catalog ? (
              Object.entries(catalog)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([prefix, perms]) => {
                  const sorted = [...perms].sort();
                  const domainTitle = permissionPrefixLabel(prefix, t);
                  return (
                    <Card key={prefix} className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
                      <CardHeader className="border-b border-border/50 bg-muted/20 py-3">
                        <CardTitle className="text-sm font-semibold text-foreground">{domainTitle}</CardTitle>
                        <p className="font-mono text-[11px] text-muted-foreground">{prefix}_*</p>
                      </CardHeader>
                      <CardContent className="max-h-[min(320px,45vh)] space-y-2 overflow-y-auto pt-4">
                        {sorted.map((p) => (
                          <div
                            key={p}
                            className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2 text-xs"
                          >
                            <p className="font-medium text-foreground">{permissionLabel(p, t)}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{p}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      <section aria-labelledby="roles-cards-heading">
        <h2 id="roles-cards-heading" className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          {t("roles.cardsTitle")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {ROLE_ORDER.map((r) => {
            const count = data?.[r]?.length ?? 0;
            return (
              <Card key={r} className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
                <CardHeader className="border-b border-border/50 bg-muted/15 pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{roleLabel(r, t)}</CardTitle>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{r}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 font-normal">
                      {roleBadge(r, t)}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2 text-sm leading-relaxed">{roleDescription(r, t)}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    {count <= 1 ? t("roles.permCount", { count }) : t("roles.permCountPlural", { count })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <AlertDialog open={resetRole !== null} onOpenChange={(o) => !o && setResetRole(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("roles.dialogResetTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="text-left leading-relaxed">
              {t("roles.dialogResetDesc", {
                role: resetRole ? roleLabel(resetRole, t) : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("roles.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-amber-600 hover:bg-amber-600/90"
              onClick={() => resetRole && resetMutation.mutate(resetRole)}
            >
              {t("roles.reset")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
