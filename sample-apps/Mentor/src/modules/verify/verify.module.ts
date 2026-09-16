/**
 * VERIFY — MCP‑2's actual job, finally reachable.
 *
 * `verify.ts`, `verdict.ts` and `session.ts` arrived with the three-way split and
 * were never registered: no `@Module`, no tools, nothing importing them. So the app
 * whose whole reason to exist is *"compares the student's actual build against the
 * staged plan, marks each role checkpoint pass / fail, and pinpoints where they
 * deviated"* could do none of it over MCP. This is the surface that fixes that.
 *
 * ## Three tools, and they were named for us
 *
 * The other two apps already say what they expect to call, in prose a student's
 * client can read:
 *
 *   mcp-roster/src/gates.module.ts   → `sentinel.call('open_session', { spec, plan, student })`
 *                                      "stream your build events to it with build_event"
 *   mcp-profile/src/cards/card.ts    → "Finish your gates with MCP-2 and call build_verdict"
 *
 * Implementing anything else would have left three dangling references in a
 * distributed system and invented a fourth name nobody was looking for. So the
 * surface is exactly `open_session` · `build_event` · `build_verdict`, and MCP‑1's
 * hand-off starts working the moment `SENTINEL_URL` is set.
 *
 * `GAPS.md` Gap 11 is the record of what a wide tool surface cost this project once,
 * and the test each of these had to pass was not *is it useful* but *is it the same
 * story*. All three are: watch a build, judge it against the design the student drew,
 * and hand the judgement to the record. There is deliberately no `verify_checkpoint`
 * (that is a consequence of an event arriving, not something to ask for), no
 * `list_sessions` (nobody's learning depends on it), and no "where am I" verb —
 * `build_verdict` with `finalise: false` *is* where-am-I, because a snapshot and a
 * final judgement that walk different code paths will disagree about the same facts
 * eventually.
 *
 * ## Nothing here can hand over a fix or an answer
 *
 * The verdict carries the concept **key and question** and travels to MCP‑3, which is
 * the only process that has ever held an answer. It carries a drift origin as
 * `file:line` and the design decision as a sentence — never the corrected code. Both
 * are properties of `shared/contracts.ts` rather than promises made here, which is
 * why they survive somebody editing this file.
 */

import {
  ToolDecorator as Tool,
  Module,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { REFUSAL } from '../mentor/mentor.adapter.js';
import { parsePlan, type Plan } from '../../shared/plan.js';
import {
  parseCheckpointSpec,
  planDigest,
  type CheckpointSpec,
} from '../../shared/contracts.js';
import { bridgeReport, profilePeer } from '../../shared/peer.js';
import {
  detachedSession,
  findSession,
  getSession,
  ingest,
  openSession,
  type Session,
} from './session.js';
import { findStuck, verifyCheckpoints } from './verify.js';
import { assess, describeBlocking } from './verdict.js';

/** Accepts either a JSON string or an already-parsed object — clients send both. */
const artifact = z
  .union([z.string(), z.record(z.unknown())])
  .describe('A JSON document, as a string or an object.');

const sessionArg = z
  .string()
  .optional()
  .describe('A session id from open_session. Omit it and give student + project instead.');

const studentArg = z
  .string()
  .optional()
  .describe('Whose build this is. Used with `project` to find their open session.');

/**
 * Find the session this call is about.
 *
 * An id when the client kept one, otherwise the seat. Looking up by seat matters
 * more than it looks: a chat client that lost the id mid-conversation would
 * otherwise have to reopen the session, which throws away the attempt history that
 * is the only thing a session exists to hold.
 */
function locate(input: {
  session?: string;
  student?: string;
  project?: string;
  role?: string;
}): Session | null {
  if (input.session) return getSession(input.session);
  if (input.student && input.project) {
    return findSession(input.student, input.project, input.role);
  }
  return null;
}

/** The same "I could not find it" answer everywhere, with the next action in it. */
function noSession(input: { session?: string; student?: string; project?: string }) {
  return {
    error: input.session
      ? `no open session ${JSON.stringify(input.session)} — sessions live in memory and do not ` +
        'survive a restart of this service'
      : 'no session id given, and no open session for that student and project',
    what_to_do:
      'Call open_session with the mentor.checkpoints/v1 spec and the lumina.plan/v1 it was ' +
      'derived from, then replay your events — build_event takes a batch, so nothing is lost. ' +
      'Or skip sessions entirely and pass spec, plan and events inline to build_verdict.',
    why_it_can_happen:
      'A session is a cache, not a record. The durable copy of what happened is the verdict ' +
      'filed with MCP-3, and the events are replayable from your client — which is exactly why ' +
      'losing one costs you the "stuck" signal for one sitting and nothing else.',
  };
}

/**
 * Does this spec describe the plan we were handed?
 *
 * `plan_digest` is MCP‑1's fingerprint of the *ordering claim* a plan makes. When it
 * disagrees with the plan in front of us, the spec was derived from a design the
 * student has since redrawn — and every downstream claim would be confidently about
 * the wrong architecture. That is not a student mistake to be recorded and taught
 * from; it is an integration error, and `MENTOR-CONCEPT.md` §10 is explicit that a
 * tool which confidently points at the wrong line is worse than useless here.
 *
 * A spec with no digest at all is hand-made rather than stale, so it passes with a
 * warning instead of a refusal.
 */
function digestVerdict(
  spec: CheckpointSpec,
  plan: Plan,
): { ok: boolean; actual: string; note: string } {
  const actual = planDigest(plan);
  if (!spec.plan_digest) {
    return {
      ok: true,
      actual,
      note:
        'This spec carries no plan_digest, so nothing ties it to a particular design. Accepted — ' +
        'a hand-written spec is a supported input — but the verdict cannot prove it judged the ' +
        'plan the gates were derived from.',
    };
  }
  if (spec.plan_digest !== actual) {
    return {
      ok: false,
      actual,
      note:
        `This spec was derived from plan ${spec.plan_digest} and the plan you passed is ${actual}. ` +
        'They state different orderings, so every gate and every drift claim below would be ' +
        'about a design this student has already replaced.',
    };
  }
  return { ok: true, actual, note: `Spec and plan agree (digest ${actual}).` };
}

export class VerifyTools {
  @Tool({
    name: 'open_session',
    description:
      'Open a verification session so this service can watch a build as it happens, rather than ' +
      'judging it afterwards. Takes the mentor.checkpoints/v1 spec MCP-1 issued and the ' +
      'lumina.plan/v1 design it was derived from. Everything downstream also works statelessly — ' +
      'build_verdict accepts the same artifacts inline — but a session is the only way to answer ' +
      '"where is this student stuck", because being stuck is a property of a sequence of attempts ' +
      'over time and not of a snapshot. Sessions are in memory and say so.',
    inputSchema: z.object({
      spec: artifact.describe('The mentor.checkpoints/v1 document from MCP-1 checkpoint_spec.'),
      plan: artifact.describe('The lumina.plan/v1 the spec was derived from.'),
      student: z
        .string()
        .optional()
        .describe('Whose session this is. Defaults to the student named in the spec.'),
    }),
  })
  async openSessionTool(
    input: { spec: unknown; plan: unknown; student?: string },
    ctx: ExecutionContext,
  ) {
    let spec: CheckpointSpec;
    let plan: Plan;
    try {
      spec = parseCheckpointSpec(input.spec);
    } catch (err) {
      return {
        error: `could not read that checkpoint spec: ${err instanceof Error ? err.message : String(err)}`,
        what_to_do: 'Pass the document MCP-1 checkpoint_spec returns under `spec`, unmodified.',
      };
    }
    try {
      plan = parsePlan(input.plan);
    } catch (err) {
      return {
        error: `could not read that plan: ${err instanceof Error ? err.message : String(err)}`,
        what_to_do:
          'Pass the lumina.plan/v1 exported from the design canvas with the Plan button. It is ' +
          'the same document the spec was derived from.',
      };
    }

    const digest = digestVerdict(spec, plan);
    if (!digest.ok) {
      ctx.logger.info('open_session refused: plan digest mismatch', {
        project: spec.project,
        role: spec.role,
        expected: spec.plan_digest,
        actual: digest.actual,
      });
      return {
        refused: true,
        reason: digest.note,
        what_to_do:
          'Re-derive the gates from the design you are actually building: call MCP-1 ' +
          'checkpoint_spec with this plan, then open the session with the spec it returns.',
        spec_digest: spec.plan_digest,
        plan_digest: digest.actual,
      };
    }

    const session = openSession({ spec, plan, student: input.student });
    ctx.logger.info('open_session', {
      id: session.id,
      project: session.project,
      role: session.role,
      gates: spec.checkpoints.length,
    });

    return {
      // MCP-1 reads this block off the hand-off, so it is the shape that matters most.
      session: {
        id: session.id,
        student: session.student,
        project: session.project,
        role: session.role,
        gates: spec.checkpoints.length,
        opened_at: session.openedAt,
      },
      watching: {
        implement_gates: spec.checkpoints.filter((c) => c.kind === 'implement').length,
        verify_gates: spec.checkpoints.filter((c) => c.kind === 'verify').length,
        owns: spec.owns,
        // Named here so nobody has to read the code to learn that a boundary box is
        // expected to stay unbuilt. It is the one false accusation that would cost a
        // student their trust in the tool on first contact.
        given: spec.given,
        boundary_note:
          'Components in `given` are somebody else\'s job. They will be reported as designed and ' +
          'never built, and that is correct rather than outstanding work.',
      },
      spec_matches_plan: digest.note,
      definition_of_done: spec.definition_of_done,
      durability:
        'This session lives in this process. A restart loses it, and that costs you the "stuck" ' +
        'signal for one sitting — not your progress, which is the verdict filed with MCP-3.',
      i_will_not:
        'block work that goes out of order. That divergence is the material the explanation is ' +
        'made of, so it is recorded and judged, never refused.',
      next: 'Stream what the student does with build_event. A batch is fine.',
      warnings: spec.warnings,
    };
  }

  @Tool({
    name: 'build_event',
    description:
      'Record what the student just did, as one or more lumina.build_event/v1 entries — a batch is ' +
      'normal and is how a client replays a session it lost. Nothing is checked against the plan ' +
      'and nothing out-of-order is refused: building your own components in the wrong sequence is ' +
      'exactly what this product exists to show you afterwards, so refusing it here would delete ' +
      'the lesson. Malformed entries are rejected individually, by index, so one bad event does ' +
      'not lose the batch. Returns the running gate marks and whether they look stuck.',
    inputSchema: z.object({
      session: sessionArg,
      student: studentArg,
      project: z.string().optional().describe('Used with `student` to find an open session.'),
      role: z.string().optional().describe('Narrows the search when a student holds two seats.'),
      events: z
        .array(z.union([z.string(), z.record(z.unknown())]))
        .describe(
          'lumina.build_event/v1 entries in the order they happened. Kinds: stage_entered, ' +
            'component_built, test_run, checkpoint_claimed.',
        ),
    }),
  })
  async buildEvent(
    input: {
      session?: string;
      student?: string;
      project?: string;
      role?: string;
      events: unknown[];
    },
    ctx: ExecutionContext,
  ) {
    const session = locate(input);
    if (!session) return noSession(input);

    const result = ingest(session, input.events);
    const gates = verifyCheckpoints(session.spec, session.events);
    const stuck = findStuck(session.spec, session.events, gates);

    ctx.logger.info('build_event', {
      session: session.id,
      accepted: result.accepted.length,
      rejected: result.rejected.length,
      total: result.total,
    });

    return {
      session: session.id,
      accepted: result.accepted.length,
      rejected: result.rejected,
      events_held: result.total,
      ...(result.dropped
        ? {
            dropped: `${result.dropped} oldest event(s) dropped — this session is at its retention cap`,
          }
        : {}),
      gates: gates.map((g) => ({
        id: g.id,
        subject: g.subject,
        kind: g.kind,
        status: g.status,
        at: g.at,
        out_of_order: g.out_of_order,
        should_follow: g.should_follow,
        attempts: g.attempts,
      })),
      passed: gates.filter((g) => g.status === 'pass').length,
      of: gates.length,
      // Reported every time rather than only on request: a student who has just built
      // something out of sequence is at the exact moment the observation is cheapest.
      out_of_order: gates
        .filter((g) => g.out_of_order)
        .map((g) => `${g.subject} was reached before ${g.should_follow.join(', ')}`),
      stuck,
      next:
        gates.every((g) => g.status === 'pass')
          ? 'Every gate is marked. Call build_verdict with finalise true.'
          : 'Keep streaming. Call build_verdict any time for a snapshot of where they are.',
    };
  }

  @Tool({
    name: 'build_verdict',
    description:
      "MCP-2's last word on a build: every checkpoint marked pass / fail / not_reached from what " +
      'was actually witnessed, the drift report when the build stopped matching the design, where ' +
      'the student got bogged down, and what is still outstanding — as a mentor.verdict/v1, which ' +
      'is the document MCP-3 files against their record and makes a flashcard from. Call it with ' +
      'finalise false (the default) for a snapshot of where they are, and true when the student ' +
      'says they are done. Drive it from an open session, or pass spec, plan and events inline. ' +
      'It reports the origin of the bug as a file and a line and DOES NOT return the fix.',
    inputSchema: z.object({
      session: sessionArg,
      student: studentArg,
      project: z.string().optional().describe('Used with `student` to find an open session.'),
      role: z.string().optional().describe('Narrows the search when a student holds two seats.'),
      spec: artifact
        .optional()
        .describe('The mentor.checkpoints/v1 spec, when driving this without a session.'),
      plan: artifact
        .optional()
        .describe('The lumina.plan/v1 design, when driving this without a session.'),
      events: z
        .array(z.union([z.string(), z.record(z.unknown())]))
        .optional()
        .describe('The lumina.build_event/v1 history, when driving this without a session.'),
      finalise: z
        .boolean()
        .optional()
        .describe(
          'True when the student says they are finished — the verdict may then be complete or ' +
            'escalated. False (the default) reports in_progress, which MCP-3 records without ' +
            'issuing a card.',
        ),
      hand_off: z
        .boolean()
        .optional()
        .describe(
          'File the verdict with MCP-3 (default true when PROFILE_URL is configured). Set false ' +
            'to get the artifact back and file it yourself.',
        ),
    }),
  })
  async buildVerdict(
    input: {
      session?: string;
      student?: string;
      project?: string;
      role?: string;
      spec?: unknown;
      plan?: unknown;
      events?: unknown[];
      finalise?: boolean;
      hand_off?: boolean;
    },
    ctx: ExecutionContext,
  ) {
    // Two ways in, one analysis. The inline path builds an unregistered session so it
    // normalises events exactly the way a streamed one does — a client that holds its
    // own history must not get a different verdict from one that streamed it.
    let session = locate(input);
    let inline = false;

    if (!session) {
      if (input.spec === undefined || input.plan === undefined) return noSession(input);

      let spec: CheckpointSpec;
      let plan: Plan;
      try {
        spec = parseCheckpointSpec(input.spec);
      } catch (err) {
        return {
          error: `could not read that checkpoint spec: ${err instanceof Error ? err.message : String(err)}`,
          what_to_do: 'Pass the document MCP-1 checkpoint_spec returns under `spec`, unmodified.',
        };
      }
      try {
        plan = parsePlan(input.plan);
      } catch (err) {
        return {
          error: `could not read that plan: ${err instanceof Error ? err.message : String(err)}`,
          what_to_do: 'Pass the lumina.plan/v1 the spec was derived from.',
        };
      }

      const digest = digestVerdict(spec, plan);
      if (!digest.ok) {
        return {
          refused: true,
          reason: digest.note,
          what_to_do:
            'Re-derive the gates from the design you are actually building: call MCP-1 ' +
            'checkpoint_spec with this plan.',
          spec_digest: spec.plan_digest,
          plan_digest: digest.actual,
        };
      }

      session = detachedSession({ spec, plan, student: input.student });
      inline = true;
      ingest(session, input.events ?? []);
    }

    const assessment = assess({
      spec: session.spec,
      plan: session.plan,
      events: session.events,
      student: input.student ?? session.student,
      finalise: input.finalise === true,
    });

    // File it with the record. The verdict is the durable half of everything above —
    // sessions are a cache — so this is the call that makes a sitting survive.
    // Read off the same function `assess` used to decide the status, never recomputed.
    // A second copy of "what is outstanding" would disagree with the verdict it sits
    // next to within a week, and the student would have no way to tell which was right.
    const blocking = describeBlocking(assessment.gates, session.spec, assessment.outsideTheSlice);

    const peer = profilePeer();
    const wantsHandOff = input.hand_off !== false && peer.configured;
    const filed = wantsHandOff
      ? await peer.call('record_verdict', {
          verdict: assessment.verdict,
          student: assessment.verdict.student,
        })
      : null;

    ctx.logger.info('build_verdict', {
      session: session.id,
      inline,
      status: assessment.verdict.status,
      driftFound: !!assessment.verdict.drift?.found,
      filed: filed?.ok ?? false,
    });

    return {
      // The artifact, whole and unmodified, because MCP-3 parses this exact shape.
      verdict: assessment.verdict,
      status: assessment.verdict.status,
      statement: assessment.verdict.statement,
      // The per-gate evidence. Too verbose for the artifact that crosses the bridge,
      // and the thing a student needs in order to audit a mark they disagree with.
      gates: assessment.gates,
      blocking,
      expected_unbuilt: assessment.expectedUnbuilt,
      expected_unbuilt_note:
        assessment.expectedUnbuilt.length > 0
          ? 'These are boundary components from your brief. They are correctly not built by you, ' +
            'and they are not outstanding work.'
          : undefined,
      outside_the_slice: assessment.outsideTheSlice,
      stuck: assessment.verdict.stuck,
      // ── the refusal, in the tool that has the most to hand over ──
      fix_withheld: true,
      refusal: REFUSAL,
      next_question: assessment.verdict.drift?.origin
        ? `Why does ${assessment.verdict.drift.origin.component} have to come after ` +
          `${assessment.verdict.drift.origin.shouldFollow}?`
        : 'Which component owns the assumption that broke?',
      concept:
        // Key and question travel; the answer has never been in this process. Said out
        // loud on the payload so a judge can see the boundary without reading the code.
        {
          ...assessment.verdict.concept,
          answer:
            'not held by this service, ever — MCP-3 releases it against the student\'s own green ' +
            'tests and is the only process that has it',
        },
      session: session.id,
      driven_by: inline
        ? 'artifacts passed inline — no session, so "stuck" is judged only on the events you sent'
        : `session ${session.id}, ${session.events.length} event(s) witnessed`,
      filed_with_profile: filed?.ok ?? false,
      bridge: filed
        ? bridgeReport(filed)
        : {
            peer: 'profile',
            called: 'record_verdict',
            mode: peer.configured ? 'skipped' : 'absent',
            reached: false,
            url: peer.url,
            note: peer.configured
              ? 'hand_off was false — the verdict is in this response, file it yourself.'
              : 'PROFILE_URL is unset on this deployment, so nothing is being kept between ' +
                'sessions. The verdict above is the artifact — pass it to MCP-3 record_verdict.',
          },
      next: assessment.verdict.drift?.found
        ? 'Show them the drift with explain_drift, then let them fix it. If they ask you to fix ' +
          'it, call withhold_fix.'
        : 'Work the blocking list, then call this again with finalise true.',
    };
  }
}

@Module({
  name: 'verify',
  description:
    "The verifier — watches a build against the checkpoint spec MCP-1 issued, marks every gate from what it actually witnessed, and files the verdict MCP-3 makes a flashcard from. It names where the build left the design; it does not fix it.",
  controllers: [VerifyTools],
})
export class VerifyModule {}
