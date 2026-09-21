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

export class GrowthTools {
  /**
   * 1. calculate_bmi
   * Calculate pediatric Body Mass Index (BMI)
   */
  @Tool({
    name: 'calculate_bmi',
    description: 'Calculate pediatric Body Mass Index (BMI) based on weight (kg) and height (cm).',
    inputSchema: z.object({
      height: z.number().positive().describe('Child height in centimeters'),
      weight: z.number().positive().describe('Child weight in kilograms')
    }),
    examples: {
      request: { height: 110, weight: 18 },
      response: {
        heightCm: 110,
        weightKg: 18,
        bmi: 14.88,
        category: 'Healthy weight'
      }
    }
  })
  async calculateBmi(rawInput: { height: number; weight: number }, ctx: ExecutionContext) {
    const input = parseInput<typeof rawInput>(rawInput);
    ctx.logger.info(`[calculate_bmi] Querying backend for height=${input.height}, weight=${input.weight}`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/growth/calculate-bmi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        return data;
      }
      ctx.logger.warn(`[calculate_bmi] Backend status ${response.status}: ${data.message || data.error}`);
      return data;
    } catch (error) {
      ctx.logger.error('[calculate_bmi] Backend error', { error: error instanceof Error ? error.message : String(error) });
      return { error: 'Backend unreachable', message: `Backend server at ${BACKEND_URL} is unreachable.` };
    }
  }

  /**
   * 2. calculate_percentile
   * Calculate WHO Growth Percentiles & Z-Scores
   */
  @Tool({
    name: 'calculate_percentile',
    description: 'Calculate WHO Growth Percentiles (Height, Weight, BMI) and Z-score for pediatric assessment.',
    inputSchema: z.object({
      age: z.number().min(0).max(18).describe('Child age in years'),
      gender: z.enum(['male', 'female', 'other']).describe('Child gender'),
      height: z.number().positive().describe('Height in cm'),
      weight: z.number().positive().describe('Weight in kg')
    }),
    examples: {
      request: { age: 5, gender: 'male', height: 110, weight: 18 },
      response: {
        bmi: 14.88,
        bmiPercentile: 50.0,
        heightPercentile: 50.0,
        weightPercentile: 50.0,
        zScore: -0.28,
        bmiStatus: 'Healthy weight'
      }
    }
  })
  async calculatePercentile(
    rawInput: { age: number; gender: 'male' | 'female' | 'other'; height: number; weight: number },
    ctx: ExecutionContext
  ) {
    const input = parseInput<typeof rawInput>(rawInput);
    ctx.logger.info(`[calculate_percentile] Querying backend percentiles for age=${input.age}, gender=${input.gender}`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/growth/calculate-percentile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        return data;
      }
      ctx.logger.warn(`[calculate_percentile] Backend status ${response.status}`);
      return data;
    } catch (error) {
      ctx.logger.error('[calculate_percentile] Backend error', { error: error instanceof Error ? error.message : String(error) });
      return { error: 'Backend unreachable', message: `Backend server at ${BACKEND_URL} is unreachable.` };
    }
  }

  /**
   * 3. growth_velocity
   * Calculate Annualized Growth Velocity
   */
  @Tool({
    name: 'growth_velocity',
    description: 'Calculate annualized height growth velocity (cm/year) and compare against WHO age-specific benchmarks.',
    inputSchema: z.object({
      age: z.number().min(0).max(18).describe('Child age in years'),
      currentHeight: z.number().positive().describe('Current height in cm'),
      previousHeight: z.number().positive().describe('Previous height in cm'),
      durationMonths: z.number().positive().optional().default(12).describe('Time elapsed between measurements in months')
    }),
    examples: {
      request: { age: 6, currentHeight: 115, previousHeight: 109, durationMonths: 12 },
      response: {
        annualVelocityCmPerYear: 6.0,
        heightGainCm: 6.0,
        durationMonths: 12,
        expectedVelocity: '5.0 - 6.0 cm/year',
        velocityStatus: 'Normal growth velocity'
      }
    }
  })
  async growthVelocity(
    rawInput: { age: number; currentHeight: number; previousHeight: number; durationMonths?: number },
    ctx: ExecutionContext
  ) {
    const input = parseInput<typeof rawInput>(rawInput);
    ctx.logger.info(`[growth_velocity] Calculating growth velocity for age=${input.age}`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/growth/growth-velocity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        return data;
      }
      ctx.logger.warn(`[growth_velocity] Backend status ${response.status}`);
      return data;
    } catch (error) {
      ctx.logger.error('[growth_velocity] Backend error', { error: error instanceof Error ? error.message : String(error) });
      return { error: 'Backend unreachable', message: `Backend server at ${BACKEND_URL} is unreachable.` };
    }
  }

  /**
   * 4. predict_growth
   * Predict Future Height & Weight Trajectory
   */
  @Tool({
    name: 'predict_growth',
    description: 'Predict future height and weight trajectory up to target age based on WHO growth curves.',
    inputSchema: z.object({
      age: z.number().min(0).max(18).describe('Current child age in years'),
      gender: z.enum(['male', 'female', 'other']).describe('Child gender'),
      height: z.number().positive().describe('Current height in cm'),
      weight: z.number().positive().describe('Current weight in kg'),
      targetAge: z.number().min(1).max(18).optional().default(18).describe('Target age for prediction in years')
    }),
    examples: {
      request: { age: 7, gender: 'male', height: 120, weight: 22, targetAge: 18 },
      response: {
        currentAge: 7,
        targetAge: 18,
        yearsDifference: 11,
        predictedMeasurements: { heightCm: 180.5, weightKg: 60.5, bmi: 18.59 },
        confidenceScore: 0.88
      }
    }
  })
  async predictGrowth(
    rawInput: { age: number; gender: 'male' | 'female' | 'other'; height: number; weight: number; targetAge?: number },
    ctx: ExecutionContext
  ) {
    const input = parseInput<typeof rawInput>(rawInput);
    ctx.logger.info(`[predict_growth] Predicting growth trajectory for age=${input.age} -> targetAge=${input.targetAge || 18}`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/growth/predict-growth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        return data;
      }
      ctx.logger.warn(`[predict_growth] Backend status ${response.status}`);
      return data;
    } catch (error) {
      ctx.logger.error('[predict_growth] Backend error', { error: error instanceof Error ? error.message : String(error) });
      return { error: 'Backend unreachable', message: `Backend server at ${BACKEND_URL} is unreachable.` };
    }
  }

  /**
   * 5. growth_risk
   * Evaluate Stunting, Wasting, and Pediatric Growth Risk
   */
  @Tool({
    name: 'growth_risk',
    description: 'Evaluate pediatric growth risk score, stunting status, wasting status, and clinical risk factors.',
    inputSchema: z.object({
      age: z.number().min(0).max(18).describe('Child age in years'),
      gender: z.enum(['male', 'female', 'other']).describe('Child gender'),
      height: z.number().positive().describe('Height in cm'),
      weight: z.number().positive().describe('Weight in kg'),
      symptoms: z.array(z.string()).optional().default([]).describe('Optional reported symptoms or concerns')
    }),
    examples: {
      request: { age: 5, gender: 'male', height: 95, weight: 13, symptoms: ['poor growth'] },
      response: {
        growthRiskScore: 45,
        overallRisk: 'High Risk',
        statureStatus: 'Severely Stunted',
        bmiStatus: 'Underweight',
        riskFactors: ['Height below 3rd WHO percentile (Stunting)', 'BMI below healthy 5th WHO percentile (Wasting)'],
        recommendations: ['Consult pediatrician for detailed stunting evaluation.']
      }
    }
  })
  async growthRisk(
    rawInput: { age: number; gender: 'male' | 'female' | 'other'; height: number; weight: number; symptoms?: string[] },
    ctx: ExecutionContext
  ) {
    const input = parseInput<typeof rawInput>(rawInput);
    ctx.logger.info(`[growth_risk] Evaluating growth risk for age=${input.age}, height=${input.height}, weight=${input.weight}`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/growth/growth-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        return data;
      }
      ctx.logger.warn(`[growth_risk] Backend status ${response.status}`);
      return data;
    } catch (error) {
      ctx.logger.error('[growth_risk] Backend error', { error: error instanceof Error ? error.message : String(error) });
      return { error: 'Backend unreachable', message: `Backend server at ${BACKEND_URL} is unreachable.` };
    }
  }
}
