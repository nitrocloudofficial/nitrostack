import { Interceptor, InterceptorInterface, Injectable } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { PolicyService } from './policy.service.js';

/**
 * DecisionCalibratorInterceptor
 *
 * Post-processes the loan decision output score by applying a group-level
 * threshold_delta from the active mitigation_policy. This is the output-side
 * mitigation — the Pipe handles input redaction, the Interceptor handles
 * score recalibration.
 *
 * group_adjustments shape: { [zip_code]: { threshold_delta: number } }
 * e.g. { "10044": { threshold_delta: 0.06 } }
 *
 * Applied to evaluate_loan_application via
 * @UseInterceptors(DecisionCalibratorInterceptor) in the coordinated
 * live edit with Person A.
 */
@Injectable()
@Interceptor()
export class DecisionCalibratorInterceptor implements InterceptorInterface {
  constructor(private policyService: PolicyService) {}

  async intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    const result = await next();
    const policy = await this.policyService.getActive();
    const adjustments = policy.group_adjustments ?? {};

    if (Object.keys(adjustments).length === 0) {
      return result;
    }

    const group = this.inferGroup(context);
    const adjustment = adjustments[group];

    if (!adjustment || adjustment.threshold_delta === undefined) {
      return result;
    }

    const output = result as Record<string, unknown>;
    const currentScore = typeof output.score === 'number' ? output.score : 0;

    return {
      ...output,
      score: Math.min(1.0, Math.max(0.0, currentScore + adjustment.threshold_delta)),
    };
  }

  /**
   * Infer the group key (zip_code) from the tool execution context.
   * The context.params carries the deserialized tool arguments.
   */
  private inferGroup(context: ExecutionContext): string {
    try {
      const params = context.params as Record<string, unknown> | undefined;
      const zipCode = params?.zip_code ?? params?.input?.zip_code;
      return typeof zipCode === 'string' ? zipCode : 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
