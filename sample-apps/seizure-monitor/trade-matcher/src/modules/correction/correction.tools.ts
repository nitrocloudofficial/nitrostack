import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import OpenAI from 'openai';
import { ProposeCorrectionOutput } from './correction.types.js';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
  maxRetries: 0,
  timeout: 15_000,
});

export class CorrectionTools {
  @Tool({
    name: 'propose_correction',
    description:
      'For an escalated (unexplained) trade break, propose what the likely correct value is and which system has the error. Never auto-applies -- always requires human approval.',
    inputSchema: z.object({
      breakId: z.string(),
      tradeA: z.any().describe('Trade record from system A, or null if missing'),
      tradeB: z.any().describe('Trade record from system B, or null if missing'),
      discrepancy: z.string().describe('Human-readable description of the mismatch'),
      investigationReason: z
        .string()
        .describe('The reason investigate_break gave for why this break was NOT explained'),
    }),
  })
  async proposeCorrection(
    input: {
      breakId: string;
      tradeA: any;
      tradeB: any;
      discrepancy: string;
      investigationReason: string;
    },
    ctx: ExecutionContext
  ): Promise<ProposeCorrectionOutput> {
    ctx.logger.info('Proposing correction', { breakId: input.breakId });

    const systemPrompt = `You are a trade reconciliation analyst. A break has already been investigated and could NOT be explained by known FX or settlement causes. Your job now is different: look at the two trade records and decide whether one of them looks like a plausible data-entry or system error, and if so, propose the specific fix.

Be conservative. Only set hasProposal=true if there's a clear, specific, defensible reason to believe one particular field in one particular system is wrong (e.g. one price is wildly out of line with the other while everything else matches, or a quantity looks like an obvious typo).

If you cannot identify a specific likely error with reasonable confidence, set hasProposal=false and explain why -- do NOT invent a plausible-sounding fix just to fill the field.

You are NEVER applying this correction yourself. You are only proposing it for a human to review and approve.

Respond ONLY with JSON matching this shape, no other text:
{"breakId": string, "hasProposal": boolean, "proposedField": string|null, "proposedValue": string|null, "proposedSystem": "A"|"B"|null, "reasoning": string, "confidence": "low"|"medium"|"high"}`;

    const userMsg = `Break ID: ${input.breakId}
Trade A: ${JSON.stringify(input.tradeA)}
Trade B: ${JSON.stringify(input.tradeB)}
Discrepancy: ${input.discrepancy}
Why this break was NOT explained by the investigation step: ${input.investigationReason}`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMsg },
    ];

    let finalText = '';
    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages,
      });
      finalText = response.choices[0].message.content ?? '';
    } catch (err: any) {
      const isRateLimit = err?.status === 429;
      const isTimeout = err?.name === 'APIConnectionTimeoutError' || err?.code === 'ETIMEDOUT';
      ctx.logger.error('propose_correction LLM call failed', {
        breakId: input.breakId,
        isRateLimit,
        isTimeout,
        err: String(err),
      });
      return {
        breakId: input.breakId,
        hasProposal: false,
        proposedField: null,
        proposedValue: null,
        proposedSystem: null,
        reasoning: isRateLimit
          ? 'Correction proposal skipped -- Groq rate limit reached.'
          : isTimeout
          ? 'Correction proposal skipped -- LLM request timed out.'
          : 'Correction proposal failed due to an internal error.',
        confidence: 'low',
      };
    }

    try {
      const cleaned = finalText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return ProposeCorrectionOutput.parse(parsed);
    } catch (err) {
      ctx.logger.error('Failed to parse propose_correction output', { finalText, err: String(err) });
      return {
        breakId: input.breakId,
        hasProposal: false,
        proposedField: null,
        proposedValue: null,
        proposedSystem: null,
        reasoning: 'Could not determine a correction -- parsing error.',
        confidence: 'low',
      };
    }
  }
}