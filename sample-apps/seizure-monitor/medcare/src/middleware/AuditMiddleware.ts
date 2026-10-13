/**
 * AuditMiddleware
 *
 * Wraps a gateway operation and records exactly one AuditEntry per
 * request — success or failure, always with execution time — without
 * ever including decrypted healthcare content.
 */

import type { IAuditService } from '../interfaces/gateway.interfaces.js';
import type { AuthenticatedIdentity, IncomingRequest } from '../types/gateway.types.js';
import { toSafeErrorSummary } from '../utils/errors.js';

export class AuditMiddleware {
  constructor(private readonly audit: IAuditService) {}

  async wrap<T>(
    identity: AuthenticatedIdentity,
    request: IncomingRequest,
    requestId: string,
    aiAgent: string | undefined,
    fn: () => Promise<T>
  ): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = await fn();
      await this.audit.record({
        timestamp: new Date().toISOString(),
        userId: identity.userId,
        role: identity.role,
        service: request.target,
        aiAgent,
        action: request.action,
        resource: request.resource,
        requestId,
        executionTimeMs: Date.now() - startedAt,
        status: 'success'
      });
      return result;
    } catch (err) {
      await this.audit.record({
        timestamp: new Date().toISOString(),
        userId: identity.userId,
        role: identity.role,
        service: request.target,
        aiAgent,
        action: request.action,
        resource: request.resource,
        requestId,
        executionTimeMs: Date.now() - startedAt,
        status: 'failure',
        errorSummary: toSafeErrorSummary(err)
      });
      throw err;
    }
  }
}
