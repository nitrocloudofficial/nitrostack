/**
 * Engine spine tests — domain-agnostic, offline (no NitroStack, no model).
 * Run: npm run build && node --test dist/core/engine.test.js
 *
 * Mirrors the verified Python suite: proves the lifecycle (autonomous, HITL
 * approve, HITL reject, verify-gate, give-up) with a stub adapter + a scripted
 * planner, so every real adapter a teammate writes inherits a trusted engine.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Engine } from './engine.js';
import type { EngineAction, Planner } from './engine.js';
import type { DomainAdapter, IncidentContext } from './adapter.js';
import type { BlastRadius, Incident, ToolResult } from './types.js';

interface StubCtx extends IncidentContext {
  mutated: boolean;
  deployed: boolean;
}

class StubAdapter implements DomainAdapter {
  readonly key = 'stub';
  readonly displayName = 'Stub';
  readonly tagline = '';
  readonly submitTool = 'submit';
  readonly verifyTool = 'verify';
  readonly mutationTools = new Set(['mutate']);

  constructor(private readonly blastScore = 1.0) {}

  systemPrompt(): string { return 'stub'; }
  framing(s: string): string { return s; }

  openContext(incidentId: string): StubCtx {
    return { incidentId, emit: () => {}, mutated: false, deployed: false };
  }

  async executeTool(ctx: IncidentContext, name: string): Promise<ToolResult> {
    const c = ctx as StubCtx;
    if (name === 'observe') return { data: { info: 'observed' } };
    if (name === 'mutate') {
      c.mutated = true;
      await c.emit('patch.applied', 'mutated', { diff: '- old\n+ new' });
      return { data: { mutated: true } };
    }
    if (name === 'verify') {
      await c.emit('tests.result', 'verify', { passed: c.mutated, output: 'ok' });
      return { data: { passed: c.mutated } };
    }
    return { data: { error: `unknown ${name}` }, isError: true };
  }

  verificationPassed(result: Record<string, unknown>): boolean { return result.passed === true; }
  blastRadius(): BlastRadius { return { score: this.blastScore, reason: 'stub blast' }; }
  diff(): string { return 'stub diff'; }
  async deploy(ctx: IncidentContext): Promise<string[]> { (ctx as StubCtx).deployed = true; return ['stub-unit']; }
  async awaitRecovery(ctx: IncidentContext): Promise<boolean> { await ctx.emit('deploy.verified', 'recovered'); return true; }
  async report(): Promise<Array<Record<string, unknown>>> { return [{ kind: 'noop' }]; }
}

function scriptPlanner(actions: Array<EngineAction | null>): Planner {
  let i = 0;
  return () => (i < actions.length ? actions[i++] : null);
}

const mutate: EngineAction = { type: 'tool', name: 'mutate' };
const verify: EngineAction = { type: 'tool', name: 'verify' };
const submit = (confidence: number, fixSummary = 'fixed it'): EngineAction => ({
  type: 'submit',
  resolution: { rootCause: 'rc', fixSummary, confidence },
});

test('autonomous resolution when confidence is high', async () => {
  const engine = new Engine(new StubAdapter(1.0), {
    planner: scriptPlanner([mutate, verify, submit(0.95)]),
  });
  const inc: Incident = await engine.runIncident('something broke');
  assert.equal(inc.status, 'RESOLVED');
  assert.equal(inc.verdict?.autonomous, true);
  assert.equal(inc.iterations, 1);
  assert.equal(inc.fixSummary, 'fixed it');
});

test('low confidence pauses, then human approves → resolved', async () => {
  const engine = new Engine(new StubAdapter(0.0), {
    planner: scriptPlanner([mutate, verify, submit(0.3, 'risky fix')]),
    approvalGate: (inc) => { inc.approvalNote = 'lgtm'; return true; },
  });
  const inc = await engine.runIncident('broke');
  assert.equal(inc.verdict?.autonomous, false);
  assert.equal(inc.status, 'RESOLVED');
  assert.equal(inc.approvalNote, 'lgtm');
});

test('human rejection escalates', async () => {
  const engine = new Engine(new StubAdapter(0.0), {
    planner: scriptPlanner([mutate, verify, submit(0.1)]),
    approvalGate: () => false,
  });
  const inc = await engine.runIncident('broke');
  assert.equal(inc.status, 'ESCALATED');
});

test('submit is blocked until a passing verify', async () => {
  const engine = new Engine(new StubAdapter(1.0), {
    planner: scriptPlanner([submit(0.9, 'premature'), mutate, verify, submit(0.9, 'verified')]),
  });
  const inc = await engine.runIncident('broke');
  assert.equal(inc.status, 'RESOLVED');
  assert.equal(inc.fixSummary, 'verified');
});

test('an unsafe action is blocked by the guard even at high confidence', async () => {
  const engine = new Engine(new StubAdapter(1.0), {
    planner: scriptPlanner([mutate, verify, submit(0.99)]),
    guard: () => ({ safe: false, reason: 'dangerous_command', trustScore: 0.25 }),
  });
  const inc = await engine.runIncident('broke');
  assert.equal(inc.status, 'ESCALATED'); // never deployed despite 0.99 confidence
});

test('a safe guard lets the deploy proceed', async () => {
  const engine = new Engine(new StubAdapter(1.0), {
    planner: scriptPlanner([mutate, verify, submit(0.95)]),
    guard: () => ({ safe: true, reason: 'no issues', trustScore: 1 }),
  });
  const inc = await engine.runIncident('broke');
  assert.equal(inc.status, 'RESOLVED');
});

test('planner giving up escalates', async () => {
  const engine = new Engine(new StubAdapter(1.0), {
    planner: scriptPlanner([null]),
  });
  const inc = await engine.runIncident('broke');
  assert.equal(inc.status, 'ESCALATED');
});
