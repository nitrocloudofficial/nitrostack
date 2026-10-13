/**
 * Gateway Service Interfaces
 *
 * Every service the Secure Data Gateway depends on is defined here as an
 * interface first. This keeps the gateway decoupled from concrete
 * implementations (dependency inversion) and makes each service mockable
 * in isolation for testing.
 */

import type {
  Action,
  AIRequest,
  AIResponse,
  AITaskName,
  AuditEntry,
  AuthenticatedIdentity,
  EncryptedPayload,
  KeyMaterial,
  Permission,
  RateLimitBucket,
  RateLimitDecision,
  ResourceType,
  Role
} from '../types/gateway.types.js';

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export interface IAuthenticationService {
  /** Verifies a JWT and returns the authenticated identity, or throws. */
  verifyJwt(token: string): Promise<AuthenticatedIdentity>;
  /** Verifies an internal service API key and returns the authenticated identity, or throws. */
  verifyApiKey(apiKey: string): Promise<AuthenticatedIdentity>;
  /** Issues a new JWT for a successfully authenticated user (used by login flows). */
  issueJwt(userId: string, role: Role, patientIds?: string[]): Promise<string>;
}

// ---------------------------------------------------------------------------
// Authorization (RBAC)
// ---------------------------------------------------------------------------

export interface IAuthorizationService {
  /** Returns true if `role` is permitted to perform `action` on `resource`. */
  isAllowed(role: Role, resource: ResourceType, action: Action): boolean;
  /** Returns true if the identity owns/can access the specific patient record. */
  canAccessPatient(identity: AuthenticatedIdentity, patientId: string): boolean;
  /** Full permission set for a role — used for introspection/admin tooling. */
  getPermissions(role: Role): Permission[];
}

// ---------------------------------------------------------------------------
// Key Management
// ---------------------------------------------------------------------------

export interface IKeyManagementService {
  /** Recovers/derives the current active master key. Gateway-only. */
  getActiveMasterKey(): Promise<KeyMaterial>;
  /** Recovers a specific historical master key version, for decrypting old records. */
  getMasterKeyByVersion(version: string): Promise<KeyMaterial>;
  /** Current key version identifier. */
  getCurrentKeyVersion(): string;
}

// ---------------------------------------------------------------------------
// Encryption
// ---------------------------------------------------------------------------

export interface IEncryptionService {
  encrypt(plaintext: string): Promise<EncryptedPayload>;
  decrypt(payload: EncryptedPayload): Promise<string>;
  /** Argon2id password/passphrase hashing, used for master-key derivation and credential storage. */
  hashSecret(secret: string, salt?: Buffer): Promise<{ hash: string; salt: string }>;
  verifySecret(secret: string, hash: string, salt?: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Database (the ONLY component the gateway allows to touch storage)
// ---------------------------------------------------------------------------

export interface IDatabaseService {
  getEncryptedRecord<T = unknown>(collection: string, id: string): Promise<T | null>;
  putEncryptedRecord<T = unknown>(collection: string, id: string, record: T): Promise<void>;
  deleteRecord(collection: string, id: string): Promise<void>;
  listRecordIds(collection: string): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// File Service
// ---------------------------------------------------------------------------

export interface IFileService {
  upload(ownerId: string, fileName: string, contentBase64: string, mimeType: string): Promise<{ fileId: string; secureUrl: string }>;
  download(fileId: string, requesterId: string): Promise<{ fileName: string; contentBase64: string; mimeType: string }>;
  generateSecureUrl(fileId: string, expiresInSeconds?: number): Promise<string>;
}

// ---------------------------------------------------------------------------
// User Service
// ---------------------------------------------------------------------------

export interface IUserService {
  getProfileMetadata(userId: string): Promise<Record<string, unknown> | null>;
  updatePreferences(userId: string, preferences: Record<string, unknown>): Promise<void>;
  getSessionInfo(sessionId: string): Promise<Record<string, unknown> | null>;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export interface IAuditService {
  record(entry: AuditEntry): Promise<void>;
}

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

export interface IRateLimiter {
  check(bucket: RateLimitBucket, key: string): Promise<RateLimitDecision>;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface IValidationService {
  validateRequest<T>(schemaName: string, payload: unknown): T;
  validateResponse<T>(schemaName: string, payload: unknown): T;
}

// ---------------------------------------------------------------------------
// AI Agents
// ---------------------------------------------------------------------------

export interface IAIAgent<TInput = Record<string, unknown>, TOutput = Record<string, unknown>> {
  readonly name: string;
  readonly handles: AITaskName[];
  run(input: TInput): Promise<TOutput>;
}

export interface IAIRouter {
  route(request: AIRequest): Promise<AIResponse>;
  /**
   * Accepts any concrete IAIAgent implementation, regardless of its
   * specific (non-Record) input/output shapes. Agents declare precise
   * types for their own internal clarity and testing; the router only
   * needs to know `name`, `handles`, and that `run` is callable — the
   * AI Gateway is responsible for shaping input correctly per task
   * before it ever reaches `route()`.
   */
  register(agent: IAIAgent<any, any>): void;
}
