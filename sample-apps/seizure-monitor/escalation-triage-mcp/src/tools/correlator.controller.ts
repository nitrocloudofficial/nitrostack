import { ControllerDecorator as Controller, ToolDecorator as Tool, z, type ExecutionContext } from '@nitrostack/core';
import { findOrCreateCustomer, getSignalsForCustomer, type Signal } from '../db.js';

/**
 * AGENT: Correlator & Risk-Scorer
 * Matches signals to the same customer (already done at collection time via
 * customer_id) and computes a 1-10 risk score with a short explanation,
 * based on signal volume, negative tone, and how long things have been open.
 */
const NEGATIVE_WORDS = [
  'angry', 'furious', 'unacceptable', 'frustrated', 'disappointed', 'urgent',
  'churn', 'cancel', 'terrible', 'worst', 'broken', 'still not', 'again',
  'escalate', 'refund', 'threaten', 'lawsuit', 'lawyer', 'switch to',
];

function scoreRisk(signals: Signal[]): { score: number; reasoning: string } {
  if (signals.length === 0) {
    return { score: 1, reasoning: 'No signals found for this customer.' };
  }

  const volumeScore = Math.min(signals.length, 5);

  const negativeHits = signals.reduce((count, s) => {
    const text = s.message.toLowerCase();
    return count + NEGATIVE_WORDS.filter((w) => text.includes(w)).length;
  }, 0);
  const toneScore = Math.min(negativeHits, 4);

  const oldestTs = signals[0].timestamp;
  const daysOpen = Math.max(
    0,
    Math.floor((Date.now() - new Date(oldestTs).getTime()) / (1000 * 60 * 60 * 24))
  );
  const ageScore = daysOpen >= 7 ? 1 : 0;

  const score = Math.min(10, 1 + volumeScore + toneScore + ageScore);

  const reasoning =
    `${signals.length} signal(s) across ${new Set(signals.map((s) => s.source)).size} source(s); ` +
    `${negativeHits} negative-tone keyword hit(s); oldest signal is ${daysOpen} day(s) old.`;

  return { score, reasoning };
}

@Controller('risk')
export class CorrelatorController {
  @Tool({
    name: 'correlate_and_score',
    description:
      'Correlate all signals for a customer and produce a 1-10 risk score with reasoning, based on signal volume, negative tone, and how long the issue has been open.',
    inputSchema: z.object({
      customerName: z.string().describe('The customer/account name'),
    }),
  })
  async correlateAndScore(input: { customerName: string }, ctx: ExecutionContext) {
    const customer = await findOrCreateCustomer(input.customerName);
    const signals = await getSignalsForCustomer(customer.id, customer.name);
    const { score, reasoning } = scoreRisk(signals);

    ctx.logger.info('Scored risk', { customer: customer.name, score });

    return {
      customer: customer.name,
      riskScore: score,
      reasoning,
      signalCount: signals.length,
    };
  }
}
