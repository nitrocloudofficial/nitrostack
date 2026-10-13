/**
 * Gateway Error Types
 *
 * Typed errors so the Secure Data Gateway can map failures to the correct
 * GatewayErrorCode without string-matching messages.
 */

import { GatewayErrorCode } from '../types/gateway.types.js';

export class GatewayError extends Error {
  public readonly code: GatewayErrorCode;

  constructor(code: GatewayErrorCode, message: string) {
    super(message);
    this.name = 'GatewayError';
    this.code = code;
    Object.setPrototypeOf(this, GatewayError.prototype);
  }
}

export class AuthenticationError extends GatewayError {
  constructor(message = 'Authentication failed') {
    super(GatewayErrorCode.UNAUTHENTICATED, message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends GatewayError {
  constructor(message = 'Not authorized to perform this action') {
    super(GatewayErrorCode.UNAUTHORIZED, message);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends GatewayError {
  constructor(message = 'Request failed validation') {
    super(GatewayErrorCode.INVALID_REQUEST, message);
    this.name = 'ValidationError';
  }
}

export class ResponseValidationError extends GatewayError {
  constructor(message = 'Response failed validation') {
    super(GatewayErrorCode.INVALID_RESPONSE, message);
    this.name = 'ResponseValidationError';
  }
}

export class RateLimitError extends GatewayError {
  constructor(message = 'Rate limit exceeded') {
    super(GatewayErrorCode.RATE_LIMITED, message);
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends GatewayError {
  constructor(message = 'Resource not found') {
    super(GatewayErrorCode.NOT_FOUND, message);
    this.name = 'NotFoundError';
  }
}

/**
 * Strips a caught error down to a safe, non-sensitive summary suitable for
 * audit logs and client responses. Never includes stack traces or raw
 * healthcare payloads.
 */
export function toSafeErrorSummary(err: unknown): string {
  if (err instanceof GatewayError) return `${err.name}: ${err.message}`;
  if (err instanceof Error) return err.name;
  return 'UnknownError';
}
