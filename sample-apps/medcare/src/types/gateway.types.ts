/**
 * Gateway Types — Secure Data Gateway Architecture
 *
 * Central type definitions for authentication, authorization, routing,
 * encryption, and auditing across the Secure Data Gateway, AI Gateway,
 * and all downstream services.
 *
 * Single source of truth — do NOT redeclare these elsewhere.
 */

// ---------------------------------------------------------------------------
// Roles & Permissions (RBAC)
// ---------------------------------------------------------------------------

export enum Role {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  CAREGIVER = 'caregiver',
  PHARMACIST = 'pharmacist',
  ADMINISTRATOR = 'administrator'
}

/** Actions that can be performed on a resource. */
export enum Action {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  VERIFY = 'verify',
  MANAGE = 'manage'
}

/** Resource categories protected by RBAC. */
export enum ResourceType {
  OWN_REPORTS = 'own_reports',
  ASSIGNED_PATIENTS = 'assigned_patients',
  ANY_PATIENT = 'any_patient',
  MEDICATION = 'medication',
  FILE = 'file',
  USER_PROFILE = 'user_profile',
  PLATFORM = 'platform',
  AI_TASK = 'ai_task'
}

/**
 * A single RBAC permission grant: role X may perform action Y on resource Z.
 */
export interface Permission {
  resource: ResourceType;
  actions: Action[];
}

// ---------------------------------------------------------------------------
// Identity & Session
// ---------------------------------------------------------------------------

export interface AuthenticatedIdentity {
  userId: string;
  role: Role;
  /** Present when the caller is a patient/caregiver scoped to specific patients. */
  patientIds?: string[];
  sessionId: string;
  authMethod: 'jwt' | 'api_key';
  issuedAt: number;
  expiresAt: number;
}

export interface SessionRecord {
  sessionId: string;
  userId: string;
  role: Role;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
  revoked: boolean;
}

// ---------------------------------------------------------------------------
// Gateway Request / Response Envelope
// ---------------------------------------------------------------------------

/** Which downstream domain a request should be routed to. */
export enum RouteTarget {
  AI_GATEWAY = 'ai_gateway',
  FILE_SERVICE = 'file_service',
  USER_SERVICE = 'user_service',
  DATABASE = 'database'
}

export interface IncomingRequest<TPayload = unknown> {
  /** Raw bearer token or API key presented by the caller. */
  credential: {
    type: 'jwt' | 'api_key';
    value: string;
  };
  target: RouteTarget;
  resource: ResourceType;
  action: Action;
  /** Operation-specific payload (e.g. AI task input, file bytes, user query). */
  payload: TPayload;
  /** Optional patient the request pertains to, used for ownership checks. */
  patientId?: string;
  /** Client metadata for auditing/rate limiting — never trusted for authz decisions. */
  clientMeta?: {
    ip?: string;
    userAgent?: string;
  };
}

export interface GatewayResponse<TResult = unknown> {
  success: boolean;
  data?: TResult;
  error?: {
    code: GatewayErrorCode;
    message: string;
  };
  requestId: string;
  tookMs: number;
}

export enum GatewayErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  RATE_LIMITED = 'RATE_LIMITED',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// ---------------------------------------------------------------------------
// AI Gateway / AI Router
// ---------------------------------------------------------------------------

/** Names of supported AI task types. Extend without touching existing code. */
export type AITaskName =
  | 'medicine-analysis'
  | 'report-summary'
  | 'emergency-analysis'
  | 'drug-origin';

export interface AIRequest<TInput = Record<string, unknown>> {
  task: AITaskName;
  /** Minimal, sanitized data only — never raw PII. */
  input: TInput;
  requestId: string;
}

export interface AIResponse<TOutput = Record<string, unknown>> {
  task: AITaskName;
  output: TOutput;
  agent: string;
  tookMs: number;
}

// ---------------------------------------------------------------------------
// Encryption
// ---------------------------------------------------------------------------

export interface EncryptedPayload {
  /** Base64 ciphertext. */
  ciphertext: string;
  /** Base64 AES-GCM nonce (IV). */
  nonce: string;
  /** Base64 AES-GCM authentication tag. */
  authTag: string;
  /** Base64 random salt used to derive the data key from the master key. */
  salt: string;
  /** Key derivation + cipher versioning, for future rotation. */
  keyVersion: string;
  algorithm: 'AES-256-GCM';
}

export interface KeyMaterial {
  key: Buffer;
  version: string;
}

// ---------------------------------------------------------------------------
// Audit Logging
// ---------------------------------------------------------------------------

export interface AuditEntry {
  timestamp: string;
  userId: string;
  role: Role;
  service: RouteTarget;
  aiAgent?: string;
  action: Action;
  resource: ResourceType;
  requestId: string;
  executionTimeMs: number;
  status: 'success' | 'failure';
  /** Never decrypted healthcare content — only a safe error summary. */
  errorSummary?: string;
}

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetAtMs: number;
}

export type RateLimitBucket =
  | 'user_requests'
  | 'api_requests'
  | 'ai_requests'
  | 'auth_attempts';
