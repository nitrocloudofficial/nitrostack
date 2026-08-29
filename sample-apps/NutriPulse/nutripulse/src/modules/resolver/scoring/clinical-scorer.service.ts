import { Injectable } from '@nitrostack/core';
import { Dish, SafetyVerdict } from '../../../domain/types.js';
import { EnvelopeResult } from '../../clinical/clinical.tools.js';
import { ScoreBreakdown } from './types.js';

export const CLINICAL_SCORER_CONFIG = {
  version: 'clinical-v1',
  weights: {
    macro_alignment: 0.3,
    deficiency_uplift: 0.4,
    headroom_fit: 0.2,
    warn_penalty: 0.1, // subtracted from the base score
  },
  warn_penalty_factors: {
    moderate: 0.1,
    severe: 0.2,
  },
  gi_penalty_max: 0.15,
};

@Injectable()
export class ClinicalScorerService {
  /**
   * Deterministic pure function to score clinical fit.
   * Asserts that BLOCK dishes do not reach here.
   */
  public scoreClinicalFit(dish: Dish, envelope: EnvelopeResult, safetyVerdicts: SafetyVerdict[]): ScoreBreakdown {
    if (safetyVerdicts.some(v => v.status === 'BLOCK')) {
      throw new Error(`[ClinicalScorer] BLOCKED dishes must not be scored: ${dish.id}`);
    }

    const breakdown: Record<string, number> = {};
    const metadata: Record<string, unknown> = { version: CLINICAL_SCORER_CONFIG.version, rules_penalised: [] };
    let totalScore = 0;

    // 1. Macro Alignment (distance from soft targets)
    let macroScore = 0;
    const macroTargets = envelope.soft_targets.filter(t => t.nutrient.endsWith('_g'));
    if (macroTargets.length > 0) {
      let totalWeight = 0;
      let sumAlignment = 0;
      for (const target of macroTargets) {
        let actual = 0;
        if (target.nutrient in dish.macros) {
          actual = (dish.macros as any)[target.nutrient];
        }
        
        // Overshoot penalized harder than undershoot
        let diffPct = 0;
        if (target.target > 0) {
          if (actual > target.target) {
            diffPct = (actual - target.target) / target.target; // overshoot
            diffPct *= 1.5; // harsher penalty
          } else {
            diffPct = (target.target - actual) / target.target; // undershoot
          }
        }
        
        const alignment = Math.max(0, 1 - diffPct);
        sumAlignment += alignment * target.weight;
        totalWeight += target.weight;
        breakdown[`macro_${target.nutrient}`] = alignment;
      }
      macroScore = totalWeight > 0 ? sumAlignment / totalWeight : 1;
    } else {
      macroScore = 1;
    }
    totalScore += macroScore * CLINICAL_SCORER_CONFIG.weights.macro_alignment;
    breakdown['macro_alignment_total'] = macroScore * CLINICAL_SCORER_CONFIG.weights.macro_alignment;

    // 2. Deficiency Uplift
    let deficiencyScore = 0;
    const defTargets = envelope.soft_targets.filter(t => !t.nutrient.endsWith('_g') && t.nutrient !== 'hydration_ml' && t.nutrient !== 'sugar_g_ceiling');
    if (defTargets.length > 0) {
      let totalWeight = 0;
      let sumUplift = 0;
      for (const target of defTargets) {
        let actual = 0;
        if (target.nutrient in dish.micros) {
          actual = (dish.micros as any)[target.nutrient];
        } else if (target.nutrient in dish.macros) {
          actual = (dish.macros as any)[target.nutrient];
        }
        
        // Reward getting closer to target. Max score 1 if actual >= target.
        const fulfillment = target.target > 0 ? Math.min(1, actual / target.target) : 1;
        sumUplift += fulfillment * target.weight;
        totalWeight += target.weight;
        breakdown[`deficiency_${target.nutrient}`] = fulfillment;
      }
      deficiencyScore = totalWeight > 0 ? sumUplift / totalWeight : 0;
    }
    totalScore += deficiencyScore * CLINICAL_SCORER_CONFIG.weights.deficiency_uplift;
    breakdown['deficiency_uplift_total'] = deficiencyScore * CLINICAL_SCORER_CONFIG.weights.deficiency_uplift;

    // 3. Headroom Fit
    const slotKcal = envelope.calculation_trace.slot_allocation ? (envelope.calculation_trace.slot_allocation as any).slot_kcal : 0;
    let headroomScore = 1;
    if (slotKcal > 0) {
      if (dish.kcal > slotKcal) {
        // Exceeding decays sharply
        const excess = dish.kcal - slotKcal;
        headroomScore = Math.max(0, 1 - Math.pow(excess / slotKcal, 2));
      } else {
        // Undershooting is okay, but maybe slight decay if too low
        headroomScore = Math.max(0, 1 - ((slotKcal - dish.kcal) / slotKcal) * 0.2); 
      }
    }
    totalScore += headroomScore * CLINICAL_SCORER_CONFIG.weights.headroom_fit;
    breakdown['headroom_fit'] = headroomScore * CLINICAL_SCORER_CONFIG.weights.headroom_fit;

    // 4. WARN Penalty
    let warnPenalty = 0;
    const warns = safetyVerdicts.filter(v => v.status === 'WARN');
    const rulesPenalised: string[] = [];
    for (const warn of warns) {
      const penalty = warn.severity === 'severe' || warn.severity === 'critical' ? CLINICAL_SCORER_CONFIG.warn_penalty_factors.severe : CLINICAL_SCORER_CONFIG.warn_penalty_factors.moderate;
      warnPenalty += penalty;
      const ruleId = warn.rule_id || 'unknown';
      rulesPenalised.push(ruleId);
      breakdown[`warn_penalty_${ruleId}`] = -penalty;
    }
    metadata.rules_penalised = rulesPenalised;
    totalScore -= warnPenalty;

    // 5. Glycemic Penalty
    // Only apply if the user has a diabetes rule in the envelope hard constraints or safety verdicts
    const hasDiabetesRule = envelope.hard_constraints.some(c => (c.rule_id || '').includes('diab_')) || safetyVerdicts.some(v => (v.rule_id || '').includes('diab_'));
    if (hasDiabetesRule && dish.glycemic_index_estimate > 55) {
      let confMultiplier = 1;
      if (dish.glycemic_index_confidence === 'low') confMultiplier = 0.3;
      else if (dish.glycemic_index_confidence === 'medium') confMultiplier = 0.7;
      
      const excessGI = Math.min(100, dish.glycemic_index_estimate) - 55; // max 45
      const giPenaltyBase = (excessGI / 45) * CLINICAL_SCORER_CONFIG.gi_penalty_max;
      const giPenalty = giPenaltyBase * confMultiplier;
      totalScore -= giPenalty;
      breakdown['glycemic_penalty'] = -giPenalty;
    }

    return {
      score: Math.max(0, Math.min(1, totalScore)),
      components: breakdown,
      metadata
    };
  }
}
