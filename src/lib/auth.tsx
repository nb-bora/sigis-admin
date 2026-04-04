import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { api } from "./api";
import type { LoginResponse, Role, Permission } from "@/types/api";
import { ROLE_PERMISSIONS } from "@/types/api";

interface AuthState {
  token: string;
  userId: string;
  role: Role;
}

interface AuthContextType {
  user: AuthState | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (p: Permission) => boolean;
  hasAnyPermission: (...ps: Permission[]) => boolean;
  hasRole: (r: Role) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "sigis_auth";

function normalizeStoredAuth(raw: unknown): AuthState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const token = o.token;
  const userId = o.userId;
  if (typeof token !== "string" || typeof userId !== "string") return null;

  let role: Role | undefined;
  if (typeof o.role === "string") role = o.role as Role;
  else if (Array.isArray(o.roles) && o.roles.length > 0 && typeof o.roles[0] === "string") {
    role = o.roles[0] as Role;
  }
  if (!role) return null;

  return { token, userId, role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = normalizeStoredAuth(JSON.parse(stored));
        if (parsed) {
          api.setToken(parsed.token);
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  });

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
    api.setToken(null);
  }, []);

  useEffect(() => {
    api.setOnUnauthorized(logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<LoginResponse>("/auth/login", { email, password });
    const state: AuthState = {
      token: res.access_token,
      userId: res.user_id,
      role: res.role,
    };
    api.setToken(state.token);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setUser(state);
  }, []);

  const hasPermission = useCallback(
    (p: Permission) => {
      if (!user) return false;
      if (user.role === "SUPER_ADMIN") return true;
      return ROLE_PERMISSIONS[user.role]?.includes(p) ?? false;
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (...ps: Permission[]) => ps.some((p) => hasPermission(p)),
    [hasPermission]
  );

  const hasRole = useCallback((r: Role) => user?.role === r, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
