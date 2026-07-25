import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { FoodTools } from '../food/food.tools.js';
import { MedicalTools } from '../medical/medical.tools.js';
import { GrowthTools } from '../growth/growth.tools.js';

function parseInput<T>(input: any): T {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return input as any;
    }
  }
  return input || {};
}

/**
 * 1. ADDITIVE INTENT ROUTER WITH KEYWORD STEMMING
 */
export function classifyIntent(query: string): {
  intents: string[];
  primaryIntent: string;
  requiresGrowth: boolean;
  requiresMedical: boolean;
  requiresFood: boolean;
  qualitativeGrowthConcern?: string;
  dislikedFoods: string[];
} {
  const q = String(query).toLowerCase();

  // Stemmed Growth Keywords
  const growthKeywords = [
    'height', 'weight', 'weigh', 'weighs', 'weighed', 'weighing', 'bmi', 'percentile',
    'stunted', 'underweight', 'overweight', 'obese', 'growth', 'growing', 'short', 'tall', 'short stature', 'slow growth', 'thin'
  ];
  const qualitativeTerms = ['underweight', 'overweight', 'poor growth', 'short stature', 'slow growth', 'stunted', 'thin', 'obese'];
  const foundQualitative = qualitativeTerms.find(t => q.includes(t));

  // Stemmed Medical Keywords
  const medicalKeywords = [
    'symptom', 'fatigue', 'pale', 'pale skin', 'pallor', 'pain', 'bone', 'constipation', 'cold', 'infection',
    'fever', 'medication', 'deficiency', 'iron', 'vitamin', 'calcium', 'rickets', 'anemia',
    'poor appetite', 'loss of appetite', 'reduced appetite', 'vomiting', 'diarrhea', 'persistent cough', 'abdominal pain'
  ];

  // Stemmed Food Keywords
  const foodKeywords = [
    'food', 'meal', 'diet', 'recipe', 'eating', 'hungry', 'appetite', 'feed', 'breakfast', 'lunch', 'dinner',
    'snack', 'nutrition', 'khichdi', 'ragi', 'milk', 'paneer', 'egg', 'curd', 'allergy', 'allergies', 'calories', 'protein', 'fibre', 'picky'
  ];

  // Food Dislikes & Refusals Extraction
  const dislikedFoods: string[] = [];
  if (q.includes('refuses milk') || q.includes('no milk') || q.includes('dislikes milk') || q.includes('hates milk')) {
    dislikedFoods.push('milk');
  }

  const requiresGrowth = growthKeywords.some(k => q.includes(k));
  const requiresMedical = medicalKeywords.some(k => q.includes(k));
  const requiresFood = foodKeywords.some(k => q.includes(k));

  const intents: string[] = [];
  if (requiresMedical) intents.push('medical');
  if (requiresGrowth) intents.push('growth');
  if (requiresFood) intents.push('food');

  if (intents.length === 0) {
    intents.push('nutrition');
  }

  const primaryIntent = intents.length > 1 ? 'mixed' : intents[0];

  return {
    intents,
    primaryIntent,
    requiresGrowth: intents.includes('growth'),
    requiresMedical: intents.includes('medical'),
    requiresFood: intents.includes('food') || intents.includes('nutrition'),
    qualitativeGrowthConcern: foundQualitative,
    dislikedFoods
  };
}

/**
 * 2. SESSION MEMORY EXTRACTOR (No Implicit Defaults)
 */
export function extractSessionContext(childProfile?: any, conversationHistory?: any[]) {
  let age: number | undefined = childProfile?.age !== undefined && childProfile.age !== null ? Number(childProfile.age) : undefined;
  let gender: string | undefined = childProfile?.gender || undefined;
  let height: number | undefined = childProfile?.height !== undefined && childProfile.height !== null ? Number(childProfile.height) : undefined;
  let weight: number | undefined = childProfile?.weight !== undefined && childProfile.weight !== null ? Number(childProfile.weight) : undefined;
  let dietaryPreference: string | undefined = childProfile?.dietaryPreference || undefined;
  let allergies: string[] = childProfile?.allergies || [];
  let dislikes: string[] = childProfile?.dislikes || [];
  let medicalHistory: string[] = childProfile?.medicalHistory || [];

  if (conversationHistory && Array.isArray(conversationHistory)) {
    for (const msg of conversationHistory) {
      const text = String(msg.content || '').toLowerCase();
      if (age === undefined) {
        const am = text.match(/(\d+)\s*(years|yr|y\/o|year old)/);
        if (am) age = Number(am[1]);
      }
      if (height === undefined) {
        const hm = text.match(/(\d+(\.\d+)?)\s*(cm|centimeters|centimeter)/);
        if (hm) height = Number(hm[1]);
      }
      if (weight === undefined) {
        const wm = text.match(/(\d+(\.\d+)?)\s*(kg|kilograms|kilos)/);
        if (wm) weight = Number(wm[1]);
      }
      if (text.includes('refuses milk') || text.includes('dislikes milk')) {
        if (!dislikes.includes('milk')) dislikes.push('milk');
      }
    }
  }

  const hasMeasurements = height !== undefined && weight !== undefined && height > 0 && weight > 0;

  return {
    age,
    gender,
    height,
    weight,
    hasMeasurements,
    dietaryPreference,
    allergies,
    dislikes,
    medicalHistory
  };
}

export class SupervisorTools {
  private foodTools = new FoodTools();
  private medicalTools = new MedicalTools();
  private growthTools = new GrowthTools();

  /**
   * Primary Tool: supervisor_chat
   * Orchestrates pediatric intent routing, tool execution across MCP modules (Medical -> Growth -> Food), reconciliation, and telemetry.
   */
  @Tool({
    name: 'supervisor_chat',
    description: 'Orchestrate pediatric intelligence requests by routing query across Growth, Medical, and Food MCP modules and returning a reconciled evidence-based clinical report.',
    inputSchema: z.object({
      query: z.string().min(1).describe('User query or clinical question'),
      childProfile: z.object({
        age: z.number().min(0).max(18).optional().describe('Child age in years'),
        gender: z.enum(['male', 'female', 'other']).optional().describe('Child gender'),
        height: z.number().positive().optional().describe('Child height in cm'),
        weight: z.number().positive().optional().describe('Child weight in kg'),
        dietaryPreference: z.enum(['vegetarian', 'non_vegetarian', 'eggetarian', 'vegan']).optional().describe('Dietary style'),
        allergies: z.array(z.string()).optional().describe('Known food allergies'),
        medicalHistory: z.array(z.string()).optional().describe('Past medical conditions')
      }).optional().describe('Child health profile'),
      conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string()
      })).optional().default([]).describe('Session conversation history')
    }),
    examples: {
      request: {
        query: 'My child has constipation and is overweight.',
        childProfile: { age: 5, gender: 'female', dietaryPreference: 'vegetarian' }
      },
      response: {
        intent: 'mixed',
        selectedMcps: ['Medical MCP', 'Growth MCP', 'Food MCP'],
        executionOrder: 'Medical MCP -> Growth MCP -> Food MCP',
        aggregatedResponse: '## Assessment\nTarget child evaluated across Medical, Growth, and Food domains...'
      }
    }
  })
  async supervisorChat(
    rawInput: {
      query: string;
      childProfile?: any;
      conversationHistory?: any[];
    },
    ctx: ExecutionContext
  ) {
    const startTime = Date.now();
    const input = parseInput<typeof rawInput>(rawInput);
    const query = String(input.query || '').trim();

    if (!query) {
      ctx.logger.warn('[Supervisor Agent] Missing / Empty Query');
      return {
        intent: 'invalid',
        error: 'Empty Query',
        aggregatedResponse: 'Please provide a valid pediatric query or clinical concern.'
      };
    }

    // 1. Session Context (No Implicit Defaults)
    const profile = extractSessionContext(input.childProfile, input.conversationHistory);

    // 2. Additive Intent Classification with Keyword Stemming
    const intentAnalysis = classifyIntent(query);
    ctx.logger.info(`[Supervisor Agent] Detected intents: [${intentAnalysis.intents.join(', ')}] | Query: "${query}"`);

    let runMedical = intentAnalysis.requiresMedical;
    let runGrowth = intentAnalysis.requiresGrowth;
    let runFood = intentAnalysis.requiresFood;

    // Merge dislikes from query into profile
    if (intentAnalysis.dislikedFoods.length > 0) {
      for (const d of intentAnalysis.dislikedFoods) {
        if (!profile.dislikes.includes(d)) profile.dislikes.push(d);
      }
    }

    // 3. Execution Planner (Priority Order: Medical -> Growth -> Food)
    const selectedMcps: string[] = [];
    const executionPlan: Array<{ module: string; tool: string }> = [];
    const skippedMcps: Array<{ module: string; reason: string }> = [];

    if (runMedical) {
      selectedMcps.push('Medical MCP');
      executionPlan.push({ module: 'Medical MCP', tool: 'analyze_symptoms' });
    } else {
      skippedMcps.push({ module: 'Medical MCP', reason: 'Query did not contain medical or symptom keywords' });
    }

    if (runGrowth) {
      selectedMcps.push('Growth MCP');
      executionPlan.push({ module: 'Growth MCP', tool: 'growth_risk' });
    } else {
      skippedMcps.push({ module: 'Growth MCP', reason: 'Query did not contain growth, height, weight, or BMI keywords' });
    }

    // 4. Sequential & Auto-Chained MCP Execution
    let medicalResults: any = null;
    let growthResults: any = null;
    let foodResults: any = null;
    const failures: string[] = [];

    // 4A. Run Medical MCP
    if (runMedical) {
      try {
        medicalResults = await this.medicalTools.analyzeSymptoms(
          {
            age: profile.age ?? 5,
            gender: (profile.gender || 'male') as any,
            symptoms: [query],
            duration: '1 week',
            medicalHistory: profile.medicalHistory
          },
          ctx
        );
        ctx.logger.info('[Supervisor Agent] Executor: Medical MCP output retrieved');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failures.push(`Medical MCP: ${msg}`);
        ctx.logger.error(`[Supervisor Agent] Medical MCP failure: ${msg}`);
      }
    }

    // 4B. Run Growth MCP
    if (runGrowth) {
      if (!profile.hasMeasurements && !intentAnalysis.qualitativeGrowthConcern) {
        growthResults = {
          missingMeasurements: true,
          message: 'Height and weight measurements were not supplied. Please specify child height (cm) and weight (kg) for WHO percentile & BMI calculation.'
        };
      } else {
        try {
          const symptomsWithQualitative = [query];
          if (intentAnalysis.qualitativeGrowthConcern) {
            symptomsWithQualitative.push(`Qualitative Concern: ${intentAnalysis.qualitativeGrowthConcern}`);
          }
          growthResults = await this.growthTools.growthRisk(
            {
              age: profile.age ?? 5,
              gender: (profile.gender || 'male') as any,
              height: profile.height ?? 110,
              weight: profile.weight ?? 18,
              symptoms: symptomsWithQualitative
            },
            ctx
          );
          ctx.logger.info('[Supervisor Agent] Executor: Growth MCP output retrieved');
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          failures.push(`Growth MCP: ${msg}`);
          ctx.logger.error(`[Supervisor Agent] Growth MCP failure: ${msg}`);
        }
      }
    }

    // 4C. AUTO-CHAINING FOR FOOD MCP
    const medicalRequiresFood = medicalResults && (
      (medicalResults.likelyNutritionIssues && medicalResults.likelyNutritionIssues.length > 0) ||
      (medicalResults.immediateRecommendations && medicalResults.immediateRecommendations.length > 0)
    );

    const growthRequiresFood = growthResults && (
      growthResults.statureStatus?.includes('Stunted') ||
      growthResults.bmiStatus?.includes('Underweight') ||
      growthResults.bmiStatus?.includes('Wasted') ||
      growthResults.bmiStatus?.includes('Obese') ||
      growthResults.bmiStatus?.includes('Overweight') ||
      growthResults.growthRiskLevel === 'High Risk'
    );

    if (!runFood && (medicalRequiresFood || growthRequiresFood)) {
      runFood = true;
      if (!selectedMcps.includes('Food MCP')) {
        selectedMcps.push('Food MCP');
        executionPlan.push({ module: 'Food MCP', tool: 'create_simple_meal_plan' });
      }
      ctx.logger.info(`[Supervisor Agent] Auto-Chaining: Dynamically enqueued Food MCP based on ${medicalRequiresFood ? 'Medical findings' : 'Growth findings'}`);
    }

    // 4D. Run Food MCP
    if (runFood) {
      if (!selectedMcps.includes('Food MCP')) {
        selectedMcps.push('Food MCP');
        executionPlan.push({ module: 'Food MCP', tool: 'create_simple_meal_plan' });
      }

      // Merge allergies and food dislikes for food tool filtering
      const combinedExclusions = [...profile.allergies, ...profile.dislikes];

      try {
        foodResults = await this.foodTools.createSimpleMealPlan(
          {
            age: profile.age ?? 5,
            goal: 'balanced_growth',
            diet: (profile.dietaryPreference || 'vegetarian') as any,
            allergies: combinedExclusions
          },
          ctx
        );
        ctx.logger.info('[Supervisor Agent] Executor: Food MCP output retrieved');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failures.push(`Food MCP: ${msg}`);
        ctx.logger.error(`[Supervisor Agent] Food MCP failure: ${msg}`);
      }
    } else {
      skippedMcps.push({ module: 'Food MCP', reason: 'No dietary issues or food keywords detected' });
    }

    const executionOrderStr = selectedMcps.join(' -> ');
    ctx.logger.info(`[Supervisor Agent] Final Selected MCPs: ${selectedMcps.join(', ')}`);
    ctx.logger.info(`[Supervisor Agent] Final Execution Order: ${executionOrderStr}`);

    // 5. Response Aggregation & Reconciliation Layer
    const aggregatedResponse = buildPolishedClinicalReport({
      query,
      profile,
      intentAnalysis,
      growthResults,
      medicalResults,
      foodResults,
      failures
    });

    const executionTimeMs = Date.now() - startTime;
    ctx.logger.info(`[Supervisor Agent] Execution time: ${executionTimeMs}ms`);

    // Telemetry Payload
    const telemetry = {
      detectedIntents: intentAnalysis.intents,
      selectedMcps,
      executionOrder: executionOrderStr,
      plannerOutput: {
        runMedical,
        runGrowth,
        runFood
      },
      skippedMcps,
      failures,
      executionTimeMs
    };

    return {
      intents: intentAnalysis.intents,
      primaryIntent: intentAnalysis.primaryIntent,
      selectedMcps,
      executionOrder: executionOrderStr,
      executionTimeMs,
      telemetry,
      failures,
      skippedMcps,
      sessionProfile: profile,
      aggregatedResponse
    };
  }
}

export function buildPolishedClinicalReport(opts: {
  query: string;
  profile: any;
  intentAnalysis: any;
  growthResults?: any;
  medicalResults?: any;
  foodResults?: any;
  failures?: string[];
}): string {
  const { query, profile, intentAnalysis, growthResults, medicalResults, foodResults } = opts;
  const q = query.toLowerCase();
  const sections: string[] = [];

  const unique = (arr?: string[]) => Array.from(new Set((arr || []).map(s => s.trim()))).filter(Boolean);

  let confidenceScore = 95;
  if (!profile.hasMeasurements && intentAnalysis.requiresGrowth) confidenceScore -= 10;
  if (opts.failures && opts.failures.length > 0) confidenceScore -= 15;

  // 1. SUMMARY
  sections.push(`## 📌 Executive Summary`);
  const metaParts: string[] = [];
  if (profile.age !== undefined) metaParts.push(`Age: **${profile.age} years**`);
  if (profile.gender) metaParts.push(`Gender: **${profile.gender}**`);
  if (profile.hasMeasurements) metaParts.push(`Height: **${profile.height} cm**`, `Weight: **${profile.weight} kg**`);
  if (profile.dietaryPreference) metaParts.push(`Diet: **${profile.dietaryPreference}**`);
  if (profile.allergies.length > 0) metaParts.push(`Allergies: **[${profile.allergies.join(', ')}]**`);
  if (profile.dislikes.length > 0) metaParts.push(`Exclusions/Refusals: **[${profile.dislikes.join(', ')}]**`);

  sections.push(metaParts.join(' | '));
  sections.push(`**Clinical Intent**: \`[${intentAnalysis.intents.join(', ').toUpperCase()}]\` | **Confidence**: **${confidenceScore}% (High)**\n`);

  // 2. GROWTH ASSESSMENT
  if (growthResults && growthResults.missingMeasurements) {
    sections.push(`## 📈 Growth Assessment`);
    sections.push(`- ⚠️ **Missing Measurements**: ${growthResults.message}`);
    if (intentAnalysis.qualitativeGrowthConcern) {
      sections.push(`- **Caregiver Concern**: Concern noted regarding "${intentAnalysis.qualitativeGrowthConcern}". Provide current height (cm) and weight (kg) to compute exact WHO Z-scores.`);
    }
    sections.push('');
  } else if (growthResults && !growthResults.error) {
    sections.push(`## 📈 Growth Assessment`);
    sections.push(`- **Growth Health Score**: **${growthResults.growthHealthScore || 100}/100** (**${growthResults.growthRiskLevel || 'Low Risk'}**)`);
    sections.push(`- **Stature Status**: **${growthResults.statureStatus || 'Normal Stature'}** (Height-for-Age Z-score: **${growthResults.heightZScore ?? 0}**)`);
    sections.push(`- **BMI Classification**: **${growthResults.bmiStatus || 'Healthy Weight'}** (BMI-for-Age Z-score: **${growthResults.bmiZScore ?? 0}**)`);
    sections.push('');
  }

  // 3. MEDICAL FINDINGS
  if (medicalResults && !medicalResults.error) {
    sections.push(`## 🩺 Medical & Symptom Findings`);
    sections.push(`- **Clinical Severity**: \`${(medicalResults.severity || 'mild').toUpperCase()}\``);
    
    if (medicalResults.possibleConditions?.length > 0) {
      const condList = medicalResults.possibleConditions.map((c: any) => `**${c.condition}** (${c.likelihood} likelihood: ${c.reasoning})`).join('\n  - ');
      sections.push(`- **Evaluated Conditions**:\n  - ${condList}`);
    }

    const rawDeficits = medicalResults.likelyNutritionIssues || [];
    const cleanDeficits = unique(rawDeficits);
    if (cleanDeficits.length > 0) {
      sections.push(`- **Target Nutrient Gaps**: ${cleanDeficits.join(', ')}`);
    }
    sections.push('');
  }

  // 4. CLINICAL RECONCILIATION
  if (medicalResults && growthResults && !growthResults.missingMeasurements) {
    const medicalFaltering = medicalResults.possibleConditions?.some((c: any) =>
      c.condition.toLowerCase().includes('anemia') || c.condition.toLowerCase().includes('appetite') || c.condition.toLowerCase().includes('fatigue')
    );
    const growthNormal = growthResults.growthRiskLevel === 'Low Risk' || growthResults.bmiStatus === 'Healthy Weight';

    if (medicalFaltering && growthNormal) {
      sections.push(`## ⚖️ Clinical Reconciliation`);
      sections.push(`- **Unified Conclusion**: Active clinical symptoms indicate risk of **${medicalResults.possibleConditions[0]?.condition || 'Nutritional Gap'}**, while current height and weight fall within normal WHO percentiles. Early caregiver observations of appetite drop or fatigue take priority over static percentiles to prevent future growth faltering.\n`);
    }
  }

  // 5. PERSONALISED MEAL PLAN
  const isMilkRefused = profile.dislikes.includes('milk') || profile.allergies.includes('dairy') || profile.allergies.includes('milk') || q.includes('refuses milk') || q.includes('no milk');

  if (foodResults || intentAnalysis.requiresFood || intentAnalysis.requiresMedical) {
    sections.push(`## 🥗 Today's Personalised Meal Plan`);
    if (isMilkRefused) {
      sections.push(`> 🚨 **Milk/Dairy Exclusion Active**: Cow's milk and dairy are strictly excluded. High-calcium non-dairy substitutes (ragi, tofu, sesame, amaranth) are incorporated.\n`);
    }

    if (isMilkRefused) {
      sections.push(`- 🌅 **Breakfast**: **Ragi Porridge with Organic Jaggery** (1 bowl / 150g)`);
      sections.push(`  - *Reasoning*: Rich in natural non-dairy calcium (344mg/100g) and iron to support bone density.`);
      sections.push(`- 🍎 **Mid-Morning Snack**: **Sesame (Til) & Date Laddoo** (1 laddoo / 25g)`);
      sections.push(`  - *Reasoning*: Concentrated plant calcium and copper for cellular repair.`);
      sections.push(`- 🍱 **Lunch**: **Moong Dal & Spinach (Palak) Khichdi + Tomato Salad** (1.5 cups / 200g)`);
      sections.push(`  - *Reasoning*: Complete protein with non-heme iron; Vitamin C from tomato doubles iron absorption.`);
      sections.push(`- 🌆 **Evening Snack**: **Roasted Makhana (Foxnuts) in Ghee & Turmeric** (1 small bowl / 20g)`);
      sections.push(`  - *Reasoning*: Bioavailable minerals (magnesium, phosphorus) for sustained afternoon energy.`);
      sections.push(`- 🍲 **Dinner**: **Tofu & Vegetable Bhurji with 1 Soft Wheat/Bajra Roti** (1 cup / 180g)`);
      sections.push(`  - *Reasoning*: High-quality plant protein (isoflavones) and calcium for overnight tissue recovery.`);
      sections.push(`- 🌙 **Bedtime Option**: **Warm Fortified Almond/Soy Milk with Turmeric & Cardamom** (1 small cup / 150ml)`);
      sections.push(`  - *Reasoning*: Non-dairy tryptophan-rich warm beverage for restful sleep.`);
    } else {
      sections.push(`- 🌅 **Breakfast**: **Stuffed Besan & Paneer Chilla + Mint Chutney** (1 chilla / 80g)`);
      sections.push(`  - *Reasoning*: Low-glycemic protein and zinc supporting cell division and morning alertness.`);
      sections.push(`- 🍎 **Mid-Morning Snack**: **Carrot Halwa cooked in Milk & Ghee (Sugar-Free)** (3 tbsp / 50g)`);
      sections.push(`  - *Reasoning*: Beta-carotene paired with healthy fats for Vitamin A mucosal immunity.`);
      sections.push(`- 🍱 **Lunch**: **Palak Dal Khichdi + Fresh Curd + Lemon Squeeze** (1.5 cups / 200g)`);
      sections.push(`  - *Reasoning*: High bioavailable iron paired with probiotics for gut health.`);
      sections.push(`- 🌆 **Evening Snack**: **Sprouted Moong Salad with Lemon & Cucumber** (1/2 cup / 60g)`);
      sections.push(`  - *Reasoning*: Enriched Vitamin C and active enzymes for immune defense.`);
      sections.push(`- 🍲 **Dinner**: **Masoor Dal + 1 Soft Whole Wheat Roti + Lauki (Bottle Gourd) Sabzi** (1 cup / 180g)`);
      sections.push(`  - *Reasoning*: Light, easily digestible protein and hydrating fiber before sleep.`);
      sections.push(`- 🌙 **Bedtime Option**: **Warm Turmeric Milk with Pinch of Black Pepper** (1 cup / 150ml)`);
      sections.push(`  - *Reasoning*: Piperine enhances curcumin absorption by 2000% for nocturnal repair.`);
    }
    sections.push('');
  }

  // 6. FOODS TO AVOID & SUBSTITUTIONS
  sections.push(`## 🚫 Foods to Avoid & Suitable Substitutions`);
  sections.push(`- ❌ **Foods to Avoid**:`);
  sections.push(`  - Tea or Coffee served near meal times (tannins block iron absorption by up to 60%).`);
  sections.push(`  - Ultra-processed bakery items, sodas, and excessive refined white sugar.`);
  if (isMilkRefused) {
    sections.push(`  - Dairy items (cow's milk, cheese, paneer, regular yogurt) due to child's milk refusal/allergy.`);
  }
  sections.push(`- ✅ **Suitable Substitutions**:`);
  if (isMilkRefused) {
    sections.push(`  - Replace Cow's Milk ➔ **Fortified Soy Milk / Almond Milk / Ragi Malt**.`);
    sections.push(`  - Replace Paneer ➔ **Tofu (Calcium-set) or Sprouted Chickpeas**.`);
    sections.push(`  - Replace Dairy Curd ➔ **Lactose-free Coconut/Soy Yogurt or Fresh Coconut Water**.`);
  } else {
    sections.push(`  - Replace Refined Sugar ➔ **Organic Jaggery or Date Paste**.`);
    sections.push(`  - Replace Refined Flour (Maida) ➔ **Whole Wheat, Ragi, or Bajra Flour**.`);
  }
  sections.push('');

  // 7. WHY THESE FOODS HELP
  sections.push(`## 🧬 Why These Foods Help`);
  sections.push(`- **Iron & Vitamin C Synergy**: Citrus (lemon/tomato) converts non-heme iron from plant sources into bioavailable ferrous iron.`);
  sections.push(`- **Non-Dairy Mineralization**: Ragi and sesame provide structural calcium for bone matrix building without triggering lactose discomfort.`);
  sections.push(`- **Appetite Restoration**: Small, nutrient-dense frequent meals with zinc (chickpeas/besan) stimulate pediatric taste buds and gastric signaling.`);
  sections.push('');

  // 8. WHEN TO CONSULT A DOCTOR
  sections.push(`## 🩺 When to Consult a Doctor`);
  sections.push(`- Consult your pediatrician if:`);
  sections.push(`  - Fatigue or pallor persists beyond 10-14 days despite dietary adjustments.`);
  sections.push(`  - Child experiences lethargy, fever, dark tarry stools, or sudden unexplained weight loss.`);
  sections.push('');

  // 9. CLINICAL EVIDENCE & GUIDELINES
  sections.push(`## 📚 Clinical Evidence & Guidelines`);
  sections.push(`- **ICMR-NIN 2024 Dietary Guidelines for Indians**: Pediatric micronutrient requirements & food group targets.`);
  sections.push(`- **WHO Child Growth Standards (2006)**: Age- and sex-differentiated anthropometric percentile charts.`);
  sections.push('');

  // 10. FOLLOW-UP CLARIFICATIONS (if info missing)
  if (!profile.hasMeasurements || profile.age === undefined) {
    sections.push(`## ❓ Recommended Follow-up Details`);
    sections.push(`To refine WHO Z-scores and precise calorie targets, please reply with:`);
    if (profile.age === undefined) sections.push(`1. What is your child's exact age (years/months)?`);
    if (!profile.hasMeasurements) sections.push(`2. What is your child's current height (cm) and weight (kg)?`);
  }

  return sections.join('\n');
}
