import { Dish, UserProfile, LabReport, SafetyVerdict } from './types.js';
import { clinicalRules } from './clinical-rules.js';
import { INGREDIENT_ALLERGEN_MAP } from './allergen-map.js';

export function evaluateDishSafety(dish: Dish, profile: UserProfile, latestLabs?: LabReport, envelopeHardConstraints?: any[]): SafetyVerdict[] {
  const verdicts: SafetyVerdict[] = [];
  const userMeds = profile.medications.map(m => m.name.toLowerCase());
  const userConditions = profile.chronic_conditions.map(c => c.toLowerCase());
  const userAllergies = profile.allergies.map(a => ({
    allergen: a.allergen.toLowerCase(),
    severity: a.severity
  }));

  // 1. Evaluate declarative rules from clinical-rules.ts
  for (const rule of clinicalRules) {
    let triggered = false;
    
    // Check condition triggers
    if (rule.trigger.type === 'condition' && userConditions.includes(rule.trigger.condition.toLowerCase())) {
      triggered = true;
    }
    // Check medication triggers
    if (!triggered && rule.trigger.type === 'medication' && userMeds.includes(rule.trigger.medication.toLowerCase())) {
      triggered = true;
    }
    // Check lab status triggers
    if (!triggered && rule.trigger.type === 'lab_status' && latestLabs) {
      const { nutrient, status } = rule.trigger;
      // Convert constraint nutrient (e.g., sodium_mg) to panel name if possible, or just string match
      const panel = latestLabs.panels.find(p => p.name.toLowerCase().includes(nutrient.replace(/_/g, ' ').toLowerCase()));
      if (panel && panel.status === status) {
        triggered = true;
      }
    }

    if (triggered && rule.constraint) {
      const constraint = rule.constraint;
      const nutrient = constraint.nutrient;
      let actualValue: number | undefined = undefined;
      
      if (nutrient in dish.macros) actualValue = (dish.macros as any)[nutrient];
      else if (nutrient in dish.micros) actualValue = (dish.micros as any)[nutrient];
      else if (nutrient === 'kcal') actualValue = dish.kcal;

      if (actualValue === undefined || actualValue === null) {
        verdicts.push({
          status: rule.verdict, // WARN | BLOCK
          rule_id: rule.id,
          rule_text: `Missing data for nutrient: ${nutrient}`,
          severity: rule.severity
        });
        continue;
      }

      let threshold = constraint.threshold;
      // Daily-scoped nutrient caps only: evaluated against the envelope's converted per-meal thresholds.
      if (rule.scope === 'daily' && envelopeHardConstraints) {
        const envRule = envelopeHardConstraints.find(c => c.rule_id === rule.id);
        if (envRule) {
          threshold = envRule.threshold;
        }
      }

      let violated = false;
      switch (constraint.operator) {
        case '>': violated = actualValue <= threshold; break;
        case '<': violated = actualValue >= threshold; break;
        case '>=': violated = actualValue < threshold; break;
        case '<=': violated = actualValue > threshold; break;
        case '==': violated = actualValue !== threshold; break;
      }

      if (violated) {
        verdicts.push({
          status: rule.verdict, // WARN | BLOCK
          rule_id: rule.id,
          rule_text: rule.scope === 'daily' && envelopeHardConstraints && envelopeHardConstraints.find(c => c.rule_id === rule.id) 
            ? envelopeHardConstraints.find(c => c.rule_id === rule.id).human_readable_text 
            : rule.human_readable_text,
          severity: rule.severity,
          actual_value: actualValue,
          threshold: threshold
        });
      }
    }
  }

  // 2. Comprehensive Allergen Cross-check
  const EXCEPTIONS = ['almond milk', 'coconut milk', 'soy milk', 'oat milk', 'peanut butter', 'cocoa butter', 'shea butter'];
  const dishIngredients = dish.ingredients || [];
  const dishAllergensSet = new Set(dish.allergens.map(a => a.toLowerCase()));

  // Expand ingredients into implied allergens using the map
  for (const ing of dishIngredients) {
    const textToSearch = (ing.name + " " + (ing.usda_query || "")).toLowerCase();
    let skipDairy = EXCEPTIONS.some(ex => textToSearch.includes(ex));

    for (const [key, mappedAllergens] of Object.entries(INGREDIENT_ALLERGEN_MAP)) {
      if (skipDairy && mappedAllergens.includes('dairy')) continue;
      
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(ing.name) || (ing.usda_query && regex.test(ing.usda_query))) {
        mappedAllergens.forEach(a => dishAllergensSet.add(a));
      }
    }
  }

  // Check user allergies against the expanded set
  for (const userAllergy of userAllergies) {
    // If it's explicitly declared in the dish's root `allergens` array
    if (dish.allergens.map(a => a.toLowerCase()).includes(userAllergy.allergen)) {
      verdicts.push({
        status: 'BLOCK',
        rule_id: `ALLERGY_${userAllergy.allergen.toUpperCase()}`,
        rule_text: `Dish contains declared allergen: ${userAllergy.allergen}`,
        severity: 'critical'
      });
      continue;
    }

    // If it was found via ingredient cross-referencing but NOT declared
    if (dishAllergensSet.has(userAllergy.allergen)) {
      if (userAllergy.severity === 'severe') {
        // Severe allergies warn on cross-contamination risk or undeclared traces
        verdicts.push({
          status: 'WARN',
          rule_id: `CROSS_CONTAMINATION_${userAllergy.allergen.toUpperCase()}`,
          rule_text: `High risk of undeclared trace allergen (${userAllergy.allergen}) based on ingredient breakdown.`,
          severity: 'severe'
        });
      } else {
        // Mild/moderate just warn
        verdicts.push({
          status: 'WARN',
          rule_id: `HIDDEN_ALLERGEN_${userAllergy.allergen.toUpperCase()}`,
          rule_text: `Dish likely contains ${userAllergy.allergen} based on ingredients.`,
          severity: 'moderate'
        });
      }
    }
  }

  return verdicts;
}
