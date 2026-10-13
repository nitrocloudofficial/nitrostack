import { ToolDecorator as Tool, ExecutionContext, z, Widget } from '@nitrostack/core';
import pLimit from 'p-limit';
import { TradeTools } from '../trades/trades.tools.js';
import { MatchTradesTools } from '../match-trades/match-trades.tools.js';
import { InvestigateTools } from '../investigate/investigate.tools.js';
import { ResolveTools } from '../resolve/resolve.tools.js';
import { CorrectionTools } from '../correction/correction.tools.js';
import { RunReconciliationOutput, ReconciledBreak } from './reconciliation.types.js';

const groqLimit = pLimit(2);

export class ReconciliationTools {
  @Tool({
    name: 'run_reconciliation',
    description:
      'Runs the full trade reconciliation pipeline end to end: loads trades, matches them, investigates every break, resolves or escalates each one, and proposes corrections for anything unexplained. Returns everything in one call.',
    inputSchema: z.object({
      system: z.enum(['A', 'B', 'both']).default('both').describe('Which system(s) to load trades from'),
    }),
    invocation: {
      invoking: 'Running full reconciliation pipeline...',
      invoked: 'Reconciliation complete',
    },
  })
  @Widget('trade-dashboard')
  async runReconciliation(
    input: { system: 'A' | 'B' | 'both' },
    ctx: ExecutionContext
  ): Promise<RunReconciliationOutput> {
    ctx.logger.info('Starting full reconciliation pipeline');

    try {
      const tradeTools = new TradeTools();
      const loadResult = await tradeTools.loadTrades({ system: input.system ?? 'both' }, ctx);
      const allTrades = loadResult.trades;

      const systemATrades = allTrades.filter((t: any) => t.system === 'A');
      const systemBTrades = allTrades.filter((t: any) => t.system === 'B');

      const matchTradesTools = new MatchTradesTools();
      const matchResult = await matchTradesTools.matchTrades({ systemATrades, systemBTrades }, ctx);
      const rawBreaks = matchResult.breaks;

      ctx.logger.info('Breaks found, beginning investigation', { count: rawBreaks.length });

      const investigateTools = new InvestigateTools();
      const resolveTools = new ResolveTools();
      const correctionTools = new CorrectionTools();

      const reconciledBreaks: ReconciledBreak[] = await Promise.all(
        rawBreaks.map((b: any) =>
          groqLimit(async (): Promise<ReconciledBreak> => {
            const investigation = await investigateTools.investigateBreak(
              { breakId: b.breakId, tradeA: b.tradeA, tradeB: b.tradeB, discrepancy: b.discrepancy },
              ctx
            );

            let resolution;
            try {
              resolution = await resolveTools.resolveOrEscalate(
                {
                  breakId: investigation.breakId,
                  explained: investigation.explained,
                  reason: investigation.reason,
                  confidence: investigation.confidence,
                },
                ctx
              );
            } catch (err) {
              ctx.logger.error('resolveOrEscalate failed', { breakId: b.breakId, err: String(err) });
              resolution = { status: 'escalated' as const };
            }

            let correction: ReconciledBreak['correction'] = null;
            if (resolution.status === 'escalated') {
              try {
                const proposal = await correctionTools.proposeCorrection(
                  {
                    breakId: b.breakId,
                    tradeA: b.tradeA,
                    tradeB: b.tradeB,
                    discrepancy: b.discrepancy,
                    investigationReason: investigation.reason,
                  },
                  ctx
                );
                correction = {
                  hasProposal: proposal.hasProposal,
                  proposedField: proposal.proposedField,
                  proposedValue: proposal.proposedValue,
                  proposedSystem: proposal.proposedSystem,
                  reasoning: proposal.reasoning,
                  confidence: proposal.confidence,
                };
              } catch (err) {
                ctx.logger.error('proposeCorrection failed', { breakId: b.breakId, err: String(err) });
              }
            }

            return {
              breakId: b.breakId,
              discrepancy: b.discrepancy,
              explained: investigation.explained,
              reason: investigation.reason,
              confidence: investigation.confidence,
              status: resolution.status,
              correction,
            };
          })
        )
      );

      let stats;
      try {
        stats = await resolveTools.getAccuracyStats({}, ctx);
      } catch (err) {
        ctx.logger.error('getAccuracyStats failed', { err: String(err) });
        stats = { totalProcessed: reconciledBreaks.length, resolvedCount: 0, escalatedCount: 0 };
      }

      ctx.logger.info('Reconciliation pipeline complete', {
        breaksProcessed: reconciledBreaks.length,
        totalProcessed: stats.totalProcessed,
        resolvedCount: stats.resolvedCount,
        escalatedCount: stats.escalatedCount,
      });

      return {
        breaks: reconciledBreaks,
        stats: {
          totalProcessed: stats.totalProcessed,
          resolvedCount: stats.resolvedCount,
          escalatedCount: stats.escalatedCount,
        },
      };
    } catch (err) {
      ctx.logger.error('run_reconciliation pipeline crashed', {
        err: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}