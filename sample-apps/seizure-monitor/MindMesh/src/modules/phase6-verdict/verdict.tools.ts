import { ToolDecorator as Tool, Widget, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { MemoryStore } from '../../core/memory/memory.store.js';
import { Verdict, ReviewResult } from '../../core/memory/session.schema.js';
import { generateId } from '../../utils/id-generator.js';

/**
 * Phase 6: Verdict & Resilience Score Tools
 *
 * Computes final verdict and resilience score after adversarial review.
 */
@Injectable({ deps: [MemoryStore] })
export class VerdictTools {
  constructor(private memory: MemoryStore) {}

  @Tool({
    name: 'compute_resilience_score',
    description: 'Compute resilience score based on review objections and paper characteristics',
    inputSchema: z.object({
      gapId: z.string().describe('Gap ID to compute score for'),
      sessionId: z.string().describe('Session ID'),
    }),
    invocation: {
      invoking: 'Computing resilience score from adversarial review...',
      invoked: 'Resilience score computed'
    },
    examples: {
      request: { gapId: 'gap_123', sessionId: 'sess_001' },
      response: { gapId: 'gap_123', gapClaim: 'Adaptive DP with dynamic budget', objectionStrength: 55, closestPriorYear: 2023, citationDensity: 12.5, recencyPenalty: 6, rawScore: 83, resilienceScore: 83 }
    }
  })
  @Widget('research-pilot-shell')
  async computeResilienceScore(
    input: { gapId: string; sessionId: string },
    ctx: ExecutionContext
  ) {
    const { gapId, sessionId } = input;

    ctx.logger.info('Computing resilience score', { gapId, sessionId });

    const gap = this.memory.getGap(sessionId, gapId);
    if (!gap) {
      throw new Error(`Gap ${gapId} not found`);
    }

    const reviews = this.memory.getReviews(sessionId).filter(r => r.gapId === gapId);
    const latestReview = reviews[reviews.length - 1];

    // Get related papers for citation density
    const papers = this.memory.getPapers(sessionId);
    const relatedPapers = papers.filter(p => gap.relatedPapers.includes(p.paperId));
    const citationDensity = relatedPapers.length > 0
      ? relatedPapers.reduce((sum, p) => sum + p.citationCount, 0) / relatedPapers.length / 100
      : 0;

    // Find closest prior attempt year
    const closestPriorYear = relatedPapers.length > 0
      ? Math.max(...relatedPapers.map(p => p.year || 0))
      : new Date().getFullYear();

    // Calculate score using formula from spec
    // raw = 100 - objectionStrength * 40 + recencyPenalty - citationDensity * 10
    // recencyPenalty = max(0, (2026 - closestPriorYear)) * 2

    const objectionStrength = latestReview?.objectionStrength || 0;
    const currentYear = new Date().getFullYear();
    const recencyPenalty = Math.max(0, (currentYear - closestPriorYear)) * 2;

    const raw = 100 - objectionStrength * 0.4 + recencyPenalty - citationDensity * 10;
    const resilienceScore = Math.max(0, Math.min(100, Math.round(raw)));

    return {
      gapId,
      gapClaim: gap.claim,
      objectionStrength,
      closestPriorYear,
      citationDensity: Math.round(citationDensity * 100) / 100,
      recencyPenalty,
      rawScore: Math.round(raw),
      resilienceScore,
      formula: {
        explanation: 'resilienceScore = max(0, min(100, 100 - objectionStrength*40 + recencyPenalty - citationDensity*10))',
        objectionStrength: objectionStrength * 0.4,
        recencyPenalty,
        citationDensity: citationDensity * 10,
      },
    };
  }

  @Tool({
    name: 'render_verdict',
    description: 'Render final PASS/CONDITIONAL/REJECT verdict with resilience score',
    inputSchema: z.object({
      gapId: z.string().describe('Gap ID'),
      sessionId: z.string().describe('Session ID'),
    }),
    invocation: {
      invoking: 'Rendering final verdict from resilience analysis...',
      invoked: 'Verdict rendered'
    },
    examples: {
      request: { gapId: 'gap_123', sessionId: 'sess_001' },
      response: { gapId: 'gap_123', gapClaim: 'Adaptive DP with dynamic budget', finalVerdict: 'PASS', resilienceScore: 83, verdictId: 'v_123', iterations: 2, objections: [], reasoning: '...' }
    }
  })
  @Widget('research-pilot-shell')
  async renderVerdict(
    input: { gapId: string; sessionId: string },
    ctx: ExecutionContext
  ) {
    const { gapId, sessionId } = input;

    ctx.logger.info('Rendering verdict', { gapId, sessionId });

    const gap = this.memory.getGap(sessionId, gapId);
    if (!gap) {
      throw new Error(`Gap ${gapId} not found`);
    }

    const reviews = this.memory.getReviews(sessionId).filter(r => r.gapId === gapId);
    const latestReview = reviews[reviews.length - 1];

    // Get resilience score
    const resilienceResult = await this.computeResilienceScore({ gapId, sessionId }, ctx);
    const resilienceScore = resilienceResult.resilienceScore;

    // Determine verdict
    let finalVerdict: Verdict['finalVerdict'];
    if (latestReview?.verdict === 'PASS' && resilienceScore >= 60) {
      finalVerdict = 'PASS';
    } else if (latestReview?.verdict === 'PASS' && resilienceScore >= 40) {
      finalVerdict = 'CONDITIONAL';
    } else {
      finalVerdict = 'REJECT';
    }

    // Collect all objections
    const allObjections = reviews.flatMap(r => r.objections).filter(Boolean);

    // Build reasoning
    const reasoning = this.buildReasoning(gap, reviews, resilienceScore, resilienceResult);

    // Create verdict object
    const verdict: Verdict = {
      verdictId: generateId('verdict'),
      gapId,
      finalVerdict,
      resilienceScore,
      objectionStrength: latestReview?.objectionStrength || 0,
      closestPriorYear: resilienceResult.closestPriorYear,
      citationDensity: resilienceResult.citationDensity,
      reasoning,
      iterations: reviews.length,
      objections: allObjections,
      decidedAt: new Date().toISOString(),
    };

    // Store verdict
    this.memory.addVerdict(sessionId, verdict);

    // Update gap status
    this.memory.updateGap(sessionId, gapId, {
      status: finalVerdict === 'PASS' ? 'passed' : finalVerdict === 'CONDITIONAL' ? 'passed' : 'rejected',
    });

    return {
      gapId,
      gapClaim: gap.claim,
      finalVerdict,
      resilienceScore,
      verdictId: verdict.verdictId,
      iterations: verdict.iterations,
      objections: verdict.objections,
      reasoning: verdict.reasoning,
      breakdown: {
        objectionStrength: verdict.objectionStrength,
        recencyPenalty: resilienceResult.recencyPenalty,
        citationDensityPenalty: resilienceResult.citationDensity * 10,
      },
      recommendations: this.getRecommendations(finalVerdict, resilienceScore),
    };
  }

  private buildReasoning(
    gap: any,
    reviews: ReviewResult[],
    resilienceScore: number,
    resilienceResult: any
  ): string {
    let reasoning = `Gap: "${gap.claim}"\n\n`;

    reasoning += `Adversarial Review: ${reviews.length} iteration(s) completed.\n`;
    reasoning += `Final Review Verdict: ${reviews[reviews.length - 1]?.verdict || 'N/A'}\n`;
    reasoning += `Objection Strength: ${reviews[reviews.length - 1]?.objectionStrength || 0}/100\n\n`;

    reasoning += `Resilience Score Calculation:\n`;
    reasoning += `  Base: 100\n`;
    reasoning += `  - Objection Penalty: ${(reviews[reviews.length - 1]?.objectionStrength || 0) * 0.4} (objectionStrength × 40)\n`;
    reasoning += `  + Recency Bonus: +${resilienceResult.recencyPenalty} (years since prior × 2)\n`;
    reasoning += `  - Citation Density: ${resilienceResult.citationDensity * 10} (avg citations / 10)\n`;
    reasoning += `  = ${Math.round(resilienceScore)} (clamped to 0-100)\n\n`;

    if (resilienceScore >= 70) {
      reasoning += 'HIGH RESILIENCE: Gap withstands adversarial scrutiny well.';
    } else if (resilienceScore >= 50) {
      reasoning += 'MODERATE RESILIENCE: Gap survives but has notable objections.';
    } else if (resilienceScore >= 30) {
      reasoning += 'LOW RESILIENCE: Significant objections found. Gap needs strengthening.';
    } else {
      reasoning += 'CRITICAL: Gap does not survive adversarial review. Consider alternative direction.';
    }

    return reasoning;
  }

  private getRecommendations(verdict: string, score: number): string[] {
    if (verdict === 'PASS') {
      return [
        'Proceed with research direction',
        'Document gap and evidence for paper introduction',
        'Consider submitting to top-tier venue',
      ];
    }
    if (verdict === 'CONDITIONAL') {
      return [
        'Address objections before proceeding',
        'Consider narrowing scope or adding differentiation',
        'Strengthen novelty argument with additional literature search',
      ];
    }
    return [
      'Gap rejected by adversarial reviewer',
      'Re-examine assumptions and search for alternative gaps',
      'Run gap_finder again with different parameters or clusters',
    ];
  }

  @Tool({
    name: 'get_verdict_history',
    description: 'Get all verdicts for a session',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID'),
    }),
    invocation: {
      invoking: 'Fetching verdict history...',
      invoked: 'Verdict history loaded'
    },
    examples: {
      request: { sessionId: 'sess_001' },
      response: { sessionId: 'sess_001', verdictCount: 2, verdicts: [{ verdictId: 'v_123', gapId: 'gap_123', finalVerdict: 'PASS', resilienceScore: 83, iterations: 2, decidedAt: '2026-07-20T10:30:00Z' }] }
    }
  })
  @Widget('research-pilot-shell')
  async getVerdictHistory(
    input: { sessionId: string },
    ctx: ExecutionContext
  ) {
    const { sessionId } = input;
    const verdicts = this.memory.getVerdicts(sessionId);

    return {
      sessionId,
      verdictCount: verdicts.length,
      verdicts: verdicts.map(v => ({
        verdictId: v.verdictId,
        gapId: v.gapId,
        finalVerdict: v.finalVerdict,
        resilienceScore: v.resilienceScore,
        iterations: v.iterations,
        decidedAt: v.decidedAt,
      })),
    };
  }
}