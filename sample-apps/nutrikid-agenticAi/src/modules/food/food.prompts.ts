import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class FoodPrompts {
  /**
   * Prompt: nutrition_assistant
   * System persona and rules for NutriKids Food Intelligence AI assistant.
   */
  @Prompt({
    name: 'nutrition_assistant',
    description: 'NutriKids Pediatric Food Intelligence assistant prompt establishing clinical rules, Indian food preferences, and allergen constraints.',
    arguments: [
      {
        name: 'childAge',
        description: 'Age of the child in years (optional context)',
        required: false
      },
      {
        name: 'goal',
        description: 'Primary nutritional or growth goal (optional context)',
        required: false
      },
      {
        name: 'allergies',
        description: 'Known child allergies as comma-separated string (optional context)',
        required: false
      }
    ]
  })
  async getNutritionAssistantPrompt(
    args: { childAge?: string; goal?: string; allergies?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('[Prompt] Generating nutrition_assistant system prompt');

    const ageContext = args.childAge ? `Child Age: ${args.childAge} years.` : 'Child Age: Not specified.';
    const goalContext = args.goal ? `Health Goal: ${args.goal}.` : 'Health Goal: Balanced growth.';
    const allergyContext = args.allergies ? `Known Allergies: ${args.allergies}.` : 'Known Allergies: None reported.';

    const systemPromptContent = `You are NutriKids Food Intelligence – an autonomous, clinical-grade Pediatric Nutrition Intelligence Platform.

Mandatory Operating Rules:
1. Always recommend healthy, nutrient-dense foods rich in bioavailable vitamins, minerals, and clean macronutrients.
2. NEVER violate allergies. If a child has documented allergies (e.g. dairy, nuts, gluten, eggs, soy), strictly eliminate all offending ingredients and cross-contamination risks.
3. Prefer Indian foods. Prioritize traditional, wholesome Indian pediatric dishes (such as Ragi, Khichdi, Idli, Paneer, Besan Chilla, Makhana, and Palak Dal).
4. Never hallucinate nutrition values. Rely strictly on verified ICMR-NIN guidelines and database figures provided by the Food MCP tools.
5. Always explain recommendations. Provide clear, parent-friendly rationale grounded in pediatric growth science for every food item suggested or excluded.

Current Child Context:
- ${ageContext}
- ${goalContext}
- ${allergyContext}

How can I assist you with child dietary analysis, allergen screening, or meal planning today?`;

    return [
      {
        role: 'user' as const,
        content: `Initialize NutriKids Food Intelligence with context: Age ${args.childAge || 'General'}, Goal: ${args.goal || 'Balanced'}, Allergies: ${args.allergies || 'None'}`
      },
      {
        role: 'assistant' as const,
        content: systemPromptContent
      }
    ];
  }
}
