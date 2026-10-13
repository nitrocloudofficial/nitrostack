/**
 * Explain Triage Prompt
 *
 * Produces a calm, plain-language, non-alarming explanation of a patient's
 * flagged lab results and why the overall triage level matters.
 * Never phrases anything as a diagnosis — always closes by recommending
 * the patient discuss the results with a doctor.
 */

import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

interface PromptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class ExplainTriagePrompts {
  @Prompt({
    name: 'explain_triage',
    description: 'Generate a calm, plain-language explanation of flagged lab results and the overall triage level, for a patient with no medical background. Never states a diagnosis.',
    arguments: [
      {
        name: 'flaggedJson',
        description: 'JSON string of the flagged array from flag_critical (each item has testName, value, unit, status, panel)',
        required: true
      },
      {
        name: 'overallTriage',
        description: 'Overall triage level from flag_critical: NORMAL, BORDERLINE, or CRITICAL',
        required: true
      },
      {
        name: 'language',
        description: 'Language for the explanation, e.g. "English", "Hindi", "Tamil". Defaults to English if omitted.',
        required: false
      }
    ]
  })
  async explainTriage(
    args: { flaggedJson: string; overallTriage: string; language?: string },
    ctx: ExecutionContext
  ): Promise<PromptMessage[]> {
    const language = args.language?.trim() || 'English';
    ctx.logger.info(`Building explain_triage prompt for overallTriage=${args.overallTriage} in ${language}`);

    const flagged = JSON.parse(args.flaggedJson);

    const resultLines = flagged
      .map((t: { testName: string; value: number; unit: string; status: string }) =>
        `- ${t.testName}: ${t.value} ${t.unit} (${t.status})`
      )
      .join('\n');

    const instructions = `You are explaining lab report results to a patient in a low-resource setting who has no medical background and may be anxious about receiving results with no context.

Overall triage level: ${args.overallTriage}

Flagged test results:
${resultLines}

Write a calm, plain-language explanation, entirely in ${language}, that:
- Uses simple, everyday words, avoiding medical jargon (explain any term you must use).
- Explains what each abnormal result generally relates to in the body, without alarming language.
- Explains why the overall triage level (${args.overallTriage}) matters in practical terms (e.g., how soon to seek care), without exaggerating risk.
- Never states or implies a diagnosis, and never says what disease or condition the patient has.
- Stays reassuring and factual — no dramatic or frightening phrasing.
- Ends with a clear, standalone line, also in ${language}, recommending the patient discuss these results with a doctor.

If ${language} is not English, write the entire explanation in ${language} — do not mix in English sentences.`;

    return [
      {
        role: 'user',
        content: instructions
      }
    ];
  }
}
