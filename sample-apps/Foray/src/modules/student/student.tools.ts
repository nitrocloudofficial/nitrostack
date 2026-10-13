/**
 * STUDENT MODEL SERVER — Loop 1 agents + Compass only.
 *
 *   ██  FACULTY ROLE IS BLOCKED HERE. THAT BLOCK IS DEMO BEAT 6.  ██
 *
 * get_reflection returns the student's own unedited words. It is the most
 * sensitive read in the system and the reason the whole architecture is
 * split: a student is only honest about confusion if the faculty member
 * cannot see their name attached to it. Remove this boundary and the
 * product stops working — not legally, epistemically. (foray_plan.md §2.3)
 */

import { ToolDecorator as Tool, UseGuards, ExecutionContext, z } from '@nitrostack/core';
import { WardenGuard } from '../../foray/warden.guard.js';
import { api } from '../../foray/api.client.js';

export class StudentTools {
  @Tool({
    name: 'get_reflection',
    description:
      "Fetch one student reflection, including its raw text. Scope: " +
      "raw_reflection. Faculty callers are refused and logged (R-03).",
    inputSchema: z.object({
      reflection_id: z.string().describe('Reflection id, e.g. "R_0921"'),
    }),
    examples: {
      request: { reflection_id: 'R_0921' },
      response: {
        id: 'R_0921',
        student_id: 'S_014',
        week: 6,
        lang: 'en',
        concept_ids: ['C11'],
        text: 'i think the port number is basically the connection...',
      },
    },
  })
  @UseGuards(WardenGuard)
  async getReflection(input: { reflection_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('get_reflection', { reflection_id: input.reflection_id });
    return api.get(`/internal/reflections/${encodeURIComponent(input.reflection_id)}`);
  }

  @Tool({
    name: 'put_diagnosis',
    description:
      'Store a Diagnosis produced by the Diagnostician. misconception_ids ' +
      'must come from the taxonomy, or be empty with novel_text set. ' +
      'evidence_span must quote the student verbatim. (R-01)',
    inputSchema: z.object({
      reflection_id: z.string(),
      misconception_ids: z
        .array(z.string())
        .describe('Taxonomy ids, e.g. ["M12"]. Empty if nothing matched.'),
      novel_text: z
        .string()
        .nullable()
        .default(null)
        .describe('Set only when nothing in the taxonomy matched'),
      confidence: z.number().min(0).max(1),
      evidence_span: z
        .string()
        .describe("Quoted VERBATIM from the student. Never paraphrased."),
    }),
    examples: {
      request: {
        reflection_id: 'R_0921',
        misconception_ids: ['M12'],
        novel_text: null,
        confidence: 0.82,
        evidence_span: 'the port number is basically the connection',
      },
      response: { id: 'D_0921', stored: true },
    },
  })
  @UseGuards(WardenGuard)
  async putDiagnosis(
    input: {
      reflection_id: string;
      misconception_ids: string[];
      novel_text: string | null;
      confidence: number;
      evidence_span: string;
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('put_diagnosis', { reflection_id: input.reflection_id });
    return api.post('/internal/diagnoses', input);
  }

  @Tool({
    name: 'get_mastery',
    description:
      "Fetch one student's MasteryState across concepts. Compass reads this " +
      'to ground a roadmap in demonstrated gaps rather than stated ' +
      'interest (R-09). Scope: individual_mastery — faculty blocked.',
    inputSchema: z.object({
      student_id: z.string().describe('Pseudonymous student id, e.g. "S_014"'),
    }),
    examples: {
      request: { student_id: 'S_014' },
      response: [
        {
          student_id: 'S_014',
          concept_id: 'C03',
          level: 0.34,
          last_seen_week: 6,
          corrected_misconceptions: ['M12'],
        },
      ],
    },
  })
  @UseGuards(WardenGuard)
  async getMastery(input: { student_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('get_mastery', { student_id: input.student_id });
    return api.get(`/internal/mastery/${encodeURIComponent(input.student_id)}`);
  }

  @Tool({
    name: 'put_mastery',
    description:
      'Record a mastery observation. The EMA update itself is computed ' +
      'deterministically in Python /core/mastery.py — this tool only ' +
      'submits the observation. No model touches the number.',
    inputSchema: z.object({
      student_id: z.string(),
      concept_id: z.string(),
      observation: z
        .number()
        .min(0)
        .max(1)
        .describe('Evidence of understanding from this reflection, 0.0–1.0'),
      week: z.number().int(),
    }),
    examples: {
      request: { student_id: 'S_014', concept_id: 'C03', observation: 0.2, week: 6 },
      response: { student_id: 'S_014', concept_id: 'C03', level: 0.34 },
    },
  })
  @UseGuards(WardenGuard)
  async putMastery(
    input: {
      student_id: string;
      concept_id: string;
      observation: number;
      week: number;
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('put_mastery', {
      student_id: input.student_id,
      concept_id: input.concept_id,
    });
    return api.post('/internal/mastery', input);
  }
}
