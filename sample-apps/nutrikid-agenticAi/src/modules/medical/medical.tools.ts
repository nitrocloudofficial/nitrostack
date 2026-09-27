import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NUTRIBITE_BACKEND_URL || 'http://localhost:5000';

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

export class MedicalTools {
  /**
   * 1. analyze_symptoms
   * Analyze pediatric symptoms and assess clinical severity and nutritional risk
   */
  @Tool({
    name: 'analyze_symptoms',
    description: 'Analyze pediatric symptoms, assess clinical severity, identify likely nutritional deficits, and determine whether medical consultation is needed.',
    inputSchema: z.object({
      age: z.number().min(0).max(18).describe('Child age in years'),
      gender: z.enum(['male', 'female', 'other']).describe('Child gender'),
      symptoms: z.array(z.string()).describe('List of observed symptoms (e.g. fatigue, paleness, poor appetite, constipation, bone pain)'),
      duration: z.string().describe('Duration of symptoms (e.g. 1 week, 2 months)'),
      medicalHistory: z.array(z.string()).optional().default([]).describe('Known past medical conditions or allergies')
    }),
    examples: {
      request: {
        age: 5,
        gender: 'female',
        symptoms: ['fatigue', 'pale skin', 'poor appetite'],
        duration: '2 weeks',
        medicalHistory: []
      },
      response: {
        possibleConditions: [
          {
            condition: 'Pediatric Anemia / Low Hemoglobin',
            likelihood: 'High',
            reasoning: 'Pallor and persistent fatigue strongly indicate reduced red blood cell oxygenation.'
          }
        ],
        severity: 'moderate',
        likelyNutritionIssues: ['Iron deficiency', 'Vitamin B12 deficiency'],
        immediateRecommendations: [
          'Incorporate iron-rich foods (spinach, beetroot, ragi) paired with Vitamin C for absorption.'
        ],
        whetherMedicalConsultationIsRecommended: false
      }
    }
  })
  async analyzeSymptoms(
    rawInput: {
      age: number;
      gender: 'male' | 'female' | 'other';
      symptoms: string[];
      duration: string;
      medicalHistory?: string[];
    },
    ctx: ExecutionContext
  ) {
    const input = parseInput<typeof rawInput>(rawInput);
    ctx.logger.info(`[analyze_symptoms] Querying backend for age=${input.age}, symptoms count=${input.symptoms?.length || 0}`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/medical/analyze-symptoms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        return data;
      }
      ctx.logger.warn(`[analyze_symptoms] Backend status ${response.status}`);
    } catch (error) {
      ctx.logger.error('[analyze_symptoms] Backend error', { error: error instanceof Error ? error.message : String(error) });
    }

    return {
      possibleConditions: [{ condition: 'Symptom analysis requires backend connection', likelihood: 'Unknown', reasoning: 'Backend server unreachable' }],
      severity: 'mild',
      likelyNutritionIssues: ['Micronutrient evaluation needed'],
      immediateRecommendations: ['Consult a pediatrician if symptoms persist.'],
      whetherMedicalConsultationIsRecommended: true
    };
  }

  /**
   * 2. identify_deficiencies
   * Identify 5 core pediatric nutrient deficiencies
   */
  @Tool({
    name: 'identify_deficiencies',
    description: 'Identify potential Iron, Vitamin D, Calcium, Protein, and Vitamin B12 deficiencies based on symptoms, eating habits, and diet type.',
    inputSchema: z.object({
      age: z.number().min(0).max(18).describe('Child age in years'),
      symptoms: z.array(z.string()).describe('Observed clinical symptoms'),
      eatingHabits: z.string().describe('Description of eating habits (e.g. picky eater, avoids milk, indoor playing)'),
      dietType: z.enum(['vegetarian', 'non_vegetarian', 'eggetarian', 'vegan']).describe('Dietary style')
    }),
    examples: {
      request: {
        age: 6,
        symptoms: ['fatigue', 'pale fingernails'],
        eatingHabits: 'Picky eater, drinks mostly tea and avoids green vegetables',
        dietType: 'vegetarian'
      },
      response: {
        age: 6,
        dietType: 'vegetarian',
        deficiencies: [
          {
            name: 'Iron deficiency',
            status: 'High Risk',
            reasoning: 'Symptoms of pallor/fatigue paired with dietary patterns indicate insufficient bioavailable iron intake.'
          },
          {
            name: 'Vitamin D deficiency',
            status: 'Moderate Risk',
            reasoning: 'Growth spurts in 6-year-olds elevate Vitamin D deficit risk.'
          }
        ],
        summary: 'Evaluated 5 core pediatric nutrient deficiencies.'
      }
    }
  })
  async identifyDeficiencies(
    rawInput: {
      age: number;
      symptoms: string[];
      eatingHabits: string;
      dietType: 'vegetarian' | 'non_vegetarian' | 'eggetarian' | 'vegan';
    },
    ctx: ExecutionContext
  ) {
    const input = parseInput<typeof rawInput>(rawInput);
    ctx.logger.info(`[identify_deficiencies] Evaluating deficiency risks for age=${input.age}`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/medical/identify-deficiencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        return data;
      }
      ctx.logger.warn(`[identify_deficiencies] Backend status ${response.status}`);
    } catch (error) {
      ctx.logger.error('[identify_deficiencies] Backend error', { error: error instanceof Error ? error.message : String(error) });
    }

    return {
      age: input.age,
      dietType: input.dietType,
      deficiencies: [
        { name: 'Iron deficiency', status: 'Uncertain', reasoning: 'Backend connection error' },
        { name: 'Vitamin D deficiency', status: 'Uncertain', reasoning: 'Backend connection error' },
        { name: 'Calcium deficiency', status: 'Uncertain', reasoning: 'Backend connection error' },
        { name: 'Protein deficiency', status: 'Uncertain', reasoning: 'Backend connection error' },
        { name: 'Vitamin B12 deficiency', status: 'Uncertain', reasoning: 'Backend connection error' }
      ],
      summary: 'Backend connection error.'
    };
  }

  /**
   * 3. retrieve_guidelines
   * Retrieve evidence-based WHO / ICMR pediatric clinical guidelines
   */
  @Tool({
    name: 'retrieve_guidelines',
    description: 'Retrieve evidence-based WHO / ICMR 2020 pediatric clinical guidelines for topics such as Iron deficiency, Constipation, Growth faltering, or Obesity.',
    inputSchema: z.object({
      topic: z.string().describe('Clinical topic (e.g. Iron deficiency, Constipation, Growth faltering, Obesity)')
    }),
    examples: {
      request: { topic: 'Iron deficiency' },
      response: {
        topic: 'Iron Deficiency & Anemia Management',
        source: 'WHO Guidelines & ICMR 2020 RDA Standards',
        evidence: 'Iron deficiency anemia (IDA) in children aged 1-18 causes cognitive impairment and fatigue.',
        recommendations: [
          'Incorporate iron-dense Indian foods: Ragi, Spinach (Palak), Beetroot, Jaggery.',
          'Pair with Vitamin C sources like lemon juice for maximum absorption.'
        ]
      }
    }
  })
  async retrieveGuidelines(rawInput: { topic: string }, ctx: ExecutionContext) {
    const input = parseInput<{ topic: string }>(rawInput);
    ctx.logger.info(`[retrieve_guidelines] Fetching evidence guidelines for topic: ${input.topic}`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/medical/retrieve-guidelines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        return data;
      }
      ctx.logger.warn(`[retrieve_guidelines] Backend status ${response.status}`);
    } catch (error) {
      ctx.logger.error('[retrieve_guidelines] Backend error', { error: error instanceof Error ? error.message : String(error) });
    }

    return {
      topic: input.topic || 'Pediatric Clinical Guidelines',
      source: 'ICMR 2020 RDA & WHO Guidelines',
      evidence: 'Evidence-based guidance prioritizes balanced diet, whole grains, and growth percentile tracking.',
      recommendations: ['Maintain nutrient-dense whole foods diet and monitor growth regularly.']
    };
  }

  /**
   * 4. check_medication
   * Pediatric medication safety information, precautions, and nutrient interactions
   */
  @Tool({
    name: 'check_medication',
    description: 'Check general pediatric medication safety information, precautions, contraindications, and food/nutrient interactions. (Do NOT prescribe medication or dosage).',
    inputSchema: z.object({
      medication: z.string().describe('Name of medication or supplement (e.g. Iron, Paracetamol, Vitamin D, Amoxicillin)'),
      age: z.number().positive().describe('Child age in years'),
      weight: z.number().positive().describe('Child weight in kilograms')
    }),
    examples: {
      request: {
        medication: 'Iron',
        age: 5,
        weight: 18
      },
      response: {
        medicationInfo: {
          name: 'Iron Supplements (Ferrous Ascorbate / Sulfate)',
          category: 'Hematinic / Mineral Supplement',
          precautions: 'May cause dark stools. Administer on an empty stomach or with Vitamin C snack.',
          contraindications: 'Do not administer simultaneously with milk or calcium supplements.',
          nutritionInteractions: 'Dairy/milk blocks iron absorption. Vitamin C enhances absorption.',
          guidelineReference: 'WHO Pediatric Anemia Guidelines'
        },
        disclaimer: 'CLINICAL NOTICE: This information is for clinical reference only. Do NOT prescribe medication or calculate dosages without a licensed physician.'
      }
    }
  })
  async checkMedication(
    rawInput: {
      medication: string;
      age: number;
      weight: number;
    },
    ctx: ExecutionContext
  ) {
    const input = parseInput<typeof rawInput>(rawInput);
    ctx.logger.info(`[check_medication] Checking safety info for med="${input.medication}" age=${input.age}`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/medical/check-medication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        return data;
      }
      ctx.logger.warn(`[check_medication] Backend status ${response.status}`);
    } catch (error) {
      ctx.logger.error('[check_medication] Backend error', { error: error instanceof Error ? error.message : String(error) });
    }

    return {
      medicationInfo: {
        name: input.medication,
        category: 'Pediatric Supplement / Pharmaceutical',
        precautions: 'Verify dosing with pediatrician.',
        contraindications: 'Known drug hypersensitivity.',
        nutritionInteractions: 'Check specific food-drug interactions.',
        guidelineReference: 'Standard Pediatric Formulations'
      },
      disclaimer: 'CLINICAL NOTICE: For reference only. Do NOT prescribe medication or calculate dosages without a licensed physician.'
    };
  }

  /**
   * 5. generate_clinical_summary
   * Generate formal Doctor Summary and empathetic Parent Summary
   */
  @Tool({
    name: 'generate_clinical_summary',
    description: 'Generate a dual Doctor Summary and Parent Summary synthesizing child profile, symptoms, nutrition findings, and growth data.',
    inputSchema: z.object({
      childProfile: z.object({
        age: z.number().describe('Age in years'),
        gender: z.string().optional().describe('Gender'),
        weight: z.number().optional().describe('Weight in kg'),
        height: z.number().optional().describe('Height in cm')
      }),
      symptoms: z.array(z.string()).describe('List of reported symptoms'),
      nutritionFindings: z.any().optional().describe('Nutritional gaps or score summary'),
      growthFindings: z.any().optional().describe('Growth percentile or trajectory details')
    }),
    examples: {
      request: {
        childProfile: { age: 6, gender: 'male', weight: 19, height: 112 },
        symptoms: ['fatigue', 'pallor'],
        nutritionFindings: { ironGap: 'High', calciumGap: 'Low' },
        growthFindings: 'Height 25th percentile, Weight 30th percentile'
      },
      response: {
        doctorSummary: 'CLINICAL EVALUATION SUMMARY: 6-year-old male presenting with fatigue and pallor...',
        parentSummary: 'Hello! Here is a simple summary for your child\'s health check...',
        keyConcerns: ['Active symptom requiring observation: fatigue', 'Active symptom requiring observation: pallor'],
        recommendedFollowUp: [
          'Implement suggested dietary adjustments for 14 days.',
          'Schedule follow-up with a pediatrician if symptoms persist.'
        ]
      }
    }
  })
  async generateClinicalSummary(
    rawInput: {
      childProfile: { age: number; gender?: string; weight?: number; height?: number };
      symptoms: string[];
      nutritionFindings?: any;
      growthFindings?: any;
    },
    ctx: ExecutionContext
  ) {
    const input = parseInput<typeof rawInput>(rawInput);
    ctx.logger.info(`[generate_clinical_summary] Generating clinical summary for age=${input.childProfile?.age}`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/medical/generate-clinical-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        return data;
      }
      ctx.logger.warn(`[generate_clinical_summary] Backend status ${response.status}`);
    } catch (error) {
      ctx.logger.error('[generate_clinical_summary] Backend error', { error: error instanceof Error ? error.message : String(error) });
    }

    return {
      doctorSummary: `CLINICAL SUMMARY: Patient age ${input.childProfile?.age}. Symptoms: ${input.symptoms?.join(', ')}.`,
      parentSummary: `Simple Summary: Evaluating wellness for your ${input.childProfile?.age}-year-old child.`,
      keyConcerns: input.symptoms || [],
      recommendedFollowUp: ['Monitor child for 14 days and consult pediatrician if symptoms persist.']
    };
  }
}
