import { describe, it, expect, beforeAll } from 'vitest';
import {
  computeBMR,
  computeTDEE,
  computeEnvelope,
  deriveHardConstraints,
  deriveSoftTargets,
  aggregateIntake,
  EnvelopeResult,
} from '../src/modules/clinical/clinical.tools.js';
import { UserProfile, LabReport, BiometricSnapshot, IntakeLog } from '../src/domain/types.js';

// ---------- Test fixtures ----------

const u1Profile: UserProfile = {
  id: 'u1',
  demographics: { age: 34, sex: 'M', height_cm: 175, weight_kg: 85, activity_level: 'moderate' },
  chronic_conditions: ['Diabetes T2', 'Hypertension'],
  allergies: [],
  medications: [],
  diet_plan: {
    type: 'balanced',
    daily_kcal_target: 2200,
    macro_split: { protein_pct: 25, carbs_pct: 45, fat_pct: 30 },
  },
  goals: ['Manage blood sugar', 'Lower blood pressure', 'Increase iron'],
  taste_preferences: {
    cuisines_liked: ['North Indian / Mughlai', 'South Indian'],
    cuisines_disliked: [],
    spice_tolerance: 'medium',
    texture_preferences: ['fluffy', 'tender'],
  },
};

const u2Profile: UserProfile = {
  id: 'u2',
  demographics: { age: 27, sex: 'F', height_cm: 165, weight_kg: 60, activity_level: 'very_active' },
  chronic_conditions: [],
  allergies: [{ allergen: 'peanut', severity: 'severe' }],
  medications: [{ name: 'warfarin', class: 'anticoagulant' }],
  diet_plan: {
    type: 'athlete',
    daily_kcal_target: 2800,
    macro_split: { protein_pct: 30, carbs_pct: 50, fat_pct: 20 },
  },
  goals: ['Athletic performance', 'Maintain vitamin D'],
  taste_preferences: {
    cuisines_liked: ['Healthy Bowls & Salads', 'Continental'],
    cuisines_disliked: [],
    spice_tolerance: 'mild',
    texture_preferences: ['crunchy', 'crispy'],
  },
};

const u3Profile: UserProfile = {
  id: 'u3',
  demographics: { age: 45, sex: 'M', height_cm: 170, weight_kg: 90, activity_level: 'sedentary' },
  chronic_conditions: ['CKD', 'Dyslipidemia'],
  allergies: [],
  medications: [],
  diet_plan: {
    type: 'renal_friendly',
    daily_kcal_target: 1800,
    macro_split: { protein_pct: 15, carbs_pct: 55, fat_pct: 30 },
  },
  goals: ['Kidney health', 'Lower cholesterol'],
  taste_preferences: {
    cuisines_liked: ['South Indian', 'Chinese-Indian'],
    cuisines_disliked: [],
    spice_tolerance: 'none',
    texture_preferences: ['soft', 'creamy'],
  },
};

const u1Labs: LabReport = {
  user_id: 'u1',
  report_date: '2026-07-20T12:00:00.000Z',
  panels: [
    { name: 'HbA1c', value: 7.4, unit: '%', reference_range: { low: 4, high: 5.6 }, status: 'high' },
    { name: 'Fasting Glucose', value: 140, unit: 'mg/dL', reference_range: { low: 70, high: 99 }, status: 'high' },
    { name: 'Serum Ferritin', value: 15, unit: 'ng/mL', reference_range: { low: 30, high: 400 }, status: 'low' },
    { name: 'LDL Cholesterol', value: 120, unit: 'mg/dL', reference_range: { low: 0, high: 99 }, status: 'high' },
  ],
  deficiency_vector: [{ nutrient: 'Iron', severity: 'moderate', target_uplift: 1.5 }],
};

const u2Labs: LabReport = {
  user_id: 'u2',
  report_date: '2026-07-20T12:00:00.000Z',
  panels: [
    { name: '25-OH Vitamin D', value: 18, unit: 'ng/mL', reference_range: { low: 30, high: 100 }, status: 'low' },
    { name: 'INR', value: 2.5, unit: '', reference_range: { low: 2, high: 3 }, status: 'normal' },
  ],
  deficiency_vector: [{ nutrient: 'Vitamin D', severity: 'severe', target_uplift: 2.0 }],
};

const u3Labs: LabReport = {
  user_id: 'u3',
  report_date: '2026-07-20T12:00:00.000Z',
  panels: [
    { name: 'eGFR', value: 75, unit: 'mL/min', reference_range: { low: 90, high: 140 }, status: 'low' },
    { name: 'Creatinine', value: 1.3, unit: 'mg/dL', reference_range: { low: 0.7, high: 1.2 }, status: 'high' },
    { name: 'Potassium', value: 5.0, unit: 'mmol/L', reference_range: { low: 3.5, high: 5.1 }, status: 'normal' },
    { name: 'LDL Cholesterol', value: 145, unit: 'mg/dL', reference_range: { low: 0, high: 99 }, status: 'high' },
    { name: 'Triglycerides', value: 210, unit: 'mg/dL', reference_range: { low: 0, high: 149 }, status: 'high' },
    { name: 'HDL Cholesterol', value: 35, unit: 'mg/dL', reference_range: { low: 40, high: 60 }, status: 'low' },
  ],
  deficiency_vector: [],
};

// Telemetry: U1 today — poor sleep, high stress, low hydration
const u1TelemetryToday: BiometricSnapshot = {
  timestamp: '2026-07-25T12:00:00.000Z',
  steps: 4319,
  active_kcal: 172,
  resting_kcal: 1800,
  sleep: { duration_min: 240, deep_min: 36, rem_min: 48, efficiency_pct: 60 },
  hr_resting: 76,
  hr_recovery: 12,
  spo2_pct: 96,
  hydration_ml: 1625,
  stress_index: 80,
};

// Telemetry: high-activity day for testing carb widening
const highActivityTelemetry: BiometricSnapshot = {
  timestamp: '2026-07-25T12:00:00.000Z',
  steps: 15000,
  active_kcal: 600,
  resting_kcal: 1600,
  sleep: { duration_min: 480, deep_min: 72, rem_min: 96, efficiency_pct: 90 },
  hr_resting: 48,
  hr_recovery: 45,
  spo2_pct: 99,
  hydration_ml: 3000,
  stress_index: 30,
};

// Telemetry: high-stress day for testing fluid targets
const highStressTelemetry: BiometricSnapshot = {
  timestamp: '2026-07-25T12:00:00.000Z',
  steps: 5000,
  active_kcal: 200,
  resting_kcal: 1800,
  sleep: { duration_min: 400, deep_min: 60, rem_min: 80, efficiency_pct: 80 },
  hr_resting: 72,
  hr_recovery: 20,
  spo2_pct: 97,
  hydration_ml: 2200,
  stress_index: 75,
};

const emptyIntake: IntakeLog[] = [];
const emptyDishes: any[] = [];

// ---------- Tests ----------

describe('computeBMR', () => {
  it('computes male BMR (Mifflin-St Jeor)', () => {
    // 10*85 + 6.25*175 - 5*34 + 5 = 850 + 1093.75 - 170 + 5 = 1778.75
    const bmr = computeBMR(85, 175, 34, 'M');
    expect(bmr).toBeCloseTo(1778.75, 1);
  });

  it('computes female BMR', () => {
    // 10*60 + 6.25*165 - 5*27 - 161 = 600 + 1031.25 - 135 - 161 = 1335.25
    const bmr = computeBMR(60, 165, 27, 'F');
    expect(bmr).toBeCloseTo(1335.25, 1);
  });
});

describe('computeTDEE', () => {
  it('returns both static and adjusted TDEE', () => {
    const { tdee_static, tdee_adjusted } = computeTDEE(1778.75, 'moderate', 172);
    expect(tdee_static).toBe(Math.round(1778.75 * 1.55));
    expect(tdee_adjusted).toBe(Math.round(1778.75 + 172));
  });
});

describe('U1 envelope: sodium and sugar hard caps', () => {
  let result: EnvelopeResult;

  beforeAll(() => {
    result = computeEnvelope(u1Profile, u1Labs, u1TelemetryToday, emptyIntake, emptyDishes, 'lunch');
  });

  it('produces a sodium hard constraint from Hypertension', () => {
    const sodium = result.hard_constraints.find((c) => c.nutrient === 'sodium_mg');
    expect(sodium).toBeDefined();
    expect(sodium!.rule_id).toBe('htn_sodium_cap');
    expect(sodium!.threshold).toBe(2000);
    expect(sodium!.severity).toBe('severe');
  });

  it('produces a sugar hard constraint from Diabetes T2', () => {
    const sugar = result.hard_constraints.find((c) => c.nutrient === 'sugar_g');
    expect(sugar).toBeDefined();
    expect(sugar!.rule_id).toBe('diab_t2_sugar_cap');
    expect(sugar!.threshold).toBe(25);
  });

  it('includes calculation_trace with BMR and TDEE', () => {
    const trace = result.calculation_trace as any;
    expect(trace.bmr).toBeDefined();
    expect(trace.bmr.formula).toBe('Mifflin-St Jeor');
    expect(trace.tdee).toBeDefined();
    expect(trace.tdee.tdee_static).toBeGreaterThan(0);
    expect(trace.tdee.tdee_adjusted).toBeGreaterThan(0);
  });
});

describe('U2 envelope: peanut BLOCK and vitamin-K constraint', () => {
  let result: EnvelopeResult;

  beforeAll(() => {
    result = computeEnvelope(u2Profile, u2Labs, highActivityTelemetry, emptyIntake, emptyDishes, 'lunch');
  });

  it('produces a peanut allergen BLOCK', () => {
    const peanut = result.hard_constraints.find((c) => c.rule_id === 'allergen_block_peanut');
    expect(peanut).toBeDefined();
    expect(peanut!.severity).toBe('critical');
  });

  it('produces a vitamin-K constraint from warfarin', () => {
    const vitK = result.hard_constraints.find((c) => c.nutrient === 'vitamin_k_ug');
    expect(vitK).toBeDefined();
    expect(vitK!.rule_id).toBe('drug_warfarin_vitk');
    expect(vitK!.threshold).toBe(120);
    expect(vitK!.severity).toBe('critical');
  });
});

describe('U3 envelope: potassium and phosphorus caps', () => {
  let result: EnvelopeResult;

  beforeAll(() => {
    result = computeEnvelope(u3Profile, u3Labs, null, emptyIntake, emptyDishes, 'dinner');
  });

  it('produces a potassium cap from CKD', () => {
    const k = result.hard_constraints.find((c) => c.nutrient === 'potassium_mg');
    expect(k).toBeDefined();
    expect(k!.rule_id).toBe('ckd_potassium_cap');
    expect(k!.threshold).toBe(2000);
  });

  it('produces a phosphorus cap from CKD', () => {
    const p = result.hard_constraints.find((c) => c.nutrient === 'phosphorus_mg');
    expect(p).toBeDefined();
    expect(p!.rule_id).toBe('ckd_phosphorus_cap');
    expect(p!.threshold).toBe(800);
  });

  it('produces a saturated fat warning from Dyslipidemia', () => {
    const sf = result.hard_constraints.find((c) => c.nutrient === 'saturated_fat_g');
    expect(sf).toBeDefined();
    expect(sf!.rule_id).toBe('dyslip_sat_fat_cap');
  });
});

describe('Telemetry: high-activity day widens carb allowance', () => {
  it('carb target is higher with 15k steps than with 4k steps', () => {
    const lowActivity = computeEnvelope(u2Profile, u2Labs, u1TelemetryToday, emptyIntake, emptyDishes, 'lunch');
    const highActivity = computeEnvelope(u2Profile, u2Labs, highActivityTelemetry, emptyIntake, emptyDishes, 'lunch');

    const lowCarb = lowActivity.soft_targets.find((t) => t.nutrient === 'carbs_g');
    const highCarb = highActivity.soft_targets.find((t) => t.nutrient === 'carbs_g');

    expect(lowCarb).toBeDefined();
    expect(highCarb).toBeDefined();
    // High activity adds +20% to carb target
    expect(highCarb!.target).toBeGreaterThan(lowCarb!.target);
    // The trigger must mention steps
    expect(highCarb!.trigger).toContain('steps=');
  });
});

describe('Telemetry: high-stress day raises fluid targets', () => {
  it('produces hydration and electrolyte soft targets when stress is high', () => {
    const result = computeEnvelope(u1Profile, u1Labs, highStressTelemetry, emptyIntake, emptyDishes, 'lunch');

    const hydration = result.soft_targets.find((t) => t.nutrient === 'hydration_ml');
    expect(hydration).toBeDefined();
    expect(hydration!.target).toBeGreaterThan(0);
    expect(hydration!.trigger).toContain('stress_index=');

    const potassium = result.soft_targets.find(
      (t) => t.nutrient === 'potassium_mg' && t.trigger.includes('electrolyte')
    );
    expect(potassium).toBeDefined();
  });
});

describe('Telemetry: poor sleep raises protein and lowers sugar ceiling', () => {
  it('U1 today has poor sleep — protein boost and sugar ceiling present', () => {
    const result = computeEnvelope(u1Profile, u1Labs, u1TelemetryToday, emptyIntake, emptyDishes, 'lunch');

    const protein = result.soft_targets.find((t) => t.nutrient === 'protein_g');
    expect(protein).toBeDefined();
    expect(protein!.trigger).toContain('recovery boost');

    const sugarCeiling = result.soft_targets.find((t) => t.nutrient === 'sugar_g_ceiling');
    expect(sugarCeiling).toBeDefined();
    expect(sugarCeiling!.trigger).toContain('poor recovery');
  });
});

describe('Intake subtraction', () => {
  it('reduces remaining kcal when intake is logged', () => {
    const fakeDishes = [
      {
        id: 'test_dish',
        kcal: 500,
        macros: { protein_g: 20, carbs_g: 60, fat_g: 15, fibre_g: 5, sugar_g: 10 },
        micros: { sodium_mg: 800, iron_mg: 3, calcium_mg: 50, vitamin_d_iu: 0, vitamin_b12_ug: 0, potassium_mg: 200, vitamin_k_ug: 10 },
      },
    ];
    const intake: IntakeLog[] = [{ user_id: 'u1', timestamp: new Date().toISOString(), dish_id: 'test_dish', portion_multiplier: 1 }];

    const withIntake = computeEnvelope(u1Profile, u1Labs, u1TelemetryToday, intake, fakeDishes, 'lunch');
    const withoutIntake = computeEnvelope(u1Profile, u1Labs, u1TelemetryToday, emptyIntake, emptyDishes, 'lunch');

    const traceWith = withIntake.calculation_trace as any;
    const traceWithout = withoutIntake.calculation_trace as any;

    expect(traceWith.remaining_daily_kcal).toBeLessThan(traceWithout.remaining_daily_kcal);
    expect(traceWith.slot_allocation.slot_kcal).toBeLessThan(traceWithout.slot_allocation.slot_kcal);
  });
});

describe('Hard constraints are never relaxed by soft targets', () => {
  it('hard and soft arrays are separate and contain no shared references', () => {
    const result = computeEnvelope(u1Profile, u1Labs, u1TelemetryToday, emptyIntake, emptyDishes, 'lunch');
    expect(Array.isArray(result.hard_constraints)).toBe(true);
    expect(Array.isArray(result.soft_targets)).toBe(true);

    // No hard constraint nutrient should appear as a soft target with a RELAXING value
    for (const hc of result.hard_constraints) {
      if (hc.operator === '<' || hc.operator === '<=') {
        // No soft target should set a target above the hard constraint threshold
        const conflicting = result.soft_targets.find(
          (st) => st.nutrient === hc.nutrient && st.target > hc.threshold
        );
        expect(conflicting).toBeUndefined();
      }
    }
  });
});
