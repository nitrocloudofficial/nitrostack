import { describe, it, expect } from 'vitest';
import { buildPlan } from '../../src/modules/planning/plan.js';
import type { DependencyFix } from '../../src/modules/assessment/types.js';
import { scoreFindings } from '../../src/modules/assessment/score.js';
import type { Category, Finding, Severity } from '../../src/modules/assessment/types.js';

function f(id: string, severity: Severity, category: Category = 'standards', recommendation = `Fix ${id}`): Finding {
  return { id, category, severity, title: id, recommendation };
}

const phpShop: Finding[] = [
  f('dep-vulnerable:guzzlehttp/guzzle', 'high', 'dependencies', 'Upgrade guzzlehttp/guzzle'),
  f('dep-vulnerable:symfony/http-kernel', 'critical', 'dependencies', 'Upgrade symfony/http-kernel'),
  f('php-mysql-removed-api', 'high', 'runtime', 'Replace mysql_* with PDO'),
  f('php-version-eol', 'high', 'runtime', 'Upgrade PHP'),
  f('php-dynamic-include', 'high', 'security', 'Stop including files from user input'),
  f('php-sql-concatenation', 'critical', 'security', 'Use prepared statements'),
  f('php-weak-password-hash', 'high', 'security', 'Use password_hash'),
  f('no-container-packaging', 'medium', 'cloud', 'Add a Dockerfile'),
  f('no-ci', 'low', 'standards', 'Add CI'),
  f('php-errors-hidden', 'medium', 'security', 'Log errors instead of hiding them'),
  f('php-inline-html-mixed', 'low', 'architecture', 'Separate templates from logic'),
];

const nodeApp: Finding[] = [
  f('dep-vulnerable:lodash', 'high', 'dependencies', 'Upgrade lodash'),
  f('node-runtime-eol', 'high', 'runtime', 'Upgrade Node'),
  f('env-file-committed', 'high', 'security', 'Remove .env from the repo'),
  f('node-deprecated-package', 'medium', 'dependencies', 'Replace request with fetch'),
  f('no-container-packaging', 'medium', 'cloud', 'Add a Dockerfile'),
  f('no-ci', 'low', 'standards', 'Add CI'),
  f('node-no-tests', 'medium', 'standards', 'Add tests'),
  f('node-commonjs', 'low', 'architecture', 'Move to ES modules'),
];

const fix = (name: string, from: string, to: string, urgent = false): DependencyFix => ({ ecosystem: 'npm', name, from, to, urgent, dev: false });
const ids = (findings: Finding[], goal: 'modernize_all' | 'patch_advisory' | 'upgrade_runtime' = 'modernize_all', fixes: DependencyFix[] = []) =>
  buildPlan({ stack: 'php', findings, fixes, goal }).stages.map((s) => s.id);

describe('buildPlan stages', () => {
  it('orders PHP shop stages and numbers them from 1', () => {
    const plan = buildPlan({ stack: 'php', findings: phpShop, fixes: [], goal: 'modernize_all' });
    expect(plan.stages.map((s) => s.id)).toEqual([
      'patch-dependencies', 'upgrade-runtime', 'fix-security-code', 'add-packaging', 'modernize-structure',
    ]);
    expect(plan.stages.map((s) => s.index)).toEqual([1, 2, 3, 4, 5]);
    expect(plan.stages[0].addresses).toEqual(['dep-vulnerable:guzzlehttp/guzzle', 'dep-vulnerable:symfony/http-kernel']);
    expect(plan.stages[2].addresses).toContain('php-errors-hidden');
  });

  it('orders Node app stages', () => {
    expect(ids(nodeApp)).toEqual([
      'patch-dependencies', 'upgrade-runtime', 'remove-committed-env', 'remove-deprecated', 'add-packaging', 'modernize-structure',
    ]);
  });

  it('sets automated flags and base risks', () => {
    const plan = buildPlan({ stack: 'node', findings: [...nodeApp, f('node-no-lockfile', 'medium')], fixes: [], goal: 'modernize_all' });
    const by = Object.fromEntries(plan.stages.map((s) => [s.id, s]));
    expect(by['patch-dependencies'].automated).toBe(true);
    expect(by['lock-dependencies'].automated).toBe(false);
    expect(by['upgrade-runtime'].automated).toBe(true);
    expect(by['remove-committed-env'].automated).toBe(true);
    expect(by['remove-deprecated'].automated).toBe(false);
    expect(by['add-packaging'].automated).toBe(true);
    expect(by['modernize-structure'].automated).toBe(false);
    expect(by['lock-dependencies'].risk).toBe('low');
    expect(by['upgrade-runtime'].risk).toBe('medium');
    expect(by['remove-committed-env'].risk).toBe('low');
    expect(by['add-packaging'].risk).toBe('low');
  });

  it('env stage steps untrack, rotate and purge history per env file without truncation', () => {
    const envs = ['.env', '.env.local', '.env.production', '.env.staging', '.env.test'].map((e) => ({ ...f('env-file-committed', 'high', 'security'), evidence: e }));
    const s = buildPlan({ stack: 'node', findings: envs, fixes: [], goal: 'modernize_all' }).stages.find((x) => x.id === 'remove-committed-env')!;
    for (const e of ['.env', '.env.local', '.env.production', '.env.staging', '.env.test']) {
      expect(s.steps).toContain(`Run: git rm --cached ${e}`);
      expect(s.steps.some((x) => x.startsWith(`Purge history: git filter-repo --path ${e} --invert-paths`) && /force-push/.test(x))).toBe(true);
    }
    expect(s.steps.some((x) => /^Rotate every secret/.test(x))).toBe(true);
  });

  it('marks fix-security-code as manual and high risk', () => {
    const s = buildPlan({ stack: 'php', findings: phpShop, fixes: [], goal: 'modernize_all' }).stages.find((x) => x.id === 'fix-security-code');
    expect(s?.automated).toBe(false);
    expect(s?.risk).toBe('high');
  });

  it('ignores lockfile findings in other stages and routes them to lock-dependencies', () => {
    const list = [f('composer-no-lock', 'medium'), f('php-approximate-versions', 'low')];
    const plan = buildPlan({ stack: 'php', findings: list, fixes: [], goal: 'modernize_all' });
    expect(plan.stages.map((s) => s.id)).toEqual(['lock-dependencies']);
    expect(plan.stages[0].steps[0]).toMatch(/lockfile/);
  });
});

describe('patch-dependencies risk and steps', () => {
  const dep = [f('dep-vulnerable:lodash', 'high', 'dependencies')];
  const risk = (fixes: DependencyFix[]) => buildPlan({ stack: 'node', findings: dep, fixes, goal: 'patch_advisory' }).stages[0].risk;

  it('is low when every fix stays inside its major', () => {
    expect(risk([fix('lodash', '4.17.15', '4.17.21'), fix('a', '1.0.0', '1.2.0')])).toBe('low');
  });

  it('is medium when any fix crosses a major', () => {
    expect(risk([fix('lodash', '4.17.15', '4.17.21'), fix('b', '1.9.0', '2.0.0')])).toBe('medium');
  });

  it('is high when more than 3 fixes cross a major', () => {
    const three = [1, 2, 3].map((n) => fix(`p${n}`, '1.0.0', '2.0.0'));
    expect(risk(three)).toBe('medium');
    expect(risk([...three, fix('p4', '3.0.0', '4.0.0')])).toBe('high');
  });

  it('lists urgent fixes first, caps at 5 and appends a remainder step', () => {
    const fixes = [1, 2, 3, 4, 5, 6, 7].map((n) => fix(`p${n}`, '1.0.0', '1.1.0', n === 7));
    const steps = buildPlan({ stack: 'node', findings: dep, fixes, goal: 'patch_advisory' }).stages[0].steps;
    expect(steps[0]).toBe('Upgrade p7 from 1.0.0 to 1.1.0');
    expect(steps).toHaveLength(6);
    expect(steps[5]).toBe('and 2 more');
  });

  it('emits a generic step when fixes are empty but dep-vulnerable findings exist', () => {
    const s = buildPlan({ stack: 'node', findings: dep, fixes: [], goal: 'patch_advisory' }).stages[0];
    expect(s.id).toBe('patch-dependencies');
    expect(s.steps).toHaveLength(1);
    expect(s.risk).toBe('low');
  });

  it('emits stage 1 when fixes exist without matching findings', () => {
    expect(ids([f('no-ci', 'low')], 'patch_advisory', [fix('x', '1.0.0', '1.0.1')])).toEqual(['patch-dependencies']);
  });
});

describe('goals', () => {
  it('patch_advisory yields only stage 1', () => {
    expect(ids(phpShop, 'patch_advisory')).toEqual(['patch-dependencies']);
  });

  it('upgrade_runtime yields only the runtime stage', () => {
    const plan = buildPlan({ stack: 'php', findings: phpShop, fixes: [], goal: 'upgrade_runtime' });
    expect(plan.stages.map((s) => s.id)).toEqual(['upgrade-runtime']);
    expect(plan.stages[0].index).toBe(1);
    expect(plan.stages[0].steps.join(' ')).toMatch(/22/);
    expect(plan.stages[0].steps.join(' ')).toMatch(/8\.4/);
    expect(plan.stages[0].steps.join(' ')).toMatch(/test suite/);
  });

  it('goal with nothing to do gives an empty plan', () => {
    const plan = buildPlan({ stack: 'node', findings: [f('no-ci', 'low')], fixes: [], goal: 'upgrade_runtime' });
    expect(plan.stages).toEqual([]);
    expect(plan.scoreAfter).toBe(plan.scoreBefore);
  });
});

describe('scores', () => {
  it('scoreAfter never decreases and the final score matches info-only leftovers', () => {
    for (const list of [phpShop, nodeApp]) {
      const withInfo = [...list, f('some-note', 'info')];
      const plan = buildPlan({ stack: 'node', findings: withInfo, fixes: [], goal: 'modernize_all' });
      const scores = [plan.scoreBefore, ...plan.stages.map((s) => s.scoreAfter)];
      for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
      expect(plan.scoreBefore).toBe(scoreFindings(withInfo).overall);
      expect(plan.scoreAfter).toBe(scoreFindings(withInfo.filter((x) => x.severity === 'info')).overall);
      expect(plan.scoreAfter).toBe(plan.stages[plan.stages.length - 1].scoreAfter);
    }
  });

  it('computes per-stage scores from the remaining findings', () => {
    const plan = buildPlan({ stack: 'node', findings: nodeApp, fixes: [], goal: 'modernize_all' });
    const remaining = nodeApp.filter((x) => !x.id.startsWith('dep-vulnerable:'));
    expect(plan.stages[0].scoreAfter).toBe(scoreFindings(remaining).overall);
  });

  it('returns an empty plan scored 100 for no findings', () => {
    const plan = buildPlan({ stack: 'unknown', findings: [], fixes: [], goal: 'modernize_all' });
    expect(plan.stages).toEqual([]);
    expect(plan.scoreBefore).toBe(100);
    expect(plan.scoreAfter).toBe(100);
  });
});

describe('other-findings', () => {
  it('collects unknown findings above info', () => {
    const plan = buildPlan({ stack: 'node', findings: [f('mystery-rule', 'medium', 'cloud', 'Do the thing')], fixes: [], goal: 'modernize_all' });
    expect(plan.stages).toHaveLength(1);
    expect(plan.stages[0]).toMatchObject({ id: 'other-findings', kind: 'code', automated: false, risk: 'medium', addresses: ['mystery-rule'], steps: ['Do the thing'] });
  });

  it('ignores unknown info-only findings', () => {
    const plan = buildPlan({ stack: 'node', findings: [f('mystery-note', 'info')], fixes: [], goal: 'modernize_all' });
    expect(plan.stages).toEqual([]);
    expect(plan.scoreAfter).toBe(100);
  });
});

describe('limits and determinism', () => {
  it('caps steps at 6 and dedupes recommendations', () => {
    const many = Array.from({ length: 9 }, (_, i) => f(`unknown-${i}`, 'low', 'standards', `Step ${i}`));
    many.push(f('unknown-dup', 'low', 'standards', 'Step 0'));
    const plan = buildPlan({ stack: 'node', findings: many, fixes: [], goal: 'modernize_all' });
    expect(plan.stages[0].steps).toHaveLength(6);
    expect(new Set(plan.stages[0].steps).size).toBe(6);
  });

  it('orders security steps by severity', () => {
    const plan = buildPlan({ stack: 'php', findings: phpShop, fixes: [], goal: 'modernize_all' });
    const s = plan.stages.find((x) => x.id === 'fix-security-code');
    expect(s?.steps[0]).toBe('Use prepared statements');
    expect(s?.steps.length).toBeLessThanOrEqual(6);
  });

  it('is deterministic', () => {
    const run = () => buildPlan({ stack: 'php', findings: phpShop, fixes: [fix('a', '1.0.0', '2.0.0', true)], goal: 'modernize_all' });
    expect(run()).toEqual(run());
  });

  it('gives every stage a one-sentence rollback', () => {
    for (const s of buildPlan({ stack: 'php', findings: phpShop, fixes: [], goal: 'modernize_all' }).stages) {
      expect(s.rollback.length).toBeGreaterThan(0);
    }
  });
});
