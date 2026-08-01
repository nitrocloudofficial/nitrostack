/**
 * Explain Recommendation Prompt
 *
 * Produces a calm, plain-language explanation of which doctor(s) a patient
 * should see and why, based on suggest_doctor's decisions. Never phrases
 * anything as a diagnosis — always closes by recommending the patient
 * follow through on the booking.
 */

import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

interface PromptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class ExplainRecommendationPrompts {
  @Prompt({
    name: 'explain_recommendation',
    description: 'Generate a calm, plain-language explanation of which doctor(s) to see and why, for a patient with no medical background. Never states a diagnosis.',
    arguments: [
      {
        name: 'decisionsJson',
        description: 'JSON string of the decisions array from suggest_doctor (or check_existing_doctor)',
        required: true
      },
      {
        name: 'contextSummary',
        description: 'Optional one-line patient context summary from patient_context, for personalizing the explanation',
        required: false
      },
      {
        name: 'language',
        description: 'Language for the explanation, e.g. "English", "Hindi", "Tamil". Defaults to English if omitted.',
        required: false
      }
    ]
  })
  async explainRecommendation(
    args: { decisionsJson: string; contextSummary?: string; language?: string },
    ctx: ExecutionContext
  ): Promise<PromptMessage[]> {
    const language = args.language?.trim() || 'English';
    ctx.logger.info(`Building explain_recommendation prompt in ${language}`);

    const decisions = JSON.parse(args.decisionsJson);

    const decisionLines = decisions
      .map((d: { specialist: string; urgency: string; reason: string; action: string; existingDoctorName?: string }) =>
        d.action === 'CONTINUE_WITH_DOCTOR'
          ? `- ${d.specialist} (${d.urgency}): continue with existing doctor ${d.existingDoctorName ?? ''} — ${d.reason}`
          : `- ${d.specialist} (${d.urgency}): book a new specialist — ${d.reason}`
      )
      .join('\n');

    const contextLine = args.contextSummary ? `Patient context: ${args.contextSummary}\n\n` : '';

    const instructions = `You are explaining a specialist recommendation to a patient in a low-resource setting who has no medical background and may be anxious about needing to see a specialist.

${contextLine}Recommendations:
${decisionLines}

Write a calm, plain-language explanation, entirely in ${language}, that:
- Uses simple, everyday words, avoiding medical jargon (explain any term you must use).
- For each recommendation, clearly states whether to continue with their existing doctor or book a new specialist, and why, in practical terms (how soon to go).
- Never states or implies a diagnosis, and never says what disease or condition the patient has.
- Stays reassuring and factual — no dramatic or frightening phrasing.
- Ends with a clear, standalone line, also in ${language}, encouraging the patient to follow through on the recommended booking.

If ${language} is not English, write the entire explanation in ${language} — do not mix in English sentences.`;

    return [
      {
        role: 'user',
        content: instructions
      }
    ];
  }
}
