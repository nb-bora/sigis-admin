import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";
import { roleLabel } from "@/lib/rbac";
import { shortDisplayName } from "@/lib/personalization";
import type { User } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AdminUserBar({ className }: { className?: string }) {
  const { user } = useAuth();
  const { t } = useLocale();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user", user?.userId],
    queryFn: () => api.get<User>(`/users/${user!.userId}`),
    enabled: !!user?.userId,
    staleTime: 60_000,
  });

  if (!user) return null;

  const name = shortDisplayName(profile?.full_name, profile?.email);
  const greeting =
    name.length > 0 ? t("shell.greetingNamed", { name }) : t("shell.greetingAnonymous");

  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {isLoading && !profile ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">{greeting}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {profile?.email ?? `ID · ${user.userId.slice(0, 8)}…`}
            </p>
          </>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-normal">
          {roleLabel(user.role, t)}
        </Badge>
        <span className="font-mono text-[10px] text-muted-foreground/80">{user.role}</span>
      </div>
    </div>
  );
}
