/**
 * The BUILD half of MENTOR's input — `mentor.build/v1`.
 *
 * What the student *actually did*, in order. The counterpart to `plan.ts`: the
 * plan says what they meant, this says what happened, and the diff between the
 * two is the whole product.
 *
 * The field that carries the weight is `seq` — the order work was done — because
 * MENTOR's claim is about *when*, not *what*. `file` + `line` per step is what
 * turns "you built tax too early" into "you built tax too early, on line 12".
 *
 * ## Provenance is part of the contract, not metadata
 *
 * `provenance` records whether this history was **derived** from a real git
 * history or **authored** by hand. It is not decoration: it feeds the confidence
 * score directly (`drift.ts`). An authored history is a claim about the past that
 * nobody observed, and MENTOR advertising "it has a time axis"
 * (`MENTOR-CONCEPT.md` §5) while silently trusting a hand-written timeline would
 * be the exact overclaim AEGIS flags in other people's output.
 *
 * The demo fixture is `authored`, which is why it scores 0.91 rather than ~0.97.
 * Building the git deriver (`GAPS.md` Gap 5) raises the score honestly.
 */

import { normalizeComponent } from '../../shared/component.js';

export const BUILD_SCHEMA = 'mentor.build/v1';

/** What kind of work a step was. Only `implement` steps define component order. */
export type StepKind = 'implement' | 'verify' | 'refactor' | 'revert' | 'other';

export interface BuildStep {
  readonly seq: number;
  /** Relative offset from session start ("T+11m"), not a wall-clock time. */
  readonly at: string;
  /** Joins to a plan node's `label`. Case- and space-insensitive at compare time. */
  readonly component: string;
  readonly kind: StepKind;
  readonly file: string;
  readonly line: number | null;
  readonly summary: string;
}

export interface BuildFailure {
  readonly test: string;
  readonly file: string;
  readonly line: number | null;
  readonly message: string;
  readonly expected?: unknown;
  readonly actual?: unknown;
}

export interface Build {
  readonly schema: string;
  readonly project: string;
  readonly entry: string;
  readonly tests: string;
  /**
   * How much this timeline can be trusted, in descending order:
   *
   * - `git` — derived from real commits. Nobody's memory is involved.
   * - `observed` — recorded by the checkpoint tracker as the work happened
   *   (`learn/checkpoints.ts`). The sequence was witnessed, but the student is
   *   the one who said "done" each time, so it is self-reported rather than
   *   anchored to an artifact.
   * - `authored` — written afterwards by hand. A claim about the past.
   *
   * Scored in `drift.ts`, not merely recorded here.
   */
  readonly provenance: 'git' | 'observed' | 'authored';
  readonly steps: readonly BuildStep[];
  readonly failure: BuildFailure | null;
  readonly warnings: readonly string[];
}

export class BuildParseError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

const KINDS: ReadonlySet<string> = new Set(['implement', 'verify', 'refactor', 'revert', 'other']);

/**
 * Parse a `mentor.build/v1` document (object or JSON string).
 *
 * @throws BuildParseError when the envelope is unusable — wrong schema, no steps,
 *   or no step that names a component.
 */
export function parseBuild(input: unknown): Build {
  const raw: unknown = typeof input === 'string' ? safeJson(input, 'build history') : input;
  if (!isObj(raw)) throw new BuildParseError('build history must be a JSON object');

  const schema = str(raw.schema);
  if (schema !== BUILD_SCHEMA) {
    throw new BuildParseError(
      `unsupported build schema ${JSON.stringify(schema || '(missing)')} — expected ${BUILD_SCHEMA}`,
    );
  }
  if (!Array.isArray(raw.steps)) throw new BuildParseError('build.steps must be an array');

  const warnings: string[] = [];
  const steps: BuildStep[] = [];
  for (const s of raw.steps) {
    if (!isObj(s)) continue;
    const component = str(s.component).trim();
    if (!component) {
      warnings.push('dropped a step with no component');
      continue;
    }
    const kindRaw = str(s.kind, 'other');
    if (!KINDS.has(kindRaw)) warnings.push(`step "${component}" has unknown kind ${kindRaw} — treated as other`);
    const line = typeof s.line === 'number' && Number.isFinite(s.line) ? s.line : null;
    steps.push({
      seq: typeof s.seq === 'number' && Number.isFinite(s.seq) ? s.seq : steps.length + 1,
      at: str(s.at),
      component,
      kind: (KINDS.has(kindRaw) ? kindRaw : 'other') as StepKind,
      file: str(s.file),
      line,
      summary: str(s.summary),
    });
  }
  if (steps.length === 0) throw new BuildParseError('build history has no usable steps');

  // `seq` is authoritative; sort defensively so a mis-ordered file still yields
  // the right actual-order rather than a silently wrong drift claim.
  steps.sort((a, b) => a.seq - b.seq || a.component.localeCompare(b.component));

  // Unknown values fall back to the *least* trusted reading, never the most. A
  // typo in `provenance` must not be able to inflate a confidence score.
  const provenanceRaw = str(raw.provenance, 'authored');
  const provenance: Build['provenance'] =
    provenanceRaw === 'git' ? 'git' : provenanceRaw === 'observed' ? 'observed' : 'authored';
  if (provenanceRaw !== provenance) {
    warnings.push(`unknown provenance ${provenanceRaw} — treated as authored (lower confidence)`);
  }

  return {
    schema,
    project: str(raw.project, 'untitled'),
    entry: str(raw.entry),
    tests: str(raw.tests),
    provenance,
    steps,
    failure: parseFailure(raw.failure, warnings),
    warnings,
  };
}

/**
 * First-touch order of components, `implement` steps only.
 *
 * First touch, not last, because MENTOR is looking for the moment a decision was
 * *made*. Coming back to a function later doesn't move when you committed to its
 * position in the sequence. `verify` steps are excluded — running the tests isn't
 * building a component, and counting it would put "tests" in the middle of the
 * student's architecture.
 */
export function actualOrder(build: Build): BuildStep[] {
  const firstTouch = new Map<string, BuildStep>();
  for (const s of build.steps) {
    if (s.kind !== 'implement') continue;
    const key = normalizeComponent(s.component);
    if (!firstTouch.has(key)) firstTouch.set(key, s);
  }
  return [...firstTouch.values()].sort((a, b) => a.seq - b.seq);
}

/** Component labels in the order they were actually built. */
export function actualLabels(build: Build): string[] {
  return actualOrder(build).map((s) => s.component);
}

/**
 * Join key between a plan node's `label` and a build step's `component`.
 *
 * Re-exported from `shared/component.ts` rather than defined here, because all three
 * deployed services have to normalise identically or the bridges silently miss — a
 * checkpoint MCP-1 called "Check Helmet" would never match the `check helmet` MCP-2
 * saw in a build event, and nothing would report an error. One definition, copied
 * into each app by `npm run sync:shared`, guarded by its `--check` mode.
 */
export { normalizeComponent };

// ── helpers ────────────────────────────────────────────────────────────────
function parseFailure(v: unknown, warnings: string[]): BuildFailure | null {
  if (!isObj(v)) return null;
  const test = str(v.test);
  const file = str(v.file);
  if (!test && !file) {
    warnings.push('build.failure present but names neither a test nor a file — ignored');
    return null;
  }
  return {
    test,
    file,
    line: typeof v.line === 'number' && Number.isFinite(v.line) ? v.line : null,
    message: str(v.message),
    expected: v.expected,
    actual: v.actual,
  };
}

function safeJson(text: string, what: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new BuildParseError(
      `${what} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
