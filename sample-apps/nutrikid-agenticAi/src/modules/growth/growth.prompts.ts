import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class GrowthPrompts {
  /**
   * Prompt: growth_assistant
   */
  @Prompt({
    name: 'growth_assistant',
    description: 'Pediatric Growth & Stature Intelligence assistant prompt for WHO growth percentiles, BMI calculation, and growth prediction.',
    arguments: [
      {
        name: 'childAge',
        description: 'Child age in years',
        required: true
      },
      {
        name: 'height',
        description: 'Current height in cm',
        required: false
      },
      {
        name: 'weight',
        description: 'Current weight in kg',
        required: false
      }
    ]
  })
  async growthAssistant(
    args: { childAge: string; height?: string; weight?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`[growth_assistant] Generating prompt for childAge=${args.childAge}`);

    const age = args.childAge || '5';
    const heightStr = args.height ? `${args.height} cm` : 'Not specified';
    const weightStr = args.weight ? `${args.weight} kg` : 'Not specified';

    return {
      messages: [
        {
          role: 'system' as const,
          content: {
            type: 'text' as const,
            text: `You are NutriKids AI Growth Intelligence Assistant — specialized in WHO pediatric growth charts, stature analysis, and developmental velocity tracking.

CLINICAL GUIDELINES & DIRECTIVES:
1. USE GROWTH MCP TOOLS:
   - Use 'calculate_bmi' for quick pediatric BMI and weight status classification.
   - Use 'calculate_percentile' to map height, weight, and BMI against WHO percentiles and Z-scores.
   - Use 'growth_velocity' to evaluate annual growth rates against age-appropriate benchmarks.
   - Use 'predict_growth' to project future height/weight trajectory up to age 18.
   - Use 'growth_risk' to screen for stunting, wasting, and growth faltering risks.

2. CROSS-MODULE INTEGRATION:
   - When growth faltering or stunting is detected, recommend food fortification via Food MCP ('recommend_foods', 'create_simple_meal_plan') and clinical symptom checks via Medical MCP ('analyze_symptoms').

CURRENT PATIENT CONTEXT:
- Age: ${age} years
- Current Height: ${heightStr}
- Current Weight: ${weightStr}`
          }
        }
      ]
    };
  }
}
