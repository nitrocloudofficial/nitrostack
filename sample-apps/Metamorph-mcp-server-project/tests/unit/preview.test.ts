import { describe, it, expect } from 'vitest';
import { canonicalHash, verifyApprovalToken } from '../../src/common/approval-token.js';
import { buildPreview } from '../../src/modules/planning/preview.js';
import type { FilePatch, ModernizationPlan } from '../../src/modules/assessment/types.js';

const SECRET = 'x'.repeat(32);
const NOW = 1_800_000_000;

const plan: ModernizationPlan = {
  goal: 'modernize_all',
  stack: 'node',
  scoreBefore: 40,
  scoreAfter: 80,
  stages: [
    { index: 1, id: 'patch-dependencies', title: 'Patch', kind: 'dependencies', automated: true, risk: 'low', addresses: ['a'], steps: ['s1'], rollback: 'r1', scoreAfter: 55 },
    { index: 2, id: 'refactor', title: 'Refactor', kind: 'code', automated: false, risk: 'medium', addresses: ['b'], steps: ['s2'], rollback: 'r2', scoreAfter: 70 }
  ]
};
const edit: FilePatch = { path: 'package.json', before: '{"a":1}\n', after: '{"a":2}\n', reason: 'bump', stageId: 'patch-dependencies' };
const create: FilePatch = { path: '.nvmrc', after: '22\n', reason: 'pin', stageId: 'patch-dependencies' };
const del: FilePatch = { path: '.env', before: 'A=1\n', after: null, reason: 'remove', stageId: 'patch-dependencies' };
const run = (patches: FilePatch[], secret: string | undefined, stageId = 'patch-dependencies') =>
  buildPreview({ plan, stageId, patches, secret, now: NOW });

describe('buildPreview', () => {
  it('lists valid stage ids for an unknown stage', () => {
    expect(() => run([edit], SECRET, 'nope')).toThrow(RangeError);
    expect(() => run([edit], SECRET, 'nope')).toThrow(/patch-dependencies, refactor/);
  });

  it('returns a guided stage without files, diff or token', () => {
    const p = run([edit], SECRET, 'refactor');
    expect(p).toMatchObject({ automated: false, files: [], diff: '' });
    expect(p.approvalToken).toBeUndefined();
    expect(p.planHash).toBeUndefined();
    expect(p.note).toMatch(/guided.*re-scans/);
    expect(p.stage).toMatchObject({ id: 'refactor', index: 2, rollback: 'r2', scoreAfter: 70 });
  });

  it('maps file actions and builds a diff', () => {
    const p = run([edit, create, del], SECRET);
    expect(p.files).toEqual([
      { path: 'package.json', action: 'edit', reason: 'bump' },
      { path: '.nvmrc', action: 'create', reason: 'pin' },
      { path: '.env', action: 'delete', reason: 'remove' }
    ]);
    expect(p.diff).toContain('--- a/package.json');
    expect(p.diff).toContain('+++ /dev/null');
    expect(Object.keys(p.files[0]).sort()).toEqual(['action', 'path', 'reason']);
  });

  it('signs a token that verifies with the same hashes and stage index', () => {
    const p = run([edit], SECRET);
    expect(p.expiresInSeconds).toBe(300);
    expect(p.planHash).toBe(canonicalHash(plan));
    expect(p.patchHash).toBe(canonicalHash([edit]));
    const expected = { planHash: p.planHash!, patchHash: p.patchHash!, stage: 1 };
    expect(verifyApprovalToken(p.approvalToken!, expected, SECRET, NOW + 10)).toEqual({ ok: true });
    expect(verifyApprovalToken(p.approvalToken!, { ...expected, stage: 2 }, SECRET, NOW + 10).ok).toBe(false);
  });

  it('a tampered patch changes the hash and the old token fails', () => {
    const a = run([edit], SECRET);
    const b = run([{ ...edit, after: '{"a":3}\n' }], SECRET);
    expect(b.patchHash).not.toBe(a.patchHash);
    const res = verifyApprovalToken(a.approvalToken!, { planHash: b.planHash!, patchHash: b.patchHash!, stage: 1 }, SECRET, NOW + 10);
    expect(res.ok).toBe(false);
  });

  it('omits the token without a valid secret and says why', () => {
    for (const secret of [undefined, 'short', 'y'.repeat(31)]) {
      const p = run([edit], secret);
      expect(p.approvalToken).toBeUndefined();
      expect(p.expiresInSeconds).toBeUndefined();
      expect(p.note).toMatch(/METAMORPH_TOKEN_SECRET \(32\+ characters\)/);
      expect(p.diff).not.toBe('');
      expect(p.planHash).toBeDefined();
    }
  });

  it('reports nothing to change when an automated stage has no patches', () => {
    const p = run([], SECRET);
    expect(p).toMatchObject({ automated: true, files: [], diff: '' });
    expect(p.note).toMatch(/Nothing to change/);
    expect(p.approvalToken).toBeUndefined();
  });

  it('caps the combined diff at 400 lines', () => {
    const big: FilePatch = { path: 'big.txt', after: Array.from({ length: 1000 }, (_, i) => `line ${i}`).join('\n') + '\n', reason: 'big', stageId: 'patch-dependencies' };
    const lines = run([big, edit], SECRET).diff.split('\n');
    expect(lines[lines.length - 1]).toBe('');
    expect(lines).toHaveLength(402);
    expect(lines[400]).toBe('... diff truncated');
  });

  describe('secret handling', () => {
    const AWS = 'AKIA' + 'ABCDEFGHIJKLMNOP';
    const PW = 'hunter2' + 'hunter2';
    const envText = `AWS_KEY=${AWS}\npassword=${PW}\n`;
    const envDel = (path: string): FilePatch => ({ path, before: envText, after: null, reason: 'remove', stageId: 'patch-dependencies' });

    it.each(['.env', '.env.production', '.env.local', 'sub/.env', 'apps/api/.env.staging'])('hides the content of %s', (path) => {
      const p = run([envDel(path)], SECRET);
      const json = JSON.stringify(p);
      expect(json).not.toContain(AWS);
      expect(json).not.toContain(PW);
      expect(p.diff).toBe(`--- a/${path}\n+++ /dev/null\n(content hidden: env file)\n`);
      expect(p.note ?? '').not.toContain('redacted');
    });

    it('hides content of edited env files too', () => {
      const p = run([{ path: '.env.production', before: envText, after: envText + 'X=1\n', reason: 'edit', stageId: 'patch-dependencies' }], SECRET);
      expect(p.diff).toBe('--- a/.env.production\n+++ b/.env.production\n(content hidden: env file)\n');
    });

    it('shows a key-only .env.example diff but hides one that adds a value', () => {
      const ok = run([{ path: '.env.example', before: 'A=\n', after: 'A=\nB=\n', reason: 'keys', stageId: 'remove-committed-env' }], SECRET);
      expect(ok.diff).toContain('+B=');
      const bad = run([{ path: '.env.example', before: 'A=\n', after: `A=\nB=${PW}\n`, reason: 'oops', stageId: 'remove-committed-env' }], SECRET);
      expect(bad.diff).toBe('--- a/.env.example\n+++ b/.env.example\n(content hidden: env file)\n');
      expect(JSON.stringify(bad)).not.toContain(PW);
    });

    it('redacts secret-looking values in other files and notes it', () => {
      const pkg: FilePatch = { path: 'package.json', before: `{"token":"${AWS}"}\n`, after: '{"token":"x"}\n', reason: 'edit', stageId: 'patch-dependencies' };
      const p = run([pkg], SECRET);
      expect(JSON.stringify(p)).not.toContain(AWS);
      expect(p.diff).toContain('[REDACTED');
      expect(p.note).toContain('Some values were redacted in this preview.');
    });

    it('appends the redaction note to an existing note and redacts reasons', () => {
      const p = run([{ ...edit, reason: `use ${AWS}` }], undefined);
      expect(p.files[0].reason).not.toContain(AWS);
      expect(p.note).toMatch(/METAMORPH_TOKEN_SECRET.*Some values were redacted/);
    });

    it('still shows the .gitignore diff and adds no redaction note', () => {
      const ign: FilePatch = { path: '.gitignore', before: 'node_modules\n', after: 'node_modules\n.env\n', reason: 'ignore', stageId: 'patch-dependencies' };
      const p = run([envDel('.env'), ign], SECRET);
      expect(p.diff).toContain('+.env');
      expect(p.diff).toContain('--- a/.gitignore');
      expect(p.note).toBeUndefined();
    });
  });
});
