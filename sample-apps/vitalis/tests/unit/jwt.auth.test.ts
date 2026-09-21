import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { env } from '../../src/config/env.js';
import { signJwt, verifyJwt } from '../../src/gateway/jwt.utils.js';

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value))
    .toString('base64url')
    .replace(/=/g, '');
}

function makeToken(
  payload: Record<string, unknown>,
  secret: string,
  header: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' },
): string {
  const encodedHeader = encode(header);
  const encodedPayload = encode(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')
    .replace(/=/g, '');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

describe('JWT Auth Utilities (S1)', () => {
  const secret = 'unit-test-jwt-secret-which-is-long-enough';

  it('should sign and verify a valid JWT token', () => {
    const token = signJwt({ sub: 'user_123', scopes: ['triage:read', 'fhir:read'] }, 3600, secret);
    expect(token).toBeTypeOf('string');
    expect(token.split('.').length).toBe(3);

    const payload = verifyJwt(token, secret);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('user_123');
    expect(payload?.scopes).toEqual(['triage:read', 'fhir:read']);
  });

  it('should reject tampered JWT signatures', () => {
    const token = signJwt({ sub: 'user_123', scopes: ['triage:read'] }, 3600, secret);
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.invalid_signature`;

    const payload = verifyJwt(tampered, secret);
    expect(payload).toBeNull();
  });

  it('should reject expired JWT tokens', () => {
    const expiredToken = signJwt({ sub: 'user_expired', scopes: ['read'] }, -10, secret);
    const payload = verifyJwt(expiredToken, secret);
    expect(payload).toBeNull();
  });

  it('should reject a token with an unexpected signing algorithm', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeToken(
      { sub: 'user_123', scopes: ['triage:read'], iat: now, exp: now + 3600 },
      secret,
      { alg: 'none', typ: 'JWT' },
    );

    expect(verifyJwt(token, secret)).toBeNull();
  });

  it('should reject malformed payloads and missing expiry', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeToken({ sub: 'user_123', scopes: ['triage:read'], iat: now }, secret);

    expect(verifyJwt(token, secret)).toBeNull();
  });

  it('should reject invalid subjects and non-string scopes', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeToken(
      { sub: '', scopes: ['triage:read', 42], iat: now, exp: now + 3600 },
      secret,
    );

    expect(verifyJwt(token, secret)).toBeNull();
  });

  it('validates configured issuer and audience claims', () => {
    const previousIssuer = env.JWT_ISSUER;
    const previousAudience = env.JWT_AUDIENCE;
    const now = Math.floor(Date.now() / 1000);

    (env as any).JWT_ISSUER = 'vitalis-test-issuer';
    (env as any).JWT_AUDIENCE = 'vitalis-test-audience';

    try {
      const validToken = makeToken(
        {
          sub: 'user_123',
          scopes: ['triage:read'],
          iss: 'vitalis-test-issuer',
          aud: 'vitalis-test-audience',
          iat: now,
          exp: now + 3600,
        },
        secret,
      );
      const wrongIssuer = makeToken(
        {
          sub: 'user_123',
          scopes: ['triage:read'],
          iss: 'other-issuer',
          aud: 'vitalis-test-audience',
          iat: now,
          exp: now + 3600,
        },
        secret,
      );
      const wrongAudience = makeToken(
        {
          sub: 'user_123',
          scopes: ['triage:read'],
          iss: 'vitalis-test-issuer',
          aud: 'other-audience',
          iat: now,
          exp: now + 3600,
        },
        secret,
      );

      expect(verifyJwt(validToken, secret)?.sub).toBe('user_123');
      expect(verifyJwt(wrongIssuer, secret)).toBeNull();
      expect(verifyJwt(wrongAudience, secret)).toBeNull();
    } finally {
      (env as any).JWT_ISSUER = previousIssuer;
      (env as any).JWT_AUDIENCE = previousAudience;
    }
  });
});
