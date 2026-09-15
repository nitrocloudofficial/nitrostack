import { z } from 'zod';

export const MealFeedbackSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  rating: z.number().min(1).max(5),
  liked: z.boolean(),
  comments: z.string(),
});
export type MealFeedback = z.infer<typeof MealFeedbackSchema>;



export const OrderSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  timestamp: z.string(),
  dish_id: z.string(),
  price_inr: z.number(),
  meal_slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
});
export type Order = z.infer<typeof OrderSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  daily_budget_inr: z.number().optional(),
  demographics: z.object({
    age: z.number(),
    sex: z.enum(['M', 'F', 'O']),
    height_cm: z.number(),
    weight_kg: z.number(),
    activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  }),
  chronic_conditions: z.array(z.string()),
  allergies: z.array(z.object({
    allergen: z.string(),
    severity: z.enum(['mild', 'moderate', 'severe']),
  })),
  medications: z.array(z.object({
    name: z.string(),
    class: z.string(),
  })),
  diet_plan: z.object({
    type: z.string(),
    daily_kcal_target: z.number(),
    macro_split: z.object({
      protein_pct: z.number(),
      carbs_pct: z.number(),
      fat_pct: z.number(),
    }),
  }),
  goals: z.array(z.string()),
  taste_preferences: z.object({
    cuisines_liked: z.array(z.string()),
    cuisines_disliked: z.array(z.string()),
    spice_tolerance: z.enum(['none', 'mild', 'medium', 'high']),
    texture_preferences: z.array(z.string()),
  }),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;


export const LabReportSchema = z.object({
  user_id: z.string(),
  report_date: z.string(), // ISO 8601 string
  panels: z.array(z.object({
    name: z.string(),
    value: z.number(),
    unit: z.string(),
    reference_range: z.object({
      low: z.number(),
      high: z.number(),
    }),
    status: z.enum(['low', 'normal', 'high']),
  })),
  deficiency_vector: z.array(z.object({
    nutrient: z.string(),
    severity: z.enum(['mild', 'moderate', 'severe']),
    target_uplift: z.number(),
  })),
});
export type LabReport = z.infer<typeof LabReportSchema>;

export const BiometricSnapshotSchema = z.object({
  timestamp: z.string(), // ISO 8601 string
  steps: z.number(),
  active_kcal: z.number(),
  resting_kcal: z.number(),
  sleep: z.object({
    duration_min: z.number(),
    deep_min: z.number(),
    rem_min: z.number(),
    efficiency_pct: z.number(),
  }),
  hr_resting: z.number(),
  hr_recovery: z.number(),
  spo2_pct: z.number(),
  hydration_ml: z.number(),
  stress_index: z.number().min(0).max(100),
});
export type BiometricSnapshot = z.infer<typeof BiometricSnapshotSchema>;

export const DishSchema = z.object({
  id: z.string(),
  restaurant_id: z.string(),
  name: z.string(),
  cuisine: z.string(),
  description: z.string(),
  price_inr: z.number(),
  rating: z.number(),
  veg: z.boolean().nullish(),
  prep_style: z.enum(['fried', 'grilled', 'steamed', 'raw', 'baked', 'curry', 'roasted']),
  flavour_profile: z.object({
    sweet: z.number().min(0).max(1),
    salty: z.number().min(0).max(1),
    sour: z.number().min(0).max(1),
    spicy: z.number().min(0).max(1),
    umami: z.number().min(0).max(1),
    fat: z.number().min(0).max(1),
  }),
  texture_tags: z.array(z.string()),
  ingredients: z.array(z.object({
    name: z.string(),
    usda_query: z.string(),
    grams: z.number(),
  })).nullish(),
  added_salt_g: z.number().nullish(),
  cooking_fat: z.object({
    name: z.string().nullish(),
    usda_query: z.string(),
    grams: z.number(),
  }).nullish(),
  serving_size_g: z.number(),
  macros: z.object({
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
    fibre_g: z.number(),
    sugar_g: z.number(),
  }),
  micros: z.object({
    sodium_mg: z.number(),
    iron_mg: z.number(),
    calcium_mg: z.number(),
    vitamin_d_iu: z.number(),
    vitamin_b12_ug: z.number(),
    potassium_mg: z.number(),
    vitamin_k_ug: z.number(),
  }),
  kcal: z.number(),
  gi_basis: z.string().nullish(),
  glycemic_index_estimate: z.number(),
  glycemic_index_confidence: z.enum(['low', 'medium', 'high']).nullish(),
  allergens: z.array(z.string()),
  usda_source_ids: z.array(z.string()),
  swap_for: z.string().nullish(),
  conflict_role: z.string().nullish(),
});
export type Dish = z.infer<typeof DishSchema>;

export const RestaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  rating: z.number(),
});
export type Restaurant = z.infer<typeof RestaurantSchema>;

export const IntakeLogSchema = z.object({
  user_id: z.string(),
  timestamp: z.string(),
  dish_id: z.string(),
  portion_multiplier: z.number(),
});
export type IntakeLog = z.infer<typeof IntakeLogSchema>;

export const BudgetStateSchema = z.object({
  user_id: z.string(),
  date: z.string(),
  kcal_remaining: z.number(),
  protein_g_remaining: z.number(),
  carbs_g_remaining: z.number(),
  fat_g_remaining: z.number(),
  sodium_mg_remaining: z.number(),
});
export type BudgetState = z.infer<typeof BudgetStateSchema>;

export const HardConstraintSchema = z.object({
  nutrient: z.string(),
  operator: z.enum(['<', '>', '<=', '>=', '==']),
  threshold: z.number(),
  unit: z.string(),
});
export type HardConstraint = z.infer<typeof HardConstraintSchema>;

export const SoftTargetSchema = z.object({
  nutrient: z.string(),
  target: z.number(),
  unit: z.string(),
  weight: z.number(), // Importance
});
export type SoftTarget = z.infer<typeof SoftTargetSchema>;

export const NutritionalEnvelopeSchema = z.object({
  hard_constraints: z.array(HardConstraintSchema),
  soft_targets: z.array(SoftTargetSchema),
});
export type NutritionalEnvelope = z.infer<typeof NutritionalEnvelopeSchema>;

export const SafetyVerdictSchema = z.object({
  status: z.enum(['PASS', 'WARN', 'BLOCK']),
  rule_id: z.string().optional(),
  rule_text: z.string().optional(),
  severity: z.enum(['none', 'mild', 'moderate', 'severe', 'critical']),
  actual_value: z.number().optional(),
  threshold: z.number().optional(),
});
export type SafetyVerdict = z.infer<typeof SafetyVerdictSchema>;

export const ConflictLogSchema = z.object({
  timestamp: z.string(),
  rule_id: z.string(),
  dish_id: z.string(),
  reason: z.string(),
});
export type ConflictLog = z.infer<typeof ConflictLogSchema>;

export const RecommendationSchema = z.object({
  dish_id: z.string(),
  match_score: z.number(),
  safety_verdict: SafetyVerdictSchema,
  justification: z.string(),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;
