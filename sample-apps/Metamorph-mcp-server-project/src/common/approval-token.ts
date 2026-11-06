// Approval token: proves "this exact change was previewed" (plan hash + patch hash + stage + expiry).
// The write API key is the authority; the token is deliberately NOT bound to a key id.
// Replay inside the lifetime is accepted on purpose: apply is idempotent on (planHash, patchHash),
// so there is no nonce store and no single-use claim.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const MIN_SECRET_LEN = 32;
const DEFAULT_TTL = 300;
const MAX_TTL = 900;
const MAX_TOKEN_LEN = 2048;
const B64URL = /^[A-Za-z0-9_-]+$/;

export type VerifyResult = { ok: true } | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' | 'mismatch' };

// Object keys sorted recursively, arrays keep order.
function canonicalize(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonicalize);
  if (v !== null && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, canonicalize(o[k])]));
  }
  return v;
}

export function canonicalHash(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(canonicalize(value));
  return createHash('sha256').update(text).digest('hex');
}

function checkSecret(secret: string): void {
  if (typeof secret !== 'string' || secret.length < MIN_SECRET_LEN) {
    throw new Error(`approval token secret must be at least ${MIN_SECRET_LEN} characters`);
  }
}

function sign(secret: string, payloadPart: string): Buffer {
  return createHmac('sha256', secret).update(payloadPart).digest();
}

export function signApprovalToken(
  claim: { planHash: string; patchHash: string; stage: number; ttlSeconds?: number },
  secret: string,
  now: number = Math.floor(Date.now() / 1000)
): string {
  checkSecret(secret);
  const ttl = claim.ttlSeconds ?? DEFAULT_TTL;
  if (!Number.isInteger(ttl) || ttl <= 0 || ttl > MAX_TTL) throw new Error(`ttlSeconds must be an integer from 1 to ${MAX_TTL}`);
  const payload = { v: 1, ph: claim.planHash, xh: claim.patchHash, st: claim.stage, iat: now, exp: now + ttl };
  const part = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${part}.${sign(secret, part).toString('base64url')}`;
}

const malformed: VerifyResult = { ok: false, reason: 'malformed' };

export function verifyApprovalToken(
  token: string,
  expected: { planHash: string; patchHash: string; stage: number },
  secret: string,
  now: number = Math.floor(Date.now() / 1000)
): VerifyResult {
  checkSecret(secret); // configuration error, not bad input
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LEN) return malformed;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts.every((p) => B64URL.test(p))) return malformed;
  const [payloadPart, sigPart] = parts;

  // Signature first: payload fields are not trusted or parsed before this passes.
  const given = Buffer.from(sigPart, 'base64url');
  const want = sign(secret, payloadPart);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return { ok: false, reason: 'bad_signature' };

  let p: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return malformed;
    p = parsed as Record<string, unknown>;
  } catch {
    return malformed;
  }
  if (p.v !== 1 || typeof p.ph !== 'string' || typeof p.xh !== 'string') return malformed;
  if (!Number.isInteger(p.st) || !Number.isInteger(p.iat) || !Number.isInteger(p.exp)) return malformed;

  if (now >= (p.exp as number)) return { ok: false, reason: 'expired' };
  if (p.ph !== expected.planHash || p.xh !== expected.patchHash || p.st !== expected.stage) return { ok: false, reason: 'mismatch' };
  return { ok: true };
}
