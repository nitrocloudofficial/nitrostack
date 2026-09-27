import { Interceptor, InterceptorInterface, ExecutionContext } from '@nitrostack/core';
import { evaluateDishSafety } from '../domain/safety-evaluator.js';
import { UserRepository } from '../data/repositories/user-repository.js';
import { LabRepository } from '../data/repositories/lab-repository.js';

@Interceptor()
export class SafetyInterceptor implements InterceptorInterface {
  private userRepo = new UserRepository();
  private labRepo = new LabRepository();

  async intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    const result = await next();

    // Only apply if the result is an object containing dishes
    if (result && typeof result === 'object') {
      const payload = result as any;

      // Extract userId from context input if available
      const input = (context as any).input || {};
      const userId = input.userId || input.user_id;

      if (userId) {
        const profile = this.userRepo.getById(userId);
        if (profile) {
          const labReports = this.labRepo.getByUserId(userId);
          const latestLabs = labReports.length > 0
            ? labReports.sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())[0]
            : undefined;

          // Check if result contains an array of dishes or recommendations
          const dishesToCheck = payload.results || payload.dishes || payload.recommendations || [];
          
          for (const item of dishesToCheck) {
            // Unpack the dish if it's nested (like in a recommendation object)
            const dish = item.dish || item;

            // Basic duck typing to check if it's a Dish
            if (dish && dish.id && dish.name && dish.macros && dish.micros) {
              const verdicts = evaluateDishSafety(dish, profile, latestLabs);
              
              const blocked = verdicts.filter(v => v.status === 'BLOCK');
              if (blocked.length > 0) {
                // We MUST throw at the framework level as requested
                throw new Error(
                  `[SAFETY INTERCEPTOR] Critical Safety Violation: Downstream tool attempted to return ` +
                  `dish '${dish.name}' (${dish.id}) which is BLOCKED for user ${userId}. ` +
                  `Reasons: ${blocked.map(b => b.rule_text).join('; ')}`
                );
              }
            }
          }
        }
      }
    }

    return result;
  }
}
