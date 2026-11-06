import { describe, expect, it } from 'vitest';
import { echoOf } from '../../src/modules/assessment/echo.js';
import { toViewModel, type ApplyVM, type AssessmentVM, type PlanVM, type ReportVM, type VerifyVM } from '../../src/widgets/lib/view-model.js';

const SHA = '9f3c2ab41d0e5a6b7c8d9e0f1a2b3c4d5e6f7a8b';
const NOW = new Date('2026-11-01T10:00:00Z');

describe('echoOf (server echo of the validated input)', () => {
  it('rebuilds a plain repository link, keeps the subfolder, the commit and the time', () => {
    const e = echoOf({ repo_url: 'https://github.com/acme/legacy-app', subfolder: 'apps/api' }, SHA, NOW);
    expect(e).toEqual({ input: { repo_url: 'https://github.com/acme/legacy-app', subfolder: 'apps/api' }, commit: SHA, generatedAt: '2026-11-01T10:00:00.000Z' });
  });

  it('keeps a /tree/<branch> link as the branch it is', () => {
    expect(echoOf({ repo_url: 'https://github.com/acme/legacy-app/tree/main' }, undefined, NOW).input?.repo_url).toBe('https://github.com/acme/legacy-app/tree/main');
  });

  it('never echoes a URL that carries credentials, a query or a fragment', () => {
    for (const url of ['https://ghp_SECRET123@github.com/acme/app', 'https://user:pw@github.com/acme/app', 'https://github.com/acme/app?token=SECRET', 'https://github.com/acme/app#SECRET']) {
      const e = echoOf({ repo_url: url }, undefined, NOW);
      expect(e.input).toBeUndefined();
      expect(JSON.stringify(e)).not.toMatch(/SECRET|ghp_|pw/);
    }
  });

  it('drops a commit that is not a hex sha', () => {
    expect(echoOf({ repo_url: 'https://github.com/acme/app' }, 'ref main (not a sha)', NOW).commit).toBeUndefined();
  });

  it('only ever has the keys input, commit and generatedAt, so no token field can be added by accident', () => {
    const e = echoOf({ repo_url: 'https://github.com/acme/app', approval_token: 'TOKEN', api_key: 'KEY' } as never, SHA, NOW);
    expect(Object.keys(e).sort()).toEqual(['commit', 'generatedAt', 'input']);
    expect(JSON.stringify(e)).not.toMatch(/TOKEN|KEY/);
  });
});

describe('view model reads the echo for every result kind', () => {
  const echo = { input: { repo_url: 'https://github.com/acme/app', subfolder: 'apps/api' }, commit: SHA, generatedAt: NOW.toISOString() };
  const expectEcho = (vm: { repoUrl?: string; subfolder?: string; commit?: string; generatedAt?: string }) => {
    expect(vm.repoUrl).toBe('https://github.com/acme/app');
    expect(vm.subfolder).toBe('apps/api');
    expect(vm.commit).toBe(SHA);
    expect(vm.generatedAt).toBe(NOW.toISOString());
  };

  it('assessment', () => {
    expectEcho(toViewModel({ stack: 'php', score: { overall: 40, counts: {} }, ...echo }) as AssessmentVM);
  });
  it('plan', () => {
    expectEcho(toViewModel({ stack: 'php', goal: 'modernize_all', stages: [], ...echo }) as PlanVM);
  });
  it('apply', () => {
    const vm = toViewModel({ stage: { id: 's', title: 'S' }, mode: 'projected', scoreBefore: 10, scoreAfter: 20, files: [], ...echo }) as ApplyVM;
    expect(vm.kind).toBe('apply');
    expectEcho(vm);
  });
  it('verify', () => {
    const vm = toViewModel({ mode: 'measured', status: 'completed', verified: false, unverifiedReasons: ['x'], patched: { status: 'completed' }, baseline: { status: 'completed' }, ...echo }) as VerifyVM;
    expect(vm.kind).toBe('verify');
    expectEcho(vm);
  });
  it('report', () => {
    const vm = toViewModel({ reportId: 'r1', score: { overall: 50 }, findings: { total: 0 }, files: [], ...echo }) as ReportVM;
    expect(vm.kind).toBe('report');
    expectEcho(vm);
  });

  it('drops an echoed URL with credentials or a query, and a commit that is not hex', () => {
    for (const url of ['https://tok@github.com/a/b', 'https://github.com/a/b?token=SECRET']) {
      const vm = toViewModel({ stack: 'php', score: { overall: 40, counts: {} }, input: { repo_url: url }, commit: 'not-a-sha' }) as AssessmentVM;
      expect(vm.repoUrl).toBeUndefined();
      expect(vm.commit).toBeUndefined();
      expect(JSON.stringify(vm)).not.toMatch(/SECRET|tok@/);
    }
  });

  it('never copies a token or key from the result into the view model', () => {
    const secretish = { approvalToken: 'APPROVAL-TOKEN-VALUE', approval_token: 'APPROVAL-TOKEN-VALUE', apiKey: 'KEY-VALUE', token: 'TOKEN-VALUE', downloadToken: 'TOKEN-VALUE' };
    const results = [
      { stack: 'php', score: { overall: 40, counts: {} }, ...echo, ...secretish },
      { stack: 'php', goal: 'x', stages: [{ title: 'a', ...secretish }], ...echo, ...secretish },
      { stage: { id: 's', title: 'S' }, mode: 'projected', scoreBefore: 1, scoreAfter: 2, files: [], ...echo, ...secretish },
      { mode: 'measured', status: 'completed', verified: true, unverifiedReasons: [], patched: { status: 'completed', ...secretish }, baseline: { status: 'completed' }, ...echo, ...secretish }
    ];
    for (const r of results) expect(JSON.stringify(toViewModel(r))).not.toMatch(/TOKEN-VALUE|KEY-VALUE/);
  });
});
