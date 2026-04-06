/**
 * Observability tracker — collecte TOUS les événements côté frontend et les
 * envoie en batch au backend toutes les 5 secondes (ou immédiatement si l'onglet
 * est sur le point de se fermer).
 *
 * Usage :
 *   tracker.record({ kind: "ui", action: "click", resource: "CreateMissionButton" })
 *   tracker.recordApiCall({ method: "POST", path: "/missions", status: 201, duration: 123.4, requestId: "…" })
 *   tracker.recordNavigation({ from: "/missions", to: "/missions/abc" })
 *   tracker.recordError({ message: "…", stack: "…", source: "LoginPage" })
 */

import type { EventKind, ObservabilityEvent } from "./types";

/** Génère un UUID v4 simple sans dépendance externe. */
function uuidv4(): string {
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (c) => {
    const r = Math.trunc(Math.random() * 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface ApiCallOpts {
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  requestId?: string | null;
  meta?: Record<string, unknown>;
}

export interface NavOpts {
  from: string;
  to: string;
  meta?: Record<string, unknown>;
}

export interface ErrorOpts {
  message: string;
  stack?: string;
  source?: string;
  meta?: Record<string, unknown>;
}

export interface UiActionOpts {
  action: string;
  resource: string;
  meta?: Record<string, unknown>;
}

class ObservabilityTracker {
  private readonly queue: ObservabilityEvent[] = [];
  private readonly flushTimer: ReturnType<typeof setInterval> | null = null;
  /** Callback injectée par le contexte React pour poster les events. */
  private flushFn: ((events: ObservabilityEvent[]) => void) | null = null;
  /** Buffer local (ring) pour l'affichage offline dans le dashboard. */
  private readonly localBuf: ObservabilityEvent[] = [];
  private readonly localMaxLen = 1000;
  private listeners: Array<(event: ObservabilityEvent) => void> = [];

  constructor() {
    if (globalThis.window !== undefined) {
      this.flushTimer = setInterval(() => this.flush(), 5000);
      globalThis.addEventListener("beforeunload", () => this.flush());
      globalThis.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") this.flush();
      });
      this.installGlobalErrorHandlers();
    }
  }

  /** Enregistre la fonction d'envoi (fournie par le contexte). */
  setFlushFn(fn: (events: ObservabilityEvent[]) => void) {
    this.flushFn = fn;
  }

  /** Abonnement en temps réel (pour le dashboard live). */
  subscribe(cb: (event: ObservabilityEvent) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private emit(event: ObservabilityEvent) {
    // Buffer local (ring)
    this.localBuf.push(event);
    if (this.localBuf.length > this.localMaxLen) this.localBuf.shift();
    // File d'envoi
    this.queue.push(event);
    // Notifie les abonnés temps réel
    this.listeners.forEach((l) => l(event));
  }

  /** Retourne les N derniers events du buffer local, du plus récent au plus ancien. */
  getLocalEvents(limit = 200): ObservabilityEvent[] {
    return [...this.localBuf].reverse().slice(0, limit);
  }

  /** Enregistre un appel API. */
  recordApiCall(opts: ApiCallOpts) {
    this.emit({
      id: uuidv4(),
      ts: nowIso(),
      kind: "http",
      action: "api_call",
      resource: opts.path,
      method: opts.method.toUpperCase(),
      path: opts.path,
      status_code: opts.status,
      duration_ms: opts.duration_ms,
      request_id: opts.requestId ?? null,
      meta: opts.meta ?? {},
    });
  }

  private currentPath(): string {
    return globalThis.window !== undefined ? globalThis.location.pathname : "";
  }

  /** Enregistre une navigation de page. */
  recordNavigation(opts: NavOpts) {
    this.emit({
      id: uuidv4(),
      ts: nowIso(),
      kind: "nav",
      action: "navigate",
      resource: opts.to,
      method: "",
      path: opts.to,
      status_code: null,
      duration_ms: null,
      request_id: null,
      meta: { from: opts.from, ...(opts.meta ?? {}) },
    });
  }

  /** Enregistre une action utilisateur (clic, soumission, …). */
  recordUiAction(opts: UiActionOpts) {
    this.emit({
      id: uuidv4(),
      ts: nowIso(),
      kind: "ui",
      action: opts.action,
      resource: opts.resource,
      method: "",
      path: this.currentPath(),
      status_code: null,
      duration_ms: null,
      request_id: null,
      meta: opts.meta ?? {},
    });
  }

  /** Enregistre une erreur JavaScript. */
  recordError(opts: ErrorOpts) {
    this.emit({
      id: uuidv4(),
      ts: nowIso(),
      kind: "error",
      action: "js_error",
      resource: opts.source ?? "unknown",
      method: "",
      path: this.currentPath(),
      status_code: null,
      duration_ms: null,
      request_id: null,
      meta: {
        message: opts.message,
        stack: opts.stack ?? "",
        ...(opts.meta ?? {}),
      },
    });
  }

  /** Enregistre une mesure de performance (Core Web Vitals, chargement, …). */
  record(opts: {
    kind: EventKind;
    action: string;
    resource: string;
    duration_ms?: number;
    meta?: Record<string, unknown>;
  }) {
    this.emit({
      id: uuidv4(),
      ts: nowIso(),
      kind: opts.kind,
      action: opts.action,
      resource: opts.resource,
      method: "",
      path: this.currentPath(),
      status_code: null,
      duration_ms: opts.duration_ms ?? null,
      request_id: null,
      meta: opts.meta ?? {},
    });
  }

  private flush() {
    if (this.queue.length === 0) return;
    if (!this.flushFn) return;
    const batch = this.queue.splice(0, 100);
    try {
      this.flushFn(batch);
    } catch {
      // On ne ré-enqueue pas pour éviter une boucle infinie
    }
  }

  private installGlobalErrorHandlers() {
    globalThis.addEventListener("error", (ev) => {
      this.recordError({
        message: ev.message,
        stack: ev.error?.stack ?? "",
        source: `${ev.filename}:${ev.lineno}`,
      });
    });
    globalThis.addEventListener("unhandledrejection", (ev) => {
      const msg = ev.reason instanceof Error ? ev.reason.message : String(ev.reason);
      const stack = ev.reason instanceof Error ? ev.reason.stack ?? "" : "";
      this.recordError({ message: msg, stack, source: "unhandledrejection" });
    });
  }
}

/** Singleton global — accessible partout sans contexte React. */
export const tracker = new ObservabilityTracker();
