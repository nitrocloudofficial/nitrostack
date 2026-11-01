import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { canonicalHash, signApprovalToken, verifyApprovalToken } from '../../src/common/approval-token.js';

// All secrets below are synthetic and built at runtime so secret scanners do not flag the repo.
const SECRET = 'test-' + 'a'.repeat(40);
const OTHER_SECRET = 'test-' + 'b'.repeat(40);
const NOW = 1_800_000_000;
const claim = { planHash: 'p'.repeat(64), patchHash: 'x'.repeat(64), stage: 2 };
const expected = { ...claim };

const b64 = (s: string) => Buffer.from(s).toString('base64url');
// Builds a correctly signed token around an arbitrary payload string, to test post-signature checks.
const forge = (payload: string) => {
  const part = b64(payload);
  return `${part}.${createHmac('sha256', SECRET).update(part).digest('base64url')}`;
};

describe('approval token', () => {
  it('round trips', () => {
    const t = signApprovalToken(claim, SECRET, NOW);
    expect(verifyApprovalToken(t, expected, SECRET, NOW)).toEqual({ ok: true });
  });

  it('rejects a tampered payload (SEC-21)', () => {
    const [p, s] = signApprovalToken(claim, SECRET, NOW).split('.');
    const evil = b64(Buffer.from(p, 'base64url').toString().replace('"st":2', '"st":3'));
    expect(verifyApprovalToken(`${evil}.${s}`, { ...expected, stage: 3 }, SECRET, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a tampered signature', () => {
    const [p, s] = signApprovalToken(claim, SECRET, NOW).split('.');
    const bad = (s[0] === 'A' ? 'B' : 'A') + s.slice(1);
    expect(verifyApprovalToken(`${p}.${bad}`, expected, SECRET, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a token signed with another secret', () => {
    const t = signApprovalToken(claim, OTHER_SECRET, NOW);
    expect(verifyApprovalToken(t, expected, SECRET, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects an expired token (SEC-23)', () => {
    const t = signApprovalToken(claim, SECRET, NOW); // default ttl 300
    expect(verifyApprovalToken(t, expected, SECRET, NOW + 300)).toEqual({ ok: false, reason: 'expired' });
    expect(verifyApprovalToken(t, expected, SECRET, NOW + 5000)).toEqual({ ok: false, reason: 'expired' });
  });

  it('accepts a token one second before expiry', () => {
    const t = signApprovalToken(claim, SECRET, NOW);
    expect(verifyApprovalToken(t, expected, SECRET, NOW + 299)).toEqual({ ok: true });
  });

  it('rejects a wrong stage, plan hash or patch hash (SEC-24)', () => {
    const t = signApprovalToken(claim, SECRET, NOW);
    expect(verifyApprovalToken(t, { ...expected, stage: 3 }, SECRET, NOW)).toEqual({ ok: false, reason: 'mismatch' });
    expect(verifyApprovalToken(t, { ...expected, planHash: 'other' }, SECRET, NOW)).toEqual({ ok: false, reason: 'mismatch' });
    expect(verifyApprovalToken(t, { ...expected, patchHash: 'other' }, SECRET, NOW)).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('accepts a replayed token inside its lifetime (SEC-20: replay is harmless because apply is idempotent)', () => {
    const t = signApprovalToken(claim, SECRET, NOW);
    expect(verifyApprovalToken(t, expected, SECRET, NOW + 10)).toEqual({ ok: true });
    expect(verifyApprovalToken(t, expected, SECRET, NOW + 20)).toEqual({ ok: true });
  });

  it('refuses a short secret', () => {
    expect(() => signApprovalToken(claim, 'short', NOW)).toThrow();
    expect(() => verifyApprovalToken('a.b', expected, 'short', NOW)).toThrow();
  });

  it('refuses a ttl above 900 seconds but allows 900', () => {
    expect(() => signApprovalToken({ ...claim, ttlSeconds: 901 }, SECRET, NOW)).toThrow();
    const t = signApprovalToken({ ...claim, ttlSeconds: 900 }, SECRET, NOW);
    expect(verifyApprovalToken(t, expected, SECRET, NOW + 899)).toEqual({ ok: true });
  });

  it('returns malformed (never throws) on bad input', () => {
    const malformed = { ok: false, reason: 'malformed' };
    const inputs = [
      '',
      'onlyonepart',
      'a.b.c',
      'abc$.def',
      'a'.repeat(5000),
      forge('not json'),
      'abc.d+/=',
      forge('{"v":2,"ph":"p","xh":"x","st":2,"iat":1,"exp":9999999999}'),
      forge(JSON.stringify({ v: 1, ph: expected.planHash, xh: expected.patchHash, st: 2.5, iat: NOW, exp: NOW + 10 })),
      forge(JSON.stringify({ v: 1, ph: expected.planHash, xh: expected.patchHash, st: 2, iat: 'now', exp: NOW + 10 })),
      forge('null'),
      forge('[]')
    ];
    for (const t of inputs) expect(verifyApprovalToken(t, expected, SECRET, NOW)).toEqual(malformed);
  });

  it('never contains the secret', () => {
    const t = signApprovalToken(claim, SECRET, NOW);
    expect(t).not.toContain(SECRET);
    expect(Buffer.from(t.split('.')[0], 'base64url').toString()).not.toContain(SECRET);
  });
});

describe('canonicalHash', () => {
  it('is stable across key order, including nested objects', () => {
    expect(canonicalHash({ a: 1, b: { c: 2, d: [1, { x: 1, y: 2 }] } })).toBe(canonicalHash({ b: { d: [1, { y: 2, x: 1 }], c: 2 }, a: 1 }));
  });

  it('differs for different content and array order', () => {
    expect(canonicalHash({ a: 1 })).not.toBe(canonicalHash({ a: 2 }));
    expect(canonicalHash([1, 2])).not.toBe(canonicalHash([2, 1]));
  });

  it('hashes strings as-is', () => {
    expect(canonicalHash('hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});
