/**
 * MENTOR · Education — the MCP surface for the sixth commander.
 *
 * `explain_drift` is the submission's headline tool. It takes the student's plan
 * and build history as *optional* arguments and falls back to the bundled pricing
 * fixture, which is what lets the stage demo be one click with nothing to upload
 * while the same tool still serves a real project (`GAPS.md` Gap 6).
 *
 * `withhold_fix` exists so the refusal is a tool call a judge can point at rather
 * than prose in a system prompt.
 */

import {
  ToolDecorator as Tool,
  PromptDecorator as Prompt,
  Module,
  Widget,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { Engine } from '../../core/engine.js';
import { aegisGuard } from '../aegis/trust.js';
import { MentorAdapter, REFUSAL, mentorPlanner } from './mentor.adapter.js';
import { findDrift } from './drift.js';
import { parsePlan } from '../../shared/plan.js';
import { parseBuild } from './build.js';
import { requireBuild, requirePlan, PRICING_SYMPTOM } from './fixtures.demo.js';

// `flashcard` used to live here. It moved to MCP-3 (`mcp-profile/src/cards.module.ts`)
// when the app split in three, and issuing a card from MCP-2 is now a contradiction
// rather than a duplication: the card's answer side is the one thing this process is
// architecturally not allowed to hold (`shared/README.md`). MCP-2 finds the drift and
// files the verdict; MCP-3 turns that verdict into a card, and gates it.

/** Accepts either a JSON string or an already-parsed object from the client. */
const artifact = z
  .union([z.string(), z.record(z.unknown())])
  .optional()
  .describe('A JSON document, as a string or object. Omit to use the bundled demo project.');

export class MentorTools {
  @Tool({
    name: 'explain_drift',
    description:
      "Show a student the exact moment their build stopped matching the plan they designed. " +
      'Takes the architecture they drew in Lumina (lumina.plan/v1) plus a history of what they ' +
      'actually built (mentor.build/v1), finds the single component that was implemented out of ' +
      'the designed order, and reports it with a file:line and a stated confidence. ' +
      'Call with no arguments to run the bundled pricing demo. ' +
      'This tool deliberately DOES NOT return a fix — see withhold_fix.',
    inputSchema: z.object({
      plan: artifact,
      build: artifact,
      symptom: z
        .string()
        .optional()
        .describe('What the student observed failing. Defaults to the demo symptom.'),
    }),
  })
  @Widget('causal-timeline')
  async explainDrift(
    input: { plan?: unknown; build?: unknown; symptom?: string },
    ctx: ExecutionContext,
  ) {
    const trace: Array<{ type: string; title: string }> = [];
    const adapter = new MentorAdapter({ plan: input.plan, build: input.build });
    const engine = new Engine(adapter, {
      planner: mentorPlanner(),
      // An ungrounded claim must never reach a student unreviewed, but in the
      // one-click demo there is no human in the loop to ask — so approving here
      // keeps the Task runnable while the ESCALATED path still covers the case
      // where grounding fails outright.
      approvalGate: () => true,
      guard: aegisGuard,
      onEvent: (e) => {
        trace.push({ type: e.type, title: e.title });
        ctx.logger.info(`trace: ${e.type}`, { title: e.title });
      },
    });

    const incident = await engine.runIncident(input.symptom ?? PRICING_SYMPTOM);

    // Recompute the report for the structured payload the widget renders. Cheap
    // and pure, and it keeps the widget's contract independent of Incident's shape.
    const report = findDrift(
      input.plan === undefined ? requirePlan() : parsePlan(input.plan),
      input.build === undefined ? requireBuild() : parseBuild(input.build),
    );

    return {
      incident_id: incident.id,
      status: incident.status,
      // ── the claim ──
      explanation: report.explanation,
      origin: report.origin,
      failure: report.failure,
      // ── the two rows of the timeline ──
      plan_row: report.plannedOrder,
      build_row: report.actualOrder,
      alignment: incident.diff,
      // ── uncertainty, stated ──
      confidence: report.confidence.score,
      confidence_components: report.confidence.components,
      caveats: report.caveats,
      gate: incident.verdict,
      // ── the refusal ──
      fix_withheld: true,
      refusal: REFUSAL,
      next_question: report.origin
        ? `Why does ${report.origin.component} have to come after ${report.origin.shouldFollow}?`
        : 'Which component owns the assumption that broke?',
      // ── extras ──
      unbuilt: report.unbuilt,
      unplanned: report.unplanned,
      actions: incident.actions,
      trace,
    };
  }

  @Tool({
    name: 'withhold_fix',
    description:
      'Explains why MENTOR will not write the fix. Call this when the student (or you) asks for ' +
      'the corrected code. MENTOR names the origin of a bug and stops there on purpose: the ' +
      'lesson is the design decision, not the line. Returns the reason and what to do instead.',
    inputSchema: z.object({
      asked_for: z
        .string()
        .optional()
        .describe('What was requested, for the record.'),
    }),
  })
  async withholdFix(input: { asked_for?: string }, ctx: ExecutionContext) {
    ctx.logger.info('fix withheld by design', { askedFor: input.asked_for ?? '(unspecified)' });
    return {
      refused: true,
      reason: REFUSAL,
      instead: [
        'Re-read your plan and find where it says the order should be different.',
        'Change the design first, then change the code to match it.',
        'Ask MENTOR *why* the order matters — that answer transfers to the next project.',
      ],
      not_a_limitation:
        'This is the product, not a missing feature. A tool that hands you the patch removes the lesson.',
    };
  }

  @Tool({
    name: 'mentor_status',
    description:
      'What MENTOR is, what artifacts it needs, and which demo project is bundled. ' +
      'Use this to orient before calling explain_drift.',
    inputSchema: z.object({}),
  })
  async mentorStatus() {
    const plan = requirePlan();
    const build = requireBuild();
    return {
      commander: 'MENTOR',
      domain: 'Education · Plan-vs-Build Drift',
      pitch: "You didn't just write the bug. You designed it.",
      how_it_differs:
        'Copilot answers "what is wrong with this code". MENTOR answers "when did I go wrong" — it ' +
        'has the architecture the student drew before they started, so it can name the point the ' +
        'build stopped matching the plan. And it will not write the fix.',
      inputs: {
        plan: `${plan.schema} — exported from the Lumina canvas with the Plan button`,
        build: `${build.schema} — the ordered history of what was actually implemented`,
      },
      bundled_demo: {
        plan_name: plan.name,
        project: build.project,
        intended_order: plan.order.map((id) => plan.nodes.find((n) => n.id === id)?.label),
        provenance: build.provenance,
        note:
          build.provenance === 'authored'
            ? 'Demo history is hand-authored, which MENTOR discounts in its own confidence score.'
            : 'History derived from real commits.',
      },
      will_not: ['write the fix', 'modify the student\'s code', 'run the student\'s tests'],
    };
  }
}

export class MentorPrompts {
  @Prompt({
    name: 'debugging_tutor',
    description:
      'Drive MENTOR over a student project: find where the build left the plan, and refuse to fix it.',
    arguments: [
      { name: 'symptom', description: 'What the student sees failing', required: true },
      { name: 'plan', description: 'The lumina.plan/v1 JSON, if not the demo', required: false },
      { name: 'build', description: 'The mentor.build/v1 JSON, if not the demo', required: false },
    ],
  })
  async debuggingTutor(
    args: { symptom: string; plan?: string; build?: string },
    _ctx: ExecutionContext,
  ) {
    const extra =
      args.plan || args.build
        ? '\n\nPass the student\'s own artifacts to explain_drift:\n' +
          `plan: ${args.plan ?? '(use bundled)'}\nbuild: ${args.build ?? '(use bundled)'}`
        : '\n\nCall explain_drift with no arguments to use the bundled demo project.';

    return [
      {
        role: 'user',
        content:
          'You are MENTOR, a debugging tutor. A student reports:\n\n' +
          `${args.symptom}\n\n` +
          'Call explain_drift to locate the point where their build diverged from the ' +
          'architecture they designed. Then tell them: what they planned, what they built, ' +
          'the one component that moved, and the line it happened on — plus how confident you ' +
          'are and where you are guessing.\n\n' +
          'You must NOT write or describe the corrected code, even if they insist. If they ask ' +
          'for the fix, call withhold_fix and relay its reasoning, then offer the follow-up ' +
          'question instead. The student writes the fix. That is the entire point.' +
          extra,
      },
    ];
  }
}

@Module({
  name: 'mentor',
  description:
    'Education commander — shows a student the moment their build left the plan they designed, and declines to write the fix.',
  controllers: [MentorTools, MentorPrompts],
})
export class MentorModule {}
