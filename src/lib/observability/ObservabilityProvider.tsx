/**
 * ObservabilityProvider
 * ---------------------
 * - Injecte la fonction d'envoi dans le tracker singleton.
 * - Suit les changements de route (navigation tracking).
 * - Envoie les events en batch vers le backend toutes les 5 s.
 * - Expose le contexte pour le dashboard (liste locale + stats).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { tracker } from "./tracker";
import type { ObservabilityEvent } from "./types";

interface ObsCtx {
  /** Retourne les derniers événements du buffer local (côté client). */
  getLocalEvents: (limit?: number) => ObservabilityEvent[];
}

const ObsContext = createContext<ObsCtx>({
  getLocalEvents: () => [],
});

export function useObservability() {
  return useContext(ObsContext);
}

export function ObservabilityProvider({ children }: Readonly<{ children: ReactNode }>) {
  const location = useLocation();
  const prevPath = useRef<string>(location.pathname);

  // ── Suivi de navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const from = prevPath.current;
    const to = location.pathname;
    if (from !== to) {
      tracker.recordNavigation({ from, to });
      prevPath.current = to;
    }
  }, [location.pathname]);

  // ── Envoi batch vers le backend ──────────────────────────────────────────
  const flush = useCallback((events: ObservabilityEvent[]) => {
    if (events.length === 0) return;
    // Batch : max 100 events / appel (rate limit côté backend)
    const payload = events.slice(0, 100).map((e) => ({
      kind: e.kind,
      action: e.action,
      resource: e.resource,
      path: e.path,
      method: e.method,
      status_code: e.status_code,
      duration_ms: e.duration_ms,
      request_id: e.request_id,
      meta: e.meta,
      client_ts: e.ts,
    }));
    // Fire-and-forget : on ne bloque pas sur les erreurs télémétrie
    api.post("/telemetry/events", payload).catch(() => {
      // Silencieux : l'observabilité ne doit pas perturber l'app
    });
  }, []);

  useEffect(() => {
    tracker.setFlushFn(flush);
    return () => tracker.setFlushFn(() => {});
  }, [flush]);

  const ctx: ObsCtx = useMemo(
    () => ({ getLocalEvents: (limit = 200) => tracker.getLocalEvents(limit) }),
    [],
  );

  return <ObsContext.Provider value={ctx}>{children}</ObsContext.Provider>;
}
