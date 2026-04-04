// ─── Auth — aligné sur l’API V1 (JWT : un seul `role`) ─────────────────────

export type Role = "SUPER_ADMIN" | "NATIONAL_ADMIN" | "REGIONAL_SUPERVISOR" | "INSPECTOR" | "HOST";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: Role;
}

export interface ApiErrorBody {
  code?: string;
  message?: string;
  request_id?: string;
}

// ─── Pagination (backend : Page[T]) ────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

// ─── Users — GET /users ────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

// ─── Establishments — GET /establishments ────────────────────────────────

export interface Establishment {
  id: string;
  name: string;
  center_lat: number;
  center_lon: number;
  radius_strict_m: number;
  radius_relaxed_m: number;
  geometry_version: number;
  minesec_code?: string | null;
  establishment_type: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  territory_code?: string | null;
  parent_establishment_id?: string | null;
  designated_host_user_id?: string | null;
  geometry_validated_at?: string | null;
  geometry_validated_by_user_id?: string | null;
}

// ─── Missions — statuts API (minuscules, StrEnum) ─────────────────────────

export type MissionStatusApi =
  | "draft"
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Mission {
  id: string;
  establishment_id: string;
  inspector_id: string;
  window_start: string;
  window_end: string;
  status: MissionStatusApi;
  host_token?: string | null;
  sms_code?: string | null;
  designated_host_user_id?: string | null;
  objective?: string | null;
  plan_reference?: string | null;
  requires_approval: boolean;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by_user_id?: string | null;
  previous_mission_id?: string | null;
}

export interface MissionOutcome {
  id: string;
  mission_id: string;
  summary: string;
  notes?: string | null;
  compliance_level?: string | null;
  created_at: string;
  created_by_user_id: string;
}

// ─── Site Visit — GET /missions/{id}/site-visit ───────────────────────────

export type SiteVisitStatusApi =
  | "scheduled"
  | "checked_in"
  | "pending_host_validation"
  | "copresence_validated"
  | "checked_out"
  | "completed"
  | "cancelled";

export interface SiteVisit {
  id: string;
  mission_id: string;
  status: SiteVisitStatusApi;
  host_validation_mode?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  inspector_lat?: number | null;
  inspector_lon?: number | null;
  host_lat?: number | null;
  host_lon?: number | null;
}

// ─── Exception requests — GET /exception-requests ─────────────────────────

export type ExceptionStatusApi = "new" | "acknowledged" | "resolved" | "escalated";

export interface ExceptionRequest {
  id: string;
  mission_id: string;
  author_user_id: string;
  created_at: string;
  status: ExceptionStatusApi;
  message: string;
  assigned_to_user_id?: string | null;
  internal_comment?: string | null;
  sla_due_at?: string | null;
  attachment_url?: string | null;
}

// ─── Reports — GET /reports/summary ───────────────────────────────────────

export interface ReportSummary {
  missions_total: number;
  missions_by_status: Partial<Record<MissionStatusApi, number>>;
  exception_requests_total: number;
  exception_requests_by_status: Partial<Record<ExceptionStatusApi, number>>;
  establishments_total: number;
  users_total: number;
}

// ─── Audit — GET /audit-logs ─────────────────────────────────────────────

export interface AuditLog {
  id: string;
  created_at: string;
  actor_user_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  payload_json?: string | null;
  request_id?: string | null;
}

// ─── Permissions — alignées sur domain/identity/permission.py ─────────────

export type Permission =
  | "ESTABLISHMENT_CREATE"
  | "ESTABLISHMENT_READ"
  | "ESTABLISHMENT_UPDATE"
  | "MISSION_CREATE"
  | "MISSION_READ"
  | "MISSION_UPDATE"
  | "MISSION_APPROVE"
  | "MISSION_CANCEL"
  | "MISSION_REASSIGN"
  | "MISSION_OUTCOME_WRITE"
  | "VISIT_CHECKIN"
  | "VISIT_HOST_CONFIRM"
  | "VISIT_CHECKOUT"
  | "VISIT_READ"
  | "EXCEPTION_CREATE"
  | "EXCEPTION_READ"
  | "EXCEPTION_UPDATE_STATUS"
  | "EXCEPTION_MANAGE"
  | "USER_LIST"
  | "USER_READ"
  | "USER_UPDATE"
  | "USER_MANAGE_ROLES"
  | "AUTH_REGISTER_USER"
  | "ROLE_READ"
  | "ROLE_MANAGE_PERMISSIONS"
  | "REPORT_READ"
  | "AUDIT_READ";

/** Matrice par défaut — miroir de domain/identity/role_defaults.py (approximation UI). */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "ESTABLISHMENT_CREATE",
    "ESTABLISHMENT_READ",
    "ESTABLISHMENT_UPDATE",
    "MISSION_CREATE",
    "MISSION_READ",
    "MISSION_UPDATE",
    "MISSION_APPROVE",
    "MISSION_CANCEL",
    "MISSION_REASSIGN",
    "MISSION_OUTCOME_WRITE",
    "VISIT_CHECKIN",
    "VISIT_HOST_CONFIRM",
    "VISIT_CHECKOUT",
    "VISIT_READ",
    "EXCEPTION_CREATE",
    "EXCEPTION_READ",
    "EXCEPTION_UPDATE_STATUS",
    "EXCEPTION_MANAGE",
    "USER_LIST",
    "USER_READ",
    "USER_UPDATE",
    "USER_MANAGE_ROLES",
    "AUTH_REGISTER_USER",
    "ROLE_READ",
    "ROLE_MANAGE_PERMISSIONS",
    "REPORT_READ",
    "AUDIT_READ",
  ],
  NATIONAL_ADMIN: [
    "ESTABLISHMENT_CREATE",
    "ESTABLISHMENT_READ",
    "ESTABLISHMENT_UPDATE",
    "MISSION_CREATE",
    "MISSION_READ",
    "MISSION_UPDATE",
    "MISSION_APPROVE",
    "MISSION_CANCEL",
    "MISSION_REASSIGN",
    "MISSION_OUTCOME_WRITE",
    "VISIT_READ",
    "EXCEPTION_READ",
    "EXCEPTION_UPDATE_STATUS",
    "EXCEPTION_MANAGE",
    "USER_LIST",
    "USER_READ",
    "USER_UPDATE",
    "AUTH_REGISTER_USER",
    "ROLE_READ",
    "REPORT_READ",
    "AUDIT_READ",
  ],
  REGIONAL_SUPERVISOR: [
    "ESTABLISHMENT_READ",
    "MISSION_READ",
    "MISSION_UPDATE",
    "MISSION_APPROVE",
    "MISSION_CANCEL",
    "MISSION_REASSIGN",
    "MISSION_OUTCOME_WRITE",
    "VISIT_READ",
    "EXCEPTION_READ",
    "EXCEPTION_UPDATE_STATUS",
    "EXCEPTION_MANAGE",
    "USER_READ",
    "ROLE_READ",
    "REPORT_READ",
  ],
  INSPECTOR: [
    "ESTABLISHMENT_READ",
    "MISSION_READ",
    "MISSION_OUTCOME_WRITE",
    "VISIT_CHECKIN",
    "VISIT_CHECKOUT",
    "VISIT_READ",
    "EXCEPTION_CREATE",
    "EXCEPTION_READ",
    "USER_READ",
    "USER_UPDATE",
  ],
  HOST: [
    "ESTABLISHMENT_READ",
    "MISSION_READ",
    "VISIT_HOST_CONFIRM",
    "VISIT_READ",
    "EXCEPTION_READ",
    "USER_READ",
    "USER_UPDATE",
  ],
};

// ─── POST /establishments — création ───────────────────────────────────────

export interface CreateEstablishmentPayload {
  name: string;
  center_lat: number;
  center_lon: number;
  radius_strict_m: number;
  radius_relaxed_m: number;
  minesec_code?: string | null;
  establishment_type?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  territory_code?: string | null;
  parent_establishment_id?: string | null;
  designated_host_user_id?: string | null;
}

export interface CreateEstablishmentResponse {
  establishment_id: string;
}

// ─── POST /missions — création ─────────────────────────────────────────────

export interface CreateMissionPayload {
  establishment_id: string;
  inspector_id: string;
  window_start: string;
  window_end: string;
  sms_code?: string | null;
  objective?: string | null;
  plan_reference?: string | null;
  requires_approval: boolean;
  designated_host_user_id?: string | null;
}

export interface CreateMissionResponse {
  mission_id: string;
  host_token: string;
  status: MissionStatusApi;
}

// ─── POST /auth/register — création de compte (admin) ─────────────────────

export interface RegisterUserPayload {
  email: string;
  full_name: string;
  phone_number: string;
  password: string;
  role: Role;
}

export interface RegisterUserResponse {
  user_id: string;
}

// ─── GET /health — disponibilité API ───────────────────────────────────────

export interface HealthResponse {
  status: string;
  service: string;
}

// ─── GET /roles — matrice permissions (admin national+) ────────────────────

export type RolesPermissionsMap = Record<string, string[]>;
