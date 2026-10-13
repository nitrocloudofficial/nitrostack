/**
 * JWT payload interface
 * 
 * This is exported from the SDK for type definitions.
 * The actual JWTGuard implementation should be in your project's guards folder.
 * 
 * @example
 * See templates/typescript-auth/src/guards/jwt.guard.ts for implementation
 */
export interface JWTPayload {
  sub: string;
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

