import * as crypto from 'crypto';

/**
 * Password Hashing and Token Utilities for Clinical Copilot
 *
 * Uses Node.js standard crypto module (PBKDF2 with SHA-512) for secure password hashing
 * and signed session token generation without external native dependencies.
 */

/**
 * Hashes a plaintext password with PBKDF2 using SHA-512 and 10,000 iterations.
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const selectedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, selectedSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: selectedSalt };
}

/**
 * Verifies a plaintext password against a stored PBKDF2 hash and salt.
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(candidate.hash, 'hex'), Buffer.from(hash, 'hex'));
}

/**
 * Generates a signed session token containing user and patient payload.
 */
export function generateSessionToken(payload: { userId: string; patientId: string; email: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(
    JSON.stringify({
      sub: payload.userId,
      patientId: payload.patientId,
      email: payload.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days expiration
    })
  ).toString('base64url');

  const secret = process.env.JWT_SECRET || 'clinical_copilot_mcp_secret_key_2026';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${claims}`)
    .digest('base64url');

  return `${header}.${claims}.${signature}`;
}
