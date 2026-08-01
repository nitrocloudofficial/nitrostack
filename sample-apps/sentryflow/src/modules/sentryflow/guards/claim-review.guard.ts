/**
 * ClaimReviewGuard
 * 
 * Gates the dispatch_safet_claim_email tool on EITHER:
 * 1. Claim value > ₹20,000 (high-value threshold), OR
 * 2. Fraud score in ambiguous band (50-80) — confidence-gated autonomy
 * 
 * When the guard blocks, the tool does not execute; instead, the widget
 * renders for human review and approval.
 */

import { Injectable, ExecutionContext } from '@nitrostack/core';

@Injectable()
export class ClaimReviewGuard {
  /**
   * Determine whether the dispatch_safet_claim_email tool should execute.
   * 
   * Returns true = tool executes (auto-dispatch)
   * Returns false = tool blocked, widget renders for human review
   */
  canActivate(
    input: {
      claimValueINR: number;
      fraudScore: number;
    },
    ctx?: ExecutionContext,
  ): boolean {
    // Block if claim exceeds auto-dispatch threshold
    if (input.claimValueINR > 20000) {
      ctx?.logger?.info('Guard blocked: claim exceeds auto-dispatch threshold', {
        claimValueINR: input.claimValueINR,
        threshold: 20000,
      });
      return false;
    }

    // Block if fraud score is in ambiguous band (50-80)
    // This is the confidence-gated autonomy differentiator:
    // even low-value claims with borderline fraud signals get held for review
    if (input.fraudScore >= 50 && input.fraudScore < 80) {
      ctx?.logger?.info('Guard blocked: fraud score in ambiguous confidence band', {
        fraudScore: input.fraudScore,
        band: '50-80',
      });
      return false;
    }

    // Allow auto-dispatch for low-value, high-confidence cases
    ctx?.logger?.info('Guard allowed: claim passed all thresholds', {
      claimValueINR: input.claimValueINR,
      fraudScore: input.fraudScore,
    });
    return true;
  }
}
