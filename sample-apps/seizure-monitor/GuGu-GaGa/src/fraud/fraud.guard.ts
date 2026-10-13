/**
 * CREED-Lite — Fraud Safety Guard
 *
 * NitroStack Guard that validates incoming recourse-path actions
 * against known fraud vectors BEFORE the tool handler executes.
 * Apply via @UseGuards(FraudSafetyGuard) on any tool that accepts
 * user-submitted action paths.
 */

import { Injectable } from '@nitrostack/core';
import type { Guard, ExecutionContext } from '@nitrostack/core';
import { FraudSafetyService } from './fraud.service.js';

@Injectable({ deps: [FraudSafetyService] })
export class FraudSafetyGuard implements Guard {
  constructor(private fraudService: FraudSafetyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const input = (context.metadata?.input ?? (context as unknown as { input?: unknown }).input) as Record<string, unknown> | undefined;

    // Only inspect requests that carry an `actions` array
    if (input && Array.isArray(input.actions) && input.actions.length > 0) {
      const evaluation = this.fraudService.evaluatePath({ actions: input.actions });

      if (evaluation.hasRisk) {
        const err = new Error(
          `Fraud risk detected — ${evaluation.vector}: ${evaluation.reason}`
        );
        (err as Error & { code: string }).code = 'FRAUD_RISK_DETECTED';
        throw err;
      }
    }

    return true;
  }
}
