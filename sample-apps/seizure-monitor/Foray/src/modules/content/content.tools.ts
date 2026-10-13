/**
 * COURSE CONTENT SERVER — read-only. Open to all roles. foray_plan.md §3.1
 *
 * This is the server the Grounding Verifier retrieves from. No embeddings,
 * no vector index: MaterialChunk.concept_ids is hand-tagged, so retrieval
 * is a list filter (§9). With 13 concepts that returns 2–5 chunks and the
 * verifier picks. There is nothing to tune at 3am.
 */

import { ToolDecorator as Tool, UseGuards, ExecutionContext, z } from '@nitrostack/core';
import { WardenGuard } from '../../foray/warden.guard.js';
import { api } from '../../foray/api.client.js';

export class ContentTools {
  @Tool({
    name: 'get_concept',
    description:
      'Fetch one concept from the course concept graph by id, including its ' +
      'name, unit and prerequisite concept ids.',
    inputSchema: z.object({
      concept_id: z.string().describe('Concept id, e.g. "C07"'),
    }),
    examples: {
      request: { concept_id: 'C03' },
      response: {
        id: 'C03',
        name: 'Addressing and ports',
        unit: 'U0',
        prereqs: ['C01'],
      },
    },
  })
  @UseGuards(WardenGuard)
  async getConcept(input: { concept_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('get_concept', { concept_id: input.concept_id });
    return api.get(`/internal/concepts/${encodeURIComponent(input.concept_id)}`);
  }

  @Tool({
    name: 'get_prereqs',
    description:
      'Fetch the prerequisite concepts of a concept. The Root Cause Analyst ' +
      'walks these edges BACKWARDS to find the concept that actually caused a ' +
      'misconception — usually not the current topic. (R-07)',
    inputSchema: z.object({
      concept_id: z.string().describe('Concept id to walk back from'),
      depth: z
        .number()
        .int()
        .min(1)
        .max(4)
        .default(1)
        .describe('How many prerequisite levels to walk back'),
    }),
    examples: {
      request: { concept_id: 'C11', depth: 3 },
      response: {
        root: 'C11',
        chain: ['C11', 'C10', 'C06', 'C05', 'C03'],
      },
    },
  })
  @UseGuards(WardenGuard)
  async getPrereqs(
    input: { concept_id: string; depth?: number },
    ctx: ExecutionContext,
  ) {
    const depth = input.depth ?? 1;
    ctx.logger.info('get_prereqs', { concept_id: input.concept_id, depth });
    return api.get(
      `/internal/concepts/${encodeURIComponent(input.concept_id)}/prereqs?depth=${depth}`,
    );
  }

  @Tool({
    name: 'get_material_chunks',
    description:
      'Retrieve prescribed course material chunks tagged with this concept. ' +
      'The Grounding Verifier MUST cite one of these — no citation, no ' +
      'correction. Each chunk carries the printed page number. (R-02)',
    inputSchema: z.object({
      concept_id: z.string().describe('Concept id to retrieve material for'),
    }),
    examples: {
      request: { concept_id: 'C03' },
      response: [
        {
          id: 'MAT_041',
          source: 'Kurose & Ross 8e',
          page: 249,
          concept_ids: ['C03'],
          text: '...',
        },
      ],
    },
  })
  @UseGuards(WardenGuard)
  async getMaterialChunks(input: { concept_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('get_material_chunks', { concept_id: input.concept_id });
    return api.get(
      `/internal/materials?concept_id=${encodeURIComponent(input.concept_id)}`,
    );
  }
}
