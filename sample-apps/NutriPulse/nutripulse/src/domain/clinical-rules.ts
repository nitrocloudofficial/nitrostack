import { z } from 'zod';
import { SafetyVerdict } from './types.js';

export const TriggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('condition'), condition: z.string() }),
  z.object({ type: z.literal('medication'), medication: z.string() }),
  z.object({ type: z.literal('lab_status'), nutrient: z.string(), status: z.enum(['low', 'high']) }),
  z.object({ type: z.literal('allergen'), allergen: z.string() }),
]);
export type Trigger = z.infer<typeof TriggerSchema>;

export const ConstraintSchema = z.object({
  nutrient: z.string(),
  operator: z.enum(['<', '>', '<=', '>=', '==']),
  threshold: z.number(),
  unit: z.string(),
});
export type Constraint = z.infer<typeof ConstraintSchema>;

export const ClinicalRuleSchema = z.object({
  id: z.string(),
  trigger: TriggerSchema,
  constraint: ConstraintSchema.optional(),
  severity: z.enum(['none', 'mild', 'moderate', 'severe', 'critical']),
  verdict: z.enum(['WARN', 'BLOCK']),
  human_readable_text: z.string(),
  source_citation: z.string(),
  scope: z.enum(['daily', 'per_meal']).optional()
});
export type ClinicalRule = z.infer<typeof ClinicalRuleSchema>;

export const clinicalRules: ClinicalRule[] = [
  // Diabetes T2 rules
  {
    id: 'diab_t2_sugar_cap',
    trigger: { type: 'condition', condition: 'Diabetes T2' },
    constraint: { nutrient: 'sugar_g', operator: '<=', threshold: 25, unit: 'g' },
    severity: 'severe',
    verdict: 'BLOCK',
    human_readable_text: 'Strict sugar cap for Type 2 Diabetes.',
    source_citation: 'ADA Guidelines 2024',
    scope: 'daily'
  },
  {
    id: 'diab_t2_gi_cap',
    trigger: { type: 'condition', condition: 'Diabetes T2' },
    constraint: { nutrient: 'glycemic_index_estimate', operator: '<', threshold: 55, unit: 'index' },
    severity: 'moderate',
    verdict: 'WARN',
    human_readable_text: 'Prefer low GI foods for Type 2 Diabetes.',
    source_citation: 'ADA Guidelines 2024'
  },
  {
    id: 'diab_t2_fibre_floor',
    trigger: { type: 'condition', condition: 'Diabetes T2' },
    constraint: { nutrient: 'fibre_g', operator: '>=', threshold: 14, unit: 'g_per_1000kcal' },
    severity: 'moderate',
    verdict: 'WARN',
    human_readable_text: 'Minimum fibre intake to manage blood glucose.',
    source_citation: 'ADA Guidelines 2024'
  },
  // Hypertension
  {
    id: 'htn_sodium_cap',
    trigger: { type: 'condition', condition: 'Hypertension' },
    constraint: { nutrient: 'sodium_mg', operator: '<', threshold: 2000, unit: 'mg' },
    severity: 'severe',
    verdict: 'BLOCK',
    human_readable_text: 'Sodium must be strictly less than 2000mg per day for hypertension.',
    source_citation: 'WHO <2000mg/day',
    scope: 'daily'
  },
  // CKD
  {
    id: 'ckd_potassium_cap',
    trigger: { type: 'condition', condition: 'CKD' },
    constraint: { nutrient: 'potassium_mg', operator: '<', threshold: 2000, unit: 'mg' },
    severity: 'severe',
    verdict: 'BLOCK',
    human_readable_text: 'Potassium restriction for Chronic Kidney Disease.',
    source_citation: 'KDOQI Guidelines',
    scope: 'daily'
  },
  {
    id: 'ckd_phosphorus_cap',
    trigger: { type: 'condition', condition: 'CKD' },
    constraint: { nutrient: 'phosphorus_mg', operator: '<', threshold: 800, unit: 'mg' },
    severity: 'severe',
    verdict: 'BLOCK',
    human_readable_text: 'Phosphorus restriction for Chronic Kidney Disease.',
    source_citation: 'KDOQI Guidelines'
  },
  // Dyslipidemia
  {
    id: 'dyslip_sat_fat_cap',
    trigger: { type: 'condition', condition: 'Dyslipidemia' },
    constraint: { nutrient: 'saturated_fat_g', operator: '<', threshold: 15, unit: 'g' },
    severity: 'moderate',
    verdict: 'WARN',
    human_readable_text: 'Saturated fat cap for Dyslipidemia.',
    source_citation: 'AHA Guidelines'
  },
  // Coeliac / Gluten
  {
    id: 'coeliac_gluten_block',
    trigger: { type: 'condition', condition: 'Coeliac' },
    constraint: { nutrient: 'gluten_g', operator: '==', threshold: 0, unit: 'g' },
    severity: 'critical',
    verdict: 'BLOCK',
    human_readable_text: 'Strict elimination of gluten.',
    source_citation: 'Gastroenterology Guidelines'
  },
  // Allergens
  ...['peanut', 'tree nut', 'dairy', 'egg', 'soy', 'wheat', 'fish', 'shellfish', 'sesame'].map((allergen) => ({
    id: `allergen_block_${allergen.replace(' ', '_')}`,
    trigger: { type: 'allergen', allergen },
    severity: 'critical',
    verdict: 'BLOCK',
    human_readable_text: `Strict block for ${allergen} allergy.`,
    source_citation: 'FAARP Guidelines'
  } as ClinicalRule)),
  // Drug-nutrient interactions
  {
    id: 'drug_warfarin_vitk',
    trigger: { type: 'medication', medication: 'warfarin' },
    constraint: { nutrient: 'vitamin_k_ug', operator: '<', threshold: 120, unit: 'ug' },
    severity: 'critical',
    verdict: 'BLOCK',
    human_readable_text: 'Vitamin K interferes with warfarin efficacy.',
    source_citation: 'FDA Drug Interactions'
  },
  {
    id: 'drug_maoi_tyramine',
    trigger: { type: 'medication', medication: 'MAOI' },
    severity: 'critical',
    verdict: 'BLOCK',
    human_readable_text: 'Tyramine foods can cause hypertensive crisis with MAOIs.',
    source_citation: 'FDA Drug Interactions'
  },
  {
    id: 'drug_statin_grapefruit',
    trigger: { type: 'medication', medication: 'statin' },
    severity: 'critical',
    verdict: 'BLOCK',
    human_readable_text: 'Grapefruit interacts with statin metabolism.',
    source_citation: 'FDA Drug Interactions'
  },
  {
    id: 'drug_levothyroxine_calcium',
    trigger: { type: 'medication', medication: 'levothyroxine' },
    severity: 'severe',
    verdict: 'BLOCK',
    human_readable_text: 'Avoid calcium/iron within 4 hours of levothyroxine.',
    source_citation: 'FDA Drug Interactions'
  },
  // Deficiency uplift rules
  {
    id: 'def_iron_uplift',
    trigger: { type: 'lab_status', nutrient: 'iron_mg', status: 'low' },
    constraint: { nutrient: 'iron_mg', operator: '>', threshold: 18, unit: 'mg' },
    severity: 'moderate',
    verdict: 'WARN',
    human_readable_text: 'Target higher iron intake due to deficiency.',
    source_citation: 'WHO Guidelines'
  },
  {
    id: 'def_vitd_uplift',
    trigger: { type: 'lab_status', nutrient: 'vitamin_d_iu', status: 'low' },
    constraint: { nutrient: 'vitamin_d_iu', operator: '>', threshold: 1000, unit: 'iu' },
    severity: 'moderate',
    verdict: 'WARN',
    human_readable_text: 'Target higher Vitamin D intake due to deficiency.',
    source_citation: 'Endocrine Society'
  },
  {
    id: 'def_b12_uplift',
    trigger: { type: 'lab_status', nutrient: 'vitamin_b12_ug', status: 'low' },
    constraint: { nutrient: 'vitamin_b12_ug', operator: '>', threshold: 2.4, unit: 'ug' },
    severity: 'moderate',
    verdict: 'WARN',
    human_readable_text: 'Target higher Vitamin B12 intake due to deficiency.',
    source_citation: 'NIH Guidelines'
  },
  {
    id: 'def_calcium_uplift',
    trigger: { type: 'lab_status', nutrient: 'calcium_mg', status: 'low' },
    constraint: { nutrient: 'calcium_mg', operator: '>', threshold: 1000, unit: 'mg' },
    severity: 'moderate',
    verdict: 'WARN',
    human_readable_text: 'Target higher Calcium intake due to deficiency.',
    source_citation: 'NIH Guidelines'
  },
];

/**
 * Resolves multiple safety verdicts into a single final verdict.
 * Rule: BLOCK cannot be downgraded by any scoring or optimisation logic.
 */
export function evaluateSafetyVerdicts(verdicts: SafetyVerdict[]): SafetyVerdict {
  if (verdicts.length === 0) {
    return { status: 'PASS', severity: 'none' };
  }

  // Find if any block exists
  const blockVerdict = verdicts.find(v => v.status === 'BLOCK');
  if (blockVerdict) {
    return blockVerdict; // BLOCK cannot be downgraded
  }

  // Find if any warn exists
  const warnVerdict = verdicts.find(v => v.status === 'WARN');
  if (warnVerdict) {
    return warnVerdict;
  }

  return { status: 'PASS', severity: 'none' };
}
