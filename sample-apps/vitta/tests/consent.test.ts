/**
 * consent.test.ts — written FIRST, before any gated tool (PLAN.md §5 Phase 1a).
 * The repo history itself proves the consent gate was not bolted on.
 *
 * The gate is the product: pull_bureau / fetch_bank_statements must refuse
 * without a valid, scoped, time-boxed consent token.
 */
import { describe, it, expect } from 'vitest';
import { issueToken, validConsent, verifyToken, refusal, CONSENT_TTL_SECONDS } from '../src/lib/consent.js';

const T0 = 1_752_700_000; // fixed epoch seconds for deterministic expiry tests

describe('consent gate — the signature feature', () => {
  it('(a) no token → CONSENT_REQUIRED', () => {
    const c = validConsent(undefined, 'CREDIT_BUREAU', { now: T0 });
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.code).toBe('CONSENT_REQUIRED');
    expect(refusal('CONSENT_REQUIRED').error).toBe('CONSENT_REQUIRED');
  });

  it('(a2) empty string / garbage → CONSENT_REQUIRED or CONSENT_INVALID', () => {
    expect(validConsent('', 'CREDIT_BUREAU', { now: T0 }).ok).toBe(false);
    expect(validConsent('not-a-token', 'CREDIT_BUREAU', { now: T0 }).ok).toBe(false);
  });

  it('(b) expired token (> 900s old) → CONSENT_EXPIRED', () => {
    const { token } = issueToken({ lead_id: 'L1', version: 'v1', now: T0 });
    const c = validConsent(token, 'CREDIT_BUREAU', { now: T0 + CONSENT_TTL_SECONDS + 1 });
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.code).toBe('CONSENT_EXPIRED');
  });

  it('(c) token without required scope → SCOPE_NOT_GRANTED', () => {
    const { token } = issueToken({ lead_id: 'L1', scopes: ['KYC'], version: 'v1', now: T0 });
    const c = validConsent(token, 'CREDIT_BUREAU', { now: T0 + 10 });
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.code).toBe('SCOPE_NOT_GRANTED');
  });

  it('(d) tampered token → CONSENT_INVALID', () => {
    const { token } = issueToken({ lead_id: 'L1', version: 'v1', now: T0 });
    const [body, mac] = token.split('.');
    // flip the last hex char of the signature
    const flipped = mac.slice(0, -1) + (mac.slice(-1) === 'a' ? 'b' : 'a');
    const c = validConsent(`${body}.${flipped}`, 'CREDIT_BUREAU', { now: T0 + 10 });
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.code).toBe('CONSENT_INVALID');
  });

  it('(d2) tampered payload (re-scoped) is rejected — signature covers payload', () => {
    const { token } = issueToken({ lead_id: 'L1', scopes: ['KYC'], version: 'v1', now: T0 });
    const [, mac] = token.split('.');
    const forgedBody = Buffer.from(
      JSON.stringify({ jti: 'x', lead_id: 'L1', scopes: ['CREDIT_BUREAU'], iat: T0, exp: T0 + 900, version: 'v1' }),
    )
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const c = validConsent(`${forgedBody}.${mac}`, 'CREDIT_BUREAU', { now: T0 + 10 });
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.code).toBe('CONSENT_INVALID');
  });

  it('(e) valid, scoped, unexpired token → passes', () => {
    const { token } = issueToken({ lead_id: 'L1', scopes: ['CREDIT_BUREAU', 'BANK_STATEMENTS'], version: 'v1', now: T0 });
    expect(validConsent(token, 'CREDIT_BUREAU', { now: T0 + 60 }).ok).toBe(true);
    expect(validConsent(token, 'BANK_STATEMENTS', { now: T0 + 60 }).ok).toBe(true);
  });

  it('(f1) token bound to lead — reusing lead-A token for lead-B → CONSENT_LEAD_MISMATCH', () => {
    const { token } = issueToken({ lead_id: 'LEAD-A', version: 'v1', now: T0 });
    // same token, different applicant → must refuse (no cross-applicant data leak)
    const c = validConsent(token, 'CREDIT_BUREAU', { now: T0 + 60, leadId: 'LEAD-B' });
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.code).toBe('CONSENT_LEAD_MISMATCH');
    // correct lead still passes
    expect(validConsent(token, 'CREDIT_BUREAU', { now: T0 + 60, leadId: 'LEAD-A' }).ok).toBe(true);
  });

  it('(f) revoked token → CONSENT_REVOKED', () => {
    const { token, payload } = issueToken({ lead_id: 'L1', version: 'v1', now: T0 });
    const c = validConsent(token, 'CREDIT_BUREAU', { now: T0 + 60, isRevoked: (jti) => jti === payload.jti });
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.code).toBe('CONSENT_REVOKED');
  });

  it('verifyToken round-trips a fresh token', () => {
    const { token, payload } = issueToken({ lead_id: 'LEAD-42', version: 'consent-v3', now: T0 });
    const v = verifyToken(token);
    expect(v.valid).toBe(true);
    expect(v.payload?.lead_id).toBe('LEAD-42');
    expect(v.payload?.jti).toBe(payload.jti);
  });
});
