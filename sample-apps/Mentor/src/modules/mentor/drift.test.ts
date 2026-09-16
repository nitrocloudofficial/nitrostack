/**
 * Tests for the drift detector — MENTOR's one real algorithm.
 *
 * The cases that matter are the ones where a naive implementation would point at
 * the wrong line, because `MENTOR-CONCEPT.md` §10 is explicit that a confidently
 * wrong line is worse than useless in education. So: which of two displaced
 * components is the origin, plans that state no order at all, and plans that were
 * never connected in the first place.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDrift } from './drift.js';
import { parsePlan, type Plan } from '../../shared/plan.js';
import { parseBuild, type Build } from './build.js';
import { requireBuild, requirePlan } from './fixtures.demo.js';

// ── builders ───────────────────────────────────────────────────────────────
function plan(labels: string[], edges: Array<[number, number]>, opts: { cyclic?: boolean } = {}): Plan {
  return parsePlan({
    schema: 'lumina.plan/v1',
    name: 'test plan',
    nodes: labels.map((label, i) => ({
      id: `n${i}`,
      type: 'script',
      label,
      position: { x: i * 100, y: 0 },
      data: {},
    })),
    edges: edges.map(([a, b], i) => ({ id: `e${i}`, source: `n${a}`, target: `n${b}` })),
    order: labels.map((_, i) => `n${i}`),
    entry: ['n0'],
    terminal: [`n${labels.length - 1}`],
    cyclic: opts.cyclic ?? false,
    warnings: [],
  });
}

function build(
  components: string[],
  opts: { provenance?: 'git' | 'authored'; failFile?: string } = {},
): Build {
  return parseBuild({
    schema: 'mentor.build/v1',
    project: 'test',
    entry: 'src/x.js',
    tests: 'src/x.test.js',
    provenance: opts.provenance ?? 'git',
    steps: components.map((component, i) => ({
      seq: i + 1,
      at: `T+0${i}m`,
      component,
      kind: 'implement',
      file: 'src/x.js',
      line: (i + 1) * 10,
      summary: `built ${component}`,
    })),
    failure: {
      test: 'the failing one',
      file: opts.failFile ?? 'src/x.js',
      line: 99,
      message: 'boom',
    },
  });
}

// ── the origin rule ────────────────────────────────────────────────────────
test('names the component that jumped the queue, not the one it displaced', () => {
  // Plan a→b→c→d, built a,c,b,d. Both b and c are out of position; only c was
  // built before something the plan said must precede it.
  const report = findDrift(plan(['a', 'b', 'c', 'd'], [[0, 1], [1, 2], [2, 3]]), build(['a', 'c', 'b', 'd']));
  assert.ok(report.origin, 'expected a drift');
  assert.equal(report.origin.component, 'c', 'c jumped ahead of b — c is the cause, b is the symptom');
  assert.equal(report.origin.shouldFollow, 'b');
  assert.equal(report.origin.plannedPosition, 3);
  assert.equal(report.origin.actualPosition, 2);
  assert.equal(report.origin.dependency, 'direct');
});

test('a build in the planned order reports no drift, and says so usefully', () => {
  const report = findDrift(plan(['a', 'b', 'c'], [[0, 1], [1, 2]]), build(['a', 'b', 'c']));
  assert.equal(report.origin, null);
  assert.equal(report.violations.length, 0);
  assert.match(report.explanation, /followed your plan/i);
  assert.match(report.explanation, /inside one component/i, 'should redirect, not shrug');
});

test('the origin is the EARLIEST violation when several components drift', () => {
  // Plan a→b→c→d; built d,c,b,a — everything reversed. The first thing built
  // that broke a stated dependency is d.
  const report = findDrift(plan(['a', 'b', 'c', 'd'], [[0, 1], [1, 2], [2, 3]]), build(['d', 'c', 'b', 'a']));
  assert.ok(report.origin);
  assert.equal(report.origin.component, 'd');
  assert.equal(report.origin.actualPosition, 1);
});

test('a transitive dependency is drift, but flagged as weaker than a direct edge', () => {
  // Plan a→b→c: a orders c only through b.
  const report = findDrift(plan(['a', 'b', 'c'], [[0, 1], [1, 2]]), build(['c', 'a', 'b']));
  assert.ok(report.origin);
  assert.equal(report.origin.component, 'c');
  assert.equal(report.origin.dependency, 'transitive');
  const direct = findDrift(plan(['a', 'b'], [[0, 1]]), build(['b', 'a']));
  assert.ok(
    direct.confidence.score > report.confidence.score,
    'a direct edge must be more confident than a transitive path',
  );
});

// ── refusing to claim drift that isn't there ───────────────────────────────
test('does NOT claim drift when the plan never connected the two components', () => {
  // Four boxes, no edges. `order` is canvas position only, so building them in
  // any sequence violates nothing the student actually stated.
  const report = findDrift(plan(['a', 'b', 'c', 'd'], []), build(['d', 'c', 'b', 'a']));
  assert.equal(report.origin, null, 'layout order is not intent');
  assert.ok(
    report.caveats.some((c) => /never connected them/.test(c)),
    'should explain why it declined to claim drift',
  );
});

test('a partially-connected plan only claims drift on the connected part', () => {
  // a→b is stated; c and d float free.
  const report = findDrift(plan(['a', 'b', 'c', 'd'], [[0, 1]]), build(['d', 'b', 'a', 'c']));
  assert.ok(report.origin);
  assert.equal(report.origin.component, 'b', 'only the a→b dependency was ever stated');
  assert.equal(report.origin.shouldFollow, 'a');
});

test('a cyclic plan caps confidence hard — it states no sequence at all', () => {
  const cyclic = plan(['a', 'b', 'c'], [[0, 1], [1, 2], [2, 0]], { cyclic: true });
  const report = findDrift(cyclic, build(['c', 'b', 'a']));
  assert.ok(report.confidence.score <= 0.35, `expected <= 0.35, got ${report.confidence.score}`);
  assert.ok(report.caveats.some((c) => /cycle/.test(c)));
});

// ── coverage findings ──────────────────────────────────────────────────────
test('reports components planned but never built', () => {
  const report = findDrift(plan(['a', 'b', 'c'], [[0, 1], [1, 2]]), build(['a', 'b']));
  assert.deepEqual(report.unbuilt, ['c']);
  assert.ok(report.caveats.some((c) => /never implemented/.test(c)));
});

test('reports components built but never planned, and docks coverage for them', () => {
  const planned = plan(['a', 'b'], [[0, 1]]);
  const clean = findDrift(planned, build(['a', 'b']));
  const messy = findDrift(planned, build(['a', 'b', 'surprise']));
  assert.deepEqual(messy.unplanned, ['surprise']);
  assert.ok(
    messy.confidence.components.coverage.score < clean.confidence.components.coverage.score,
    'unplanned work must reduce coverage confidence',
  );
});

test('verify steps do not count as components', () => {
  const b = parseBuild({
    schema: 'mentor.build/v1',
    project: 'test',
    provenance: 'git',
    steps: [
      { seq: 1, component: 'a', kind: 'implement', file: 'x.js', line: 1, summary: '' },
      { seq: 2, component: 'tests', kind: 'verify', file: 'x.test.js', line: 9, summary: '' },
      { seq: 3, component: 'b', kind: 'implement', file: 'x.js', line: 3, summary: '' },
    ],
    failure: null,
  });
  const report = findDrift(plan(['a', 'b'], [[0, 1]]), b);
  assert.deepEqual(report.actualOrder, ['a', 'b'], 'running the tests is not building a component');
  assert.equal(report.origin, null);
});

test('first touch defines position, not last touch', () => {
  const b = parseBuild({
    schema: 'mentor.build/v1',
    project: 'test',
    provenance: 'git',
    steps: [
      { seq: 1, component: 'b', kind: 'implement', file: 'x.js', line: 1, summary: 'first' },
      { seq: 2, component: 'a', kind: 'implement', file: 'x.js', line: 2, summary: '' },
      { seq: 3, component: 'b', kind: 'implement', file: 'x.js', line: 3, summary: 'revisited' },
    ],
    failure: null,
  });
  const report = findDrift(plan(['a', 'b'], [[0, 1]]), b);
  assert.ok(report.origin, 'b was committed to before a, revisiting it later does not undo that');
  assert.equal(report.origin.component, 'b');
  assert.equal(report.origin.line, 1, 'the origin line is where the decision was first made');
});

test('joins plan labels to build components case- and separator-insensitively', () => {
  const b = parseBuild({
    schema: 'mentor.build/v1',
    project: 'test',
    provenance: 'git',
    steps: [
      { seq: 1, component: 'Apply Discount', kind: 'implement', file: 'x.js', line: 1, summary: '' },
      { seq: 2, component: 'TAX', kind: 'implement', file: 'x.js', line: 2, summary: '' },
    ],
    failure: null,
  });
  const report = findDrift(plan(['apply-discount', 'tax'], [[0, 1]]), b);
  assert.equal(report.origin, null, 'the two artifacts are authored separately; the join must be lenient');
  assert.deepEqual(report.unplanned, []);
});

// ── confidence ─────────────────────────────────────────────────────────────
test('confidence is computed from real signals, and provenance moves it', () => {
  const p = plan(['a', 'b'], [[0, 1]]);
  const git = findDrift(p, build(['b', 'a'], { provenance: 'git' }));
  const authored = findDrift(p, build(['b', 'a'], { provenance: 'authored' }));
  assert.ok(git.confidence.score > authored.confidence.score);
  assert.equal(git.confidence.components.provenance.score, 1);
  assert.equal(authored.confidence.components.provenance.score, 0.4);
  assert.match(authored.confidence.components.provenance.reason, /hand-authored/);
});

test('confidence components are weighted to sum to the score', () => {
  const report = findDrift(plan(['a', 'b'], [[0, 1]]), build(['b', 'a']));
  const sum = Object.values(report.confidence.components).reduce(
    (acc, c) => acc + c.score * c.weight,
    0,
  );
  assert.ok(Math.abs(sum - report.confidence.score) < 0.002, `${sum} vs ${report.confidence.score}`);
  const weights = Object.values(report.confidence.components).reduce((a, c) => a + c.weight, 0);
  assert.ok(Math.abs(weights - 1) < 1e-9, 'weights must sum to 1');
});

test('an unlinked failure costs the failureLink signal', () => {
  const p = plan(['a', 'b'], [[0, 1]]);
  const linked = findDrift(p, build(['b', 'a'], { failFile: 'src/x.js' }));
  const unlinked = findDrift(p, build(['b', 'a'], { failFile: 'somewhere/else.js' }));
  assert.equal(linked.confidence.components.failureLink.score, 1);
  assert.equal(unlinked.confidence.components.failureLink.score, 0);
});

// ── the shipped demo ───────────────────────────────────────────────────────
test('the bundled pricing demo produces the claim the concept doc promises', () => {
  const report = findDrift(requirePlan(), requireBuild());

  assert.deepEqual(report.plannedOrder, ['validate', 'discount', 'tax', 'total']);
  assert.deepEqual(report.actualOrder, ['validate', 'tax', 'discount', 'total']);

  assert.ok(report.origin, 'the demo must find a drift');
  assert.equal(report.origin.component, 'tax');
  assert.equal(report.origin.shouldFollow, 'discount');
  assert.equal(report.origin.file, 'build/pricing.js');
  assert.equal(report.origin.line, 12, 'MENTOR-CONCEPT.md §3 cites line 12');
  assert.equal(report.origin.plannedPosition, 3);
  assert.equal(report.origin.actualPosition, 2);
  assert.equal(report.origin.dependency, 'direct');

  assert.equal(report.failure?.line, 40, 'the error the student saw is at line 40');

  // The exact number printed on the slide. Not a constant in the code — it falls
  // out of: direct edge (0.40) + full coverage (0.20) + strict chain (0.15)
  // + authored history (0.15 * 0.4) + linked failure (0.10) = 0.91.
  assert.equal(report.confidence.score, 0.91);

  assert.match(report.explanation, /designed tax to come after discount/i);
  assert.match(report.explanation, /implemented it before/i);
  assert.match(report.explanation, /pricing\.js:12/);
});

test('fixing the demo history to git provenance raises confidence honestly', () => {
  // Guards the claim in build.ts: deriving history from real commits (GAPS.md
  // Gap 5) should improve the score, and by exactly the provenance weight.
  const authored = findDrift(requirePlan(), requireBuild());
  const asGit = findDrift(
    requirePlan(),
    parseBuild({ ...JSON.parse(JSON.stringify(bundledBuildRaw())), provenance: 'git' }),
  );
  assert.equal(authored.confidence.score, 0.91);
  assert.equal(asGit.confidence.score, 1);
  assert.equal(asGit.origin?.component, 'tax', 'provenance must not change the finding itself');
});

/** The bundled build as a plain object, for provenance experiments. */
function bundledBuildRaw(): Record<string, unknown> {
  const b = requireBuild();
  return {
    schema: b.schema,
    project: b.project,
    entry: b.entry,
    tests: b.tests,
    provenance: b.provenance,
    steps: b.steps.map((s) => ({ ...s })),
    failure: b.failure,
  };
}
