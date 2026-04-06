/** Types partagés pour le système d'observabilité SIGIS. */

export type EventKind = "http" | "ui" | "nav" | "error" | "perf";

export interface ObservabilityEvent {
  /** Identifiant (UUID côté client ; serveur inclut un id stable depuis le buffer). */
  id?: string;
  /** Horodatage précis (performance.now() → Date ISO). */
  ts: string;
  /** Catégorie de l'événement. */
  kind: EventKind;
  /** Action métier : "click", "submit", "navigate", "api_call", "js_error", … */
  action: string;
  /** Ressource concernée : endpoint, nom de page, composant, … */
  resource: string;
  /** Méthode HTTP (vide pour les événements non-HTTP). */
  method: string;
  /** Chemin HTTP ou chemin de page (sans query string). */
  path: string;
  /** Code HTTP de la réponse (null pour les événements non-HTTP). */
  status_code: number | null;
  /** Durée en millisecondes (sous-milliseconde possible via performance.now). */
  duration_ms: number | null;
  /** X-Request-ID renvoyé par le backend. */
  request_id: string | null;
  /** Métadonnées libres (ex : {component: "CreateEstablishment", field: "name"}). */
  meta: Record<string, unknown>;
  /** Présents sur les événements issus du buffer serveur. */
  user_id?: string | null;
  client_ip?: string;
  user_agent?: string;
  action?: string;
}

export interface TelemetryStats {
  total_requests: number;
  error_rate_pct: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  buffer_size: number;
  frontend_events: number;
}

export interface TelemetryListResponse {
  total: number;
  items: ObservabilityEvent[];
}
