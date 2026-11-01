import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ExecutionContext } from '@nitrostack/core';
import { authorize, extractKey, parseKeyTable, sha256 } from '../../src/common/auth/keys.js';
import { scopeGuard } from '../../src/common/auth/scope.guard.js';

// Scope bypass attempts. Synthetic keys only.
const READ = 'read-key-security-test-0001';
const PLAN = 'plan-key-security-test-0002';
const WRITE = 'write-key-security-test-0003';
const hex = (k: string) => sha256(k).toString('hex');

const saved: Record<string, string | undefined> = {};
const ENV: Record<string, string | undefined> = {
  METAMORPH_AUTH: undefined,
  METAMORPH_KEY_SECREAD: `read:${hex(READ)}`,
  METAMORPH_KEY_SECPLAN: `plan:${hex(PLAN)}`,
  METAMORPH_KEY_SECWRITE: `write:${hex(WRITE)}`
};
beforeAll(() => {
  for (const [k, v] of Object.entries(ENV)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function ctxOf(metadata: Record<string, unknown> | undefined, tool = 'x') {
  const logged: unknown[][] = [];
  const ctx = { metadata, toolName: tool, logger: { warn: (...a: unknown[]) => logged.push(a), info: () => undefined, error: () => undefined, debug: () => undefined } } as unknown as ExecutionContext;
  return { ctx, logged };
}
const decide = async (required: 'read' | 'plan' | 'write', metadata: Record<string, unknown> | undefined) => {
  const { ctx, logged } = ctxOf(metadata);
  try {
    await new (scopeGuard(required))().canActivate(ctx);
    return { ok: true as const, logged, message: '' };
  } catch (e) {
    return { ok: false as const, logged, message: (e as Error).message };
  }
};

describe('which scope each tool demands (read from the source, so a silent downgrade fails here)', () => {
  const root = fileURLToPath(new URL('../../src/modules/', import.meta.url));
  const toolFiles = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? toolFiles(join(dir, n)) : n.endsWith('.tools.ts') ? [join(dir, n)] : []));
  const declared: Record<string, string> = {};
  for (const f of toolFiles(root)) {
    for (const chunk of readFileSync(f, 'utf8').split('@Tool({').slice(1)) {
      const name = chunk.match(/name:\s*'([^']+)'/)?.[1];
      const guards = [...chunk.slice(0, chunk.search(/\n\s*async\s/)).matchAll(/@UseGuards\((scopeGuard\('[a-z]+'\))\)/g)].map((m) => m[1]);
      if (name) declared[name] = guards.join(' + ');
    }
  }
  const EXPECTED: Record<string, string> = {
    assess_project: "scopeGuard('read')",
    analyze_advisory: "scopeGuard('read')",
    check_watch: "scopeGuard('read')",
    plan_modernization: "scopeGuard('plan')",
    preview_changes: "scopeGuard('read')",
    generate_report: "scopeGuard('read')",
    apply_stage: "scopeGuard('write')",
    verify_patch: "scopeGuard('write')",
    cloud_inventory: "scopeGuard('read')"
  };
  it('every tool has exactly one scope guard, as expected', () => {
    expect(declared).toEqual(EXPECTED);
  });
  it('the tools that apply or dispatch (write) are the only ones that need write scope', () => {
    expect(Object.entries(declared).filter(([, g]) => g.includes("'write'")).map(([n]) => n).sort()).toEqual(['apply_stage', 'verify_patch']);
  });
});

describe('scope matrix: key scope against required scope', () => {
  const keys = { read: READ, plan: PLAN, write: WRITE } as const;
  const RANK = { read: 1, plan: 2, write: 3 } as const;
  for (const [have, key] of Object.entries(keys) as Array<[keyof typeof keys, string]>) {
    for (const need of ['read', 'plan', 'write'] as const) {
      const allowed = RANK[have] >= RANK[need];
      it(`${have} key on a ${need} tool: ${allowed ? 'allowed' : '403'}`, async () => {
        const r = await decide(need, { authorization: `Bearer ${key}` });
        expect(r.ok).toBe(allowed);
        if (!allowed) {
          expect(r.message).toMatch(/^403:/);
          expect(r.message).toContain(`"${need}"`);
          expect(r.message).not.toContain(key);
        }
      });
    }
  }
  it('works the same through x-api-key', async () => {
    expect((await decide('read', { 'x-api-key': READ })).ok).toBe(true);
    expect((await decide('write', { 'x-api-key': READ })).message).toMatch(/^403:/);
    expect((await decide('write', { 'x-api-key': WRITE })).ok).toBe(true);
  });
});

describe('malformed and hostile credentials are 401, never a pass', () => {
  const NOPE: Array<[string, Record<string, unknown> | undefined]> = [
    ['no metadata at all', undefined],
    ['empty metadata', {}],
    ['empty bearer', { authorization: 'Bearer ' }],
    ['bearer with no key', { authorization: 'Bearer' }],
    ['empty x-api-key', { 'x-api-key': '' }],
    ['basic scheme with the right key', { authorization: `Basic ${WRITE}` }],
    ['scheme missing, bare key', { authorization: WRITE }],
    ['token scheme', { authorization: `Token ${WRITE}` }],
    ['key with a trailing space', { authorization: `Bearer ${WRITE} ` }],
    ['key with a trailing newline', { authorization: `Bearer ${WRITE}\n` }],
    ['two keys in one header', { authorization: `Bearer ${READ} ${WRITE}` }],
    ['key with a header-injection newline', { authorization: `Bearer ${READ}\nX-Admin: 1` }],
    ['key with a NUL byte', { authorization: `Bearer ${WRITE}\u0000` }],
    ['key prefix only', { authorization: `Bearer ${WRITE.slice(0, -1)}` }],
    ['key plus extra characters', { authorization: `Bearer ${WRITE}x` }],
    ['key in the wrong case', { authorization: `Bearer ${WRITE.toUpperCase()}` }],
    ['the stored hash instead of the key', { authorization: `Bearer ${hex(WRITE)}` }],
    ['the hash in x-api-key', { 'x-api-key': hex(WRITE) }],
    ['array value', { authorization: [`Bearer ${WRITE}`] }],
    ['object value', { authorization: { toString: () => `Bearer ${WRITE}` } }],
    ['number value', { 'x-api-key': 1234567890123 }],
    ['too short (7 chars)', { 'x-api-key': 'abcdefg' }],
    ['too long (513 chars)', { 'x-api-key': 'a'.repeat(513) }],
    ['very long bearer (5 MB)', { authorization: `Bearer ${'a'.repeat(5_000_000)}` }],
    ['wrong key of valid shape', { authorization: 'Bearer aaaaaaaaaaaaaaaaaaaaaaaa' }],
    ['unknown metadata field', { token: WRITE, jwt: WRITE, key: WRITE }],
    ['key only in an unrelated field', { 'x-forwarded-authorization': `Bearer ${WRITE}` }]
  ];
  for (const [label, metadata] of NOPE) {
    it(`${label}`, async () => {
      const t0 = Date.now();
      const r = await decide('read', metadata);
      expect(r.ok).toBe(false);
      expect(r.message).toMatch(/^401:/);
      expect(Date.now() - t0).toBeLessThan(500); // a 5 MB header must not cost real time
      const everything = r.message + JSON.stringify(r.logged);
      for (const k of [READ, PLAN, WRITE, hex(WRITE)]) expect(everything).not.toContain(k);
    });
  }

  it('prototype-pollution shaped metadata does not grant anything', async () => {
    const meta = JSON.parse('{"__proto__": {"authorization": "Bearer ' + WRITE + '"}, "constructor": {"x": 1}}');
    expect((await decide('read', meta)).ok).toBe(false);
  });
});

describe('Authorization versus x-api-key', () => {
  it('a well-formed Bearer wins: a wrong Bearer is not rescued by a correct x-api-key', async () => {
    const r = await decide('read', { authorization: 'Bearer wrong-wrong-wrong-key', 'x-api-key': WRITE });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/^401:/);
  });
  it('a lower scope in Bearer is not raised by a higher-scope x-api-key', async () => {
    const r = await decide('write', { authorization: `Bearer ${READ}`, 'x-api-key': WRITE });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/^403:/);
  });
  it('a malformed Authorization header falls back to x-api-key (both are credentials sent by the same caller)', async () => {
    expect((await decide('write', { authorization: 'Basic abc', 'x-api-key': WRITE })).ok).toBe(true);
  });
  it('the scheme name is case-insensitive and extra spaces are tolerated, nothing else', () => {
    expect(extractKey({ authorization: `bearer ${WRITE}` })).toBe(WRITE);
    expect(extractKey({ authorization: `BEARER   ${WRITE}` })).toBe(WRITE);
    expect(extractKey({ Authorization: `Bearer ${WRITE}` })).toBe(WRITE);
  });
});

describe('fail closed', () => {
  it('METAMORPH_AUTH only switches auth off when it is exactly "off"', async () => {
    for (const v of ['OFF', 'Off', 'false', '0', 'no', ' off', 'off ', 'on', '']) {
      process.env.METAMORPH_AUTH = v;
      expect((await decide('read', undefined)).ok, JSON.stringify(v)).toBe(false);
    }
    process.env.METAMORPH_AUTH = 'off';
    expect((await decide('write', undefined)).ok).toBe(true);
    delete process.env.METAMORPH_AUTH;
  });
  it('an empty key table denies everything, including the hash of an empty key', () => {
    const table = parseKeyTable({ METAMORPH_KEY_EMPTY: `write:${sha256('').toString('hex')}` });
    expect(authorize('', 'read', table)).toMatchObject({ ok: false, status: 401 });
    expect(authorize(undefined, 'read', table)).toMatchObject({ ok: false, status: 401 });
    expect(authorize('anything-at-all', 'read', [])).toMatchObject({ ok: false, status: 401 });
  });
  it('malformed key-table entries are skipped, never turned into a permissive entry', () => {
    const t = parseKeyTable({
      METAMORPH_KEY_UPPER: `write:${hex(WRITE).toUpperCase()}`,
      METAMORPH_KEY_SHORT: `write:${hex(WRITE).slice(1)}`,
      METAMORPH_KEY_NOSCOPE: hex(WRITE),
      METAMORPH_KEY_ADMIN: `admin:${hex(WRITE)}`,
      METAMORPH_KEY_EMPTYVAL: '',
      METAMORPH_KEY_lower: `write:${hex(WRITE)}`
    });
    expect(t).toEqual([]);
  });
  it('two entries for the same key: the first one wins, so a duplicate cannot raise a scope by being later', () => {
    const t = parseKeyTable({ METAMORPH_KEY_A: `read:${hex(WRITE)}`, METAMORPH_KEY_B: `write:${hex(WRITE)}` });
    expect(authorize(WRITE, 'write', t)).toMatchObject({ ok: false, status: 403 });
  });
  it('a denial is logged with tool, status and required scope only', async () => {
    const r = await decide('write', { authorization: `Bearer ${READ}` });
    expect(r.logged).toHaveLength(1);
    expect(Object.keys(r.logged[0][1] as object).sort()).toEqual(['required', 'status', 'tool']);
  });
});

describe('constant-time comparison', () => {
  const src = readFileSync(fileURLToPath(new URL('../../src/common/auth/keys.ts', import.meta.url)), 'utf8');
  it('compares fixed-length SHA-256 digests with timingSafeEqual and never with === on key material', () => {
    expect(src).toContain("import { createHash, timingSafeEqual } from 'node:crypto'");
    expect(src).toMatch(/timingSafeEqual\(presented, entry\.hash\)/);
    expect(src).not.toMatch(/key\s*===|===\s*key|presented\s*===|\.hash\s*===|===\s*entry\.hash/);
  });
  it('visits every table entry (no early exit that would reveal which entry matched)', () => {
    const loop = src.match(/for \(const entry of table\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(loop).toContain('timingSafeEqual');
    expect(loop).not.toMatch(/\bbreak\b|\breturn\b/);
  });
  it('stored hashes and presented digests have the same length, so timingSafeEqual never throws', () => {
    const t = parseKeyTable({ METAMORPH_KEY_ONE: `read:${hex(READ)}` });
    for (const k of ['a', 'a'.repeat(512), 'é'.repeat(200), READ]) expect(() => authorize(k, 'read', t)).not.toThrow();
  });
});
