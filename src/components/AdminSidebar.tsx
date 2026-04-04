import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
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
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Permission, Role } from "@/types/api";

const roleShort: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  NATIONAL_ADMIN: "Admin national",
  REGIONAL_SUPERVISOR: "Superviseur",
  INSPECTOR: "Inspecteur",
  HOST: "Hôte",
};

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  permissions?: Permission[];
  rolesOnly?: Role[];
}

const navItems: NavItem[] = [
  { label: "Tableau de bord", path: "/", icon: LayoutDashboard },
  { label: "Missions", path: "/missions", icon: ClipboardList, permissions: ["MISSION_READ"] },
  { label: "Établissements", path: "/etablissements", icon: Building2, permissions: ["ESTABLISHMENT_READ"] },
  { label: "Signalements", path: "/signalements", icon: AlertTriangle, permissions: ["EXCEPTION_READ"] },
  { label: "Utilisateurs", path: "/utilisateurs", icon: Users, permissions: ["USER_LIST"] },
  {
    label: "Rôles & permissions",
    path: "/roles",
    icon: KeyRound,
    rolesOnly: ["SUPER_ADMIN", "NATIONAL_ADMIN"],
  },
  { label: "Pilotage", path: "/pilotage", icon: BarChart3, permissions: ["REPORT_READ"] },
  { label: "Audit", path: "/audit", icon: FileText, permissions: ["AUDIT_READ"] },
];

export function AdminSidebar() {
  const { hasAnyPermission, logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const visibleItems = navItems.filter((item) => {
    if (item.rolesOnly?.length) {
      if (!user || !item.rolesOnly.includes(user.role)) return false;
    }
    if (item.permissions?.length && !hasAnyPermission(...item.permissions)) return false;
    return true;
  });

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 h-16 border-b border-border shrink-0", collapsed && "justify-center px-2")}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="text-sm font-semibold text-foreground block">SIGIS</span>
            <span className="text-[10px] text-muted-foreground leading-none">Administration</span>
            {user && (
              <span className="text-[10px] text-primary/90 font-medium block mt-1 truncate">
                {roleShort[user.role]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
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
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-2 py-3 space-y-0.5 shrink-0">
        <NavLink
          to="/parametres"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Paramètres</span>}
        </NavLink>
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full text-left",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-card border border-border shadow-sm"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-foreground/20 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-card border-r border-border shrink-0 transition-[width] duration-200",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {sidebarContent}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-[18px] -right-3 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-accent transition-colors"
          style={{ left: collapsed ? "52px" : "228px" }}
          aria-label={collapsed ? "Étendre" : "Réduire"}
        >
          <ChevronLeft className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>
    </>
  );
}
