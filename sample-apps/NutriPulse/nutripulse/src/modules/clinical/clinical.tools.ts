import { ToolDecorator as Tool, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { UserRepository } from '../../data/repositories/user-repository.js';
import { LabRepository } from '../../data/repositories/lab-repository.js';
import { TelemetryRepository } from '../../data/repositories/telemetry-repository.js';
import { IntakeRepository } from '../../data/repositories/intake-repository.js';
import { clinicalRules, ClinicalRule } from '../../domain/clinical-rules.js';
import { UserProfile, LabReport, BiometricSnapshot, IntakeLog } from '../../domain/types.js';
import path from 'path';
import fs from 'fs';

// ---------- Constants ----------

/** Mifflin-St Jeor activity multipliers (static baseline) */
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Documented meal-slot energy allocation split.
 * Percentages of REMAINING daily kcal allocated to each slot.
 * Source: ICMR–NIN dietary guidance adapted for Indian meal patterns.
 */
const SLOT_SPLIT: Record<string, number> = {
  breakfast: 0.20,
  lunch: 0.35,
  dinner: 0.35,
  snack: 0.10,
};

// ---------- Telemetry adjustment thresholds ----------

const STRESS_HIGH_THRESHOLD = 60;
const HYDRATION_LOW_ML = 2000;
const SLEEP_POOR_MIN = 360; // < 6h
const HR_RECOVERY_LOW = 15;
const STEPS_HIGH = 10000;

// ---------- Pure helper functions (exported for tests) ----------

export interface EnvelopeHardConstraint {
  rule_id: string;
  nutrient: string;
  operator: string;
  threshold: number;
  unit: string;
  severity: string;
  human_readable_text: string;
  source_citation: string;
}

export interface EnvelopeSoftTarget {
  nutrient: string;
  target: number;
  unit: string;
  weight: number;
  trigger: string;
}

export interface EnvelopeResult {
  hard_constraints: EnvelopeHardConstraint[];
  soft_targets: EnvelopeSoftTarget[];
  calculation_trace: Record<string, unknown>;
}

/**
 * Mifflin-St Jeor BMR.
 * Male:   10 × weight(kg) + 6.25 × height(cm) – 5 × age – 5 + 5
 *   → 10w + 6.25h – 5a + 5
 * Female: 10 × weight(kg) + 6.25 × height(cm) – 5 × age – 161
 */
export function computeBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  sex: string
): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return sex === 'F' ? base - 161 : base + 5;
}

/**
 * TDEE adjusted by actual telemetry active_kcal instead of the static multiplier.
 * Formula: BMR + telemetry.active_kcal  (replaces BMR × multiplier)
 * We also compute the static TDEE for the trace comparison.
 */
export function computeTDEE(
  bmr: number,
  activityLevel: string,
  todayActiveKcal: number
): { tdee_static: number; tdee_adjusted: number } {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2;
  return {
    tdee_static: Math.round(bmr * multiplier),
    tdee_adjusted: Math.round(bmr + todayActiveKcal),
  };
}

/**
 * Resolve catalog dish nutrition for an array of intake logs.
 * Returns aggregate consumed values.
 */
export function aggregateIntake(
  intakeLogs: IntakeLog[],
  catalogDishes: any[]
): {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number;
  sodium_mg: number;
  fibre_g: number;
  iron_mg: number;
  calcium_mg: number;
  vitamin_d_iu: number;
  vitamin_b12_ug: number;
  potassium_mg: number;
  vitamin_k_ug: number;
} {
  const totals = {
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
    fibre_g: 0,
    iron_mg: 0,
    calcium_mg: 0,
    vitamin_d_iu: 0,
    vitamin_b12_ug: 0,
    potassium_mg: 0,
    vitamin_k_ug: 0,
  };

  for (const log of intakeLogs) {
    const dish = catalogDishes.find((d: any) => d.id === log.dish_id);
    if (!dish) continue;
    const m = log.portion_multiplier;
    totals.kcal += dish.kcal * m;
    totals.protein_g += dish.macros.protein_g * m;
    totals.carbs_g += dish.macros.carbs_g * m;
    totals.fat_g += dish.macros.fat_g * m;
    totals.sugar_g += dish.macros.sugar_g * m;
    totals.fibre_g += dish.macros.fibre_g * m;
    totals.sodium_mg += dish.micros.sodium_mg * m;
    totals.iron_mg += dish.micros.iron_mg * m;
    totals.calcium_mg += dish.micros.calcium_mg * m;
    totals.vitamin_d_iu += dish.micros.vitamin_d_iu * m;
    totals.vitamin_b12_ug += dish.micros.vitamin_b12_ug * m;
    totals.potassium_mg += dish.micros.potassium_mg * m;
    totals.vitamin_k_ug += dish.micros.vitamin_k_ug * m;
  }

  return totals;
}

export function deriveHardConstraints(
  profile: UserProfile,
  latestLabs: LabReport | null,
  consumed: any,
  slotPct: number
): EnvelopeHardConstraint[] {
  const fired: EnvelopeHardConstraint[] = [];

  for (const rule of clinicalRules) {
    let matches = false;
    const trigger = rule.trigger;

    switch (trigger.type) {
      case 'condition':
        matches = profile.chronic_conditions.some(
          (c) => c.toLowerCase() === trigger.condition.toLowerCase()
        );
        break;
      case 'allergen':
        matches = profile.allergies.some(
          (a) => a.allergen.toLowerCase() === trigger.allergen.toLowerCase()
        );
        break;
      case 'medication':
        matches = profile.medications.some(
          (m) => m.name.toLowerCase() === trigger.medication.toLowerCase()
        );
        break;
      case 'lab_status':
        if (latestLabs) {
          const panelMatch = latestLabs.panels.some((p) => {
            const nutrientKey = trigger.nutrient.replace(/_/g, ' ').toLowerCase();
            return (
              p.name.toLowerCase().includes(nutrientKey) &&
              p.status === trigger.status
            );
          });
          const defMatch =
            trigger.status === 'low' &&
            latestLabs.deficiency_vector.some((d) =>
              trigger.nutrient.toLowerCase().includes(d.nutrient.toLowerCase())
            );
          matches = panelMatch || defMatch;
        }
        break;
    }

    if (matches) {
      let threshold = rule.constraint?.threshold ?? 0;
      let text = rule.human_readable_text;
      
      if (rule.scope === 'daily' && rule.constraint && consumed) {
        const consumedAmt = consumed[rule.constraint.nutrient] || 0;
        const adjusted = Math.max(0, (threshold - consumedAmt) * slotPct);
        text = `${rule.constraint.nutrient.split('_')[0]} ${Math.round(adjusted)}${rule.constraint.unit} vs (daily ${threshold}${rule.constraint.unit} - ${Math.round(consumedAmt)}${rule.constraint.unit} consumed, slot ${Math.round(slotPct*100)}% allocation)`;
        threshold = adjusted;
      }

      fired.push({
        rule_id: rule.id,
        nutrient: rule.constraint?.nutrient ?? 'allergen_presence',
        operator: rule.constraint?.operator ?? '==',
        threshold: threshold,
        unit: rule.constraint?.unit ?? 'presence',
        severity: rule.severity,
        human_readable_text: text,
        source_citation: rule.source_citation,
      });
    }
  }

  return fired;
}

/**
 * Derive soft targets from diet plan, deficiency vector, and telemetry.
 * Every adjustment names its trigger for the trace.
 */
export function deriveSoftTargets(
  profile: UserProfile,
  latestLabs: LabReport | null,
  telemetryToday: BiometricSnapshot | null,
  slotKcal: number
): EnvelopeSoftTarget[] {
  const targets: EnvelopeSoftTarget[] = [];

  // ---------- Macro split from diet_plan ----------
  const { protein_pct, carbs_pct, fat_pct } = profile.diet_plan.macro_split;
  let proteinG = (slotKcal * (protein_pct / 100)) / 4;
  let carbsG = (slotKcal * (carbs_pct / 100)) / 4;
  const fatG = (slotKcal * (fat_pct / 100)) / 9;

  targets.push({ nutrient: 'protein_g', target: round2(proteinG), unit: 'g', weight: 0.8, trigger: `diet_plan.macro_split (${protein_pct}% of ${slotKcal} kcal)` });
  targets.push({ nutrient: 'carbs_g', target: round2(carbsG), unit: 'g', weight: 0.6, trigger: `diet_plan.macro_split (${carbs_pct}% of ${slotKcal} kcal)` });
  targets.push({ nutrient: 'fat_g', target: round2(fatG), unit: 'g', weight: 0.5, trigger: `diet_plan.macro_split (${fat_pct}% of ${slotKcal} kcal)` });

  // ---------- Fibre floor (14g per 1000 kcal, slot-proportional) ----------
  const fibreFloor = round2((14 / 1000) * slotKcal);
  targets.push({ nutrient: 'fibre_g', target: fibreFloor, unit: 'g', weight: 0.5, trigger: `fibre floor: 14g per 1000 kcal, slot kcal = ${slotKcal}` });

  // ---------- Deficiency-vector uplifts (from labs) ----------
  if (latestLabs) {
    for (const def of latestLabs.deficiency_vector) {
      const severityWeight = def.severity === 'severe' ? 1.0 : def.severity === 'moderate' ? 0.8 : 0.5;
      const nutrientKey = deficiencyNutrientToKey(def.nutrient);
      // Use the clinical rule's threshold as the target if one exists
      const matchingRule = clinicalRules.find(
        (r) => r.trigger.type === 'lab_status' && r.constraint?.nutrient === nutrientKey
      );
      const baseTarget = matchingRule?.constraint?.threshold ?? 0;
      if (baseTarget > 0) {
        targets.push({
          nutrient: nutrientKey,
          target: round2(baseTarget * def.target_uplift),
          unit: matchingRule?.constraint?.unit ?? 'unit',
          weight: severityWeight,
          trigger: `deficiency_vector: ${def.nutrient} severity=${def.severity}, uplift=${def.target_uplift}x`,
        });
      }
    }
  }

  // ---------- Telemetry-driven adjustments ----------
  if (telemetryToday) {
    // High stress → raise fluid & electrolyte targets
    if (telemetryToday.stress_index >= STRESS_HIGH_THRESHOLD) {
      targets.push({
        nutrient: 'hydration_ml',
        target: 500,
        unit: 'ml',
        weight: 0.7,
        trigger: `telemetry: stress_index=${telemetryToday.stress_index} >= ${STRESS_HIGH_THRESHOLD}`,
      });
      targets.push({
        nutrient: 'potassium_mg',
        target: 400,
        unit: 'mg',
        weight: 0.4,
        trigger: `telemetry: stress_index=${telemetryToday.stress_index} >= ${STRESS_HIGH_THRESHOLD} → electrolyte support`,
      });
    }

    // Low hydration → raise fluid target
    if (telemetryToday.hydration_ml < HYDRATION_LOW_ML) {
      const existing = targets.find((t) => t.nutrient === 'hydration_ml');
      if (existing) {
        existing.target += 300;
        existing.trigger += `; hydration_ml=${telemetryToday.hydration_ml} < ${HYDRATION_LOW_ML}`;
      } else {
        targets.push({
          nutrient: 'hydration_ml',
          target: 500,
          unit: 'ml',
          weight: 0.7,
          trigger: `telemetry: hydration_ml=${telemetryToday.hydration_ml} < ${HYDRATION_LOW_ML}`,
        });
      }
    }

    // Poor sleep or low HR recovery → raise protein, lower sugar ceiling
    if (
      telemetryToday.sleep.duration_min < SLEEP_POOR_MIN ||
      telemetryToday.hr_recovery < HR_RECOVERY_LOW
    ) {
      const sleepTrigger =
        telemetryToday.sleep.duration_min < SLEEP_POOR_MIN
          ? `sleep=${telemetryToday.sleep.duration_min}min < ${SLEEP_POOR_MIN}min`
          : '';
      const recoveryTrigger =
        telemetryToday.hr_recovery < HR_RECOVERY_LOW
          ? `hr_recovery=${telemetryToday.hr_recovery} < ${HR_RECOVERY_LOW}`
          : '';
      const trigger = [sleepTrigger, recoveryTrigger].filter(Boolean).join('; ');

      // Raise protein by 15%
      const proteinTarget = targets.find((t) => t.nutrient === 'protein_g');
      if (proteinTarget) {
        const boost = round2(proteinTarget.target * 0.15);
        proteinTarget.target = round2(proteinTarget.target + boost);
        proteinTarget.trigger += `; +15% recovery boost (${trigger})`;
      }

      // Lower sugar ceiling
      targets.push({
        nutrient: 'sugar_g_ceiling',
        target: round2(slotKcal * 0.03),
        unit: 'g',
        weight: 0.6,
        trigger: `poor recovery → simple sugar ceiling lowered (${trigger})`,
      });
    }

    // High steps → widen carb allowance
    if (telemetryToday.steps >= STEPS_HIGH) {
      const carbTarget = targets.find((t) => t.nutrient === 'carbs_g');
      if (carbTarget) {
        const boost = round2(carbTarget.target * 0.20);
        carbTarget.target = round2(carbTarget.target + boost);
        carbTarget.trigger += `; +20% carb boost (steps=${telemetryToday.steps} >= ${STEPS_HIGH})`;
      }
    }
  }

  return targets;
}

function deficiencyNutrientToKey(nutrient: string): string {
  const map: Record<string, string> = {
    'Iron': 'iron_mg',
    'Vitamin D': 'vitamin_d_iu',
    'Vitamin B12': 'vitamin_b12_ug',
    'Calcium': 'calcium_mg',
  };
  return map[nutrient] ?? nutrient.toLowerCase().replace(/ /g, '_');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Full envelope computation — pure function for testability.
 * Accepts all dependencies as arguments.
 */
export function computeEnvelope(
  profile: UserProfile,
  latestLabs: LabReport | null,
  telemetryToday: BiometricSnapshot | null,
  intakeLogs: IntakeLog[],
  catalogDishes: any[],
  mealSlot: string
): EnvelopeResult {
  // Step 1: BMR
  const { age, sex, height_cm, weight_kg, activity_level } = profile.demographics;
  const bmr = computeBMR(weight_kg, height_cm, age, sex);

  // Step 2: TDEE
  const todayActiveKcal = telemetryToday?.active_kcal ?? 0;
  const { tdee_static, tdee_adjusted } = computeTDEE(bmr, activity_level, todayActiveKcal);

  // Step 3: Subtract intake → remaining → slot allocation
  const consumed = aggregateIntake(intakeLogs, catalogDishes);
  const dailyKcalTarget = profile.diet_plan.daily_kcal_target;
  const remainingKcal = Math.max(0, dailyKcalTarget - consumed.kcal);
  const slotPct = SLOT_SPLIT[mealSlot] ?? 0.25;
  const slotKcal = Math.round(remainingKcal * slotPct);

  // Step 4: Hard constraints
  const hardConstraints = deriveHardConstraints(profile, latestLabs, consumed, slotPct);

  // Step 5: Soft targets
  const softTargets = deriveSoftTargets(profile, latestLabs, telemetryToday, slotKcal);

  // Step 6: Build trace
  const telemetryAdjustments: string[] = [];
  if (telemetryToday) {
    if (telemetryToday.stress_index >= STRESS_HIGH_THRESHOLD) {
      telemetryAdjustments.push(`high stress (${telemetryToday.stress_index}) → +fluid, +electrolytes`);
    }
    if (telemetryToday.hydration_ml < HYDRATION_LOW_ML) {
      telemetryAdjustments.push(`low hydration (${telemetryToday.hydration_ml}ml) → +fluid`);
    }
    if (telemetryToday.sleep.duration_min < SLEEP_POOR_MIN) {
      telemetryAdjustments.push(`poor sleep (${telemetryToday.sleep.duration_min}min) → +protein, -sugar`);
    }
    if (telemetryToday.hr_recovery < HR_RECOVERY_LOW) {
      telemetryAdjustments.push(`low HR recovery (${telemetryToday.hr_recovery}) → +protein, -sugar`);
    }
    if (telemetryToday.steps >= STEPS_HIGH) {
      telemetryAdjustments.push(`high steps (${telemetryToday.steps}) → +carbs`);
    }
  }

  const calculation_trace = {
    bmr: {
      formula: 'Mifflin-St Jeor',
      inputs: { weight_kg, height_cm, age, sex },
      result: bmr,
    },
    tdee: {
      static_multiplier: ACTIVITY_MULTIPLIERS[activity_level] ?? 1.2,
      tdee_static,
      telemetry_active_kcal: todayActiveKcal,
      tdee_adjusted,
      note: 'tdee_adjusted = BMR + telemetry.active_kcal (replaces static multiplier with real data)',
    },
    intake_consumed: consumed,
    remaining_daily_kcal: remainingKcal,
    slot_allocation: {
      meal_slot: mealSlot,
      split_pct: slotPct,
      split_table: SLOT_SPLIT,
      slot_kcal: slotKcal,
    },
    telemetry_adjustments: telemetryAdjustments,
    rules_fired: hardConstraints.map((c) => ({
      rule_id: c.rule_id,
      nutrient: c.nutrient,
      severity: c.severity,
      source: c.source_citation,
    })),
    deficiency_uplifts: latestLabs?.deficiency_vector ?? [],
  };

  return { hard_constraints: hardConstraints, soft_targets: softTargets, calculation_trace };
}

// ---------- NitroStack Tool ----------

@Injectable()
export class clinicalTools {
  private userRepo = new UserRepository();
  private labRepo = new LabRepository();
  private telemetryRepo = new TelemetryRepository();
  private intakeRepo = new IntakeRepository();

  @Tool({
    name: 'compute_nutritional_envelope',
    description: 'Use ONLY when the user directly asks about their own targets, limits, or remaining allowance for the day. Not required before resolve_recommendation.',
    inputSchema: z.object({
      userId: z.string().describe('The user ID to compute the envelope for.'),
      meal_slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).describe('Which meal slot to compute the envelope for.'),
      timestamp_override: z.string().optional().describe('Optional ISO 8601 timestamp to use instead of current time.'),
    }),
  })
  async computeNutritionalEnvelope(
    input: { userId: string; meal_slot: string; timestamp_override?: string },
    context: ExecutionContext
  ) {
    // Load all dependencies
    const profile = this.userRepo.getById(input.userId);
    if (!profile) throw new Error(`User not found: ${input.userId}`);

    const labReports = this.labRepo.getByUserId(input.userId);
    const latestLabs =
      labReports.length > 0
        ? labReports.sort(
            (a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
          )[0]
        : null;

    const telemetryAll = this.telemetryRepo.getByUserId(input.userId);
    const telemetryToday = telemetryAll.length > 0 ? telemetryAll[telemetryAll.length - 1] : null;

    const intakeLogs = this.intakeRepo.getTodayByUserId(input.userId);

    // Load catalog dishes for intake aggregation
    const catalogPath = path.join(process.cwd(), 'data', 'catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    const catalogDishes = catalog.dishes;

    const result = computeEnvelope(
      profile,
      latestLabs,
      telemetryToday,
      intakeLogs,
      catalogDishes,
      input.meal_slot
    );

    return result;
  }

  @Tool({
    name: 'check_meal_safety',
    description: 'Use ONLY when the user names a specific dish and asks whether they can eat it. Not required before resolve_recommendation, which runs this internally.',
    inputSchema: z.object({
      userId: z.string().describe('The user ID to check safety for.'),
      dish_ids: z.array(z.string()).min(1).max(50).describe('Array of dish IDs to evaluate.'),
      meal_slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional().describe('Optional meal slot context.'),
    }),
  })
  async checkMealSafety(
    input: { userId: string; dish_ids: string[]; meal_slot?: string },
    context: ExecutionContext
  ) {
    // Robust normalisation for UI quirks (e.g. if the UI shatters strings into char arrays)
    let rawIds = input.dish_ids;
    if (Array.isArray(rawIds) && rawIds.length > 0 && rawIds.every(s => s.length === 1)) {
      // Reassemble shattered character array
      const reassembled = rawIds.join('');
      // Check if it looks like JSON array
      if (reassembled.startsWith('[') && reassembled.endsWith(']')) {
        try {
          rawIds = JSON.parse(reassembled);
        } catch {
          rawIds = reassembled.replace(/[\[\]"']/g, '').split(',').map(s => s.trim()) as unknown as string[];
        }
      } else {
        // Just split by comma
        rawIds = reassembled.split(',').map(s => s.trim()) as unknown as string[];
      }
    } else if (typeof rawIds === 'string') {
      try {
        rawIds = JSON.parse(rawIds as unknown as string);
      } catch {
        rawIds = (rawIds as unknown as string).split(',').map(s => s.trim()) as unknown as string[];
      }
    }
    
    if (!Array.isArray(rawIds)) {
      rawIds = [rawIds];
    }
    
    // Replace the input array with the cleaned one
    input.dish_ids = rawIds.filter(Boolean);

    const profile = this.userRepo.getById(input.userId);
    if (!profile) throw new Error(`User not found: ${input.userId}`);

    const labReports = this.labRepo.getByUserId(input.userId);
    const latestLabs =
      labReports.length > 0
        ? labReports.sort(
            (a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
          )[0]
        : undefined;

    // Load catalog dishes (or we could use DishRepository)
    const catalogPath = path.join(process.cwd(), 'data', 'catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    const catalogDishes = catalog.dishes;

    const results = [];
    const evaluationTraces = [];

    const { evaluateDishSafety } = await import('../../domain/safety-evaluator.js');

    // Pre-compute envelope for daily scoped constraints if a meal_slot is provided
    let envelope: any = undefined;
    if (input.meal_slot) {
      const intakeLogs = this.intakeRepo.getTodayByUserId(input.userId);
      const telemetryAll = this.telemetryRepo.getByUserId(input.userId);
      const telemetryToday = telemetryAll.length > 0 ? telemetryAll[telemetryAll.length - 1] : null;
      envelope = computeEnvelope(profile, latestLabs || null, telemetryToday, intakeLogs, catalogDishes, input.meal_slot);
    }

    for (const dishId of input.dish_ids) {
      const dish = catalogDishes.find((d: any) => d.id === dishId);
      if (!dish) {
        results.push({ dish_id: dishId, status: 'ERROR', reason: 'Dish not found' });
        continue;
      }

      const verdicts = evaluateDishSafety(dish, profile, latestLabs, envelope?.hard_constraints);
      
      // Determine overall status
      let finalStatus = 'PASS';
      if (verdicts.some(v => v.status === 'BLOCK')) {
        finalStatus = 'BLOCK';
      } else if (verdicts.some(v => v.status === 'WARN')) {
        finalStatus = 'WARN';
      }

      results.push({
        dish_id: dishId,
        overall_status: finalStatus,
        verdicts: verdicts,
      });

      evaluationTraces.push({
        dish_id: dishId,
        dish_name: dish.name,
        rules_evaluated: 'ALL_CLINICAL_RULES',
        verdicts_fired: verdicts.length,
      });
    }

    return {
      results,
      calculation_trace: {
        userId: input.userId,
        dishes_evaluated: input.dish_ids.length,
        traces: evaluationTraces,
      },
    };
  }
}
