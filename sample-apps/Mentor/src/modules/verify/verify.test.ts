/**
 * Tests for the verifier — MCP‑2's other algorithm.
 *
 * The cases that matter here are the ones where a naive implementation would accuse
 * a student of something they did not do. Marking a gate is easy; the hard parts are
 * all the ways a mark can be *wrong in a way that reads as authoritative*:
 *
 * - a whole-suite red run naming a criterion it cannot actually blame,
 * - a boundary component reported as missing work when the brief said not to build it,
 * - a green-then-red suite still showing green because an earlier pass was kept,
 * - a verdict computed against a design the student has already redrawn.
 *
 * Every one of those would be a confident wrong claim, which `MENTOR-CONCEPT.md` §10
 * argues is worse than saying nothing at all in an education product.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKPOINT_SPEC_SCHEMA,
  parseCheckpointSpec,
  planDigest,
  type BuildEvent,
  type CheckpointSpec,
} from '../../shared/contracts.js';
import { parsePlan, type Plan } from '../../shared/plan.js';
import { buildFromEvents, findStuck, verifyCheckpoints } from './verify.js';
import { assess } from './verdict.js';
import { __resetSessions, findSession, getSession, ingest, openSession } from './session.js';
import { VerifyTools } from './verify.module.js';

// ── builders ───────────────────────────────────────────────────────────────
//
// The shape of the real pricing seat, small enough to read in one screen: four owned
// components in a chain, one boundary component the frontend owns, one acceptance
// criterion.

const OWNED = ['validate', 'discount', 'tax', 'total'];

function plan(labels: string[] = [...OWNED, 'cart api']): Plan {
  const id = (l: string) => 'n-' + l.replace(/ /g, '-');
  return parsePlan({
    schema: 'lumina.plan/v1',
    name: 'pricing slice',
    nodes: labels.map((label, i) => ({
      id: id(label),
      type: 'component',
      label,
      position: { x: i * 200, y: 0 },
      data: { label, component: label },
    })),
    edges: labels.slice(1).map((label, i) => ({
      id: `e${i}`,
      source: id(labels[i]),
      target: id(label),
      sourceHandle: 'output',
      targetHandle: 'input',
    })),
    order: labels.map(id),
    entry: [id(labels[0])],
    terminal: [id(labels[labels.length - 1])],
    cyclic: false,
    warnings: [],
  });
}

/**
 * A spec of the shape MCP‑1 mints. Hand-written on purpose: MCP‑2 is a separate
 * deployment and parses this from JSON, so a test that imported MCP‑1's deriver
 * would be testing an integration this app is designed not to have.
 */
function spec(over: Partial<Record<string, unknown>> = {}, forPlan: Plan = plan()): CheckpointSpec {
  const gates = OWNED.map((subject, i) => ({
    id: `cp-${i + 1}`,
    seq: i + 1,
    kind: 'implement',
    subject,
    title: `Implement ${subject}`,
    proves: `${subject} does its one job`,
    blockedBy: OWNED.slice(0, i).map((_, j) => `cp-${j + 1}`),
    evidence: { kind: 'file', hint: 'build/pricing.js' },
  }));
  return parseCheckpointSpec({
    schema: CHECKPOINT_SPEC_SCHEMA,
    issued_by: 'mentor-roster/1.0.0 (MCP-1)',
    project: 'pricing',
    role: 'backend',
    student: 'sam',
    checkpoints: [
      ...gates,
      {
        id: 'cp-a1',
        seq: 5,
        kind: 'verify',
        subject: 'a1',
        title: 'Verify: tax is charged on the discounted amount',
        proves: 'a 40%-off cart is taxed on what is actually paid',
        blockedBy: gates.map((g) => g.id),
        evidence: { kind: 'test', hint: 'build/pricing.test.js' },
      },
    ],
    definition_of_done: 'all four built, the criterion passes, and the design covers the slice',
    owns: OWNED,
    given: ['cart api'],
    files: { entry: 'build/pricing.js', tests: 'build/pricing.test.js' },
    concept: { key: 'discount-before-tax', question: 'Why must tax follow the discount?' },
    plan_digest: planDigest(forPlan),
    warnings: [],
    ...over,
  });
}

let clock = 0;
function event(over: Partial<BuildEvent> & { kind: BuildEvent['kind'] }): Record<string, unknown> {
  clock += 7;
  return {
    schema: 'lumina.build_event/v1',
    at: `T+${String(clock).padStart(2, '0')}m`,
    component: null,
    checkpoint: null,
    file: 'build/pricing.js',
    line: null,
    summary: '',
    outcome: null,
    test_output: null,
    source: 'lumina',
    ...over,
  } as Record<string, unknown>;
}

const built = (component: string, line: number) =>
  event({ kind: 'component_built', component, line });
const suite = (outcome: 'pass' | 'fail') =>
  event({ kind: 'test_run', outcome, file: 'build/pricing.test.js', line: 40 });

/** Parse a batch the way a session would, without opening one. */
function events(...raw: Record<string, unknown>[]): BuildEvent[] {
  const holder = { events: [] as BuildEvent[], touchedAt: 0 } as never as Parameters<typeof ingest>[0];
  ingest(holder, raw);
  return holder.events;
}

/** The out-of-order history the whole demo is about: tax built before discount. */
const DRIFTED = () =>
  events(
    built('validate', 8),
    built('tax', 12),
    built('discount', 14),
    built('total', 17),
    suite('fail'),
  );

// ── marking the gates ──────────────────────────────────────────────────────

test('a green whole-suite run passes every acceptance gate', () => {
  const gates = verifyCheckpoints(
    spec(),
    events(...OWNED.map((c, i) => built(c, 8 + i)), suite('pass')),
  );
  const a1 = gates.find((g) => g.id === 'cp-a1')!;
  assert.equal(a1.status, 'pass');
  assert.ok(
    a1.evidence.some((e) => e.kind === 'test_run (whole suite)'),
    'the evidence should say it was a whole-suite run, not a named criterion',
  );
});

test('a red whole-suite run fails no criterion BY NAME', () => {
  const gates = verifyCheckpoints(spec(), DRIFTED());
  const a1 = gates.find((g) => g.id === 'cp-a1')!;
  // Something is red, but not which criterion — accusing one would be worse than
  // accusing none, because the student would go and look in the wrong place.
  assert.equal(a1.status, 'not_reached');
  assert.notEqual(a1.status, 'fail');
});

test('a suite that goes green then red takes its gates back — no stale pass', () => {
  const gates = verifyCheckpoints(
    spec(),
    events(...OWNED.map((c, i) => built(c, 8 + i)), suite('pass'), suite('fail')),
  );
  assert.equal(
    gates.find((g) => g.id === 'cp-a1')!.status,
    'not_reached',
    'a regression must not be masked by the earlier pass',
  );
});

test('out-of-order work is recorded against what had passed AT THE TIME, not blocked', () => {
  const gates = verifyCheckpoints(spec(), DRIFTED());
  const tax = gates.find((g) => g.subject === 'tax')!;
  const discount = gates.find((g) => g.subject === 'discount')!;

  assert.equal(tax.status, 'pass', 'building early still counts as built');
  assert.equal(tax.out_of_order, true);
  assert.deepEqual(tax.should_follow, ['discount']);
  // discount was built after tax but before nothing it depended on — it is the
  // component that got displaced, not the one that jumped the queue.
  assert.equal(discount.out_of_order, false);
});

test('a build event naming a component outside the spec is ignored, not an error', () => {
  const gates = verifyCheckpoints(spec(), events(built('receipt', 30), built('validate', 8)));
  assert.equal(gates.find((g) => g.subject === 'validate')!.status, 'pass');
  assert.ok(
    gates.every((g) => g.subject !== 'receipt'),
    'somebody else\'s component is not a gate of ours',
  );
});

// ── the history the drift engine reads ─────────────────────────────────────

test('buildFromEvents produces an observed history, and a test run is not a component', () => {
  const build = buildFromEvents(spec(), DRIFTED());
  assert.equal(build.provenance, 'observed');
  assert.deepEqual(
    build.steps.filter((s) => s.kind === 'implement').map((s) => s.component),
    ['validate', 'tax', 'discount', 'total'],
    'only component_built moves a component in the build order',
  );
  assert.equal(build.failure?.file, 'build/pricing.test.js');
  assert.equal(build.failure?.line, 40);
});

test('an unknown event source falls to observed, never up to git', () => {
  const mixed = buildFromEvents(
    spec(),
    events(
      { ...built('validate', 8), source: 'git' },
      { ...built('discount', 14), source: 'someone-said-so' },
    ),
  );
  assert.equal(mixed.provenance, 'observed', 'a mislabelled source must not inflate confidence');

  const allGit = buildFromEvents(
    spec(),
    events({ ...built('validate', 8), source: 'git' }, { ...built('discount', 14), source: 'git' }),
  );
  assert.equal(allGit.provenance, 'git');
});

test('only the LATEST red run becomes the failure the explanation links to', () => {
  const build = buildFromEvents(
    spec(),
    events(built('validate', 8), suite('fail'), built('discount', 14), suite('pass')),
  );
  assert.equal(build.failure, null, 'a failure they have since fixed is not what they are asking about');
});

// ── stuck ──────────────────────────────────────────────────────────────────

test('two failed attempts at one gate is stuck; a clean run is not', () => {
  const s = spec();
  const stream = events(
    built('validate', 8),
    event({ kind: 'checkpoint_claimed', checkpoint: 'cp-2', outcome: 'fail' }),
    event({ kind: 'checkpoint_claimed', checkpoint: 'cp-2', outcome: 'fail' }),
  );
  const stuck = findStuck(s, stream, verifyCheckpoints(s, stream));
  assert.equal(stuck?.checkpoint, 'cp-2');
  assert.match(stuck!.why, /counted, not inferred/);

  const clean = events(...OWNED.map((c, i) => built(c, 8 + i)), suite('pass'));
  assert.equal(
    findStuck(s, clean, verifyCheckpoints(s, clean)),
    null,
    'a tool that always finds something wrong is one a student learns to ignore',
  );
});

// ── the verdict ────────────────────────────────────────────────────────────

test('a boundary component is NOT reported as outstanding work', () => {
  const p = plan();
  const result = assess({ spec: spec({}, p), plan: p, events: DRIFTED(), finalise: true });

  assert.deepEqual(result.expectedUnbuilt, ['cart api']);
  assert.deepEqual(result.outsideTheSlice, [], 'a `given` box drawn as an edge is correct practice');
  assert.ok(
    !JSON.stringify(result.verdict.statement).includes('cart api'),
    'the one false accusation that would cost a student their trust on first contact',
  );
});

test('a component that is neither owned nor given IS reported as outside the slice', () => {
  const p = plan([...OWNED, 'cart api', 'receipt']);
  const result = assess({ spec: spec({}, p), plan: p, events: DRIFTED(), finalise: true });
  assert.deepEqual(result.outsideTheSlice, ['receipt']);
});

test('finalising a drifted build escalates, with the origin attached as file:line', () => {
  const p = plan();
  const result = assess({ spec: spec({}, p), plan: p, events: DRIFTED(), finalise: true });

  assert.equal(result.verdict.status, 'escalated');
  assert.equal(result.verdict.drift?.found, true);
  assert.equal(result.verdict.drift?.origin?.component, 'tax');
  assert.equal(result.verdict.drift?.origin?.shouldFollow, 'discount');
  assert.equal(result.verdict.drift?.origin?.file, 'build/pricing.js');
  assert.equal(result.verdict.drift?.origin?.line, 12);
  assert.equal(result.verdict.tests_green, false);
  assert.equal(result.verdict.provenance, 'observed');
});

test('the same facts un-finalised are a snapshot, and issue nothing', () => {
  const p = plan();
  const input = { spec: spec({}, p), plan: p, events: DRIFTED() };
  const snapshot = assess({ ...input, finalise: false });
  const final = assess({ ...input, finalise: true });

  assert.equal(snapshot.verdict.status, 'in_progress');
  assert.equal(final.verdict.status, 'escalated');
  // One analysis, two labels. A mid-build view that disagreed with the final verdict
  // about the same events would make both of them useless.
  assert.deepEqual(
    snapshot.verdict.checkpoints,
    final.verdict.checkpoints,
    'a snapshot and a verdict must never disagree about the same facts',
  );
});

test('a fully built, green slice completes', () => {
  const p = plan();
  const result = assess({
    spec: spec({}, p),
    plan: p,
    events: events(...OWNED.map((c, i) => built(c, 8 + i)), suite('pass')),
    finalise: true,
  });
  assert.equal(result.verdict.status, 'complete');
  assert.equal(result.verdict.implemented.reached, 4);
  assert.equal(result.verdict.verified.reached, 1);
});

test('an owned component with no gate blocks completion instead of shrinking done', () => {
  const p = plan();
  const short = spec({ owns: [...OWNED, 'rounding'] }, p);
  const result = assess({
    spec: short,
    plan: p,
    events: events(...OWNED.map((c, i) => built(c, 8 + i)), suite('pass')),
    finalise: true,
  });
  assert.equal(result.verdict.status, 'escalated');
  // MCP-1 and MCP-2 disagreeing about the slice is a bridge problem, and it must not
  // present as an unearned "complete".
  assert.equal(result.verdict.implemented.total, 4);
});

test('the verdict carries the concept KEY and QUESTION, and nothing that could be an answer', () => {
  const p = plan();
  const result = assess({ spec: spec({}, p), plan: p, events: DRIFTED(), finalise: true });
  assert.deepEqual(Object.keys(result.verdict.concept).sort(), ['key', 'question']);
  const wire = JSON.stringify(result.verdict);
  assert.ok(!/"back"/.test(wire), 'a card answer field has no business in a verdict');
  assert.ok(
    !/subtotal\s*\*|taxable\s*\*|\* *\(1 *-/.test(wire),
    'the verdict names where the mistake was made; it never contains the corrected line',
  );
});

// ── sessions ───────────────────────────────────────────────────────────────

test('reopening the same seat supersedes the abandoned session', () => {
  __resetSessions();
  const first = openSession({ spec: spec(), plan: plan(), student: 'sam' });
  ingest(first, [built('validate', 8)]);
  const second = openSession({ spec: spec(), plan: plan(), student: 'sam' });

  assert.notEqual(second.id, first.id);
  assert.equal(getSession(first.id), null, 'verifying against a design they abandoned is worse than nothing');
  assert.equal(findSession('sam', 'pricing')?.id, second.id);
});

test('a malformed event is rejected by index, and the rest of the batch survives', () => {
  __resetSessions();
  const session = openSession({ spec: spec(), plan: plan() });
  const result = ingest(session, [built('validate', 8), { kind: 'thinking_hard' }, built('tax', 12)]);

  assert.equal(result.accepted.length, 2);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].index, 1);
  assert.match(result.rejected[0].why, /expected one of/);
});

// ── the tool surface ───────────────────────────────────────────────────────

/**
 * Tool responses are unions of several literal shapes — an error branch, a refusal
 * branch, the real one. Read them as plain JSON, which is how a client sees them.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = (value: unknown) => value as Record<string, any>;

const ctx = () =>
  ({ logger: { info() {}, warn() {}, error() {}, debug() {} } }) as never as Parameters<
    VerifyTools['openSessionTool']
  >[1];

test('open_session refuses a spec derived from a different design', async () => {
  __resetSessions();
  const tools = new VerifyTools();
  const drawn = plan();
  // Same boxes, one edge fewer — a different ordering claim, so a different digest.
  const redrawn = parsePlan({ ...drawn, edges: drawn.edges.slice(1) });

  const out = (await tools.openSessionTool(
    { spec: spec({}, drawn), plan: redrawn },
    ctx(),
  )) as Record<string, unknown>;

  assert.equal(out.refused, true);
  assert.match(String(out.reason), /different orderings/);
  assert.match(String(out.what_to_do), /checkpoint_spec/);
});

test('open_session accepts a hand-written spec with no digest, and says what it cannot prove', async () => {
  __resetSessions();
  const tools = new VerifyTools();
  const out = (await tools.openSessionTool(
    { spec: spec({ plan_digest: '' }), plan: plan() },
    ctx(),
  )) as Record<string, unknown>;

  assert.ok((out.session as { id: string }).id);
  assert.match(String(out.spec_matches_plan), /cannot prove/);
});

test('build_event never refuses out-of-order work, and reports it the moment it happens', async () => {
  __resetSessions();
  const tools = new VerifyTools();
  const opened = (await tools.openSessionTool({ spec: spec(), plan: plan() }, ctx())) as {
    session: { id: string };
  };

  const out = (await tools.buildEvent(
    { session: opened.session.id, events: [built('validate', 8), built('tax', 12)] },
    ctx(),
  )) as Record<string, unknown>;

  assert.equal(out.accepted, 2);
  assert.deepEqual(out.rejected, []);
  assert.deepEqual(out.out_of_order, ['tax was reached before discount']);
});

test('a lost session is recoverable, and the error says how', async () => {
  __resetSessions();
  const tools = new VerifyTools();
  const out = (await tools.buildEvent({ session: 's-gone-1', events: [] }, ctx())) as Record<
    string,
    unknown
  >;
  assert.match(String(out.error), /no open session/);
  assert.match(String(out.what_to_do), /build_event takes a batch/);
});

test('build_verdict works with the artifacts inline, and matches the streamed path exactly', async () => {
  __resetSessions();
  const tools = new VerifyTools();
  const p = plan();
  const raw = [built('validate', 8), built('tax', 12), built('discount', 14), built('total', 17), suite('fail')];

  const opened = (await tools.openSessionTool({ spec: spec({}, p), plan: p }, ctx())) as {
    session: { id: string };
  };
  await tools.buildEvent({ session: opened.session.id, events: raw }, ctx());
  const streamed = json(await tools.buildVerdict(
    { session: opened.session.id, finalise: true },
    ctx(),
  ));

  const inline = json(await tools.buildVerdict(
    { spec: spec({}, p), plan: p, events: raw, finalise: true },
    ctx(),
  ));

  assert.equal(inline.status, 'escalated');
  assert.deepEqual(
    inline.verdict.checkpoints,
    streamed.verdict.checkpoints,
    'a client that holds its own history must get the same verdict as one that streamed it',
  );
  assert.equal(inline.verdict.drift.origin.line, streamed.verdict.drift.origin.line);
  assert.match(String(inline.driven_by), /no session/);
});

test('build_verdict withholds the fix and says where the answer lives', async () => {
  __resetSessions();
  const tools = new VerifyTools();
  const p = plan();
  const out = json(await tools.buildVerdict(
    { spec: spec({}, p), plan: p, events: DRIFTED(), finalise: true },
    ctx(),
  ));

  assert.equal(out.fix_withheld, true);
  assert.match(String(out.refusal), /\S/);
  assert.equal(out.next_question, 'Why does tax have to come after discount?');
  assert.match(String(out.concept.answer), /not held by this service/);
  assert.equal(out.concept.key, 'discount-before-tax');
  assert.equal(out.filed_with_profile, false, 'PROFILE_URL is unset under test');
  assert.equal(out.bridge.mode, 'absent');
});

test('no tool on this surface can modify a student\'s build', () => {
  const verbs = Object.getOwnPropertyNames(VerifyTools.prototype).filter((n) => n !== 'constructor');
  assert.deepEqual(verbs.sort(), ['buildEvent', 'buildVerdict', 'openSessionTool']);
  assert.ok(
    !verbs.some((v) => /patch|fix|heal|apply|write|edit/i.test(v)),
    'MCP-2 proves it cannot touch the source; a verb here that could would weaken that proof',
  );
});
