import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { RolesPermissionsMap } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const ROLE_ORDER = [
  "SUPER_ADMIN",
  "NATIONAL_ADMIN",
  "REGIONAL_SUPERVISOR",
  "INSPECTOR",
  "HOST",
] as const;

export default function RolesPage() {
  const { hasRole } = useAuth();
  const allowed = hasRole("SUPER_ADMIN") || hasRole("NATIONAL_ADMIN");

  const { data, isLoading, error } = useQuery({
    queryKey: ["roles-permissions"],
    queryFn: () => api.get<RolesPermissionsMap>("/roles"),
    enabled: allowed,
  });

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ["roles-permissions-catalog"],
    queryFn: () => api.get<Record<string, string[]>>("/roles/permissions/catalog"),
    enabled: allowed,
  });

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="page-header">
        <h1 className="page-title">Rôles & permissions</h1>
        <p className="page-description">
          GET /v1/roles — matrice effective ; GET /v1/roles/permissions/catalog — catalogue par préfixe.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm px-4 py-3 mb-4">
          {error instanceof Error ? error.message : "Erreur de chargement"}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">Catalogue des permissions</h2>
        {catalogLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : catalog ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(catalog)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([prefix, perms]) => (
                <Card key={prefix}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-mono">{prefix}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="text-xs font-mono text-muted-foreground space-y-1">
                      {[...perms].sort().map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : null}
      </div>

      <h2 className="text-sm font-semibold text-foreground mb-3">Matrice par rôle</h2>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {ROLE_ORDER.map((role) => {
            const perms = data?.[role] ?? [];
            return (
              <Card key={role}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base font-semibold">{role}</CardTitle>
                  <p className="text-xs text-muted-foreground">{perms.length} permission(s)</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="h-[min(200px,40vh)] w-full rounded-md border border-border p-3">
                    <ul className="text-xs font-mono text-muted-foreground space-y-1">
                      {perms.length === 0 ? (
                        <li className="italic">Aucune permission listée</li>
                      ) : (
                        [...perms].sort().map((p) => <li key={p}>{p}</li>)
                      )}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
