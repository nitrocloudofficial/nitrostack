/**
 * MENTOR end-to-end through the shared engine — and the refusal, tested as a
 * behaviour rather than trusted as a prompt instruction.
 *
 * The load-bearing test in this file is `awaitRecovery`: MENTOR resolving an
 * incident must mean "the explanation was delivered AND the student's code is
 * byte-identical". If anyone ever adds a tool here that writes to the build, the
 * engine escalates and this suite goes red.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../../core/engine.js';
import { aegisGuard } from '../aegis/trust.js';
import { MentorAdapter, REFUSAL, mentorPlanner } from './mentor.adapter.js';
import { MentorPrompts } from './mentor.module.js';
import { PRICING_BUILD_SOURCE, PRICING_SYMPTOM, requireBuild, requirePlan } from './fixtures.demo.js';
import { parsePlan, PlanParseError } from '../../shared/plan.js';
import { parseBuild, BuildParseError } from './build.js';

function run(sources = {}, opts: { approve?: boolean } = {}) {
  const trace: Array<{ type: string; title: string }> = [];
  const engine = new Engine(new MentorAdapter(sources), {
    planner: mentorPlanner(),
    approvalGate: () => opts.approve ?? true,
    guard: aegisGuard,
    onEvent: (e) => {
      trace.push({ type: e.type, title: e.title });
    },
  });
  return { engine, trace };
}

// ── the happy path ─────────────────────────────────────────────────────────
test('resolves the pricing demo end-to-end and names line 12', async () => {
  const { engine, trace } = run();
  const incident = await engine.runIncident(PRICING_SYMPTOM);

  assert.equal(incident.status, 'RESOLVED');
  assert.equal(incident.domain, 'education');
  assert.match(incident.diagnosis, /designed tax to come after discount/i);
  assert.match(incident.diagnosis, /pricing\.js:12/);

  const types = trace.map((t) => t.type);
  assert.ok(types.includes('plan.read'));
  assert.ok(types.includes('build.read'));
  assert.ok(types.includes('drift.found'));
  assert.ok(types.includes('grounding.checked'));
  assert.ok(types.includes('trust.checked'), 'AEGIS must gate the explanation too');
  assert.ok(types.includes('deploy.verified'));
  assert.ok(types.includes('incident.resolved'));
});

test('the confidence gate clears using the COMPUTED drift confidence', async () => {
  const { engine } = await Promise.resolve(run());
  const incident = await engine.runIncident(PRICING_SYMPTOM);
  assert.ok(incident.verdict);
  assert.equal(incident.verdict.autonomous, true);
  // agentConfidence is the drift score, not a planner constant.
  assert.equal(incident.verdict.components.agent.score, 0.91);
  // blastRadius is inverted for MENTOR: it carries claim confidence.
  assert.equal(incident.verdict.components.blastRadius.score, 0.91);
  assert.match(incident.verdict.components.blastRadius.reason, /no code modified/);
  assert.match(incident.verdict.components.blastRadius.reason, /wrong line is worse/);
});

test('the diff slot holds the plan-vs-build alignment, not a code patch', async () => {
  const { engine } = run();
  const incident = await engine.runIncident(PRICING_SYMPTOM);
  assert.match(incident.diff, /plan\s*:\s*validate -> discount -> tax -> total/);
  assert.match(incident.diff, /build:\s*validate -> tax -> discount -> total/);
  assert.ok(!/^\+\s*const /m.test(incident.diff), 'must not contain replacement source lines');
});

// ── the refusal ────────────────────────────────────────────────────────────
test('the report withholds the fix and offers a question instead', async () => {
  const { engine } = run();
  const incident = await engine.runIncident(PRICING_SYMPTOM);

  const kinds = incident.actions.map((a) => a.kind);
  assert.ok(kinds.includes('causal_timeline'));
  assert.ok(kinds.includes('fix_withheld'));
  assert.ok(kinds.includes('socratic_prompt'), 'the refusal must not dead-end the student');

  const withheld = incident.actions.find((a) => a.kind === 'fix_withheld');
  assert.equal(withheld?.mode, 'by_design');
  assert.equal(withheld?.reason, REFUSAL);

  const question = incident.actions.find((a) => a.kind === 'socratic_prompt');
  assert.match(String(question?.question), /why does tax have to come after discount/i);
});

test('request_fix refuses and records the attempt in the trace', async () => {
  const adapter = new MentorAdapter();
  const ctx = adapter.openContext('INC-TEST');
  const emitted: string[] = [];
  ctx.emit = (type) => void emitted.push(type);

  await adapter.executeTool(ctx, 'align', {});
  const result = await adapter.executeTool(ctx, 'request_fix', {});

  assert.equal(result.data.refused, true);
  assert.equal(result.data.reason, REFUSAL);
  assert.match(String(result.data.instead), /pricing\.js:12/);
  assert.match(String(result.data.instead), /why the plan put tax after discount/i);
  assert.ok(emitted.includes('fix.refused'), 'the refusal must be visible in the trace');
});

test('there is NO tool that can modify the student\'s build', async () => {
  const adapter = new MentorAdapter();
  const ctx = adapter.openContext('INC-TEST');
  ctx.emit = () => {};

  // Every plausible name a helpful model might reach for.
  for (const name of ['propose_patch', 'apply_fix', 'write_file', 'edit_source', 'patch', 'fix']) {
    const res = await adapter.executeTool(ctx, name, { content: 'malicious' });
    assert.equal(res.isError, true, `${name} must not exist`);
    assert.match(String(res.data.error), /unknown tool/);
  }
  // And the source is still what it was.
  const read = await adapter.executeTool(ctx, 'read_build_source', {});
  assert.equal(read.data.readonly, true);
  assert.equal(read.data.source, PRICING_BUILD_SOURCE);
});

test('awaitRecovery FAILS if the source was mutated — the refusal is enforced', async () => {
  const adapter = new MentorAdapter();
  const ctx = adapter.openContext('INC-TEST') as ReturnType<MentorAdapter['openContext']>;
  const emitted: string[] = [];
  ctx.emit = (type) => void emitted.push(type);

  assert.equal(await adapter.awaitRecovery(ctx), true, 'untouched source must pass');

  // Simulate a future regression where something edits the build.
  ctx.source = ctx.source.replace('subtotal * taxRate', 'taxable * taxRate');
  assert.equal(await adapter.awaitRecovery(ctx), false, 'a modified build must fail recovery');
  assert.ok(emitted.includes('deploy.failed'));
});

test('deploy promotes an explanation, never a code change', async () => {
  const adapter = new MentorAdapter();
  const ctx = adapter.openContext('INC-TEST');
  ctx.emit = () => {};
  const promoted = await adapter.deploy(ctx);
  assert.equal(promoted.length, 1);
  assert.match(promoted[0], /explanation only/);
  assert.match(promoted[0], /no code changed/);
});

// ── the engine contract ────────────────────────────────────────────────────
test('submit is blocked until grounding passes', async () => {
  const trace: Array<{ type: string; title: string }> = [];
  // A planner that tries to submit before ever checking grounding.
  let step = 0;
  const engine = new Engine(new MentorAdapter(), {
    planner: () => {
      step++;
      if (step === 1) return { type: 'submit', resolution: { rootCause: 'x', fixSummary: 'y', confidence: 0.9 } };
      if (step === 2) return { type: 'tool', name: 'align' };
      if (step === 3) return { type: 'tool', name: 'check_grounding' };
      if (step === 4) return { type: 'submit', resolution: { rootCause: 'x', fixSummary: 'y', confidence: 0.9 } };
      return null;
    },
    approvalGate: () => true,
    guard: aegisGuard,
    onEvent: (e) => {
      trace.push({ type: e.type, title: e.title });
    },
  });

  const incident = await engine.runIncident(PRICING_SYMPTOM);
  assert.ok(
    trace.some((t) => t.type === 'tool.blocked'),
    'the engine must refuse an ungrounded submission',
  );
  assert.equal(incident.status, 'RESOLVED', 'and then allow it once grounded');
});

test('reloading an artifact invalidates grounding (mutationTools)', () => {
  const adapter = new MentorAdapter();
  assert.ok(adapter.mutationTools.has('load_plan'));
  assert.ok(adapter.mutationTools.has('load_build'));
  assert.equal(adapter.verifyTool, 'check_grounding');
  assert.equal(adapter.verificationPassed({ grounded: true }), true);
  assert.equal(adapter.verificationPassed({ grounded: false }), false);
  assert.equal(adapter.verificationPassed({ passed: true }), false);
});

// ── a student's own project ────────────────────────────────────────────────
test('accepts a caller-supplied plan and build instead of the bundled demo', async () => {
  const studentPlan = {
    schema: 'lumina.plan/v1',
    name: 'My scraper',
    nodes: [
      { id: 'a', type: 'script', label: 'fetch', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'script', label: 'parse', position: { x: 100, y: 0 }, data: {} },
      { id: 'c', type: 'script', label: 'save', position: { x: 200, y: 0 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ],
    order: ['a', 'b', 'c'],
    entry: ['a'],
    terminal: ['c'],
    cyclic: false,
    warnings: [],
  };
  const studentBuild = {
    schema: 'mentor.build/v1',
    project: 'scraper',
    entry: 'scrape.py',
    tests: 'test_scrape.py',
    provenance: 'git',
    steps: [
      { seq: 1, at: 'T+02m', component: 'fetch', kind: 'implement', file: 'scrape.py', line: 4, summary: '' },
      { seq: 2, at: 'T+09m', component: 'save', kind: 'implement', file: 'scrape.py', line: 21, summary: '' },
      { seq: 3, at: 'T+15m', component: 'parse', kind: 'implement', file: 'scrape.py', line: 11, summary: '' },
    ],
    failure: { test: 'test_saves_rows', file: 'test_scrape.py', line: 30, message: 'saved 0 rows' },
  };

  const { engine } = run({ plan: studentPlan, build: studentBuild, source: 'print("hi")\n' });
  const incident = await engine.runIncident('test_saves_rows fails: saved 0 rows');

  assert.equal(incident.status, 'RESOLVED');
  assert.match(incident.diagnosis, /designed save to come after parse/i);
  assert.match(incident.diagnosis, /scrape\.py:21/);
});

test('accepts artifacts as JSON strings as well as objects', () => {
  const asObject = parsePlan(requirePlan() as unknown as Record<string, unknown>);
  assert.equal(asObject.order.length, 4);
  const asString = parseBuild(JSON.stringify({
    schema: 'mentor.build/v1',
    project: 'p',
    provenance: 'git',
    steps: [{ seq: 1, component: 'a', kind: 'implement', file: 'f', line: 1, summary: '' }],
    failure: null,
  }));
  assert.equal(asString.steps.length, 1);
});

// ── refusing junk rather than guessing ─────────────────────────────────────
test('rejects a plan with the wrong schema, pointing at the fix', () => {
  assert.throws(
    () => parsePlan({ schema: 'nodered/v1', nodes: [], order: [] }),
    (err: unknown) => {
      assert.ok(err instanceof PlanParseError);
      assert.match(err.message, /expected lumina\.plan\/v1/);
      assert.match(err.message, /Plan button/, 'tell the student how to produce a valid one');
      return true;
    },
  );
});

test('rejects a plan whose order does not cover its nodes', () => {
  assert.throws(
    () =>
      parsePlan({
        schema: 'lumina.plan/v1',
        nodes: [
          { id: 'a', label: 'a', position: { x: 0, y: 0 }, data: {} },
          { id: 'b', label: 'b', position: { x: 1, y: 0 }, data: {} },
        ],
        edges: [],
        order: ['a'],
      }),
    /order lists 1 of 2 node/,
  );
});

test('rejects a build history with no usable steps', () => {
  assert.throws(
    () => parseBuild({ schema: 'mentor.build/v1', steps: [{ kind: 'implement' }] }),
    (err: unknown) => {
      assert.ok(err instanceof BuildParseError);
      assert.match(err.message, /no usable steps/);
      return true;
    },
  );
});

test('an ungrounded claim escalates rather than pointing at a line', async () => {
  // A plan whose single node was never built: nothing to align, nothing to claim.
  const emptyish = {
    schema: 'lumina.plan/v1',
    name: 'stub',
    nodes: [{ id: 'a', type: 'script', label: 'only', position: { x: 0, y: 0 }, data: {} }],
    edges: [],
    order: ['a'],
    entry: ['a'],
    terminal: ['a'],
    cyclic: true, // cyclic → grounding must refuse
    warnings: [],
  };
  const someBuild = {
    schema: 'mentor.build/v1',
    project: 'x',
    provenance: 'git',
    steps: [{ seq: 1, component: 'only', kind: 'implement', file: 'f.js', line: 1, summary: '' }],
    failure: null,
  };
  const { engine, trace } = run({ plan: emptyish, build: someBuild, source: 'x' });
  const incident = await engine.runIncident('something broke');

  assert.equal(incident.status, 'ESCALATED');
  assert.ok(trace.some((t) => t.type === 'grounding.checked' && /NOT grounded/.test(t.title)));
  const abstained = incident.actions.find((a) => a.kind === 'mentor_abstained');
  assert.ok(abstained, 'MENTOR must say it does not know rather than guess');
  assert.match(String(abstained?.message), /could not locate the drift/i);
});

/**
 * The prompt contract, which nothing tested until an end-to-end MCP sweep hit
 * `prompts/get` and got `Invalid prompt message role: 'undefined'`.
 *
 * @nitrostack/core's `normalizePromptResponse` does:
 *     const arrayResult = Array.isArray(result) ? result : [result];
 *     return arrayResult.map(validateMessageFormat);
 *
 * So returning `{ messages: [...] }` makes the framework treat the *wrapper* as
 * a single message, whose `role` is undefined — and the prompt fails at runtime
 * while compiling perfectly. The contract is an array of messages. These
 * assertions mirror `validateMessageFormat` exactly.
 */
test('debugging_tutor returns the array-of-messages shape the framework requires', async () => {
  const result: any = await new MentorPrompts().debuggingTutor(
    { symptom: 'my pricing test fails' },
    {} as any,
  );

  assert.ok(
    Array.isArray(result),
    'must return an array of messages, not { messages: [...] } — see the comment above',
  );
  assert.ok(result.length > 0, 'must return at least one message');

  for (const msg of result) {
    assert.ok(
      ['user', 'assistant', 'system'].includes(msg.role),
      `role must be user|assistant|system, got '${msg.role}'`,
    );
    assert.equal(typeof msg.content, 'string', 'content must be a string');
    assert.ok(msg.content.length > 0, 'content must not be empty');
  }
});

test('debugging_tutor carries the symptom and the refusal instruction', async () => {
  const result: any = await new MentorPrompts().debuggingTutor(
    { symptom: 'discounted orders are overcharged' },
    {} as any,
  );
  const text = result.map((m: any) => m.content).join('\n');

  assert.match(text, /discounted orders are overcharged/, 'the symptom reaches the model');
  assert.match(text, /explain_drift/, 'it tells the model which tool to call');
  assert.match(text, /withhold_fix/, 'it routes fix requests to the refusal');
  assert.match(text, /NOT write/, 'the refusal is stated, not implied');
});
