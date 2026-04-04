import { NavLink, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  AlertTriangle,
  Users,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Shield,
  ChevronLeft,
  Menu,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Permission, Role } from "@/types/api";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  permissions?: Permission[];
  rolesOnly?: Role[];
}

const NAV_BASE: Array<{
  labelKey: string;
  path: string;
  icon: React.ElementType;
  permissions?: Permission[];
  rolesOnly?: Role[];
}> = [
  { labelKey: "nav.dashboard", path: "/", icon: LayoutDashboard },
  { labelKey: "nav.missions", path: "/missions", icon: ClipboardList, permissions: ["MISSION_READ"] },
  { labelKey: "nav.establishments", path: "/etablissements", icon: Building2, permissions: ["ESTABLISHMENT_READ"] },
  { labelKey: "nav.reports", path: "/signalements", icon: AlertTriangle, permissions: ["EXCEPTION_READ"] },
  { labelKey: "nav.users", path: "/utilisateurs", icon: Users, permissions: ["USER_LIST"] },
  {
    labelKey: "nav.roles",
    path: "/roles",
    icon: KeyRound,
    rolesOnly: ["SUPER_ADMIN", "NATIONAL_ADMIN"],
  },
  { labelKey: "nav.pilotage", path: "/pilotage", icon: BarChart3, permissions: ["REPORT_READ"] },
  { labelKey: "nav.audit", path: "/audit", icon: FileText, permissions: ["AUDIT_READ"] },
];

export function AdminSidebar() {
  const { hasAnyPermission, logout, user } = useAuth();
  const { t } = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems: NavItem[] = useMemo(
    () => NAV_BASE.map((item) => ({ ...item, label: t(item.labelKey) })),
    [t],
  );

  const roleShortLabel = (role: Role) => t(`nav.roleShort.${role}`);

  const visibleItems = navItems.filter((item) => {
    const cfg = NAV_BASE.find((c) => c.path === item.path);
    if (cfg?.rolesOnly?.length) {
      if (!user || !cfg.rolesOnly.includes(user.role)) return false;
    }
    if (cfg?.permissions?.length && !hasAnyPermission(...cfg.permissions)) return false;
    return true;
  });

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("flex items-center gap-3 px-4 h-16 border-b border-border shrink-0", collapsed && "justify-center px-2")}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="text-sm font-semibold text-foreground block">SIGIS</span>
            <span className="text-[10px] text-muted-foreground leading-none">{t("nav.administration")}</span>
            {user && (
              <span className="text-[10px] text-primary/90 font-medium block mt-1 truncate">
                {roleShortLabel(user.role)}
              </span>
            )}
          </div>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                collapsed && "justify-center px-2",
              )}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border px-2 py-3 space-y-0.5 shrink-0">
        <NavLink
          to="/parametres"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
            collapsed && "justify-center px-2",
          )}
        >
          <Settings className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>{t("nav.settings")}</span>}
        </NavLink>
        <button
          type="button"
          onClick={logout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full text-left",
            collapsed && "justify-center px-2",
          )}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>{t("nav.logout")}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-card border border-border shadow-sm"
        aria-label={t("nav.openMenu")}
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-foreground/20 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarContent}
      </aside>

      <aside
        className={cn(
          "relative z-30 hidden lg:flex shrink-0 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-200",
          "sticky top-0 h-screen self-start",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {sidebarContent}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-[18px] -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-colors hover:bg-accent"
          style={{ left: collapsed ? "52px" : "228px" }}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>
    </>
  );
}
