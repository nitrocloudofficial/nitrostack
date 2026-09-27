/**
 * A verification session — the thing that lets MCP‑2 run *alongside* the student.
 *
 * The architecture page is specific about this being simultaneous rather than
 * after-the-fact: *"Sentinel runs alongside Lumina in real time: compares the
 * student's actual build against the staged plan, marks each role checkpoint
 * pass / fail, and pinpoints where they deviated and which part they're stuck on."*
 * A session is what makes that sentence implementable — somewhere to put the
 * checkpoint spec MCP‑1 issued, the design it was derived from, and the stream of
 * events arriving while the work happens.
 *
 * ## Why a session at all, when the tools could have stayed pure
 *
 * Before this, every tool in the loop was a pure function and the client held the
 * state: pass the plan and the history in, get a verdict out. That is a good shape
 * and it is *still supported* — every tool here accepts the artifacts inline.
 *
 * It cannot express "stuck", though. Being stuck is not a property of a build, it is
 * a property of a *sequence of attempts over time*: three failed runs at the same
 * gate, or forty minutes in one stage. A stateless verifier sees the third attempt
 * and cannot tell it was the third. So the session exists precisely to hold the one
 * thing a snapshot cannot carry.
 *
 * ## In-memory, and honest about it
 *
 * Sessions live in this process. A NitroCloud restart loses them, and every tool that
 * depends on one says so rather than implying otherwise. That is an acceptable trade
 * for exactly one reason: **the session is a cache, not a record.** The durable copy
 * of what happened is the verdict filed with MCP‑3, and the events are re-playable
 * from the client, which is why `build_event` accepts a batch. Losing a session costs
 * a student their "stuck" signal for one sitting; it cannot cost them their progress.
 *
 * Capped, and oldest-evicted. An unbounded map keyed by a client-supplied id is a
 * memory leak with a nice name.
 */

import { parseBuildEvent, type BuildEvent, type CheckpointSpec } from '../../shared/contracts.js';
import type { Plan } from '../../shared/plan.js';

/** How many concurrent sessions one process keeps before evicting the oldest. */
const MAX_SESSIONS = 200;
/** How many events one session retains. Beyond this the oldest are dropped. */
const MAX_EVENTS = 500;

export interface Session {
  readonly id: string;
  readonly student: string;
  readonly project: string;
  readonly role: string;
  readonly spec: CheckpointSpec;
  readonly plan: Plan;
  /** In arrival order. This axis is the whole reason the session exists. */
  readonly events: BuildEvent[];
  readonly openedAt: string;
  /** Bumped on every write, so eviction can pick a genuine least-recently-used. */
  touchedAt: number;
}

export interface SessionSummary {
  readonly id: string;
  readonly student: string;
  readonly project: string;
  readonly role: string;
  readonly events: number;
  readonly openedAt: string;
}

const sessions = new Map<string, Session>();
let counter = 0;

/**
 * Deterministic, readable, and not guessable enough to matter.
 *
 * Sessions hold no secrets — the spec came from MCP‑1 and the events came from the
 * student — so the id is for humans reading a log, not a capability. If that ever
 * stops being true the fix is authentication, not a longer random string.
 */
function nextId(project: string, role: string): string {
  counter += 1;
  return `s-${project}-${role}-${counter}`;
}

/**
 * A session that is never registered, for the stateless path.
 *
 * `build_verdict` accepts the spec, the plan and the events inline, and that path
 * has to normalise events exactly the way a real session does — same server-assigned
 * sequence, same `T+…` fallback — or a client that holds its own history would get a
 * subtly different verdict from one that streamed. So it borrows the same object and
 * the same `ingest`, and simply never goes in the map.
 *
 * It still consumes an id from the counter. That is deliberate: an id that appears in
 * a log should never turn out to belong to two different things.
 */
export function detachedSession(input: {
  spec: CheckpointSpec;
  plan: Plan;
  student?: string;
}): Session {
  const student = (input.student ?? input.spec.student ?? 'anonymous').trim() || 'anonymous';
  return {
    id: nextId(input.spec.project, input.spec.role),
    student,
    project: input.spec.project,
    role: input.spec.role,
    spec: input.spec,
    plan: input.plan,
    events: [],
    openedAt: new Date().toISOString(),
    touchedAt: Date.now(),
  };
}

export function openSession(input: {
  spec: CheckpointSpec;
  plan: Plan;
  student?: string;
}): Session {
  const session = detachedSession(input);
  const student = session.student;

  // Reopening the same seat for the same student supersedes the old session. A
  // student who redraws their design and re-derives their gates has a new intent,
  // and verifying against the abandoned one would produce a confident wrong answer.
  for (const [id, existing] of sessions) {
    if (
      existing.student === student &&
      existing.project === session.project &&
      existing.role === session.role
    ) {
      sessions.delete(id);
    }
  }

  sessions.set(session.id, session);
  evict();
  return session;
}

export function getSession(id: string): Session | null {
  const session = sessions.get(id);
  if (session) session.touchedAt = Date.now();
  return session ?? null;
}

/** The open session for a seat, when the caller knows who but not which id. */
export function findSession(student: string, project: string, role?: string): Session | null {
  for (const session of sessions.values()) {
    if (session.student !== student) continue;
    if (session.project !== project) continue;
    if (role && session.role !== role) continue;
    session.touchedAt = Date.now();
    return session;
  }
  return null;
}

export interface IngestResult {
  readonly accepted: readonly BuildEvent[];
  readonly rejected: readonly { index: number; why: string }[];
  readonly total: number;
  readonly dropped: number;
}

/**
 * Fold a batch of events into a session.
 *
 * Deliberately does **not** validate the events against the plan or reject
 * out-of-order work. That is not laziness — an out-of-order build is exactly the
 * material the drift explanation is made of, and a stream that refused it would
 * prevent the mistake this whole product exists to teach from. Events are recorded,
 * and the judging happens later, in `verify.ts` and `drift.ts`.
 *
 * Malformed events *are* rejected, individually, with the index named. One bad entry
 * in a batch of twenty should not lose the other nineteen.
 */
export function ingest(session: Session, incoming: readonly unknown[]): IngestResult {
  const accepted: BuildEvent[] = [];
  const rejected: { index: number; why: string }[] = [];

  for (const [index, raw] of incoming.entries()) {
    let event: BuildEvent;
    try {
      event = parseBuildEvent(raw, index);
    } catch (err) {
      rejected.push({ index, why: err instanceof Error ? err.message : String(err) });
      continue;
    }
    // Server-assigned sequence when the client did not number it. Arrival order is a
    // worse axis than the client's own clock, but it is the one we can always supply,
    // and a step with no position at all cannot be compared to a plan.
    accepted.push({
      ...event,
      seq: event.seq ?? session.events.length + accepted.length + 1,
      at: event.at || `T+${(session.events.length + accepted.length) * 7}m`,
    });
  }

  session.events.push(...accepted);
  let dropped = 0;
  if (session.events.length > MAX_EVENTS) {
    dropped = session.events.length - MAX_EVENTS;
    session.events.splice(0, dropped);
  }
  session.touchedAt = Date.now();

  return { accepted, rejected, total: session.events.length, dropped };
}

export function listSessions(student?: string): SessionSummary[] {
  return [...sessions.values()]
    .filter((s) => !student || s.student === student)
    .sort((a, b) => b.touchedAt - a.touchedAt)
    .map((s) => ({
      id: s.id,
      student: s.student,
      project: s.project,
      role: s.role,
      events: s.events.length,
      openedAt: s.openedAt,
    }));
}

export function sessionCount(): number {
  return sessions.size;
}

/** Test seam — a shared map between cases would make ordering assertions flaky. */
export function __resetSessions(): void {
  sessions.clear();
  counter = 0;
}

function evict(): void {
  while (sessions.size > MAX_SESSIONS) {
    let oldestId: string | null = null;
    let oldest = Infinity;
    for (const [id, session] of sessions) {
      if (session.touchedAt < oldest) {
        oldest = session.touchedAt;
        oldestId = id;
      }
    }
    if (!oldestId) return;
    sessions.delete(oldestId);
  }
}
