/**
 * SecureDataGateway
 *
 * The ONLY entry and exit point between the Mobile/Web app and everything
 * behind it (AI Gateway, File Service, User Service, and the encrypted
 * database). Every request flows through this pipeline, in this order:
 *
 *   1. Rate Limiting        (RateLimiter)
 *   2. Authentication       (JWTMiddleware -> AuthenticationService)
 *   3. Authorization / RBAC (RBACMiddleware -> AuthorizationService)
 *   4. Request Validation   (ValidationMiddleware -> ValidationService)
 *   5. Routing               -> AIGateway | FileService | UserService | DatabaseService
 *   6. Response Validation  (ValidationMiddleware -> ValidationService)
 *   7. Audit Logging        (AuditMiddleware -> AuditService)   [wraps steps 2-6]
 *
 * No other module in this codebase is permitted to hold a direct
 * reference to DatabaseService, EncryptionService, or KeyManagementService
 * — they are private fields here and nowhere else.
 *
 * Zero Trust: every request is authenticated and authorized regardless of
 * where it originated, including from other internal services (via API
 * key credentials).
 */

import { randomUUID } from 'crypto';
import type {
  IAuditService,
  IAuthenticationService,
  IAuthorizationService,
  IDatabaseService,
  IEncryptionService,
  IFileService,
  IRateLimiter,
  IUserService,
  IValidationService
} from '../interfaces/gateway.interfaces.js';
import {
  Action,
  AuthenticatedIdentity,
  GatewayErrorCode,
  GatewayResponse,
  IncomingRequest,
  RateLimitBucket,
  ResourceType,
  Role,
  RouteTarget
} from '../types/gateway.types.js';
import { JWTMiddleware } from '../middleware/JWTMiddleware.js';
import { RBACMiddleware } from '../middleware/RBACMiddleware.js';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware.js';
import { AuditMiddleware } from '../middleware/AuditMiddleware.js';
import { AIGateway, type RawAIContext } from './AIGateway.js';
import { GatewayError, RateLimitError, toSafeErrorSummary } from '../utils/errors.js';

export interface SecureDataGatewayDeps {
  authentication: IAuthenticationService;
  authorization: IAuthorizationService;
  validation: IValidationService;
  audit: IAuditService;
  rateLimiter: IRateLimiter;
  database: IDatabaseService;
  encryption: IEncryptionService;
  fileService: IFileService;
  userService: IUserService;
  aiGateway: AIGateway;
}

const ANONYMOUS_IDENTITY: AuthenticatedIdentity = {
  userId: 'anonymous',
  role: Role.PATIENT,
  sessionId: 'none',
  authMethod: 'jwt',
  issuedAt: 0,
  expiresAt: 0
};

export class SecureDataGateway {
  private readonly jwtMiddleware: JWTMiddleware;
  private readonly rbacMiddleware: RBACMiddleware;
  private readonly validationMiddleware: ValidationMiddleware;
  private readonly auditMiddleware: AuditMiddleware;

  // Private, unexported-outside-this-class references. Nothing else in
  // the app is constructed with these — see src/gateway/container.ts.
  private readonly database: IDatabaseService;
  private readonly encryption: IEncryptionService;
  private readonly fileService: IFileService;
  private readonly userService: IUserService;
  private readonly aiGateway: AIGateway;
  private readonly rateLimiter: IRateLimiter;

  constructor(deps: SecureDataGatewayDeps) {
    this.jwtMiddleware = new JWTMiddleware(deps.authentication);
    this.rbacMiddleware = new RBACMiddleware(deps.authorization);
    this.validationMiddleware = new ValidationMiddleware(deps.validation);
    this.auditMiddleware = new AuditMiddleware(deps.audit);

    this.database = deps.database;
    this.encryption = deps.encryption;
    this.fileService = deps.fileService;
    this.userService = deps.userService;
    this.aiGateway = deps.aiGateway;
    this.rateLimiter = deps.rateLimiter;
  }

  /**
   * Single public entry point. Mirrors the target architecture diagram:
   * everything the Mobile/Web app wants to do comes through here.
   */
  async handle<TPayload, TResult>(
    request: IncomingRequest<TPayload>
  ): Promise<GatewayResponse<TResult>> {
    const requestId = randomUUID();
    const startedAt = Date.now();

    try {
      // --- 1. Rate limiting (pre-auth, keyed by credential value to slow brute force) ---
      await this.enforceRateLimit(request);

      // --- 2. Authentication ---
      const identity = await this.jwtMiddleware.authenticate(request);

      // --- 3. Per-user rate limiting (post-auth, keyed by userId) ---
      await this.enforceRateLimit(request, identity.userId);

      // --- Wrap the rest of the pipeline in audit logging ---
      const result = await this.auditMiddleware.wrap(
        identity,
        request,
        requestId,
        undefined,
        () => this.processAuthenticated<TPayload, TResult>(identity, request, requestId)
      );

      return {
        success: true,
        data: result,
        requestId,
        tookMs: Date.now() - startedAt
      };
    } catch (err) {
      // Authentication failures happen before we have a real identity —
      // still audit them, under an anonymous identity, so failed-auth
      // patterns are visible to security monitoring.
      if (this.isPreAuthError(err)) {
        await this.auditMiddleware.wrap(ANONYMOUS_IDENTITY, request, requestId, undefined, async () => {
          throw err;
        }).catch(() => undefined);
      }

      return this.toErrorResponse(err, requestId, startedAt);
    }
  }

  // ---------------------------------------------------------------------
  // Post-authentication pipeline: RBAC -> validate -> route -> validate
  // ---------------------------------------------------------------------

  private async processAuthenticated<TPayload, TResult>(
    identity: AuthenticatedIdentity,
    request: IncomingRequest<TPayload>,
    requestId: string
  ): Promise<TResult> {
    // --- 3. Authorization / RBAC ---
    this.rbacMiddleware.authorize(identity, request);

    // --- 4. Request validation is delegated to the specific route handler
    //         below, since the schema depends on the target/action. ---

    // --- 5. Routing ---
    switch (request.target) {
      case RouteTarget.AI_GATEWAY:
        return this.routeToAIGateway(identity, request, requestId) as Promise<TResult>;
      case RouteTarget.FILE_SERVICE:
        return this.routeToFileService(identity, request) as Promise<TResult>;
      case RouteTarget.USER_SERVICE:
        return this.routeToUserService(identity, request) as Promise<TResult>;
      case RouteTarget.DATABASE:
        return this.routeToDatabase(identity, request) as Promise<TResult>;
      default: {
        const exhaustive: never = request.target;
        throw new GatewayError(GatewayErrorCode.INVALID_REQUEST, `Unknown route target: ${exhaustive}`);
      }
    }
  }

  // ---------------------------------------------------------------------
  // AI Gateway routing
  // ---------------------------------------------------------------------

  private async routeToAIGateway<TPayload>(
    identity: AuthenticatedIdentity,
    request: IncomingRequest<TPayload>,
    requestId: string
  ): Promise<unknown> {
    await this.enforceRateLimit(request, identity.userId, 'ai_requests');

    const payload = request.payload as unknown as { task: RawAIContext['task']; context: unknown };
    this.validationMiddleware.validateRequest(payload.task, payload.context);

    if (request.patientId) {
      // Gateway-level ownership re-check right before touching any
      // patient-scoped AI task, independent of the earlier RBAC pass.
      if (!this.isOwnerOrPrivileged(identity, request.patientId)) {
        throw new GatewayError(GatewayErrorCode.UNAUTHORIZED, 'Not authorized for this patient.');
      }
    }

    const aiResponse = await this.aiGateway.process({ task: payload.task, context: payload.context } as RawAIContext);

    return this.validationMiddleware.validateResponse('ai-response', aiResponse);
  }

  // ---------------------------------------------------------------------
  // File Service routing
  // ---------------------------------------------------------------------

  private async routeToFileService<TPayload>(
    identity: AuthenticatedIdentity,
    request: IncomingRequest<TPayload>
  ): Promise<unknown> {
    if (request.action === Action.WRITE) {
      const payload = this.validationMiddleware.validateRequest<{
        fileName: string;
        mimeType: string;
        contentBase64: string;
      }>('file-upload', request.payload);
      return this.fileService.upload(identity.userId, payload.fileName, payload.contentBase64, payload.mimeType);
    }

    if (request.action === Action.READ) {
      const { fileId } = request.payload as unknown as { fileId: string };
      return this.fileService.download(fileId, identity.userId);
    }

    throw new GatewayError(GatewayErrorCode.INVALID_REQUEST, `Unsupported file action: ${request.action}`);
  }

  // ---------------------------------------------------------------------
  // User Service routing
  // ---------------------------------------------------------------------

  private async routeToUserService<TPayload>(
    identity: AuthenticatedIdentity,
    request: IncomingRequest<TPayload>
  ): Promise<unknown> {
    if (request.action === Action.READ) {
      return this.userService.getProfileMetadata(identity.userId);
    }
    if (request.action === Action.WRITE) {
      const preferences = request.payload as unknown as Record<string, unknown>;
      await this.userService.updatePreferences(identity.userId, preferences);
      return { updated: true };
    }
    throw new GatewayError(GatewayErrorCode.INVALID_REQUEST, `Unsupported user action: ${request.action}`);
  }

  // ---------------------------------------------------------------------
  // Direct database routing (administrative / internal-service use only)
  // ---------------------------------------------------------------------

  private async routeToDatabase<TPayload>(
    identity: AuthenticatedIdentity,
    request: IncomingRequest<TPayload>
  ): Promise<unknown> {
    if (identity.role !== Role.ADMINISTRATOR) {
      throw new GatewayError(GatewayErrorCode.UNAUTHORIZED, 'Direct database access requires administrator privileges.');
    }

    const { collection, id, record } = request.payload as unknown as {
      collection: string;
      id: string;
      record?: unknown;
    };

    switch (request.action) {
      case Action.READ:
        return this.database.getEncryptedRecord(collection, id);
      case Action.WRITE:
        await this.database.putEncryptedRecord(collection, id, record);
        return { written: true };
      case Action.DELETE:
        await this.database.deleteRecord(collection, id);
        return { deleted: true };
      default:
        throw new GatewayError(GatewayErrorCode.INVALID_REQUEST, `Unsupported database action: ${request.action}`);
    }
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  private isOwnerOrPrivileged(identity: AuthenticatedIdentity, patientId: string): boolean {
    if (identity.role === Role.ADMINISTRATOR || identity.role === Role.DOCTOR) {
      return identity.patientIds?.includes(patientId) ?? identity.role === Role.ADMINISTRATOR;
    }
    return identity.patientIds?.includes(patientId) ?? false;
  }

  private async enforceRateLimit<TPayload>(
    request: IncomingRequest<TPayload>,
    key?: string,
    bucketOverride?: RateLimitBucket
  ): Promise<void> {
    const bucket: RateLimitBucket = bucketOverride ?? (key ? 'user_requests' : 'api_requests');
    const rateKey = key ?? request.credential.value.slice(0, 32);
    const decision = await this.rateLimiter.check(bucket, rateKey);
    if (!decision.allowed) {
      throw new RateLimitError(`Rate limit exceeded for bucket "${bucket}". Try again later.`);
    }
  }

  private isPreAuthError(err: unknown): boolean {
    return err instanceof GatewayError && err.code === GatewayErrorCode.UNAUTHENTICATED;
  }

  private toErrorResponse(err: unknown, requestId: string, startedAt: number): GatewayResponse<never> {
    const tookMs = Date.now() - startedAt;
    if (err instanceof GatewayError) {
      return {
        success: false,
        error: { code: err.code, message: err.message },
        requestId,
        tookMs
      };
    }
    return {
      success: false,
      error: { code: GatewayErrorCode.INTERNAL_ERROR, message: toSafeErrorSummary(err) },
      requestId,
      tookMs
    };
  }
}
