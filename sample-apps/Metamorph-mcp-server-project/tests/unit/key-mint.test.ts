import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nitrostack/core';
import { createHash } from 'node:crypto';
import { clearRuntimeKeys, runtimeKeyTable } from '../../src/common/auth/keys.js';
import { scopeGuard } from '../../src/common/auth/scope.guard.js';
import { MINT, createMinter, installKeyMint } from '../../src/key-mint.js';
import { CSP, renderLanding } from '../../src/landing.js';

function call(minter: ReturnType<typeof createMinter>, ip = '1.1.1.1', extra: Record<string, unknown> = {}) {
  const out = { code: 0, headers: {} as Record<string, string>, body: '' };
  const res = {
    status(c: number) { out.code = c; return res; },
    setHeader(n: string, v: string) { out.headers[n.toLowerCase()] = v; },
    send(b: string) { out.body = b; }
  };
  minter.handle({ headers: { 'x-forwarded-for': ip, ...(extra.headers as object) }, body: extra.body } as never, res);
  return { ...out, json: out.body ? JSON.parse(out.body) : {} };
}
const ctx = (key: string) =>
  ({ metadata: { authorization: `Bearer ${key}` }, toolName: 't', logger: { warn: () => undefined } }) as unknown as ExecutionContext;
const can = async (scope: 'read' | 'plan' | 'write', key: string) => {
  const G = scopeGuard(scope);
  try { return await new G().canActivate(ctx(key)); } catch (e) { return (e as Error).message; }
};

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2030-01-01T00:00:00Z')); clearRuntimeKeys(); delete process.env.METAMORPH_AUTH; });
afterEach(() => { vi.useRealTimers(); clearRuntimeKeys(); });

describe('POST /keys/mint', () => {
  it('returns a key that reads and plans but cannot write', async () => {
    const r = call(createMinter());
    expect(r.code).toBe(200);
    expect(r.json.key).toMatch(/^sk_[A-Za-z0-9_-]{32}$/);
    expect(r.json.scope).toBe('plan');
    expect(r.json.expiresAt).toBe('2030-01-02T00:00:00.000Z');
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['referrer-policy']).toBe('no-referrer');
    expect(await can('read', r.json.key)).toBe(true);
    expect(await can('plan', r.json.key)).toBe(true);
    expect(await can('write', r.json.key)).toMatch(/^403:/);
  });

  it('never stores or logs the plain key; only its hash is registered', () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
    const r = call(createMinter());
    const key = r.json.key as string;
    expect(JSON.stringify(spies.map((s) => s.mock.calls))).not.toContain(key);
    expect(r.body.split(key)).toHaveLength(2); // exactly once, in the body
    expect(JSON.stringify(Object.values(r.headers))).not.toContain(key);
    const entry = runtimeKeyTable().find((k) => k.label === 'guest')!;
    expect(entry.hash.equals(createHash('sha256').update(key).digest())).toBe(true);
    expect(JSON.stringify(runtimeKeyTable())).not.toContain(key);
    spies.forEach((s) => s.mockRestore());
  });

  it('limits to 3 mints an hour per client, then frees up', () => {
    let t = Date.now();
    const m = createMinter({ now: () => t });
    for (let i = 0; i < MINT.perHour; i++) expect(call(m).code).toBe(200);
    const r = call(m);
    expect(r.code).toBe(429);
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
    expect(call(m, '2.2.2.2').code).toBe(200); // other client unaffected
    t += 3600_001;
    expect(call(m).code).toBe(200);
  });

  it('caps active guest keys at 300 with a 429 and Retry-After', () => {
    const m = createMinter();
    for (let i = 0; i < MINT.maxActive; i++) expect(call(m, `10.0.${i >> 8}.${i & 255}`).code).toBe(200);
    const r = call(m, '9.9.9.9');
    expect(r.code).toBe(429);
    expect(r.json.error).toMatch(/in use/);
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('expires keys after 24 hours and purges them', async () => {
    const r = call(createMinter());
    vi.setSystemTime(Date.now() + MINT.ttlMs - 1000);
    expect(await can('read', r.json.key)).toBe(true);
    vi.setSystemTime(Date.now() + 2000);
    expect(await can('read', r.json.key)).toMatch(/^401:/);
    expect(runtimeKeyTable().filter((k) => k.label === 'guest')).toHaveLength(0);
  });

  it('rejects bodies over 1 KB', () => {
    expect(call(createMinter(), '1.1.1.1', { headers: { 'content-length': '2000' } }).code).toBe(413);
    expect(call(createMinter(), '1.1.1.1', { body: 'x'.repeat(2000) }).code).toBe(413);
    expect(runtimeKeyTable()).toHaveLength(0);
  });

  it('is not installed when METAMORPH_KEY_MINT=off', () => {
    const paths: string[] = [];
    const app = { post: (p: string) => paths.push(p) };
    expect(installKeyMint(app, { env: { METAMORPH_KEY_MINT: 'off' } })).toBe(false);
    expect(paths).toEqual([]);
    expect(installKeyMint(app, { env: {} })).toBe(true);
    expect(paths).toEqual(['/keys/mint']);
  });
});

describe('landing page mint button', () => {
  const html = renderLanding('http://localhost:3000/mcp');
  it('has the button, the shown-once text and the placeholder', () => {
    expect(html).toContain('Get a key (plan scope, 24 hours)');
    expect(html).toContain('Shown once. Valid 24 hours or until the server restarts. Scope: read and plan (no write).');
    expect(html).toContain('&lt;your key&gt;');
  });
  it('keeps hash-only CSP, adds connect-src self, and the hashes match the inline blocks', () => {
    const h = (s: string) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;
    const style = html.match(/<style>([\s\S]*?)<\/style>/)![1];
    const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
    expect(CSP).toContain(`style-src ${h(style)}`);
    expect(CSP).toContain(`script-src ${h(script)}`);
    expect(CSP).toContain("connect-src 'self'");
    expect(CSP).not.toContain('unsafe-inline');
    expect(script).toContain("fetch('/keys/mint'");
  });
});
