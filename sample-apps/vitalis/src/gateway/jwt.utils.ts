/**
 * Native HS256 JWT Utility — Signs and verifies JWT tokens using node:crypto.
 */
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export interface JwtPayload {
  sub: string;
  scopes: string[];
  iat: number;
  exp: number;
  iss?: string;
  aud?: string | string[];
}

function base64UrlEncode(str: string | Buffer): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function decodeJsonSegment(segment: string): unknown {
  // Buffer.from(..., 'base64') is deliberately permissive, so reject
  // non-base64url input before decoding to avoid accepting malformed tokens.
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) return null;
  try {
    return JSON.parse(base64UrlDecode(segment));
  } catch {
    return null;
  }
}

function configuredSecret(override?: string): string {
  const configured = override ?? env.JWT_SECRET;
  const secret = typeof configured === 'string' ? configured.trim() : '';
  if (!secret || Buffer.byteLength(secret, 'utf8') < 16) {
    throw new Error('JWT_SECRET with at least 16 bytes is required before signing or verifying JWTs.');
  }
  return secret;
}

export function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  expiresInSeconds: number = 3600,
  secretOverride?: string,
): string {
  const secret = configuredSecret(secretOverride);
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload: JwtPayload = {
    ...payload,
    ...(env.JWT_ISSUER ? { iss: env.JWT_ISSUER } : {}),
    ...(env.JWT_AUDIENCE ? { aud: env.JWT_AUDIENCE } : {}),
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();

  const encodedSignature = base64UrlEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export function verifyJwt(token: string, secretOverride?: string): JwtPayload | null {
  try {
    const secret = configuredSecret(secretOverride);
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    if (!/^[A-Za-z0-9_-]+$/.test(encodedSignature)) return null;
    const header = decodeJsonSegment(encodedHeader) as { alg?: string; typ?: string } | null;
    if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') return null;

    const expectedSignature = base64UrlEncode(
      crypto
        .createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest(),
    );
    const expectedBytes = Buffer.from(expectedSignature);
    const actualBytes = Buffer.from(encodedSignature);
    if (
      expectedBytes.length !== actualBytes.length ||
      !crypto.timingSafeEqual(expectedBytes, actualBytes)
    ) {
      return null;
    }

    const payload = decodeJsonSegment(encodedPayload) as Partial<JwtPayload> | null;
    const issuedAt = payload?.iat;
    const expiresAt = payload?.exp;
    if (
      !payload ||
      typeof payload.sub !== 'string' ||
      payload.sub.trim().length === 0 ||
      !Array.isArray(payload.scopes) ||
      payload.scopes.some((scope) => typeof scope !== 'string' || scope.trim().length === 0) ||
      typeof issuedAt !== 'number' ||
      typeof expiresAt !== 'number' ||
      !Number.isSafeInteger(issuedAt) ||
      !Number.isSafeInteger(expiresAt) ||
      issuedAt <= 0 ||
      expiresAt <= issuedAt ||
      (payload.iss !== undefined && typeof payload.iss !== 'string') ||
      (payload.aud !== undefined &&
        typeof payload.aud !== 'string' &&
        (!Array.isArray(payload.aud) || payload.aud.some((audience) => typeof audience !== 'string')))
    ) {
      return null;
    }

    if (env.JWT_ISSUER && payload.iss !== env.JWT_ISSUER) return null;

    if (env.JWT_AUDIENCE) {
      const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (!audiences.includes(env.JWT_AUDIENCE)) return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now >= expiresAt) return null;

    return {
      ...payload,
      sub: payload.sub.trim(),
      scopes: payload.scopes.map((scope) => scope.trim()),
    } as JwtPayload;
  } catch {
    return null;
  }
}
