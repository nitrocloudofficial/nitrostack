/**
 * AuthenticationService
 *
 * Handles all identity verification for the Secure Data Gateway:
 *   - JWT tokens (end users: patients, doctors, caregivers, pharmacists, admins)
 *   - API keys (internal service-to-service calls)
 *   - Extension point for future OAuth support (see `verifyOAuthToken` stub)
 *
 * This service ONLY establishes identity. It never makes authorization
 * decisions — that is AuthorizationService's job.
 */

import jwt, { type JwtPayload } from 'jsonwebtoken';
import { timingSafeEqual, createHash } from 'crypto';
import type { IAuthenticationService } from '../interfaces/gateway.interfaces.js';
import { AuthenticatedIdentity, Role } from '../types/gateway.types.js';
import { AuthenticationError } from '../utils/errors.js';
import { generateSessionId } from '../utils/idGenerator.js';

interface JwtClaims extends JwtPayload {
  sub: string; // userId
  role: Role;
  patientIds?: string[];
  sid: string; // sessionId
}

interface AuthenticationConfig {
  jwtSecret: string;
  jwtExpiresInSeconds: number;
  /** Map of internal service name -> SHA-256 hash of its API key (never store raw keys). */
  apiKeyHashes: Map<string, string>;
}

export class AuthenticationService implements IAuthenticationService {
  constructor(private readonly config: AuthenticationConfig) {
    if (!config.jwtSecret || config.jwtSecret.length < 16) {
      throw new Error('AuthenticationService: JWT_SECRET must be set and at least 16 characters.');
    }
  }

  async issueJwt(userId: string, role: Role, patientIds?: string[]): Promise<string> {
    const sessionId = generateSessionId();
    const claims: JwtClaims = { sub: userId, role, patientIds, sid: sessionId };
    return jwt.sign(claims, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresInSeconds,
      algorithm: 'HS256'
    });
  }

  async verifyJwt(token: string): Promise<AuthenticatedIdentity> {
    let decoded: JwtClaims;
    try {
      decoded = jwt.verify(token, this.config.jwtSecret, { algorithms: ['HS256'] }) as JwtClaims;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Session token has expired. Please sign in again.');
      }
      throw new AuthenticationError('Invalid session token.');
    }

    if (!decoded.sub || !decoded.role || !decoded.sid) {
      throw new AuthenticationError('Malformed session token.');
    }

    if (!Object.values(Role).includes(decoded.role)) {
      throw new AuthenticationError('Session token references an unknown role.');
    }

    return {
      userId: decoded.sub,
      role: decoded.role,
      patientIds: decoded.patientIds,
      sessionId: decoded.sid,
      authMethod: 'jwt',
      issuedAt: (decoded.iat ?? 0) * 1000,
      expiresAt: (decoded.exp ?? 0) * 1000
    };
  }

  async verifyApiKey(apiKey: string): Promise<AuthenticatedIdentity> {
    if (!apiKey) {
      throw new AuthenticationError('Missing API key.');
    }

    const presentedHash = this.hashApiKey(apiKey);
    let matchedService: string | null = null;

    // Constant-time comparison against every registered key to avoid
    // leaking which prefix matched via timing side channels.
    for (const [serviceName, storedHash] of this.config.apiKeyHashes.entries()) {
      if (this.safeEquals(presentedHash, storedHash)) {
        matchedService = serviceName;
      }
    }

    if (!matchedService) {
      throw new AuthenticationError('Invalid API key.');
    }

    const now = Date.now();
    return {
      userId: `service:${matchedService}`,
      role: Role.ADMINISTRATOR, // internal services act with platform-level trust; RBAC still scopes actions
      sessionId: generateSessionId(),
      authMethod: 'api_key',
      issuedAt: now,
      expiresAt: now + this.config.jwtExpiresInSeconds * 1000
    };
  }

  /** Placeholder extension point for future OAuth support (per spec: "Future OAuth Support"). */
  async verifyOAuthToken(_accessToken: string, _provider: string): Promise<AuthenticatedIdentity> {
    throw new AuthenticationError('OAuth authentication is not yet enabled on this gateway.');
  }

  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey, 'utf-8').digest('hex');
  }

  private safeEquals(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}

/**
 * Builds an AuthenticationService from process.env.
 * INTERNAL_API_KEYS format: "service-name:raw-key,service-name2:raw-key2"
 */
export function createAuthenticationServiceFromEnv(env: NodeJS.ProcessEnv): AuthenticationService {
  const apiKeyHashes = new Map<string, string>();
  const raw = env.INTERNAL_API_KEYS ?? '';

  for (const pair of raw.split(',').map(s => s.trim()).filter(Boolean)) {
    const [serviceName, key] = pair.split(':');
    if (!serviceName || !key) continue;
    apiKeyHashes.set(serviceName, createHash('sha256').update(key, 'utf-8').digest('hex'));
  }

  return new AuthenticationService({
    jwtSecret: env.JWT_SECRET ?? '',
    jwtExpiresInSeconds: Number(env.JWT_EXPIRES_IN_SECONDS ?? 3600),
    apiKeyHashes
  });
}
