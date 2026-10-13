/**
 * COHORT ANALYTICS SERVER — Loop 2 agents + faculty.
 *
 *   RETURNS NO RAW STUDENT TEXT. STRUCTURALLY CANNOT.
 *
 * Every response on this server is a count, an id or a concept name. There
 * is no code path from here to Reflection.text — that is what makes the
 * faculty grant safe, and it is why the Root Cause Analyst can be given
 * cohort data without ever seeing a student's words.
 *
 * The k-anonymity gate (k=5) is applied in Python /core/clustering.py
 * BEFORE anything reaches this server. A safety gate must be
 * deterministic; an LLM gate is not a gate. (R-04, §3.2)
 */

import { ToolDecorator as Tool, UseGuards, ExecutionContext, z } from '@nitrostack/core';
import { WardenGuard } from '../../foray/warden.guard.js';
import { api } from '../../foray/api.client.js';

export class CohortTools {
  @Tool({
    name: 'get_clusters',
    description:
      'Misconception clusters for a given week. Clusters below k=5 students ' +
      'are filtered out upstream and never appear here (R-04). Counts only — ' +
      'no student ids, no reflection text.',
    inputSchema: z.object({
      week: z.number().int().describe('Teaching week, e.g. 6'),
    }),
    examples: {
      request: { week: 6 },
      response: [
        {
          id: 'CL_006_M12',
          week: 6,
          misconception_id: 'M12',
          student_count: 23,
          cohort_size: 60,
          k_satisfied: true,
          root_cause_concept_id: 'C03',
        },
      ],
    },
  })
  @UseGuards(WardenGuard)
  async getClusters(input: { week: number }, ctx: ExecutionContext) {
    ctx.logger.info('get_clusters', { week: input.week });
    return api.get(`/internal/clusters?week=${input.week}`);
  }

  @Tool({
    name: 'get_cohort_mastery',
    description:
      'Aggregate cohort mastery for one concept. The Root Cause Analyst uses ' +
      'this to prefer a prerequisite with LOW cohort mastery when tracing ' +
      'backwards (R-07). Aggregate only — never per-student.',
    inputSchema: z.object({
      concept_id: z.string().describe('Concept id, e.g. "C03"'),
    }),
    examples: {
      request: { concept_id: 'C03' },
      response: { concept_id: 'C03', mean_level: 0.31, n: 60 },
    },
  })
  @UseGuards(WardenGuard)
  async getCohortMastery(input: { concept_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('get_cohort_mastery', { concept_id: input.concept_id });
    return api.get(
      `/internal/cohort-mastery/${encodeURIComponent(input.concept_id)}`,
    );
  }

  @Tool({
    name: 'put_intervention',
    description:
      'Store a ten-minute intervention for a cluster and mark it delivered. ' +
      'Efficacy is NOT set here — it is counted deterministically at week+1 ' +
      'by /core/efficacy.py. The crown-jewel number is never generated (R-08).',
    inputSchema: z.object({
      cluster_id: z.string(),
      kind: z.enum(['reteach', 'worked_example', 'problem_set']),
      content: z.string().describe('The intervention itself. Ten minutes.'),
      delivered_week: z.number().int(),
    }),
    examples: {
      request: {
        cluster_id: 'CL_006_M12',
        kind: 'worked_example',
        content: 'Two clients, same server port — show the four-tuple...',
        delivered_week: 6,
      },
      response: { id: 'INT_003', delivered: true },
    },
  })
  @UseGuards(WardenGuard)
  async putIntervention(
    input: {
      cluster_id: string;
      kind: 'reteach' | 'worked_example' | 'problem_set';
      content: string;
      delivered_week: number;
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('put_intervention', { cluster_id: input.cluster_id });
    return api.post('/internal/interventions', input);
  }

  @Tool({
    name: 'get_topic_questions',
    description:
      'Most-questioned topics: per-concept counts of the questions students ' +
      'asked in chat. COUNTED from logged questions, never generated (R-12). ' +
      'Topics below k=5 distinct students are filtered upstream and never ' +
      'appear here. Counts only — no question text, no student ids.',
    inputSchema: z.object({
      class_id: z
        .string()
        .optional()
        .describe('Class id, e.g. "CLS_CN5". Omit for all classes.'),
    }),
    examples: {
      request: { class_id: 'CLS_CN5' },
      response: [
        {
          concept_id: 'C11',
          concept_name: 'TCP connection management',
          questions: 34,
          students: 21,
        },
      ],
    },
  })
  @UseGuards(WardenGuard)
  async getTopicQuestions(
    input: { class_id?: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('get_topic_questions', { class_id: input.class_id });
    const q = input.class_id
      ? `?class_id=${encodeURIComponent(input.class_id)}`
      : '';
    return api.get(`/internal/topic-questions${q}`);
  }
}
