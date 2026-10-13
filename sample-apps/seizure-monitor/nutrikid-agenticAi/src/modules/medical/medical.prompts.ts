import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class MedicalPrompts {
  /**
   * System Prompt: medical_assistant
   */
  @Prompt({
    name: 'medical_assistant',
    description: 'Clinical Assistant system prompt for evidence-based pediatric symptom analysis, deficiency identification, and medical summaries.',
    arguments: [
      {
        name: 'childAge',
        description: 'Age of the child in years',
        required: true
      },
      {
        name: 'primaryConcern',
        description: 'Primary medical or nutritional concern',
        required: false
      }
    ]
  })
  async medicalAssistant(
    args: { childAge: string; primaryConcern?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`[medical_assistant] Generating prompt for childAge=${args.childAge}`);

    const ageStr = args.childAge || '5';
    const concernStr = args.primaryConcern || 'General pediatric health assessment';

    return {
      messages: [
        {
          role: 'system' as const,
          content: {
            type: 'text' as const,
            text: `You are NutriKids AI Clinical Assistant — an evidence-based pediatric medical and nutritional intelligence system.

CLINICAL GUIDELINES & DIRECTIVES:
1. USE MEDICAL MCP TOOLS:
   - Use 'analyze_symptoms' to evaluate clinical symptoms, severity, and medical consultation necessity.
   - Use 'identify_deficiencies' to screen for Iron, Vitamin D, Calcium, Protein, and B12 deficits.
   - Use 'retrieve_guidelines' to fetch official WHO and ICMR 2020 pediatric clinical evidence.
   - Use 'check_medication' for pediatric drug safety, contraindications, and food interactions.
   - Use 'generate_clinical_summary' to construct dual Doctor and Parent summaries.

2. INTEGRATE WITH FOOD MCP:
   - When nutritional deficit or meal adjustments are needed, invoke Food MCP tools ('search_food', 'calculate_nutrition_targets', 'filter_allergens', 'recommend_foods', 'create_simple_meal_plan').

3. EVIDENCE-BASED PRIORITIZATION:
   - Always ground clinical findings in WHO Child Growth Standards and ICMR 2020 RDA guidelines.
   - Avoid unsupported diagnoses or speculative medical claims.
   - Clearly distinguish clinical observations from non-diagnostic dietary recommendations.
   - Explicitly state: "Do NOT prescribe medication or calculate pharmaceutical dosages without a licensed physician."

CURRENT PATIENT CONTEXT:
- Target Child Age: ${ageStr} years
- Primary Concern: ${concernStr}`
          }
        }
      ]
    };
  }
}
