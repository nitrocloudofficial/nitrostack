/**
 * ValidationMiddleware
 *
 * Validates the request payload against its registered Zod schema before
 * the gateway routes it anywhere. Keeps malformed/unauthorized-shaped
 * data from ever reaching a service or AI agent.
 */

import type { IValidationService } from '../interfaces/gateway.interfaces.js';

export class ValidationMiddleware {
  constructor(private readonly validation: IValidationService) {}

  validateRequest<T>(schemaName: string, payload: unknown): T {
    return this.validation.validateRequest<T>(schemaName, payload);
  }

  validateResponse<T>(schemaName: string, payload: unknown): T {
    return this.validation.validateResponse<T>(schemaName, payload);
  }
}
