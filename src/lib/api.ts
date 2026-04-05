import { getStoredLocale, translate } from "@/lib/locale";

const API_PREFIX = "/v1";

/** URL du backend (sans slash final). */
const DEFAULT_PRODUCTION_API = "https://sigis-backend.onrender.com";

/**
 * En dev : même origine + proxy Vite (`/v1` → localhost:8000), pas besoin de CORS.
 * En prod (Vercel, etc.) : il faut l’URL absolue du backend — ne pas utiliser
 * `window.location.origin` sinon les requêtes partent vers le front (404 / CORS).
 */
function baseUrl(): string {
  const env = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (env) return env.replace(/\/$/, "");
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return window.location.origin;
  }
  return DEFAULT_PRODUCTION_API;
}

function messageFromErrorBody(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (typeof o.detail === "string") return o.detail;
  if (Array.isArray(o.detail)) {
    const parts = o.detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: unknown }).msg);
        }
        return null;
      })
      .filter((x): x is string => Boolean(x));
    if (parts.length) return parts.join(" · ");
  }
  if (o.detail && typeof o.detail === "object" && "message" in o.detail) {
    const m = (o.detail as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  if (typeof o.message === "string") return o.message;
  return null;
}

class ApiClient {
  private token: string | null = null;
  private onUnauthorized?: () => void;

  setToken(token: string | null) {
    this.token = token;
  }

  setOnUnauthorized(cb: () => void) {
    this.onUnauthorized = cb;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
      raw?: boolean;
    }
  ): Promise<T> {
    const url = new URL(`${API_PREFIX}${path}`, baseUrl());
    if (options?.params) {
      Object.entries(options.params).forEach(([k, v]) => {
        if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
      });
    }

    const headers: Record<string, string> = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    if (options?.body) headers["Content-Type"] = "application/json";

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (res.status === 401) {
      this.onUnauthorized?.();
      throw new Error(translate(getStoredLocale(), "api.sessionExpired"));
    }

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      const msg =
        messageFromErrorBody(body) ||
        translate(getStoredLocale(), "api.httpError", {
          status: res.status,
          statusText: res.statusText,
        });
      throw new Error(msg);
    }

    if (options?.raw) return res as unknown as T;
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>("GET", path, { params });
  }

  /** GET qui retourne `null` si le serveur répond 404 (ressource absente). */
  async getOptional<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T | null> {
    const url = new URL(`${API_PREFIX}${path}`, baseUrl());
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
      });
    }
    const headers: Record<string, string> = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    const res = await fetch(url.toString(), { method: "GET", headers });
    if (res.status === 404) return null;
    if (res.status === 401) {
      this.onUnauthorized?.();
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      const msg =
        messageFromErrorBody(body) || `Erreur ${res.status} : ${res.statusText}`;
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>("POST", path, { body });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, { body });
  }

  delete<T>(path: string) {
    return this.request<T>("DELETE", path);
  }

  async downloadFile(
    path: string,
    filename: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) {
    const url = new URL(`${API_PREFIX}${path}`, baseUrl());
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
      });
    }
    const headers: Record<string, string> = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) throw new Error("Erreur lors du téléchargement");

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

export const api = new ApiClient();
