import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { User, PaginatedResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, UserPlus } from "lucide-react";

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  NATIONAL_ADMIN: "Admin national",
  REGIONAL_SUPERVISOR: "Superviseur régional",
  INSPECTOR: "Inspecteur",
  HOST: "Hôte",
};

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UsersPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [skip, setSkip] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["users", skip],
    queryFn: () => api.get<PaginatedResponse<User>>("/users", { skip, limit }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between page-header">
        <div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-description">Comptes et rôle unique (API /v1/users)</p>
        </div>
        {hasPermission("AUTH_REGISTER_USER") && (
          <Button onClick={() => navigate("/utilisateurs/nouveau")} className="mt-3 sm:mt-0">
            <UserPlus className="w-4 h-4 mr-2" />
            Nouveau compte
          </Button>
        )}
      </div>

      <div className="data-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  E-mail
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  Rôle
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                data?.items.map((u) => (
                  <tr
                    key={u.id}
                    role="link"
                    tabIndex={0}
                    className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/utilisateurs/${u.id}`)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        navigate(`/utilisateurs/${u.id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                          {initials(u.full_name)}
                        </div>
                        <span className="font-medium text-foreground">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="status-badge-info">{roleLabels[u.role] ?? u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.is_active ? "status-badge-success" : "status-badge-neutral"}>
                        {u.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {(data?.total ?? 0) > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {data?.total ?? 0} résultat{(data?.total ?? 0) > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={skip === 0}
                onClick={() => setSkip(Math.max(0, skip - limit))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={skip + limit >= (data?.total ?? 0)}
                onClick={() => setSkip(skip + limit)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
