/**
 * Composition Root
 *
 * The one place in the codebase allowed to `new` up every concrete
 * service and wire them together. Everything downstream (modules, MCP
 * tools) depends only on `SecureDataGateway`, never on the concrete
 * services directly — that's what keeps DatabaseService, EncryptionService,
 * and KeyManagementService private to the gateway.
 *
 * Call `createSecureDataGateway()` once per process and reuse the
 * instance — do not construct a new gateway per request.
 */

import { createAuthenticationServiceFromEnv } from '../services/AuthenticationService.js';
import { AuthorizationService } from '../services/AuthorizationService.js';
import { createKeyManagementServiceFromEnv } from '../services/KeyManagementService.js';
import { EncryptionService } from '../services/EncryptionService.js';
import { createDatabaseServiceFromEnv } from '../services/DatabaseService.js';
import { createFileServiceFromEnv } from '../services/FileService.js';
import { UserService } from '../services/UserService.js';
import { createAuditServiceFromEnv } from '../services/AuditService.js';
import { createRateLimiterFromEnv } from '../services/RateLimiter.js';
import { ValidationService } from '../services/ValidationService.js';

import { MedicineAI } from '../agents/MedicineAI.js';
import { ReportAI } from '../agents/ReportAI.js';
import { EmergencyAI } from '../agents/EmergencyAI.js';

import { AIRouter } from './AIRouter.js';
import { AIGateway } from './AIGateway.js';
import { SecureDataGateway } from './SecureDataGateway.js';

let singleton: SecureDataGateway | null = null;

export function createSecureDataGateway(env: NodeJS.ProcessEnv = process.env): SecureDataGateway {
  // --- Foundational services ---
  const authentication = createAuthenticationServiceFromEnv(env);
  const authorization = new AuthorizationService();
  const validation = new ValidationService();
  const audit = createAuditServiceFromEnv(env);
  const rateLimiter = createRateLimiterFromEnv(env);

  // --- Key management + encryption (gateway-private) ---
  const keyManagement = createKeyManagementServiceFromEnv(env);
  const encryption = new EncryptionService(keyManagement);

  // --- Data-access services, all built on top of EncryptionService, never key material directly ---
  const database = createDatabaseServiceFromEnv(encryption, env);
  const fileService = createFileServiceFromEnv(encryption, env);
  const userService = new UserService(database);

  // --- AI Router + agents ---
  const aiRouter = new AIRouter();
  aiRouter.register(new MedicineAI());
  aiRouter.register(new ReportAI());
  aiRouter.register(new EmergencyAI());
  const aiGateway = new AIGateway(aiRouter);

  return new SecureDataGateway({
    authentication,
    authorization,
    validation,
    audit,
    rateLimiter,
    database,
    encryption,
    fileService,
    userService,
    aiGateway
  });
}

/** Process-wide singleton accessor, so MCP tools share one gateway instance. */
export function getSecureDataGateway(): SecureDataGateway {
  if (!singleton) {
    singleton = createSecureDataGateway();
  }
  return singleton;
}
