import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { RedlineService } from './redline.service.js';

@Injectable({ deps: [RedlineService] })
export class RedlineTools {
  constructor(private redlineService: RedlineService) {}

  @Tool({
    name: 'generate_redline',
    description:
      'Redline & Counter-Proposal Synthesizer. Aggregates the specialized agents’ findings, drafts founder-friendly replacement clause language checked against the graph dependency edges, and produces a negotiation email. Set restore=true to decrypt the session token map and substitute original values back for the user — do not pass restored output to any model.',
    inputSchema: z.object({
      graphId: z.string().describe('Graph id from build_graph'),
      sessionId: z.string().describe('Session id from redact_document'),
      restore: z
        .boolean()
        .optional()
        .describe('Substitute original values back in. User-facing output only. Default false.')
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true }
  })
  async generateRedline(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Synthesizing counter-proposal', {
      graphId: input.graphId,
      sessionId: input.sessionId,
      restore: !!input.restore
    });

    const proposal = await this.redlineService.synthesize(input.graphId, input.sessionId, {
      restore: !!input.restore
    });

    if (proposal.restorationWarning) {
      ctx.logger.warn('Restoration requested but vault unavailable', {
        sessionId: input.sessionId
      });
    }

    ctx.logger.info('redline.generated', {
      graphId: input.graphId,
      redlineCount: proposal.redlines.length,
      restored: proposal.restored,
      source: proposal.source
    });

    return proposal;
  }

  @Tool({
    name: 'diff_clause',
    description:
      'Render a unified-diff style comparison between the current clause language and a proposed replacement, for display in the results UI.',
    inputSchema: z.object({
      originalText: z.string().describe('Clause as currently drafted'),
      proposedText: z.string().describe('Proposed replacement language')
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  })
  async diffClause(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Rendering clause diff');
    return { diff: this.redlineService.diff(input.originalText, input.proposedText) };
  }
}
