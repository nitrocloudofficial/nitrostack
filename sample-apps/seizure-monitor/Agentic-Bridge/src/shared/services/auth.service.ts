/**
 * Credential verification for the bridge's remote surface.
 *
 * The architecture calls for API key authentication and JWT validation on every
 * remote endpoint, "ensuring that only the designated Admin Dashboard can alter
 * workflow states or resolve conflicts". Two things follow from that:
 *
 *   - It is an authorisation boundary on *mutating* operations, not a blanket
 *     lock on the server. Reading the knowledge base is not what needs guarding.
 *   - It must be inert until an operator configures a credential. A bridge that
 *     demands a secret before it will run over stdio on a laptop is a bridge
 *     nobody demos. Configure `BRIDGE_ADMIN_API_KEY` or `BRIDGE_JWT_SECRET` and
 *     the boundary switches on everywhere at once.
 *
 * JWT verification is implemented directly on node:crypto rather than pulling in
 * jsonwebtoken: HS256/384/512 is an HMAC over `header.payload` plus a handful of
 * registered-claim checks, and the whole thing is small enough to audit on one
 * screen.
 */
import { Injectable } from '@nitrostack/core';
import * as crypto from 'crypto';

export type AuthMethod = 'api-key' | 'jwt';

export interface Principal {
  /** Who the credential identifies — a key label or the JWT `sub`. */
  subject: string;
  method: AuthMethod;
}

export interface Credentials {
  /** Raw `x-api-key` header or `_meta.apiKey`. */
  apiKey?: string;
  /** Raw `Authorization` header value, with or without the `Bearer ` prefix. */
  authorization?: string;
}

/** Thrown for any credential failure. Carries the 401/403 split. */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

interface JwtHeader {
  alg?: string;
  typ?: string;
}

interface JwtClaims {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  [claim: string]: unknown;
}

const HMAC_ALGORITHMS: Record<string, string> = {
  HS256: 'sha256',
  HS384: 'sha384',
  HS512: 'sha512',
};

/** Clock skew allowance for `exp`/`nbf`, in seconds. */
const LEEWAY_SECONDS = 30;

@Injectable()
export class AuthService {
  private readonly apiKeys: { label: string; value: string }[];
  private readonly jwtSecret: string | null;
  private readonly jwtIssuer: string | null;
  private readonly jwtAudience: string | null;

  constructor() {
    this.apiKeys = AuthService.readApiKeys();
    this.jwtSecret = process.env.BRIDGE_JWT_SECRET?.trim() || null;
    this.jwtIssuer = process.env.BRIDGE_JWT_ISSUER?.trim() || null;
    this.jwtAudience = process.env.BRIDGE_JWT_AUDIENCE?.trim() || null;
  }

  /**
   * `BRIDGE_ADMIN_API_KEY` accepts one key or a comma-separated list, so an
   * operator can rotate by adding the new key before retiring the old one.
   * Entries may be `label:secret` to keep the audit log readable.
   */
  private static readApiKeys(): { label: string; value: string }[] {
    const raw = process.env.BRIDGE_ADMIN_API_KEY?.trim();
    if (!raw) return [];

    return raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf(':');
        // A bare secret containing no colon is the common case.
        if (separator <= 0) return { label: 'admin', value: entry };
        return { label: entry.slice(0, separator), value: entry.slice(separator + 1) };
      })
      .filter((key) => key.value.length > 0);
  }

  /** True once any credential source is configured. Until then the guard is inert. */
  get enabled(): boolean {
    return this.apiKeys.length > 0 || this.jwtSecret !== null;
  }

  /** Human-readable description of what is switched on, for logs and health checks. */
  get description(): string {
    if (!this.enabled) return 'disabled (no BRIDGE_ADMIN_API_KEY or BRIDGE_JWT_SECRET set)';
    const parts: string[] = [];
    if (this.apiKeys.length) parts.push(`${this.apiKeys.length} API key(s)`);
    if (this.jwtSecret) parts.push('HS256/384/512 JWT');
    return parts.join(' + ');
  }

  /**
   * Verify a credential pair. Returns the authenticated principal, or throws an
   * AuthError carrying the status the HTTP layer should send.
   *
   * Missing credentials are 401 (you did not identify yourself); presented but
   * invalid credentials are 403 (you did, and it was not good enough).
   */
  authenticate(credentials: Credentials): Principal {
    if (!this.enabled) {
      return { subject: 'anonymous', method: 'api-key' };
    }

    const bearer = AuthService.stripBearer(credentials.authorization);

    // A JWT can arrive in either slot; try the shape that matches before falling
    // back, so an operator who puts their token in `x-api-key` still gets in.
    if (this.jwtSecret) {
      const candidate = bearer && AuthService.looksLikeJwt(bearer)
        ? bearer
        : credentials.apiKey && AuthService.looksLikeJwt(credentials.apiKey)
          ? credentials.apiKey
          : null;
      if (candidate) {
        const claims = this.verifyJwt(candidate);
        return { subject: claims.sub ?? 'jwt', method: 'jwt' };
      }
    }

    if (this.apiKeys.length) {
      const presented = credentials.apiKey?.trim() || bearer;
      if (presented) {
        const match = this.apiKeys.find((key) => AuthService.timingSafeEqual(key.value, presented));
        if (match) return { subject: match.label, method: 'api-key' };
        throw new AuthError('API key is not recognised.', 403);
      }
    }

    throw new AuthError(
      'This operation mutates bridge state and requires a credential. ' +
        'Send an API key in the `x-api-key` header (or `_meta.apiKey` for stdio clients), ' +
        'or a bearer JWT in `Authorization`.',
      401
    );
  }

  /**
   * Verify an HS-family JWT and return its claims.
   * Rejects `alg: none` and any asymmetric algorithm outright — this server only
   * ever issues and accepts a shared-secret HMAC, so an RS256 token arriving
   * here is an algorithm-confusion attempt, not a configuration mistake.
   */
  verifyJwt(token: string): JwtClaims {
    if (!this.jwtSecret) {
      throw new AuthError('JWT authentication is not configured (set BRIDGE_JWT_SECRET).', 403);
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new AuthError('Malformed JWT: expected three dot-separated segments.', 403);
    }
    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    let header: JwtHeader;
    let claims: JwtClaims;
    try {
      header = JSON.parse(AuthService.base64UrlDecode(encodedHeader).toString('utf8')) as JwtHeader;
      claims = JSON.parse(AuthService.base64UrlDecode(encodedPayload).toString('utf8')) as JwtClaims;
    } catch {
      throw new AuthError('Malformed JWT: header or payload is not valid JSON.', 403);
    }

    const hash = header.alg ? HMAC_ALGORITHMS[header.alg] : undefined;
    if (!hash) {
      throw new AuthError(
        `Unsupported JWT algorithm "${header.alg ?? 'none'}". This server accepts HS256, HS384 and HS512 only.`,
        403
      );
    }

    const expected = crypto
      .createHmac(hash, this.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
    const presented = AuthService.base64UrlDecode(encodedSignature);
    if (
      expected.length !== presented.length ||
      !crypto.timingSafeEqual(expected, presented)
    ) {
      throw new AuthError('JWT signature does not verify.', 403);
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp === 'number' && now > claims.exp + LEEWAY_SECONDS) {
      throw new AuthError('JWT has expired.', 403);
    }
    if (typeof claims.nbf === 'number' && now + LEEWAY_SECONDS < claims.nbf) {
      throw new AuthError('JWT is not valid yet.', 403);
    }
    if (this.jwtIssuer && claims.iss !== this.jwtIssuer) {
      throw new AuthError(`JWT issuer "${claims.iss ?? 'none'}" is not accepted.`, 403);
    }
    if (this.jwtAudience) {
      const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
      if (!audiences.includes(this.jwtAudience)) {
        throw new AuthError(`JWT audience does not include "${this.jwtAudience}".`, 403);
      }
    }

    return claims;
  }

  /**
   * Mint an HS256 token. Present so an operator can issue a dashboard session
   * token from the same secret the server verifies against, rather than reaching
   * for a second tool to produce a credential this server will accept.
   */
  signJwt(claims: JwtClaims, expiresInSeconds = 24 * 60 * 60): string {
    if (!this.jwtSecret) {
      throw new AuthError('Cannot sign a JWT: BRIDGE_JWT_SECRET is not set.', 403);
    }
    const now = Math.floor(Date.now() / 1000);
    const payload: JwtClaims = {
      ...claims,
      iat: now,
      exp: now + expiresInSeconds,
      ...(this.jwtIssuer ? { iss: this.jwtIssuer } : {}),
      ...(this.jwtAudience ? { aud: this.jwtAudience } : {}),
    };

    const encodedHeader = AuthService.base64UrlEncode(
      Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    );
    const encodedPayload = AuthService.base64UrlEncode(Buffer.from(JSON.stringify(payload)));
    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();

    return `${encodedHeader}.${encodedPayload}.${AuthService.base64UrlEncode(signature)}`;
  }

  private static looksLikeJwt(value: string): boolean {
    return value.split('.').length === 3;
  }

  private static stripBearer(authorization?: string): string | undefined {
    const trimmed = authorization?.trim();
    if (!trimmed) return undefined;
    return /^bearer\s+/i.test(trimmed) ? trimmed.replace(/^bearer\s+/i, '').trim() : trimmed;
  }

  /**
   * Constant-time comparison that does not leak the expected length. Hashing both
   * sides first makes every comparison the same width, which `timingSafeEqual`
   * requires anyway.
   */
  private static timingSafeEqual(expected: string, presented: string): boolean {
    const a = crypto.createHash('sha256').update(expected).digest();
    const b = crypto.createHash('sha256').update(presented).digest();
    return crypto.timingSafeEqual(a, b);
  }

  private static base64UrlDecode(value: string): Buffer {
    return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  }

  private static base64UrlEncode(value: Buffer): string {
    return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
