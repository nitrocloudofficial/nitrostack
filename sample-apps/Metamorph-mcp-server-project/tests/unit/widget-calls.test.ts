import { describe, expect, it } from 'vitest';
import { assessCall, clock, countdownStart, nextCallAfterAssessment, previewCall, reportCall, reportFromRuns, resumeCall, secondsLeft, verifyCall } from '../../src/widgets/lib/calls.js';

const echo = { repoUrl: 'https://github.com/acme/app', subfolder: 'apps/api' };

describe('calls composed from the echoed input', () => {
  it('is complete only when the repository URL is known, else shows a placeholder', () => {
    expect(nextCallAfterAssessment(echo)).toMatchObject({ tool: 'plan_modernization', complete: true, args: { repo_url: 'https://github.com/acme/app', subfolder: 'apps/api' } });
    const none = nextCallAfterAssessment({});
    expect(none.complete).toBe(false);
    expect(none.text).toContain('OWNER/REPO');
    expect(none.args).toEqual({});
  });

  it('preview_changes carries the stage and the goal', () => {
    const c = previewCall({ ...echo, goal: 'modernize_all' }, { id: 'patch-dependencies' });
    expect(c.args).toEqual({ repo_url: 'https://github.com/acme/app', subfolder: 'apps/api', stage: 'patch-dependencies', goal: 'modernize_all' });
    expect(c.complete).toBe(true);
  });

  it('verify_patch is never complete: it needs a fresh approval token, which the widget does not have', () => {
    const c = verifyCall({ ...echo, stage: { id: 'patch-dependencies', title: 'x', risk: 'low' } });
    expect(c.complete).toBe(false);
    expect(c.args).not.toHaveProperty('approval_token');
    expect(c.text).toContain('<approvalToken from preview_changes>');
  });

  it('report and re-assess calls reuse the echo', () => {
    expect(reportCall(echo).text).toBe('generate_report {"repo_url":"https://github.com/acme/app","subfolder":"apps/api"}');
    expect(assessCall({ repoUrl: echo.repoUrl }).args).toEqual({ repo_url: echo.repoUrl });
  });

  it('resumes a verification from run ids, and records runs in a report', () => {
    const vm = { patched: { status: 'running' as const, runId: '11' }, baseline: { status: 'running' as const, runId: '12' } };
    expect(resumeCall(vm)?.args).toEqual({ run_id: '11', baseline_run_id: '12' });
    expect(resumeCall({ patched: { status: 'failed' }, baseline: { status: 'failed' } })).toBeUndefined();
    expect(reportFromRuns({ ...vm, ...echo }).text).toContain('"runner_run_ids":{"baseline":"12","patched":"11"}');
  });

  it('never puts a token field in any call', () => {
    const all = [nextCallAfterAssessment(echo), previewCall({ ...echo, goal: 'g' }, { id: 's' }), reportCall(echo), assessCall(echo)];
    for (const c of all) expect(Object.keys(c.args).join()).not.toMatch(/token|key|secret/i);
  });
});

describe('expiry countdown', () => {
  const t0 = Date.parse('2026-11-01T10:00:00Z');
  it('counts down and stops at zero', () => {
    expect(secondsLeft(t0, 10, t0)).toBe(600);
    expect(secondsLeft(t0, 10, t0 + 90_500)).toBe(510);
    expect(secondsLeft(t0, 10, t0 + 600_000)).toBe(0);
    expect(secondsLeft(t0, 10, t0 + 9_000_000)).toBe(0);
  });
  it('formats as m:ss with fixed digits', () => {
    expect(clock(600)).toBe('10:00');
    expect(clock(61)).toBe('1:01');
    expect(clock(0)).toBe('0:00');
    expect(clock(-5)).toBe('0:00');
  });
  it('starts from the server time only when it is recent and not in the future', () => {
    expect(countdownStart('2026-11-01T09:58:00Z', 10, t0)).toBe(Date.parse('2026-11-01T09:58:00Z'));
    expect(countdownStart('2026-10-31T09:58:00Z', 10, t0)).toBe(t0); // old: a fresh link must not look expired
    expect(countdownStart('2026-11-01T10:05:00Z', 10, t0)).toBe(t0); // future: clock skew
    expect(countdownStart(undefined, 10, t0)).toBe(t0);
    expect(countdownStart('not a date', 10, t0)).toBe(t0);
  });
});
