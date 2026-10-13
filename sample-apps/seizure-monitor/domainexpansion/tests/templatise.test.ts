import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { templatisePaths } from '../src/engine/templatise.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('templatisePaths', () => {
  it('resolves the four parameterised ground-truth templates with the exact expected names', () => {
    const paths = [
      '/api/v1/orders/1001',
      '/api/v1/orders/1002',
      '/api/v1/orders/1003',
      '/api/v1/users/1/documents/11',
      '/api/v1/users/2/documents/22',
      '/api/v1/users/3/documents/33',
      '/api/v1/invoices/1',
      '/api/v1/invoices/2',
      '/api/v1/invoices/3',
      '/api/v1/webhooks/501',
      '/api/v1/webhooks/502',
      '/api/v1/webhooks/503',
    ];
    const result = templatisePaths(paths);
    const templates = new Set(result.values());
    expect(templates).toContain('/api/v1/orders/{orderId}');
    expect(templates).toContain('/api/v1/users/{userId}/documents/{docId}');
    expect(templates).toContain('/api/v1/invoices/{invoiceId}');
    expect(templates).toContain('/api/v1/webhooks/{hookId}');
    expect(templates.size).toBe(4);
  });

  it('collapses >=5 structurally-similar tenant slugs into {tenantId} via rule (b)', () => {
    const tenants = ['acme', 'initech', 'umbrella', 'wayne', 'stark'];
    const paths = tenants.flatMap((t) => [`/api/tenants/${t}/users/1`, `/api/tenants/${t}/users/2`]);
    const result = templatisePaths(paths);
    const templates = new Set(result.values());
    expect(templates.size).toBe(1);
    expect([...templates][0]).toBe('/api/tenants/{tenantId}/users/{userId}');
  });

  it('does NOT collapse >=5 sibling static filenames (leaf nodes) via rule (b) — regression for a false {id} found against real NASA-HTTP traffic', () => {
    // All five are pure leaves (nothing follows them), so their grandchild
    // key sets are all empty. Before the fix, jaccard(empty, empty) === 1,
    // so every pair "matched" and rule (b) fired despite the filenames
    // being unrelated — no genuine subtree-shape evidence, just the
    // coincidence of having nothing below them.
    const files = ['72HC31.GIF', '72HC400.GIF', '72HC401.GIF', '72HC404.GIF', '72HC405.GIF'];
    const paths = files.map((f) => `/history/apollo/apollo-16/${f}`);
    const result = templatisePaths(paths);
    const templates = new Set(result.values());
    expect(templates.size).toBe(5); // each filename stays its own distinct static template
    for (const f of files) {
      expect(templates).toContain(`/history/apollo/apollo-16/${f}`);
    }
  });

  it('still collapses >=5 siblings via rule (b) when they share genuine non-empty subtree structure', () => {
    // Same shape as the leaf-filename case above, but each sibling is
    // followed by an identical real sub-resource — genuine evidence the
    // fix must not have broken.
    const tenants = ['acme', 'initech', 'umbrella', 'wayne', 'stark'];
    const paths = tenants.flatMap((t) => [`/api/orgs/${t}/settings`, `/api/orgs/${t}/billing`]);
    const result = templatisePaths(paths);
    const templates = new Set(result.values());
    expect(templates).toContain('/api/orgs/{id}/settings');
    expect(templates).toContain('/api/orgs/{id}/billing');
    expect(templates.size).toBe(2);
  });

  it('does not collapse fewer than 5 non-regex-matching siblings even with similar subtrees', () => {
    const tenants = ['acme', 'initech', 'umbrella']; // only 3, below the rule-(b) floor of 5
    const paths = tenants.flatMap((t) => [`/api/tenants/${t}/users/1`]);
    const result = templatisePaths(paths);
    const templates = new Set(result.values());
    // each slug stays a distinct static segment
    expect(templates.size).toBe(3);
    for (const t of tenants) {
      expect(templates).toContain(`/api/tenants/${t}/users/{userId}`);
    }
  });

  it('keeps /api/v1/admin/feature-flags fully static', () => {
    const paths = ['/api/v1/admin/feature-flags'];
    const result = templatisePaths(paths);
    expect(result.get('/api/v1/admin/feature-flags')).toBe('/api/v1/admin/feature-flags');
  });

  it('keeps /api/v1/auth/login fully static even alongside sibling auth routes', () => {
    const paths = ['/api/v1/auth/login', '/api/v1/auth/logout', '/api/v1/auth/refresh'];
    const result = templatisePaths(paths);
    expect(result.get('/api/v1/auth/login')).toBe('/api/v1/auth/login');
    expect(result.get('/api/v1/auth/logout')).toBe('/api/v1/auth/logout');
    expect(result.get('/api/v1/auth/refresh')).toBe('/api/v1/auth/refresh');
  });

  it('never parameterises a stoplisted word even when siblings otherwise qualify', () => {
    // "search" sits alongside 4 clearly-hashy values at the same position; the
    // hashy siblings should collapse but "search" must remain a literal branch.
    const hashy = ['aGVsbG93b3JsZDEyMzQ1', 'bGludXhpc2Nvb2wxMjM0', 'd2luZG93c3J1bGVzMTIz', 'bWFjb3Npc25pY2UxMjM0'];
    const paths = [...hashy.map((h) => `/api/cache/${h}`), '/api/cache/search'];
    const result = templatisePaths(paths);
    expect(result.get('/api/cache/search')).toBe('/api/cache/search');
    for (const h of hashy) {
      expect(result.get(`/api/cache/${h}`)).toBe('/api/cache/{id}');
    }
  });

  it('suffixes a naming collision inside one template as {id2}', () => {
    // Two unknown-parent numeric params in the same path both default to "id".
    const paths = ['/api/widgets/1/parts/1', '/api/widgets/2/parts/2', '/api/widgets/3/parts/3'];
    const result = templatisePaths(paths);
    expect(result.get('/api/widgets/1/parts/1')).toBe('/api/widgets/{id}/parts/{id2}');
  });

  it('is idempotent: templatising the same input twice yields an equal Map', () => {
    const paths = ['/api/v1/orders/1', '/api/v1/orders/2', '/api/v1/admin/feature-flags'];
    const first = templatisePaths(paths);
    const second = templatisePaths(paths);
    expect([...first.entries()]).toEqual([...second.entries()]);
  });

  it('real fixture data: templatising every observed path yields exactly 34 distinct templates', () => {
    const raw = readFileSync(join(ROOT, 'fixtures/logs/acme-prod.jsonl'), 'utf-8');
    const lines = raw.trim().split('\n');
    const paths = lines.map((line) => JSON.parse(line).path as string);
    const result = templatisePaths(paths);
    const templates = new Set(result.values());
    if (templates.size !== 34) {
      console.error('Distinct templates found:', templates.size);
      console.error([...templates].sort().join('\n'));
    }
    expect(templates.size).toBe(34);
  });
});
