import { Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool, z } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import OpenAI from 'openai';
import { Claim } from '../../shared/trust-context.interface.js';

@Injectable()
export class RiskEvaluatorService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'mock-key' });

  @Tool({
    name: 'evaluateContext',
    description: 'Evaluate a TrustContext for overall risk level, contradictions, corroborations, and benign explanations',
    inputSchema: z.object({
      claims: z.array(z.object({
        id: z.string(),
        source: z.string(),
        type: z.string(),
        fact: z.string(),
        value: z.any(),
        description: z.string(),
        severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        ts: z.number(),
        strength: z.number(),
        weight: z.number().optional()
      })).describe('Array of claims to evaluate')
    })
  })
  async evaluateContext(input: { claims: Claim[] }, _ctx?: ExecutionContext) {
    const claims = input.claims;
    const evaluation = {
      overallRisk: 'LOW',
      contradictions: [] as string[],
      corroborations: [] as string[],
      benignExplanation: null as string | null
    };

    // 1. Detect Corroborating Contradictions
    // Example: Payment says "QR requests money", Conversation says "seller claims refund"
    const hasPayIntent = claims.some(c => c.type === 'QR_INTENT' && c.description.includes('requests money'));
    const hasRefundClaim = claims.some(c => c.type === 'SELLER_CLAIM' && c.description.includes('claims refund'));

    if (hasPayIntent && hasRefundClaim) {
      evaluation.contradictions.push('QR Semantic Inversion: Seller claims refund but QR requests payment.');
      evaluation.overallRisk = 'CRITICAL';
    }

    // Determine initial risk based on highest claim severity
    const severities = claims.map(c => c.severity);
    if (evaluation.overallRisk !== 'CRITICAL') {
      if (severities.includes('CRITICAL')) evaluation.overallRisk = 'CRITICAL';
      else if (severities.includes('HIGH')) evaluation.overallRisk = 'HIGH';
      else if (severities.includes('MEDIUM')) evaluation.overallRisk = 'MEDIUM';
    }

    // 2. Adversarial Self-Check (Benign Explanation)
    if (evaluation.overallRisk === 'HIGH' || evaluation.overallRisk === 'CRITICAL') {
      const benignExplanation = await this.adversarialSelfCheck(claims);
      if (benignExplanation) {
        evaluation.benignExplanation = benignExplanation;
        // Soften the warning since we found a plausible innocent explanation
        evaluation.overallRisk = 'MEDIUM'; 
      }
    }

    return evaluation;
  }

  private async adversarialSelfCheck(claims: Claim[]): Promise<string | null> {
    const prompt = `Review the following risk claims about a transaction.
Attempt to construct the MOST PLAUSIBLE innocent/benign explanation for these combined facts.
If there is a highly plausible innocent explanation (e.g. the seller is just an older person who doesn't understand technology, or a simple typo), return it in the "explanation" field and set "isPlausible" to true.
If the facts overwhelmingly point to a scam (like an explicit QR inversion requesting money under the guise of a refund), set "isPlausible" to false.

Claims:
${JSON.stringify(claims, null, 2)}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an adversarial risk evaluator designed to find innocent explanations for suspicious activity to reduce false positives.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      if (analysis.isPlausible && analysis.explanation) {
        return analysis.explanation;
      }
    } catch (e) {
      console.error('Adversarial Self-Check failed with LLM:', e);
    }
    return null;
  }
}
