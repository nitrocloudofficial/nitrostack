import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import OpenAI from 'openai';
import { InvestigateBreakOutput } from './investigate.types.js';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
  maxRetries: 0,     // don't let the SDK silently stack backoff delays on 429s
  timeout: 15_000,   // fail fast instead of hanging the whole pipeline
});

export class InvestigateTools {
  @Tool({
    name: 'investigate_break',
    description: 'Investigate why two matched trades have a discrepancy',
    inputSchema: z.object({
      breakId: z.string(),
      tradeA: z.any(),
      tradeB: z.any(),
      discrepancy: z.string(),
    }),
  })
  async investigateBreak(
    input: { breakId: string; tradeA: any; tradeB: any; discrepancy: string },
    ctx: ExecutionContext
  ): Promise<InvestigateBreakOutput> {
    ctx.logger.info('Investigating break', { breakId: input.breakId });

    const systemPrompt = `You are a trade reconciliation analyst. Given two trade records and a discrepancy, decide if it's explained by normal causes (FX timing, settlement windows) or not.

Respond ONLY with JSON, no other text:
{"breakId": string, "explained": boolean, "reason": string, "confidence": "low"|"medium"|"high"}`;

    const userMsg = `Break ID: ${input.breakId}
Trade A: ${JSON.stringify(input.tradeA)}
Trade B: ${JSON.stringify(input.tradeB)}
Discrepancy: ${input.discrepancy}`;

    let finalText = '';
    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg },
        ],
      });
      finalText = response.choices[0].message.content ?? '';
    } catch (err: any) {
      const isRateLimit = err?.status === 429;
      const isTimeout = err?.name === 'APIConnectionTimeoutError' || err?.code === 'ETIMEDOUT';
      ctx.logger.error('investigate_break LLM call failed', {
        breakId: input.breakId,
        isRateLimit,
        isTimeout,
        err: err instanceof Error ? err.message : String(err),
      });
      return {
        breakId: input.breakId,
        explained: false,
        reason: isRateLimit
          ? 'Investigation skipped -- Groq rate limit reached. Escalate for manual review.'
          : isTimeout
          ? 'Investigation skipped -- LLM request timed out. Escalate for manual review.'
          : 'Investigation failed due to an internal error.',
        confidence: 'low',
      };
    }

    try {
      const cleaned = finalText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return InvestigateBreakOutput.parse(parsed);
    } catch (err) {
      ctx.logger.error('Failed to parse investigate_break output', { breakId: input.breakId, finalText, err: String(err) });
      return {
        breakId: input.breakId,
        explained: false,
        reason: 'Could not parse investigation output -- treating as unexplained.',
        confidence: 'low',
      };
    }
  }
}