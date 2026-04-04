import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Establishment, PaginatedResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Plus, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

function contactLine(e: Establishment): string {
  const parts = [e.contact_email, e.contact_phone].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

export default function EstablishmentsPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState("");
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["establishments", skip, search],
    queryFn: () =>
      api.get<PaginatedResponse<Establishment>>("/establishments", {
        skip,
        limit,
        ...(search ? { territory_code: search } : {}),
      }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between page-header">
        <div>
          <h1 className="page-title">Établissements</h1>
          <p className="page-description">Référentiel géographique (API /v1/establishments)</p>
        </div>
        {hasPermission("ESTABLISHMENT_CREATE") && (
          <Button onClick={() => navigate("/etablissements/new")} className="mt-3 sm:mt-0">
            <Plus className="w-4 h-4 mr-2" />
            Nouvel établissement
          </Button>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Filtrer par code territoire…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSkip(0);
          }}
          className="max-w-xs bg-card"
        />
      </div>

      <div className="data-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Type
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  Territoire
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">
                  Contact
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Carto</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Aucun établissement trouvé
                  </td>
                </tr>
              ) : (
                data?.items.map((e) => (
                  <tr
                    key={e.id}
                    role="link"
                    tabIndex={0}
                    className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/etablissements/${e.id}`)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        navigate(`/etablissements/${e.id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground">{e.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {e.establishment_type || "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {e.territory_code ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs max-w-[200px] truncate">
                      {contactLine(e)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="status-badge-neutral text-xs">v{e.geometry_version}</span>
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
