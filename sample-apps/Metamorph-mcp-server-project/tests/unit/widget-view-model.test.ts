import { describe, expect, it } from 'vitest';
import { MAX_FILES, MAX_FINDINGS, MAX_INLINE_BYTES, formatBytes, MAX_FIXED, MAX_REMAINING, MAX_STAGES, MAX_STEPS, MAX_STRING, scoreBand, toViewModel, type ApplyVM, type AssessmentVM, type PlanVM, type ReportVM } from '../../src/widgets/lib/view-model.js';

const assessment = {
  assessmentId: 'abc',
  stack: 'php',
  runtime: { declared: '^5.6', source: 'composer.json' },
  frameworks: [],
  uiLibraries: [],
  hosting: ['shared hosting'],
  dependencies: { total: 3, checked: 3, vulnerable: 2, urgent: 1, approximateVersions: true },
  score: {
    overall: 43,
    byCategory: { security: 50, dependencies: 12, runtime: 88, architecture: 100, standards: 100, cloud: 95 },
    counts: { critical: 1, high: 2, medium: 0, low: 0, info: 1 }
  },
  topFindings: [{ id: 'php-eol', category: 'runtime', severity: 'high', title: 'PHP 5.6 is end of life', evidence: 'composer.json', recommendation: 'Move to PHP 8.4.' }],
  findingCount: 4,
  truncated: false
};

const plan = {
  assessmentId: 'abc',
  stack: 'php',
  goal: 'modernize_all',
  scoreBefore: 43,
  scoreAfter: 100,
  stages: [
    { index: 1, id: 'patch-dependencies', title: 'Patch dependencies', kind: 'dependencies', automated: true, risk: 'low', addresses: [], steps: ['Bump guzzle'], rollback: 'Revert manifest.', scoreAfter: 61 },
    { index: 2, id: 'upgrade-runtime', title: 'Upgrade runtime', kind: 'runtime', automated: false, risk: 'high', addresses: [], steps: ['Edit code'], rollback: 'Revert.', scoreAfter: 100 }
  ],
  hint: 'Call preview_changes.'
};

describe('toViewModel', () => {
  it('shapes an assessment', () => {
    const vm = toViewModel(assessment) as AssessmentVM;
    expect(vm.kind).toBe('assessment');
    expect(vm.score).toBe(43);
    expect(vm.byCategory).toHaveLength(6);
    expect(vm.counts.find((c) => c.severity === 'critical')?.count).toBe(1);
    expect(vm.findings[0]).toMatchObject({ severity: 'high', title: 'PHP 5.6 is end of life', recommendation: 'Move to PHP 8.4.' });
    expect(vm.dependencies).toEqual({ total: 3, checked: 3, vulnerable: 2, urgent: 1, approximateVersions: true });
    expect(vm.runtime.declared).toBe('^5.6');
    expect(vm.hosting).toEqual(['shared hosting']);
  });

  it('shapes a plan', () => {
    const vm = toViewModel(plan) as PlanVM;
    expect(vm.kind).toBe('plan');
    expect(vm.scoreBefore).toBe(43);
    expect(vm.scoreAfter).toBe(100);
    expect(vm.stages.map((s) => [s.automated, s.risk, s.scoreAfter])).toEqual([
      [true, 'low', 61],
      [false, 'high', 100]
    ]);
  });

  it('parses a JSON string', () => {
    expect(toViewModel(JSON.stringify(plan)).kind).toBe('plan');
  });

  it.each([null, undefined, [], {}, '', '   '])('returns empty for %j', (input) => {
    expect(toViewModel(input)).toEqual({ kind: 'empty' });
  });

  it('never throws on hostile input', () => {
    const evil = {
      get stages(): unknown {
        throw new Error('boom');
      }
    };
    expect(toViewModel(evil).kind).toBe('unknown');
  });

  it('tolerates missing optional fields', () => {
    const vm = toViewModel({ score: { overall: 70 }, topFindings: [{ title: 'Something', severity: 'weird' }, { nothing: 1 }, 'x'] }) as AssessmentVM;
    expect(vm.kind).toBe('assessment');
    expect(vm.stack).toBe('unknown');
    expect(vm.byCategory).toEqual([]);
    expect(vm.dependencies).toBeUndefined();
    expect(vm.hosting).toEqual([]);
    expect(vm.findings).toHaveLength(1);
    expect(vm.findings[0].severity).toBe('info');
    expect(vm.findings[0].evidence).toBeUndefined();
    const p = toViewModel({ stages: [{ title: 'Only title' }] }) as PlanVM;
    expect(p.stages[0]).toMatchObject({ index: 1, risk: 'medium', automated: false, steps: [] });
    expect(p.scoreAfter).toBeUndefined();
  });

  it('clamps scores to 0-100', () => {
    expect((toViewModel({ score: { overall: 250 } }) as AssessmentVM).score).toBe(100);
    expect((toViewModel({ score: { overall: 5, byCategory: { security: -5 } } }) as AssessmentVM).byCategory[0].score).toBe(0);
  });

  it('caps lists', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `f${i}`, severity: 'low', title: `Finding ${i}` }));
    const a = toViewModel({ score: { overall: 10 }, topFindings: many, findingCount: 30 }) as AssessmentVM;
    expect(a.findings).toHaveLength(MAX_FINDINGS);
    expect(a.findingCount).toBe(30);
    const stages = Array.from({ length: 20 }, (_, i) => ({ title: `S${i}`, steps: Array.from({ length: 20 }, (_, j) => `step ${j}`) }));
    const p = toViewModel({ stages }) as PlanVM;
    expect(p.stages).toHaveLength(MAX_STAGES);
    expect(p.stages[0].steps).toHaveLength(MAX_STEPS);
  });

  it('truncates very long strings', () => {
    const long = 'x'.repeat(5000);
    const a = toViewModel({ score: { overall: 10 }, topFindings: [{ title: long, evidence: long, recommendation: long }] }) as AssessmentVM;
    expect(a.findings[0].title.length).toBe(MAX_STRING);
    expect(a.findings[0].evidence!.length).toBe(MAX_STRING);
    expect(a.findings[0].recommendation!.length).toBe(MAX_STRING);
  });
});

describe('scoreBand', () => {
  it('maps thresholds', () => {
    expect([scoreBand(100), scoreBand(80), scoreBand(79), scoreBand(50), scoreBand(49)]).toEqual(['ok', 'ok', 'warn', 'warn', 'danger']);
  });
});

const applyResult = {
  stage: { id: 'patch-dependencies', index: 1, title: 'Patch vulnerable dependencies', risk: 'low' },
  applied: true,
  mode: 'projected',
  files: [{ path: 'composer.json', action: 'edit' }, { path: 'composer.lock', action: 'edit' }],
  scoreBefore: 17,
  scoreAfter: 41,
  scoreDelta: 24,
  findingsFixed: ['dep-vulnerable:guzzlehttp/guzzle', 'dep-vulnerable:symfony/http-kernel'],
  remaining: [{ id: 'php-runtime-eol', severity: 'high', title: 'PHP 7.2 is end of life' }],
  patch: 'x'.repeat(100000),
  howToApply: ['git apply fix.patch'],
  note: 'Projected from a throwaway copy.'
};

describe('toViewModel apply', () => {
  it('shapes an apply_stage result and drops the patch', () => {
    const vm = toViewModel(applyResult) as ApplyVM;
    expect(vm.kind).toBe('apply');
    expect(vm.mode).toBe('projected');
    expect([vm.scoreBefore, vm.scoreAfter, vm.scoreDelta]).toEqual([17, 41, 24]);
    expect(vm.stage).toEqual({ id: 'patch-dependencies', index: 1, title: 'Patch vulnerable dependencies', risk: 'low' });
    expect(vm.findingsFixed).toHaveLength(2);
    expect(vm.remaining[0]).toMatchObject({ severity: 'high', title: 'PHP 7.2 is end of life' });
    expect(vm.files).toEqual([{ path: 'composer.json', action: 'edit' }, { path: 'composer.lock', action: 'edit' }]);
    expect(vm.note).toBe('Projected from a throwaway copy.');
    expect(JSON.stringify(vm)).not.toContain('xxxxxxxx');
    expect('patch' in vm).toBe(false);
  });

  it('parses a JSON string', () => {
    expect(toViewModel(JSON.stringify(applyResult)).kind).toBe('apply');
  });

  it('caps lists but keeps the real counts', () => {
    const vm = toViewModel({
      ...applyResult,
      findingsFixed: Array.from({ length: 40 }, (_, i) => `f${i}`),
      remaining: Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, severity: 'low', title: `R${i}` })),
      files: Array.from({ length: 25 }, (_, i) => ({ path: `f${i}.php`, action: 'edit' }))
    }) as ApplyVM;
    expect(vm.findingsFixed).toHaveLength(MAX_FIXED);
    expect(vm.remaining).toHaveLength(MAX_REMAINING);
    expect(vm.files).toHaveLength(MAX_FILES);
    expect([vm.fixedCount, vm.remainingCount, vm.fileCount]).toEqual([40, 12, 25]);
  });

  it('tolerates garbage fields and long strings', () => {
    const long = 'y'.repeat(900);
    const vm = toViewModel({
      mode: 'projected',
      scoreBefore: 999,
      scoreAfter: -3,
      stage: 'oops',
      files: [null, 7, { path: long, action: 'zap' }, { action: 'edit' }],
      findingsFixed: [1, null, long, ''],
      remaining: ['x', { title: long, severity: 'nope' }, {}],
      note: long
    }) as ApplyVM;
    expect(vm.kind).toBe('apply');
    expect([vm.scoreBefore, vm.scoreAfter]).toEqual([100, 0]);
    expect(vm.stage).toMatchObject({ id: 'stage', risk: 'medium' });
    expect(vm.files).toHaveLength(1);
    expect(vm.files[0].path.length).toBe(MAX_STRING);
    expect(vm.files[0].action).toBe('edit');
    expect(vm.findingsFixed).toEqual([long.slice(0, MAX_STRING - 1) + '…']);
    expect(vm.remaining).toHaveLength(1);
    expect(vm.remaining[0].severity).toBe('info');
    expect(vm.note!.length).toBe(MAX_STRING);
  });

  it('never throws on hostile apply input', () => {
    const evil = {
      mode: 'projected',
      scoreBefore: 1,
      scoreAfter: 2,
      get files(): unknown {
        throw new Error('boom');
      }
    };
    expect(toViewModel(evil).kind).toBe('unknown');
  });

  it('does not mistake a plan or assessment for an apply result', () => {
    expect(toViewModel(plan).kind).toBe('plan');
    expect(toViewModel(assessment).kind).toBe('assessment');
    expect(toViewModel({ scoreBefore: 1, scoreAfter: 2 }).kind).toBe('unknown');
  });
});

describe('toViewModel plan (planning tool output)', () => {
  it('shapes a realistic plan_modernization result', () => {
    const vm = toViewModel({
      assessmentId: '1de79dab6aaa7982',
      stack: 'php',
      goal: 'modernize_all',
      scoreBefore: 17,
      scoreAfter: 92,
      stages: [
        { index: 1, id: 'patch-dependencies', title: 'Patch vulnerable dependencies', kind: 'dependencies', automated: true, risk: 'low', addresses: ['dep-vulnerable:guzzlehttp/guzzle'], steps: ['Bump guzzlehttp/guzzle to 7.9.2'], rollback: 'Revert composer.json.', scoreAfter: 41 },
        { index: 2, id: 'upgrade-runtime', title: 'Move to PHP 8.4', kind: 'runtime', automated: false, risk: 'high', addresses: [], steps: [], scoreAfter: 92 }
      ],
      hint: 'Call preview_changes with stage set to "patch-dependencies".'
    }) as PlanVM;
    expect(vm.kind).toBe('plan');
    expect([vm.scoreBefore, vm.scoreAfter]).toEqual([17, 92]);
    expect(vm.stages.map((s) => [s.id, s.automated, s.risk, s.scoreAfter])).toEqual([
      ['patch-dependencies', true, 'low', 41],
      ['upgrade-runtime', false, 'high', 92]
    ]);
    expect(vm.stages[0].rollback).toBe('Revert composer.json.');
    expect(vm.hint).toContain('preview_changes');
  });
});

describe('toViewModel report (generate_report output)', () => {
  const report = {
    reportId: 'a1b2c3d4e5f60718293a4b5c',
    score: { overall: 52, origin: 'measured' },
    findings: { total: 9, critical: 0, high: 3, medium: 4, low: 2, info: 0 },
    topFindings: [
      { severity: 'high', title: 'SQL query built from request input' },
      { severity: 'bogus', title: 'Odd severity' }
    ],
    pages: 8,
    files: [
      { format: 'pdf', label: 'PDF report', fileName: 'metamorph-report-a1b2c3d4.pdf', bytes: 180000, mimeType: 'application/pdf', uri: 'metamorph://report/x.pdf', downloadUrl: 'https://m.example.com/reports/x.pdf?t=abc' },
      { format: 'sarif', label: 'SARIF 2.1.0 findings', fileName: 'r.sarif', bytes: 900, mimeType: 'application/sarif+json', uri: 'metamorph://report/x.sarif', downloadPath: '/reports/x.sarif?t=abc' },
      { format: 'sbom', label: 'CycloneDX 1.5 SBOM', fileName: 'r.cdx.json', bytes: 2_000_000, mimeType: 'application/vnd.cyclonedx+json', uri: 'metamorph://report/x.cdx.json' }
    ],
    expiresInMinutes: 10,
    message: 'Download links (valid 10 minutes):'
  };

  it('is recognised before the assessment branch even though it has score.overall', () => {
    const vm = toViewModel(report) as ReportVM;
    expect(vm.kind).toBe('report');
    expect(vm.score).toBe(52);
    expect(vm.origin).toBe('measured');
    expect(vm.pages).toBe(8);
    expect(vm.findingTotal).toBe(9);
    expect(vm.counts.find((c) => c.severity === 'high')?.count).toBe(3);
    expect(vm.topFindings.map((t) => t.severity)).toEqual(['high', 'info']);
    expect(vm.files.map((f) => [f.format, f.sizeLabel])).toEqual([['pdf', '176 KB'], ['sarif', '900 B'], ['sbom', '1.9 MB']]);
    expect(vm.files[0].href).toBe('https://m.example.com/reports/x.pdf?t=abc');
    expect(vm.files[1].href).toBeUndefined();
    expect(vm.files[1].path).toBe('/reports/x.sarif?t=abc');
  });
  it('accepts only http(s) download links', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'nope']) {
      const vm = toViewModel({ ...report, files: [{ ...report.files[0], downloadUrl: bad }] }) as ReportVM;
      expect(vm.files[0].href).toBeUndefined();
    }
  });
  it('keeps inline copies only under the cap and only when well formed', () => {
    const ok = Buffer.from('%PDF-1.7').toString('base64');
    const f = (inline: unknown) => (toViewModel({ ...report, files: [{ ...report.files[0], downloadUrl: undefined, inline }] }) as ReportVM).files[0].inline;
    expect(f({ encoding: 'base64', data: ok })?.mimeType).toBe('application/pdf');
    expect(f({ encoding: 'base64', data: 'not*base64!' })).toBeUndefined();
    expect(f({ encoding: 'base64', data: 'A'.repeat(Math.ceil((MAX_INLINE_BYTES * 4) / 3) + 8) })).toBeUndefined();
    expect(f({ encoding: 'utf8', data: 'x'.repeat(MAX_INLINE_BYTES + 1) })).toBeUndefined();
    expect(f({ encoding: 'hex', data: 'ab' })).toBeUndefined();
  });
  it('caps files and findings, drops unknown formats, and never throws on junk', () => {
    const many = Array.from({ length: 8 }, () => report.files[0]);
    expect((toViewModel({ ...report, files: many }) as ReportVM).files).toHaveLength(3);
    expect((toViewModel({ ...report, files: [{ format: 'exe', bytes: 1 }] }) as ReportVM).files).toHaveLength(0);
    expect((toViewModel({ ...report, topFindings: Array.from({ length: 9 }, (_, i) => ({ severity: 'low', title: `t${i}` })) }) as ReportVM).topFindings).toHaveLength(3);
    expect(toViewModel({ reportId: 'x', files: 'nope', score: { overall: 1 } }).kind).toBe('assessment');
    expect(toViewModel({ reportId: 'x', files: [], score: null }).kind).toBe('unknown');
  });
  it('formats sizes', () => {
    expect([formatBytes(12), formatBytes(2048), formatBytes(3 * 1024 * 1024)]).toEqual(['12 B', '2 KB', '3.0 MB']);
  });
});

describe('kind detection: no kind shadows another', () => {
  const verify = { mode: 'measured', status: 'completed', verified: true, unverifiedReasons: [], patched: { status: 'completed', checks: [{ tool: 'tests', status: 'pass' }] }, baseline: { status: 'completed' } };
  const report = { reportId: 'a1b2c3d4e5f60718293a4b5c', score: { overall: 52, origin: 'measured' }, files: [], findings: { total: 0 } };
  const apply = { stage: { id: 's' }, files: [], mode: 'projected', scoreBefore: 1, scoreAfter: 2 };
  const samples: Array<[string, unknown]> = [['verify', verify], ['report', report], ['assessment', assessment], ['plan', plan], ['apply', apply]];
  it.each(samples)('%s is recognised as itself', (kind, sample) => {
    expect(toViewModel(sample).kind).toBe(kind);
    expect(toViewModel(JSON.stringify(sample)).kind).toBe(kind);
  });
  it('a report that also carries verify-like or plan-like fields stays a report', () => {
    expect(toViewModel({ ...report, verified: true, mode: 'measured', patched: {}, stages: [] }).kind).toBe('report');
  });
  it('a verify result with a score field is not an assessment', () => {
    expect(toViewModel({ ...verify, score: { overall: 10 } }).kind).toBe('verify');
  });
});
