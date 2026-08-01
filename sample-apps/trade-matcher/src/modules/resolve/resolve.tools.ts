import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { InvestigateBreakResult, ResolveOrEscalateResult, AccuracyStats } from './resolve.types.js';

// This counter lives in memory while the server runs.
// Good enough for a hackathon demo -- no database needed.
const stats: AccuracyStats = {
  totalProcessed: 0,
  resolvedCount: 0,
  escalatedCount: 0,
};

/**
 * Takes the output of investigate_break and decides: resolved or escalated.
 * explained: true  -> resolved (agent understood the break, no human needed)
 * explained: false -> escalated (flag for a human to review)
 */
function resolveOrEscalateInternal(
  input: InvestigateBreakResult,
): ResolveOrEscalateResult {
  const status: 'resolved' | 'escalated' = input.explained
    ? 'resolved'
    : 'escalated';

  // update the running counter
  stats.totalProcessed += 1;
  if (status === 'resolved') {
    stats.resolvedCount += 1;
  } else {
    stats.escalatedCount += 1;
  }

  return {
    breakId: input.breakId,
    status,
    reason: input.reason,
    confidence: input.confidence,
  };
}

export class ResolveTools {
  @Tool({
    name: 'resolve_or_escalate',
    description: 'Takes the output of investigate_break and decides whether the break is resolved or should be escalated to a human',
    inputSchema: z.object({
      breakId: z.string(),
      explained: z.boolean(),
      reason: z.string(),
      confidence: z.enum(['low', 'medium', 'high']),
    }),
  })
  async resolveOrEscalate(
    input: InvestigateBreakResult,
    ctx: ExecutionContext
  ): Promise<ResolveOrEscalateResult> {
    ctx.logger.info('Resolving or escalating break', { breakId: input.breakId });
    return resolveOrEscalateInternal(input);
  }

  /**
   * Returns the current running totals -- the dashboard (Agastya's part)
   * can call this to show "X resolved / Y escalated" live during the demo.
   */
  @Tool({
    name: 'get_accuracy_stats',
    description: 'Returns running totals of resolved vs escalated breaks for the demo dashboard',
    inputSchema: z.object({}),
  })
  async getAccuracyStats(
    _input: Record<string, never>,
    ctx: ExecutionContext
  ): Promise<AccuracyStats> {
    return { ...stats };
  }
}