import { ExecutionContext } from '@nitrostack/core';
import { LLMService, defaultLLMService } from '../shared/llm/llm.service.js';
import {
  DepartmentOutput,
  ChallengeRoundOutput,
  ChallengeRoundOutputSchema,
  Concern
} from '../shared/types.js';

export class DebateService {
  private llmService: LLMService;

  constructor(llmService?: LLMService) {
    this.llmService = llmService ?? defaultLLMService;
  }

  /**
   * Performs Estimate Reconciliation between Product and Engineering.
   * Product's provisional effort is updated to Engineering's authoritative size.
   */
  reconcileEstimates(
    productOutput: DepartmentOutput,
    engineeringOutput: DepartmentOutput
  ): { productOutput: DepartmentOutput; reconciled: boolean } {
    if (!productOutput.opportunity_cost_estimate || !engineeringOutput.effort_assessment) {
      return { productOutput, reconciled: false };
    }

    const engSize = engineeringOutput.effort_assessment.size;
    const prodEst = productOutput.opportunity_cost_estimate;

    const updatedEstimate = {
      ...prodEst,
      effort: engSize,
      effort_source: 'reconciled_with_engineering' as const
    };

    const isLargeOrMassive = engSize === 'large' || engSize === 'massive';
    const isLowImpact = prodEst.impact === 'minimal' || prodEst.impact === 'low';
    const isLowConfidence = prodEst.confidence === 'low';

    let updatedConcerns = [...productOutput.concerns];
    if (isLargeOrMassive && (isLowImpact || isLowConfidence)) {
      const exists = updatedConcerns.some(c => c.category === 'opportunity_cost');
      if (!exists) {
        updatedConcerns.push({
          id: `prod-opportunity-cost-reconciled`,
          category: 'opportunity_cost',
          tags: ['effort_mismatch', 'high_resource_bet'],
          issue: `Reconciled engineering effort is ${engSize}, which represents a high resource bet given ${isLowImpact ? 'low impact' : 'low confidence'}.`,
          severity: 'medium',
          recommendation: 'Re-evaluate ROI or trim scope to reduce effort size.',
          responds_to: null,
          status: 'open',
          requested_context: null
        });
      }
    }

    const hasHigh = updatedConcerns.some(c => c.severity === 'high' && c.status !== 'resolved');
    const hasMedium = updatedConcerns.some(c => c.severity === 'medium' && c.status !== 'resolved');
    const updatedVerdict = hasHigh ? 'blocked' : hasMedium ? 'flagged' : productOutput.verdict;

    return {
      productOutput: {
        ...productOutput,
        verdict: updatedVerdict,
        opportunity_cost_estimate: updatedEstimate,
        concerns: updatedConcerns
      },
      reconciled: true
    };
  }

  /**
   * Runs a full structured debate round across all agent outputs concurrently.
   * Cross-references concerns between Product ↔ Engineering and Security ↔ Legal.
   * Enforces a 2-round challenge cap: concern becomes "escalated" if unresolved after 2 challenge attempts.
   */
  async runFullDebateCycle(
    outputs: DepartmentOutput[],
    proposalText: string,
    ctx: ExecutionContext
  ): Promise<{ outputs: DepartmentOutput[]; exchanges: ChallengeRoundOutput[] }> {
    ctx.logger.info('Running cross-agent debate round');

    const updatedOutputs = outputs.map(o => ({ ...o, concerns: [...o.concerns] }));
    const exchanges: ChallengeRoundOutput[] = [];

    const counterAgentMap: Record<string, 'product' | 'engineering' | 'security' | 'legal'> = {
      product: 'engineering',
      engineering: 'product',
      security: 'legal',
      legal: 'security'
    };

    // Run up to 2 debate rounds to honor the 2-round cap state machine
    for (let round = 1; round <= 2; round++) {
      const roundTasks: {
        outputIdx: number;
        concernIdx: number;
        counterpart: 'product' | 'engineering' | 'security' | 'legal';
        concern: Concern;
      }[] = [];

      for (let oIdx = 0; oIdx < updatedOutputs.length; oIdx++) {
        const output = updatedOutputs[oIdx];
        const counterpart = counterAgentMap[output.agent];
        if (!counterpart) continue;

        for (let cIdx = 0; cIdx < output.concerns.length; cIdx++) {
          const concern = output.concerns[cIdx];
          if (concern.status === 'open' || concern.status === 'challenged') {
            roundTasks.push({
              outputIdx: oIdx,
              concernIdx: cIdx,
              counterpart,
              concern
            });
          }
        }
      }

      if (roundTasks.length === 0) break;

      // Execute all challenge exchanges for this round concurrently in parallel
      const roundResults = await Promise.all(
        roundTasks.map(t =>
          this.executeChallengeExchange(t.counterpart, t.concern, proposalText, ctx).catch(err => {
            ctx.logger.error('Challenge exchange failed', { concernId: t.concern.id, errorMsg: String(err) });
            return null;
          })
        )
      );

      for (let k = 0; k < roundTasks.length; k++) {
        const task = roundTasks[k];
        const exchange = roundResults[k];
        if (!exchange) continue;

        exchanges.push(exchange);

        const concern = updatedOutputs[task.outputIdx].concerns[task.concernIdx];
        if (exchange.stance === 'provides_fact' || exchange.stance === 'agree') {
          updatedOutputs[task.outputIdx].concerns[task.concernIdx] = { ...concern, status: 'resolved' };
        } else if (exchange.stance === 'disagree' || exchange.stance === 'partially_agree') {
          if (concern.status === 'open') {
            updatedOutputs[task.outputIdx].concerns[task.concernIdx] = { ...concern, status: 'challenged' };
          } else if (concern.status === 'challenged') {
            // Escalated after 2nd unresolved challenge round
            updatedOutputs[task.outputIdx].concerns[task.concernIdx] = { ...concern, status: 'escalated' };
          }
        }

        // Apply revised verdict if provided by exchange
        if (exchange.revised_verdict) {
          updatedOutputs[task.outputIdx].verdict = exchange.revised_verdict;
        }
      }

      // Re-evaluate agent verdicts post debate round with realistic severity gating
      for (const output of updatedOutputs) {
        const hasEscalatedHigh = output.concerns.some(c => c.severity === 'high' && c.status === 'escalated');
        const hasUnresolvedHigh = output.concerns.some(c => c.severity === 'high' && c.status !== 'resolved');
        const hasUnresolvedMedOrLow = output.concerns.some(c => (c.severity === 'medium' || c.severity === 'low') && c.status !== 'resolved');

        if (hasEscalatedHigh || hasUnresolvedHigh) {
          output.verdict = 'blocked';
        } else if (hasUnresolvedMedOrLow) {
          output.verdict = 'flagged';
        } else {
          output.verdict = 'approved';
        }
      }
    }

    return { outputs: updatedOutputs, exchanges };
  }

  /**
   * Executes a single challenge round exchange for a specific concern.
   */
  async executeChallengeExchange(
    respondingAgent: 'product' | 'engineering' | 'security' | 'legal',
    targetConcern: Concern,
    proposalText: string,
    ctx: ExecutionContext
  ): Promise<ChallengeRoundOutput> {
    ctx.logger.info('Executing challenge exchange', { respondingAgent, concernId: targetConcern.id });

    const system = `You are the ${respondingAgent} agent on a Decision Review Board responding to a concern raised by another department.
Concern [${targetConcern.id}]:
- Category: ${targetConcern.category}
- Issue: ${targetConcern.issue}
- Severity: ${targetConcern.severity}
- Recommendation: ${targetConcern.recommendation}

Evaluation Guidelines:
- Assess if your department can provide a standard fact, technical capability, or compliance mechanism (e.g. Standard Contractual Clauses, automated rollback plan, regional data isolation, or retention analytics) that addresses this concern.
- If a valid mitigation or fact can be provided, set stance: "provides_fact" or "agree" (which resolves the concern).
- If the concern cannot be mitigated immediately or represents an open action item required before production rollout, set stance: "partially_agree" and set revised_verdict: "flagged".
- If the concern represents an unresolvable fundamental risk (e.g. no consent, automated employment termination without human override), set stance: "disagree" and set revised_verdict: "blocked".

Stance options: "agree" | "disagree" | "partially_agree" | "provides_fact"

CRITICAL: Return ONLY a raw JSON object. Do NOT output preamble prose or markdown headers.
Return JSON matching:
{
  "agent": "${respondingAgent}",
  "responds_to": "${targetConcern.id}",
  "stance": "agree" | "disagree" | "partially_agree" | "provides_fact",
  "response": string,
  "revised_verdict": "approved" | "flagged" | "blocked" | null
}`;

    const user = `Proposal context:\n${proposalText}`;

    return this.llmService.generateStructured<ChallengeRoundOutput>(
      system,
      user,
      ChallengeRoundOutputSchema,
      { temperature: 0.1 }
    );
  }
}
