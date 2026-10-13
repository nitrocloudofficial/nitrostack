// ─────────────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit here.
//
// The original is shared/contracts.ts at the monorepo root. Three deployed services
// need the same copy of the bridge contracts, and each deploys as a lone folder,
// so the file is duplicated and the duplication is guarded:
//
//   npm run sync:shared            regenerate every copy
//   npm run sync:shared -- --check fail if any copy has drifted (runs in verify)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The bridge artifacts — every sentence the three MCP apps say to one another.
 *
 * Three separately deployed services cannot import each other's types, so the
 * integration surface is a small set of **versioned plain-JSON documents**. Each
 * one is defined here once and parsed defensively at the receiving end, because a
 * bridge that trusts its input is a bridge that reports a confident wrong answer
 * when the other side is redeployed with a change.
 *
 * ```
 *   ┌── MCP-1 roster ──┐        mentor.checkpoints/v1        ┌── MCP-2 sentinel ──┐
 *   │ role → projects  │ ──────────────────────────────────▶ │ verify each gate   │
 *   │ → checkpoint spec│                                     │ then the whole build│
 *   └──────────────────┘ ◀── mentor.profile/v1 (read) ──┐    └────────────────────┘
 *              ▲                                        │              │
 *              │                                  ┌─────┴────────┐     │ mentor.verdict/v1
 *              │                                  │ MCP-3 profile│ ◀───┘
 *              └── (a returning student's history) │  + flashcards│
 *                                                  └──────────────┘
 *                          ▲ lumina.build_event/v1
 *                          │ (Lumina / studio, streaming, to MCP-2)
 * ```
 *
 * ## Two rules that the shapes below enforce rather than document
 *
 * 1. **The checkpoint spec is self-sufficient.** MCP‑2 verifies a student's work
 *    without ever asking MCP‑1 a follow-up question — everything it needs travels
 *    in the artifact. That is what makes MCP‑1 legitimately *not* MENTOR: it hands
 *    over a spec and steps out.
 * 2. **No answer ever crosses a bridge.** The spec and the verdict carry a concept
 *    `key` and `question`. The answer exists only inside MCP‑3. A leak in MCP‑1 or
 *    MCP‑2 therefore cannot hand a student the thing they are supposed to earn —
 *    which is a stronger guarantee than a boolean on a field.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Schema identifiers. Bumping one of these is a breaking change and the parser
// below will say so out loud rather than coercing.
// ─────────────────────────────────────────────────────────────────────────────

export const CHECKPOINT_SPEC_SCHEMA = 'mentor.checkpoints/v1';
export const BUILD_EVENT_SCHEMA = 'lumina.build_event/v1';
export const VERDICT_SCHEMA = 'mentor.verdict/v1';
export const PROFILE_SCHEMA = 'mentor.profile/v1';
export const CARD_SCHEMA = 'mentor.card/v1';
export const CATALOG_SCHEMA = 'mentor.catalog/v1';
export const BRIEF_SCHEMA = 'mentor.brief/v1';

export class ContractError extends Error {}

// ─────────────────────────────────────────────────────────────────────────────
// ① mentor.checkpoints/v1 — MCP-1 ▶ MCP-2 (and ▶ the student's client)
// ─────────────────────────────────────────────────────────────────────────────

export type CheckpointKind = 'implement' | 'verify';

/** How MCP‑2 is expected to know this checkpoint was actually reached. */
export interface CheckpointEvidence {
  /** `file` — code landed somewhere. `test` — a named criterion ran and passed. */
  readonly kind: 'file' | 'test';
  /** Where to look. A path for `file`, the criterion's own wording for `test`. */
  readonly hint: string;
}

export interface SpecCheckpoint {
  readonly id: string;
  readonly seq: number;
  readonly kind: CheckpointKind;
  /** The component label the student typed, or an acceptance-criterion id. */
  readonly subject: string;
  readonly title: string;
  readonly proves: string;
  /**
   * Checkpoint ids that the student's *own plan* put first. Reaching a checkpoint
   * with these unmet is recorded, never blocked — that divergence is the material
   * MCP‑2 needs in order to teach anything.
   */
  readonly blockedBy: readonly string[];
  readonly evidence: CheckpointEvidence;
}

export interface CheckpointSpec {
  readonly schema: typeof CHECKPOINT_SPEC_SCHEMA;
  /** Which service minted this, so a stale spec is attributable. */
  readonly issued_by: string;
  readonly project: string;
  readonly role: string;
  /** Who it was issued to. MCP‑2 files its verdict against this id. */
  readonly student: string;
  readonly checkpoints: readonly SpecCheckpoint[];
  readonly definition_of_done: string;
  /** Components this role owns. MCP‑2 counts these, and only these, toward done. */
  readonly owns: readonly string[];
  /**
   * Boundary components — drawn as an edge, owned by someone else. Without this
   * MCP‑2 would report a correctly-unbuilt box as missing work, which is the one
   * false accusation that would make a student stop trusting the tool.
   */
  readonly given: readonly string[];
  readonly files: { readonly entry: string; readonly tests: string };
  /** Key and question only — never the answer. See the header. */
  readonly concept: { readonly key: string; readonly question: string };
  /** Ties this spec to the exact plan it was derived from. See `planDigest`. */
  readonly plan_digest: string;
  readonly warnings: readonly string[];
}

/**
 * A short, stable fingerprint of a plan's *ordering claim*.
 *
 * Deliberately covers the node labels, the edges and the order — and nothing else.
 * Moving a box on the canvas must not invalidate a spec; changing what depends on
 * what must. Implemented without `node:crypto` so the same function can run in a
 * browser-side client and produce the same string.
 */
export function planDigest(input: {
  readonly nodes: readonly { readonly id: string; readonly label: string }[];
  readonly edges: readonly { readonly source: string; readonly target: string }[];
  readonly order: readonly string[];
}): string {
  const labelOf = new Map(input.nodes.map((n) => [n.id, n.label.trim().toLowerCase()]));
  const canonical = [
    input.order.map((id) => labelOf.get(id) ?? id).join('>'),
    [...input.edges]
      .map((e) => `${labelOf.get(e.source) ?? e.source}->${labelOf.get(e.target) ?? e.target}`)
      .sort()
      .join(','),
  ].join('|');

  // FNV-1a, 32-bit, hex. Not a security hash and not used as one — it answers
  // "is this the same plan" for a human reading two payloads side by side.
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function parseCheckpointSpec(input: unknown): CheckpointSpec {
  const raw = asObject(input, 'checkpoint spec');
  expectSchema(raw.schema, CHECKPOINT_SPEC_SCHEMA, 'checkpoint spec');

  const checkpoints: SpecCheckpoint[] = [];
  for (const c of asArray(raw.checkpoints, 'checkpoints')) {
    if (!isObj(c)) continue;
    const id = str(c.id);
    if (!id) continue;
    const kind: CheckpointKind = c.kind === 'verify' ? 'verify' : 'implement';
    const ev = isObj(c.evidence) ? c.evidence : {};
    checkpoints.push({
      id,
      seq: num(c.seq, checkpoints.length + 1),
      kind,
      subject: str(c.subject, id),
      title: str(c.title, `Reach ${id}`),
      proves: str(c.proves),
      blockedBy: strArray(c.blockedBy),
      evidence: {
        kind: ev.kind === 'test' ? 'test' : 'file',
        hint: str(ev.hint),
      },
    });
  }
  if (checkpoints.length === 0) {
    throw new ContractError(
      'checkpoint spec lists no checkpoints — there is nothing to verify against. ' +
        'Call open_brief then checkpoint_spec on MCP-1 first.',
    );
  }

  const files = isObj(raw.files) ? raw.files : {};
  const concept = isObj(raw.concept) ? raw.concept : {};

  return {
    schema: CHECKPOINT_SPEC_SCHEMA,
    issued_by: str(raw.issued_by, '(unattributed)'),
    project: str(raw.project, 'untitled'),
    role: str(raw.role, 'unknown'),
    student: str(raw.student, 'anonymous'),
    checkpoints,
    definition_of_done: str(raw.definition_of_done),
    owns: strArray(raw.owns),
    given: strArray(raw.given),
    files: { entry: str(files.entry), tests: str(files.tests) },
    concept: { key: str(concept.key), question: str(concept.question) },
    plan_digest: str(raw.plan_digest),
    warnings: strArray(raw.warnings),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ② lumina.build_event/v1 — Lumina / studio ▶ MCP-2, as the work happens
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What a client can witness. Only `component_built` moves a component's position
 * in the actual build order — the rest are context, and conflating them would put
 * "ran the tests" in the middle of the student's architecture.
 */
export type BuildEventKind =
  /** Lumina's stage-based guidance advanced. Cheap, frequent, and how "stuck" is measured. */
  | 'stage_entered'
  /** A component the student owns now exists in a file. */
  | 'component_built'
  /** They ran the test command. Carries the verbatim output. */
  | 'test_run'
  /** They assert a specific checkpoint is reached. */
  | 'checkpoint_claimed';

export interface BuildEvent {
  readonly schema: typeof BUILD_EVENT_SCHEMA;
  /** Client sequence number. `null` lets the server append in arrival order. */
  readonly seq: number | null;
  /** Offset from session start, e.g. `T+11m`. Relative, never wall-clock. */
  readonly at: string;
  readonly kind: BuildEventKind;
  readonly component: string | null;
  readonly checkpoint: string | null;
  readonly file: string;
  readonly line: number | null;
  readonly summary: string;
  /** For `test_run` and `checkpoint_claimed` on a verify gate. */
  readonly outcome: 'pass' | 'fail' | null;
  /** Verbatim runner output. The only thing allowed to prove a test passed. */
  readonly test_output: string | null;
  /** Who observed it — `lumina`, `studio`, `cli`. Recorded, and shown. */
  readonly source: string;
}

const EVENT_KINDS: ReadonlySet<string> = new Set([
  'stage_entered',
  'component_built',
  'test_run',
  'checkpoint_claimed',
]);

export function parseBuildEvent(input: unknown, index = 0): BuildEvent {
  const raw = asObject(input, 'build event');
  // The schema field is optional on an event: a client streaming twenty of these
  // per session should not have to repeat the envelope, and the transport (a
  // named tool argument) already establishes what this is.
  const schema = str(raw.schema);
  if (schema && schema !== BUILD_EVENT_SCHEMA) {
    throw new ContractError(
      `unsupported build event schema ${JSON.stringify(schema)} — expected ${BUILD_EVENT_SCHEMA}`,
    );
  }

  const kindRaw = str(raw.kind);
  if (!EVENT_KINDS.has(kindRaw)) {
    throw new ContractError(
      `build event ${index + 1} has kind ${JSON.stringify(kindRaw || '(missing)')} — expected one of ` +
        [...EVENT_KINDS].join(', '),
    );
  }

  return {
    schema: BUILD_EVENT_SCHEMA,
    seq: typeof raw.seq === 'number' && Number.isFinite(raw.seq) ? raw.seq : null,
    at: str(raw.at),
    kind: kindRaw as BuildEventKind,
    component: nullableStr(raw.component),
    checkpoint: nullableStr(raw.checkpoint),
    file: str(raw.file),
    line: typeof raw.line === 'number' && Number.isFinite(raw.line) ? raw.line : null,
    summary: str(raw.summary),
    outcome: raw.outcome === 'pass' ? 'pass' : raw.outcome === 'fail' ? 'fail' : null,
    test_output: nullableStr(raw.test_output),
    source: str(raw.source, 'unknown'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ③ mentor.verdict/v1 — MCP-2 ▶ MCP-3
// ─────────────────────────────────────────────────────────────────────────────

export interface VerdictCheckpoint {
  readonly id: string;
  readonly subject: string;
  readonly kind: CheckpointKind;
  readonly status: 'pass' | 'fail' | 'not_reached';
  readonly at: string | null;
  readonly file: string | null;
  readonly line: number | null;
  /** Reached before its own plan said it should be. Recorded, not punished. */
  readonly out_of_order: boolean;
  readonly should_follow: readonly string[];
  readonly attempts: number;
}

export interface VerdictOrigin {
  readonly component: string;
  readonly file: string;
  readonly line: number | null;
  readonly shouldFollow: string;
  readonly plannedPosition: number;
  readonly actualPosition: number;
  readonly dependency: 'direct' | 'transitive' | 'none';
  readonly at: string;
}

export interface VerdictDrift {
  readonly found: boolean;
  readonly explanation: string;
  readonly origin: VerdictOrigin | null;
  readonly failure: {
    readonly test: string;
    readonly file: string;
    readonly line: number | null;
    readonly message: string;
  } | null;
  readonly planned_order: readonly string[];
  readonly actual_order: readonly string[];
  readonly confidence: number;
  readonly confidence_components: Readonly<Record<string, unknown>>;
  readonly caveats: readonly string[];
}

/** Where the student is bogged down, measured from events rather than asked. */
export interface VerdictStuck {
  readonly checkpoint: string;
  readonly subject: string;
  readonly attempts: number;
  readonly since: string;
  readonly why: string;
}

export interface Verdict {
  readonly schema: typeof VERDICT_SCHEMA;
  readonly issued_by: string;
  readonly student: string;
  readonly project: string;
  readonly role: string;
  /**
   * `complete` — every gate passed. `escalated` — the build finished with drift
   * attached, which is the interesting case and the one MCP‑3 makes cards from.
   * `in_progress` — a snapshot; MCP‑3 records it but issues nothing.
   */
  readonly status: 'complete' | 'escalated' | 'in_progress';
  readonly statement: string;
  readonly checkpoints: readonly VerdictCheckpoint[];
  readonly implemented: { readonly reached: number; readonly total: number };
  readonly verified: { readonly reached: number; readonly total: number };
  readonly drift: VerdictDrift | null;
  readonly stuck: VerdictStuck | null;
  readonly concept: { readonly key: string; readonly question: string };
  readonly provenance: 'git' | 'observed' | 'authored';
  /**
   * MCP‑2's own reading of the last `test_run` it witnessed. MCP‑3 treats this as
   * *necessary but not sufficient* for releasing a card answer — it re-parses the
   * verbatim output itself. Two independent readings, because a single boolean
   * travelling over a bridge is exactly the field an attacker would set.
   */
  readonly tests_green: boolean;
  readonly at: string;
}

export function parseVerdict(input: unknown): Verdict {
  const raw = asObject(input, 'verdict');
  expectSchema(raw.schema, VERDICT_SCHEMA, 'verdict');

  const statusRaw = str(raw.status);
  const status: Verdict['status'] =
    statusRaw === 'complete' ? 'complete' : statusRaw === 'escalated' ? 'escalated' : 'in_progress';

  const checkpoints: VerdictCheckpoint[] = [];
  for (const c of asArray(raw.checkpoints, 'verdict.checkpoints', true)) {
    if (!isObj(c)) continue;
    const id = str(c.id);
    if (!id) continue;
    checkpoints.push({
      id,
      subject: str(c.subject, id),
      kind: c.kind === 'verify' ? 'verify' : 'implement',
      status: c.status === 'pass' ? 'pass' : c.status === 'fail' ? 'fail' : 'not_reached',
      at: nullableStr(c.at),
      file: nullableStr(c.file),
      line: typeof c.line === 'number' ? c.line : null,
      out_of_order: c.out_of_order === true,
      should_follow: strArray(c.should_follow),
      attempts: num(c.attempts, 0),
    });
  }

  const concept = isObj(raw.concept) ? raw.concept : {};
  const counts = (v: unknown) => {
    const o = isObj(v) ? v : {};
    return { reached: num(o.reached, 0), total: num(o.total, 0) };
  };

  return {
    schema: VERDICT_SCHEMA,
    issued_by: str(raw.issued_by, '(unattributed)'),
    student: str(raw.student, 'anonymous'),
    project: str(raw.project, 'untitled'),
    role: str(raw.role, 'unknown'),
    status,
    statement: str(raw.statement),
    checkpoints,
    implemented: counts(raw.implemented),
    verified: counts(raw.verified),
    drift: parseDrift(raw.drift),
    stuck: parseStuck(raw.stuck),
    concept: { key: str(concept.key), question: str(concept.question) },
    provenance:
      raw.provenance === 'git' ? 'git' : raw.provenance === 'observed' ? 'observed' : 'authored',
    tests_green: raw.tests_green === true,
    at: str(raw.at),
  };
}

function parseDrift(v: unknown): VerdictDrift | null {
  if (!isObj(v)) return null;
  const o = isObj(v.origin) ? v.origin : null;
  const f = isObj(v.failure) ? v.failure : null;
  return {
    found: v.found === true,
    explanation: str(v.explanation),
    origin: o
      ? {
          component: str(o.component),
          file: str(o.file),
          line: typeof o.line === 'number' ? o.line : null,
          shouldFollow: str(o.shouldFollow ?? o.should_follow),
          plannedPosition: num(o.plannedPosition ?? o.planned_position, 0),
          actualPosition: num(o.actualPosition ?? o.actual_position, 0),
          dependency:
            o.dependency === 'direct'
              ? 'direct'
              : o.dependency === 'transitive'
                ? 'transitive'
                : 'none',
          at: str(o.at),
        }
      : null,
    failure: f
      ? {
          test: str(f.test),
          file: str(f.file),
          line: typeof f.line === 'number' ? f.line : null,
          message: str(f.message),
        }
      : null,
    planned_order: strArray(v.planned_order),
    actual_order: strArray(v.actual_order),
    confidence: num(v.confidence, 0),
    confidence_components: isObj(v.confidence_components) ? v.confidence_components : {},
    caveats: strArray(v.caveats),
  };
}

function parseStuck(v: unknown): VerdictStuck | null {
  if (!isObj(v)) return null;
  const checkpoint = str(v.checkpoint);
  if (!checkpoint) return null;
  return {
    checkpoint,
    subject: str(v.subject, checkpoint),
    attempts: num(v.attempts, 0),
    since: str(v.since),
    why: str(v.why),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ④ mentor.profile/v1 — MCP-3's record of a student, read by MCP-1
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfileCheckpointRecord {
  readonly id: string;
  readonly subject: string;
  readonly status: 'pass' | 'fail' | 'not_reached';
  readonly at: string | null;
}

export interface ProfileProject {
  readonly project: string;
  readonly role: string;
  readonly status: 'attempted' | 'complete' | 'escalated';
  readonly started_at: string;
  readonly updated_at: string;
  readonly checkpoints: readonly ProfileCheckpointRecord[];
}

/** One entry per time a build diverged from its design. The teaching material. */
export interface ProfileDriftEntry {
  readonly at: string;
  readonly project: string;
  readonly role: string;
  readonly component: string;
  readonly file: string;
  readonly line: number | null;
  readonly should_follow: string;
  readonly confidence: number;
  readonly concept: string;
}

export interface ProfileDifficulty {
  readonly concept: string;
  readonly seen: number;
  readonly struggled: number;
  readonly last_at: string;
}

export interface ProfileMastery {
  readonly concept: string;
  /** 0…1. Derived, and the evidence is stated next to it rather than implied. */
  readonly level: number;
  readonly evidence: string;
}

export interface ProfileCard {
  readonly id: string;
  readonly concept: string;
  readonly project: string;
  readonly state: 'new' | 'learning' | 'review';
  readonly due_in_sessions: number;
  readonly ease: number;
  readonly reps: number;
  readonly lapses: number;
  readonly last_grade: 'again' | 'hard' | 'good' | 'easy' | null;
}

export interface Profile {
  readonly schema: typeof PROFILE_SCHEMA;
  readonly student: string;
  readonly handle: string;
  readonly created_at: string;
  /**
   * How many separate sittings this student has had.
   *
   * The review schedule is counted in sessions rather than days, and that is a
   * deliberate choice rather than a shortcut: a student on a two-week project does
   * not sit down at 24-hour intervals, so "due tomorrow" is a worse predictor of
   * "about to forget" than "due next time you open this". It also makes the whole
   * scheduler testable without faking a clock.
   */
  readonly sessions: number;
  readonly role_history: readonly { readonly role: string; readonly project: string; readonly at: string }[];
  readonly projects: readonly ProfileProject[];
  readonly drift_ledger: readonly ProfileDriftEntry[];
  readonly difficulty: readonly ProfileDifficulty[];
  readonly mastery: readonly ProfileMastery[];
  readonly cards: readonly ProfileCard[];
  /**
   * The most recent verdict per seat, kept whole.
   *
   * Kept rather than reduced to the ledger entries because the card needs the
   * *evidence*, not a summary of it: which line the mistake was made on, which line
   * it surfaced on, how confident the verifier was, and whether the student was
   * stuck. A card that cannot say "you earned this by fixing the bug that surfaced
   * at X but was made at Y" is a topic from a syllabus rather than a record of
   * something that happened to this person.
   *
   * One per seat, superseded on each new verdict — a history of every snapshot would
   * grow without bound and answer no question the ledgers do not already answer.
   */
  readonly verdicts: readonly Verdict[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ⑤ mentor.card/v1 — MCP-3's output. The `back` field is ABSENT until earned.
// ─────────────────────────────────────────────────────────────────────────────

export interface Card {
  readonly schema: typeof CARD_SCHEMA;
  readonly id: string;
  readonly concept: string;
  readonly project: string;
  readonly role: string;
  readonly front: string;
  /**
   * Present **only** when earned. Not `null`, not `"withheld"` — absent from the
   * object, because a field a model can read is a field it will read out.
   */
  readonly back?: string;
  readonly earned: boolean;
  readonly why: string;
  readonly your_mistake: string | null;
  readonly transfers_to: readonly string[];
  readonly review: { readonly state: string; readonly due_in_sessions: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// shared parsing helpers — small, and identical in all three apps on purpose
// ─────────────────────────────────────────────────────────────────────────────

export const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

export function nullableStr(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Accept an object or a JSON string — MCP clients send both, and both are fine. */
export function asObject(input: unknown, what: string): Record<string, unknown> {
  let raw: unknown = input;
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input);
    } catch (err) {
      throw new ContractError(
        `${what} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  if (!isObj(raw)) throw new ContractError(`${what} must be a JSON object`);
  return raw;
}

function asArray(v: unknown, what: string, allowEmpty = false): unknown[] {
  if (!Array.isArray(v)) {
    if (allowEmpty) return [];
    throw new ContractError(`${what} must be an array`);
  }
  return v;
}

function expectSchema(actual: unknown, expected: string, what: string): void {
  const got = str(actual);
  if (got !== expected) {
    throw new ContractError(
      `unsupported ${what} schema ${JSON.stringify(got || '(missing)')} — expected ${expected}`,
    );
  }
}
