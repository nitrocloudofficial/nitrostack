import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatDuration, phpLabel, signed } from '../../src/widgets/lib/format.js';
import { toViewModel, type VerifyVM } from '../../src/widgets/lib/view-model.js';

const load = (n: string) => (JSON.parse(readFileSync(new URL(`../fixtures/widget/${n}`, import.meta.url), 'utf8')) as { structuredContent: Record<string, unknown> }).structuredContent;
const asVerify = (o: unknown): VerifyVM => {
  const vm = toViewModel(o);
  expect(vm.kind).toBe('verify');
  return vm as VerifyVM;
};

describe('real-shaped verify_patch results (recorded runner output through the real verify code)', () => {
  const notVerified = asVerify(load('verify_patch.notverified.result.json'));
  const verified = asVerify(load('verify_patch.verified.result.json'));

  it('not verified: lists the reasons, never a pass', () => {
    expect(notVerified.verified).toBe(false);
    expect(notVerified.reasons).toContain('composer install failed');
    expect(notVerified.reasons).toContain('no tests found');
  });

  it('keeps per-check duration, the PHP selection and the lockfile note', () => {
    expect(notVerified.checks.find((c) => c.tool === 'trivy')).toMatchObject({ status: 'fail', durationMs: 133425 });
    expect(notVerified.patched.php).toEqual({ selected: '7.4', supported: true, lockRegenerated: true });
  });

  it('keeps run links (https only) and the echo', () => {
    expect(notVerified.patched.htmlUrl).toMatch(/^https:\/\/github\.com\//);
    expect(notVerified.repoUrl).toBe('https://github.com/acme/legacy-shop');
    expect(notVerified.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('measured block: scores, finding counts and per-tool counts for both sides', () => {
    const m = notVerified.measured!;
    expect(m.delta).toBe(m.patched - m.baseline);
    expect(m.baselineSide.perTool.length).toBeGreaterThan(0);
    expect(m.patchedSide.perTool.find((t) => t.tool === 'trivy')).toBeDefined();
  });

  it('verified fixture is verified only with no reason and a completed patched run', () => {
    expect(verified.verified).toBe(true);
    expect(verified.reasons).toEqual([]);
    const lying = { ...load('verify_patch.verified.result.json'), unverifiedReasons: ['no tests found'] };
    expect(asVerify(lying).verified).toBe(false);
    const missing = { ...load('verify_patch.verified.result.json') } as Record<string, unknown>;
    delete missing.unverifiedReasons;
    expect(asVerify({ ...missing, patched: { status: 'failed' } }).verified).toBe(false);
  });

  it('drops a run link that is not http(s)', () => {
    const o = load('verify_patch.notverified.result.json');
    const bad = { ...o, patched: { ...(o.patched as object), htmlUrl: 'javascript:alert(1)' } };
    expect(asVerify(bad).patched.htmlUrl).toBeUndefined();
  });
});

describe('formatters', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0 s');
    expect(formatDuration(5)).toBe('<0.1 s');
    expect(formatDuration(896)).toBe('0.9 s');
    expect(formatDuration(14711)).toBe('15 s');
    expect(formatDuration(133425)).toBe('2 min 13 s');
    expect(formatDuration(119600)).toBe('2 min');
    expect(formatDuration(undefined)).toBe('n/a');
    expect(formatDuration(-1)).toBe('n/a');
  });
  it('signs numbers explicitly', () => {
    expect(signed(24)).toBe('+24');
    expect(signed(-3)).toBe('−3');
    expect(signed(0)).toBe('0');
  });
  it('labels the PHP selection', () => {
    expect(phpLabel({ selected: '8.4' })).toBe('PHP 8.4');
    expect(phpLabel(undefined)).toBeUndefined();
  });
});
