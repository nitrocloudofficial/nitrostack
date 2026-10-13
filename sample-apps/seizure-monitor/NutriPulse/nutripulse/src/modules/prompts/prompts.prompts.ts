import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class promptsPrompts {
  @Prompt({
    name: 'meal_decision_council',
    description: 'Resolve a meal decision narrated by a panel of specialists.',
    arguments: [
      { name: 'userId', description: 'The user ID.', required: true },
      { name: 'craving', description: 'Optional craving string or dish id.', required: false },
      { name: 'budget_override', description: 'Optional reason to override the budget constraint.', required: false }
    ]
  })
  async mealDecisionCouncil(args: Record<string, unknown>, context: ExecutionContext) {
    const cravingArg = args.craving ? `craving=${args.craving}` : '';
    const budgetArg = args.budget_override ? `budget_override=${args.budget_override}` : '';
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please resolve my meal recommendation using the resolve_recommendation tool.
Pass userId=${args.userId}, ${cravingArg} ${budgetArg}.

Do NOT call any other tools like compute_nutritional_envelope or check_meal_safety. Call resolve_recommendation ONCE and ONLY ONCE.

When you receive the result, narrate it as a panel of three specialists reviewing my case:
1. The Clinical Advisor: State the hard constraints and why they matter, citing the rules and real values from the envelope and carried_warns.
2. The Culinary Advisor: Speak to taste fit, cuisine, texture, and craving satisfaction based on the contextual and craving scores.
3. The Financial Advisor: State my budget position and the exact rupee figures.

Then present the Resolution:
- Announce the winning dish.
- Critically: read out the conflict_log. Name exactly what was sacrificed, in real units, and which alternative lost and why.
- If dropped_for_safety is non-empty, state plainly which dishes were removed and which specific rule removed them. Never hide a block.
- Never override or argue with a BLOCK verdict.`
          }
        }
      ]
    };
  }

  @Prompt({
    name: 'craving_negotiation',
    description: 'Negotiate a craving by finding healthier swaps.',
    arguments: [
      { name: 'userId', description: 'The user ID.', required: true },
      { name: 'craved_item', description: 'The craved dish or item.', required: true }
    ]
  })
  async cravingNegotiation(args: Record<string, unknown>, context: ExecutionContext) {
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `I am craving ${args.craved_item}. Please help me negotiate this craving. (My userId is ${args.userId}).

Call find_healthier_alternatives ONCE.
Report the craved item's own safety verdict FIRST.
Then present the healthier alternatives with their nutritional delta tables and sensory rationale. Frame this as a swap, never a refusal.`
          }
        }
      ]
    };
  }

  @Prompt({
    name: 'daily_briefing',
    description: 'Summarize the user\'s daily biometric state and remaining allowances.',
    arguments: [
      { name: 'userId', description: 'The user ID.', required: true }
    ]
  })
  async dailyBriefing(args: Record<string, unknown>, context: ExecutionContext) {
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please give me my daily briefing for userId=${args.userId}.

Read the resources telemetry://${args.userId}/today and intake://${args.userId}/today.
Then call the compute_nutritional_envelope tool.
Summarise my day's biometric state and my remaining headroom.`
          }
        }
      ]
    };
  }
}
