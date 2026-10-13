import { Injectable } from '@nitrostack/core';
import { Dish, UserProfile } from '../../../domain/types.js';
import { ScoreBreakdown } from './types.js';

export const BUDGET_SCORER_CONFIG = {
  version: 'budget-v1',
  weights: {
    affordability: 0.4,
    weekly_pacing: 0.3,
    value_efficiency: 0.3,
  },
};

@Injectable()
export class BudgetScorerService {
  /**
   * pure function to score budget fit
   */
  public scoreBudgetFit(
    dish: Dish,
    budgetState: any,
    profile: UserProfile
  ): ScoreBreakdown {
    const breakdown: Record<string, number> = {};
    const metadata: Record<string, unknown> = { version: BUDGET_SCORER_CONFIG.version };
    let totalScore = 0;

    const remainingToday = budgetState.budget_inr_remaining || 0;
    const remainingWeekly = budgetState.weekly_budget_inr_remaining || (remainingToday * 7); // fallback
    const daysRemaining = budgetState.days_remaining_in_week || 7; // fallback

    // 1. Affordability against today's cap
    let affordScore = 0;
    if (dish.price_inr <= remainingToday) {
      affordScore = 1.0;
    } else {
      affordScore = 0.0; // over budget = 0, but NOT a block
    }
    const affordContrib = affordScore * BUDGET_SCORER_CONFIG.weights.affordability;
    breakdown['affordability'] = affordContrib;
    totalScore += affordContrib;

    // 2. Weekly Pacing
    const paceTarget = remainingWeekly / daysRemaining;
    let pacingScore = 1.0;
    if (dish.price_inr > paceTarget) {
      // decays 
      pacingScore = Math.max(0, paceTarget / dish.price_inr);
    }
    const pacingContrib = pacingScore * BUDGET_SCORER_CONFIG.weights.weekly_pacing;
    breakdown['weekly_pacing'] = pacingContrib;
    totalScore += pacingContrib;

    // 3. Value efficiency
    // Cost per gram of protein
    const costPerProtein = dish.price_inr / (dish.macros.protein_g || 1);
    // Cost per unit of priority micros (from profile goals/conditions). 
    // We'll approximate this by checking overall micronutrient density vs price.
    let microDensity = (dish.micros.iron_mg || 0) * 10 + (dish.micros.calcium_mg || 0) * 0.1; 
    let valueScore = 0.5;
    if (costPerProtein < 10) valueScore += 0.25; // good protein value
    else if (costPerProtein > 30) valueScore -= 0.25; // bad protein value
    if (microDensity / dish.price_inr > 0.05) valueScore += 0.25; 

    valueScore = Math.max(0, Math.min(1, valueScore));
    const valueContrib = valueScore * BUDGET_SCORER_CONFIG.weights.value_efficiency;
    breakdown['value_efficiency'] = valueContrib;
    totalScore += valueContrib;

    return {
      score: Math.max(0, Math.min(1, totalScore)),
      components: breakdown,
      metadata
    };
  }

  public evaluateBudgetImpact(userId: string, dishIds: string[]) {
    // Phase 5 tool wrapper hook
    return dishIds.map(id => ({
       dish_id: id,
       affordability_score: 1.0, // Stub
       remaining_after: 0,
       weekly_projection_ok: true
    }));
  }
}
