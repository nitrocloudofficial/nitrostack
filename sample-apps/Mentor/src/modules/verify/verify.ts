/**
 * Marking each gate pass/fail from what actually happened, and spotting the stall.
 *
 * MCP‑1 issued a `mentor.checkpoints/v1` spec. Lumina (or the studio client) streams
 * `lumina.build_event/v1` as the student works. This file is the join: it reads the
 * event stream against the spec and answers three questions the architecture asks of
 * MCP‑2 —
 *
 * 1. **Which gates passed?** (`verifyCheckpoints`)
 * 2. **Where are they stuck?** (`findStuck`)
 * 3. **What is the ordered history of what they built?** (`buildFromEvents`) — which
 *    is the `mentor.build/v1` the drift engine already consumes, so the whole
 *    ordering analysis comes free from having watched.
 *
 * ## Everything here is pure
 *
 * Takes a spec and an array of events, returns a verdict. The session
 * (`session.ts`) holds the array; nothing in this file reads it, which is what makes
 * the rules below testable without opening a session or faking a clock.
 *
 * ## The rules, and why each one is the way it is
 *
 * **Last write wins, per gate.** A suite that was green and goes red must take its
 * verify gates back to failing. Anything that treated the earlier pass as permanent
 * would mask a regression, and "your tests passed at some point" is not a claim
 * anybody should be issued a flashcard on.
 *
 * **A green suite passes every acceptance gate.** A `test_run` that names no
 * checkpoint and reports no failures means the student's whole test file is green,
 * and every criterion in it therefore holds. Requiring a per-criterion event would
 * mean the common case — running `npm test` — proved nothing.
 *
 * **A red suite passes none of them, and fails none of them by name.** Without a
 * named checkpoint we know *something* is red but not which criterion, so the gates
 * go back to `not_reached` rather than being individually accused. Naming the wrong
 * gate would be worse than naming none.
 *
 * **Out-of-order is recorded, never blocked.** Evaluated at the moment the gate was
 * reached, against what had passed *by then*. That divergence is the material the
 * drift explanation is made of — refusing the event would prevent the mistake this
 * product exists to teach from.
 */

import {
  BUILD_SCHEMA,
  type Build,
  type BuildFailure,
  type BuildStep,
} from '../mentor/build.js';
import { normalizeComponent } from '../../shared/component.js';
import type {
  BuildEvent,
  CheckpointSpec,
  SpecCheckpoint,
  VerdictCheckpoint,
  VerdictStuck,
} from '../../shared/contracts.js';

/** One gate's standing, plus the evidence it was judged on. */
export interface GateResult extends VerdictCheckpoint {
  /** Every event that touched this gate, in order. Shown so a student can audit us. */
  readonly evidence: readonly {
    readonly at: string;
    readonly kind: string;
    readonly outcome: 'pass' | 'fail' | null;
    readonly file: string;
  }[];
}

/**
 * Mark every gate in the spec against the event stream.
 *
 * Walks the events once in order, so `out_of_order` can be judged against what had
 * actually passed at that moment rather than against the final state — a gate reached
 * first and legitimised later was still reached out of order, and that is the whole
 * point of recording it.
 */
export function verifyCheckpoints(
  spec: CheckpointSpec,
  events: readonly BuildEvent[],
): GateResult[] {
  const byId = new Map(spec.checkpoints.map((c) => [c.id, c]));
  const implementByComponent = new Map<string, SpecCheckpoint>();
  for (const c of spec.checkpoints) {
    if (c.kind === 'implement') implementByComponent.set(normalizeComponent(c.subject), c);
  }
  const verifyGates = spec.checkpoints.filter((c) => c.kind === 'verify');

  type Mutable = {
    status: 'pass' | 'fail' | 'not_reached';
    at: string | null;
    file: string | null;
    line: number | null;
    outOfOrder: boolean;
    shouldFollow: string[];
    attempts: number;
    evidence: GateResult['evidence'][number][];
  };

  const state = new Map<string, Mutable>(
    spec.checkpoints.map((c) => [
      c.id,
      {
        status: 'not_reached',
        at: null,
        file: null,
        line: null,
        outOfOrder: false,
        shouldFollow: [],
        attempts: 0,
        evidence: [],
      },
    ]),
  );

  const passed = () =>
    new Set(
      [...state.entries()].filter(([, s]) => s.status === 'pass').map(([id]) => id),
    );

  /** Apply one outcome to one gate, recording order violations as they happen. */
  const mark = (
    gate: SpecCheckpoint,
    outcome: 'pass' | 'fail',
    event: BuildEvent,
    countsAsAttempt: boolean,
  ) => {
    const s = state.get(gate.id);
    if (!s) return;
    if (countsAsAttempt) s.attempts += 1;
    s.evidence.push({
      at: event.at,
      kind: event.kind,
      outcome,
      file: event.file || event.component || '',
    });

    if (outcome === 'pass') {
      // Judged now, against what had passed by now. A gate whose blockers went green
      // later was still built early, and that is the divergence worth keeping.
      const already = passed();
      const unmet = gate.blockedBy.filter((b) => !already.has(b));
      if (unmet.length && s.status !== 'pass') {
        s.outOfOrder = true;
        s.shouldFollow = unmet.map((id) => byId.get(id)?.subject ?? id);
      }
    }

    s.status = outcome;
    s.at = event.at || s.at;
    if (event.file) s.file = event.file;
    if (event.line !== null) s.line = event.line;
  };

  for (const event of events) {
    switch (event.kind) {
      case 'component_built': {
        const gate = event.component
          ? implementByComponent.get(normalizeComponent(event.component))
          : undefined;
        // A build event naming a component that is not in the spec is not an error —
        // it is either a boundary component or scope drift, and both are somebody
        // else's report to make. Recorded in the history, ignored for gates.
        if (gate) mark(gate, 'pass', event, true);
        break;
      }

      case 'checkpoint_claimed': {
        const gate = event.checkpoint ? byId.get(event.checkpoint) : undefined;
        if (gate) mark(gate, event.outcome === 'fail' ? 'fail' : 'pass', event, true);
        break;
      }

      case 'test_run': {
        const named = event.checkpoint ? byId.get(event.checkpoint) : undefined;
        if (named) {
          mark(named, event.outcome === 'fail' ? 'fail' : 'pass', event, true);
          break;
        }
        // Whole-suite run. Green passes every criterion; red takes them all back to
        // not-reached without accusing any one of them by name.
        for (const gate of verifyGates) {
          const s = state.get(gate.id);
          if (!s) continue;
          s.attempts += 1;
          s.evidence.push({
            at: event.at,
            kind: 'test_run (whole suite)',
            outcome: event.outcome,
            file: event.file,
          });
          if (event.outcome === 'pass') {
            const already = passed();
            const unmet = gate.blockedBy.filter((b) => !already.has(b));
            if (unmet.length && s.status !== 'pass') {
              s.outOfOrder = true;
              s.shouldFollow = unmet.map((id) => byId.get(id)?.subject ?? id);
            }
            s.status = 'pass';
            s.at = event.at || s.at;
            if (event.file) s.file = event.file;
            if (event.line !== null) s.line = event.line;
          } else if (event.outcome === 'fail') {
            s.status = 'not_reached';
          }
        }
        break;
      }

      case 'stage_entered':
        // Context, not evidence. Used only by `findStuck`.
        break;
    }
  }

  return spec.checkpoints.map((c) => {
    const s = state.get(c.id)!;
    return {
      id: c.id,
      subject: c.subject,
      kind: c.kind,
      status: s.status,
      at: s.at,
      file: s.file,
      line: s.line,
      out_of_order: s.outOfOrder,
      should_follow: s.shouldFollow,
      attempts: s.attempts,
      evidence: s.evidence,
    };
  });
}

/**
 * Where the student is bogged down.
 *
 * This is a **heuristic and it says so** in the `why` it returns, because being stuck
 * is not a fact in the data the way a failed test is. Two signals, in priority order:
 *
 * 1. **Repeated failure at one gate.** Two or more failed attempts on something still
 *    unpassed. The strongest signal available, and unambiguous.
 * 2. **Entered a stage and never left it.** The most recent `stage_entered` names a
 *    component whose gate has not passed, and several events have gone by since
 *    without it being built. Weaker — a student may simply be thinking — so it is
 *    reported with lower confidence in the wording rather than as a diagnosis.
 *
 * Returning `null` is a normal outcome and a better one than guessing. A tool that
 * always finds something wrong is a tool a student learns to ignore.
 */
export function findStuck(
  spec: CheckpointSpec,
  events: readonly BuildEvent[],
  results: readonly GateResult[],
): VerdictStuck | null {
  const unpassed = results.filter((r) => r.status !== 'pass');
  if (unpassed.length === 0) return null;

  // ① repeated failure
  const failing = unpassed
    .map((r) => ({
      result: r,
      failures: r.evidence.filter((e) => e.outcome === 'fail').length,
    }))
    .filter((r) => r.failures >= 2)
    .sort((a, b) => b.failures - a.failures)[0];

  if (failing) {
    const first = failing.result.evidence.find((e) => e.outcome === 'fail');
    return {
      checkpoint: failing.result.id,
      subject: failing.result.subject,
      attempts: failing.result.attempts,
      since: first?.at ?? failing.result.at ?? 'unknown',
      why:
        `${failing.failures} failed attempts at this gate and it is still not passing. This is ` +
        'the strongest stuck signal available — it is counted, not inferred.',
    };
  }

  // ② entered a stage and stayed there
  const stages = events.filter((e) => e.kind === 'stage_entered' && e.component);
  const lastStage = stages[stages.length - 1];
  if (lastStage?.component) {
    const key = normalizeComponent(lastStage.component);
    const gate = results.find(
      (r) => r.kind === 'implement' && normalizeComponent(r.subject) === key,
    );
    const sinceIndex = events.indexOf(lastStage);
    const eventsSince = events.length - 1 - sinceIndex;
    if (gate && gate.status !== 'pass' && eventsSince >= 3) {
      return {
        checkpoint: gate.id,
        subject: gate.subject,
        attempts: gate.attempts,
        since: lastStage.at,
        why:
          `You entered ${lastStage.component} at ${lastStage.at} and ${eventsSince} events have ` +
          'gone by without it being built. This is a weaker signal than a repeated failure — you ' +
          'may simply be thinking — so treat it as a question rather than a diagnosis.',
      };
    }
  }

  return null;
}

/** The most recent whole-suite or named test run, with its verbatim output. */
export function latestTestRun(
  events: readonly BuildEvent[],
): { readonly event: BuildEvent; readonly green: boolean } | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (event.kind === 'test_run') return { event, green: event.outcome === 'pass' };
  }
  return null;
}

/**
 * Turn the event stream into a `mentor.build/v1`.
 *
 * This is the join that makes watching worth anything: the stream that existed to
 * track progress turns out to be exactly the input the drift engine needs, so the
 * ordering analysis costs nothing extra and — crucially — the history is
 * `provenance: 'observed'` rather than `'authored'`. The confidence score rises
 * because the evidence genuinely improved, not because a number was tuned.
 *
 * Provenance is derived from the events rather than declared: a stream whose
 * implement events all came from a git deriver is `git`, anything else observed by a
 * client is `observed`. Unknown falls to the *lower* reading, never the higher — a
 * mislabelled source must not be able to inflate a confidence score.
 */
export function buildFromEvents(
  spec: CheckpointSpec,
  events: readonly BuildEvent[],
): Build {
  const steps: BuildStep[] = [];
  let seq = 0;

  for (const event of events) {
    if (event.kind === 'stage_entered') continue;

    if (event.kind === 'component_built' && event.component) {
      steps.push({
        seq: ++seq,
        at: event.at,
        component: event.component,
        kind: 'implement',
        file: event.file,
        line: event.line,
        summary: event.summary || `Built ${event.component}.`,
      });
      continue;
    }

    if (event.kind === 'test_run') {
      steps.push({
        seq: ++seq,
        at: event.at,
        // Named after the gate rather than a component, because `actualOrder` derives
        // component order from `implement` steps only and injecting "tests" as a
        // component would put it in the middle of the student's architecture.
        component: event.checkpoint ?? 'tests',
        kind: 'verify',
        file: event.file || spec.files.tests,
        line: event.line,
        summary: event.summary || (event.outcome === 'fail' ? 'Ran the tests — red.' : 'Ran the tests — green.'),
      });
      continue;
    }

    if (event.kind === 'checkpoint_claimed') {
      const gate = spec.checkpoints.find((c) => c.id === event.checkpoint);
      steps.push({
        seq: ++seq,
        at: event.at,
        component: gate?.kind === 'implement' ? gate.subject : (gate?.subject ?? event.checkpoint ?? 'claim'),
        kind: gate?.kind === 'verify' ? 'verify' : 'implement',
        file: event.file,
        line: event.line,
        summary: event.summary || gate?.title || 'Claimed a checkpoint.',
      });
    }
  }

  const implementSources = new Set(
    events.filter((e) => e.kind === 'component_built').map((e) => e.source),
  );
  const provenance: Build['provenance'] =
    implementSources.size > 0 && [...implementSources].every((s) => s === 'git')
      ? 'git'
      : 'observed';

  return {
    schema: BUILD_SCHEMA,
    project: spec.project,
    entry: spec.files.entry,
    tests: spec.files.tests,
    provenance,
    steps,
    failure: failureFrom(spec, events),
    warnings:
      steps.length === 0
        ? ['no build events yet — there is no history to compare against a design']
        : [],
  };
}

/**
 * The failure the drift engine links to.
 *
 * Only the *latest* red run counts. An earlier failure the student has since fixed is
 * not what they are asking about, and pointing at it would make the explanation about
 * a bug that no longer exists.
 */
function failureFrom(spec: CheckpointSpec, events: readonly BuildEvent[]): BuildFailure | null {
  const last = latestTestRun(events);
  if (!last || last.green) return null;

  const gate = spec.checkpoints.find((c) => c.id === last.event.checkpoint);
  return {
    test: gate?.title || last.event.summary || 'the acceptance tests',
    file: last.event.file || spec.files.tests,
    line: last.event.line,
    message: last.event.summary || 'the tests did not pass',
  };
}
