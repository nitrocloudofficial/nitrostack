/**
 * consent.ts — THE SIGNATURE FEATURE.
 *
 * DPDP consent expressed as code: a scoped, time-boxed, tamper-evident token.
 * Data-pull tools (pull_bureau, fetch_bank_statements) MUST refuse without a
 * valid token for the required scope. Enforced INLINE as the first line of each
 * gated handler (NitroStack Guards cannot read tool input — see NITROSTACK_NOTES.md).
 *
 * Pure module: node:crypto only, no NitroStack imports, injectable clock → testable.
 */
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { ConsentPayload, ConsentScope, ConsentFailureCode, ConsentRefusal } from './types.js';

export const CONSENT_TTL_SECONDS = 900; // 15 minutes
export const ALL_SCOPES: ConsentScope[] = ['CREDIT_BUREAU', 'BANK_STATEMENTS', 'KYC'];

/**
 * Per-process random fallback secret. If CONSENT_SECRET is unset, tokens are
 * still internally consistent within THIS running instance (demo never breaks)
 * but CANNOT be forged from the public repo — unlike a hardcoded fallback.
 * Trade-off: tokens don't survive a process restart (fine under a 15-min TTL).
 */
const EPHEMERAL_SECRET = randomBytes(32).toString('hex');
let warnedDevSecret = false;
function secret(): string {
  const s = process.env.CONSENT_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production' && !warnedDevSecret) {
    warnedDevSecret = true;
    console.error(
      '[VITTA SECURITY] CONSENT_SECRET is not set — using an ephemeral per-boot secret. ' +
        'Tokens are unforgeable from the repo but will not survive a restart. ' +
        'Set CONSENT_SECRET in the deployment env for stable tokens.',
    );
  }
  return EPHEMERAL_SECRET;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}
function sign(body: string): string {
  return createHmac('sha256', secret()).update(body).digest('hex');
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Issue a signed consent token. `now` is injectable for deterministic tests. */
export function issueToken(args: {
  lead_id: string;
  scopes?: ConsentScope[];
  version: string;
  ttl?: number;
  now?: number;
}): { token: string; payload: ConsentPayload } {
  const iat = args.now ?? nowSeconds();
  const payload: ConsentPayload = {
    jti: randomUUID(),
    lead_id: args.lead_id,
    scopes: args.scopes && args.scopes.length ? args.scopes : [...ALL_SCOPES],
    iat,
    exp: iat + (args.ttl ?? CONSENT_TTL_SECONDS),
    version: args.version,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return { token: `${body}.${sign(body)}`, payload };
}

export interface VerifyResult {
  valid: boolean;
  code?: ConsentFailureCode;
  payload?: ConsentPayload;
}

/** Verify signature + parse. Does NOT check expiry/scope/revocation. */
export function verifyToken(token: unknown): VerifyResult {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, code: 'CONSENT_REQUIRED' };
  }
  const [body, mac] = token.split('.');
  if (!body || !mac) return { valid: false, code: 'CONSENT_INVALID' };

  const expected = sign(body);
  // constant-time compare; length mismatch → invalid
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, code: 'CONSENT_INVALID' };
  }
  try {
    const payload = JSON.parse(b64urlDecode(body).toString('utf8')) as ConsentPayload;
    if (!payload || typeof payload.exp !== 'number' || !Array.isArray(payload.scopes)) {
      return { valid: false, code: 'CONSENT_INVALID' };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, code: 'CONSENT_INVALID' };
  }
}

export type ConsentCheck = { ok: true; payload: ConsentPayload } | { ok: false; code: ConsentFailureCode };

/**
 * The gate. Returns ok:true only for a signed, unexpired, in-scope, non-revoked token.
 * @param opts.now       injectable clock (epoch seconds)
 * @param opts.isRevoked predicate on jti (store-backed revocation)
 */
export function validConsent(
  token: unknown,
  requiredScope: ConsentScope,
  opts?: { now?: number; isRevoked?: (jti: string) => boolean; leadId?: string },
): ConsentCheck {
  const v = verifyToken(token);
  if (!v.valid || !v.payload) return { ok: false, code: v.code ?? 'CONSENT_INVALID' };

  const now = opts?.now ?? nowSeconds();
  if (now > v.payload.exp) return { ok: false, code: 'CONSENT_EXPIRED' };
  if (opts?.isRevoked?.(v.payload.jti)) return { ok: false, code: 'CONSENT_REVOKED' };
  // Token binding: a consent issued for one applicant must NOT unlock another's data.
  if (opts?.leadId && v.payload.lead_id !== opts.leadId) return { ok: false, code: 'CONSENT_LEAD_MISMATCH' };
  if (!v.payload.scopes.includes(requiredScope)) return { ok: false, code: 'SCOPE_NOT_GRANTED' };
  return { ok: true, payload: v.payload };
}

/** Build the exact refusal payload returned by a gated tool. */
export function refusal(code: ConsentFailureCode): ConsentRefusal {
  const hints: Record<ConsentFailureCode, string> = {
    CONSENT_REQUIRED: 'Call record_consent first and pass the returned consent_token',
    CONSENT_INVALID: 'The consent_token is malformed or tampered — re-run record_consent',
    CONSENT_EXPIRED: 'The consent_token expired (15-min TTL) — re-run record_consent',
    SCOPE_NOT_GRANTED: 'This consent_token does not grant the scope this tool needs',
    CONSENT_REVOKED: 'Consent was revoked — obtain fresh consent via record_consent',
    CONSENT_LEAD_MISMATCH: 'This consent_token was issued for a different application — obtain consent for this lead_id',
  };
  return { error: 'CONSENT_REQUIRED', code, hint: hints[code] };
}

/** Stable content hash of the consent proof (stored on file). */
export function consentHash(input: { lead_id: string; version: string; ts: string; channel: string }): string {
  return createHmac('sha256', secret())
    .update(`${input.lead_id}|${input.version}|${input.ts}|${input.channel}`)
    .digest('hex');
}
