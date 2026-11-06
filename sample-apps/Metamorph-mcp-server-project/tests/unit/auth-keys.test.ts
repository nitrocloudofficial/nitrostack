import { describe, it, expect } from 'vitest';
import { authorize, extractKey, parseKeyTable, sha256 } from '../../src/common/auth/keys.js';

// Synthetic keys only.
const READ = 'read-key-for-tests-0001';
const PLAN = 'plan-key-for-tests-0002';
const WRITE = 'write-key-for-tests-0003';
const hex = (k: string) => sha256(k).toString('hex');
const env = {
  METAMORPH_KEY_JUDGE: `plan:${hex(PLAN)}`,
  METAMORPH_KEY_OWNER: `write:${hex(WRITE)}`,
  METAMORPH_KEY_CI: `read:${hex(READ)}`,
  METAMORPH_KEY_BROKEN: 'write:nothex',
  METAMORPH_KEY_BADSCOPE: `admin:${hex(WRITE)}`,
  UNRELATED: 'x'
};
const table = parseKeyTable(env);

describe('parseKeyTable', () => {
  it('keeps valid entries and skips malformed ones', () => {
    expect(table.map((t) => t.label).sort()).toEqual(['ci', 'judge', 'owner']);
  });
  it('never stores the plain key', () => {
    expect(JSON.stringify(table)).not.toContain(WRITE);
  });
});

describe('extractKey', () => {
  it('reads Bearer and x-api-key', () => {
    expect(extractKey({ authorization: `Bearer ${WRITE}` })).toBe(WRITE);
    expect(extractKey({ 'x-api-key': WRITE })).toBe(WRITE);
  });
  it('ignores missing, short or non-string values', () => {
    expect(extractKey(undefined)).toBeUndefined();
    expect(extractKey({ authorization: 'Bearer x' })).toBeUndefined();
    expect(extractKey({ 'x-api-key': 12345678 })).toBeUndefined();
    expect(extractKey({ 'x-api-key': 'a'.repeat(600) })).toBeUndefined();
  });
});

describe('authorize', () => {
  it('401 when the key is missing', () => {
    const r = authorize(undefined, 'read', table);
    expect(r).toMatchObject({ ok: false, status: 401 });
  });
  it('401 when the key is unknown', () => {
    expect(authorize('not-a-real-key-123', 'read', table)).toMatchObject({ ok: false, status: 401 });
  });
  it('scopes are cumulative: write includes plan includes read', () => {
    expect(authorize(WRITE, 'read', table).ok).toBe(true);
    expect(authorize(WRITE, 'plan', table).ok).toBe(true);
    expect(authorize(WRITE, 'write', table).ok).toBe(true);
    expect(authorize(PLAN, 'read', table).ok).toBe(true);
    expect(authorize(PLAN, 'plan', table).ok).toBe(true);
  });
  it('403 when the scope is too low, naming the needed scope', () => {
    const r = authorize(PLAN, 'write', table);
    expect(r).toMatchObject({ ok: false, status: 403 });
    expect(r.ok ? '' : r.message).toContain('"write"');
    expect(authorize(READ, 'plan', table)).toMatchObject({ ok: false, status: 403 });
  });
  it('returns the key label, not the key', () => {
    const r = authorize(WRITE, 'write', table);
    expect(r).toEqual({ ok: true, label: 'owner', scope: 'write', keyId: expect.stringMatching(/^[a-f0-9]{12}$/) });
    expect(JSON.stringify(r)).not.toContain(WRITE);
    expect(JSON.stringify(r)).not.toContain(hex(WRITE));
  });
  it('an empty table denies everything', () => {
    expect(authorize(WRITE, 'read', [])).toMatchObject({ ok: false, status: 401 });
  });
});
