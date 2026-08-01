/**
 * Recommend Department Prompt
 *
 * Asks the LLM to analyze flagged lab results and recommend which medical
 * department the patient should consult next. This is intended to replace
 * fixed panel-to-department mapping when a model-driven recommendation is
 * preferred.
 */

import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

interface PromptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class RecommendDepartmentPrompts {
  @Prompt({
    name: 'recommend_department',
    description: 'Recommend the most relevant medical department based on flagged lab results, using the lab values and triage severity. Do not name specific doctors yet.',
    arguments: [
      {
        name: 'flaggedJson',
        description: 'JSON string of the flagged array from flag_critical',
        required: true
      },
      {
        name: 'overallTriage',
        description: 'Overall triage level from flag_critical: NORMAL, BORDERLINE, or CRITICAL',
        required: true
      }
    ]
  })
  async recommendDepartment(
    args: { flaggedJson: string; overallTriage: string },
    ctx: ExecutionContext
  ): Promise<PromptMessage[]> {
    ctx.logger.info(`Building recommend_department prompt for overallTriage=${args.overallTriage}`);

    const flagged = JSON.parse(args.flaggedJson) as Array<{
      testName: string;
      value: number;
      unit: string;
      status: string;
      panel: string;
    }>;

    const resultLines = flagged
      .map((t) => `- ${t.testName}: ${t.value} ${t.unit} (${t.status}) [${t.panel}]`)
      .join('\n');

    const instructions = `You are helping triage lab results for a patient. Your job is to recommend the most relevant medical department(s) to consult next.

Overall triage level: ${args.overallTriage}

Flagged test results:
${resultLines}

Instructions:
- Analyze the abnormal results, especially BORDERLINE and CRITICAL values.
- Recommend only the medical department(s), not specific doctors.
- Keep the answer concise and practical.
- If multiple departments fit, list the primary one first and secondary ones after.
- If the overall triage is CRITICAL, prioritize the department that should be seen first.
- Do not mention exact doctor names.
- Do not invent diagnoses.

Return the recommendation in plain language, for example: "Primary department: Endocrinology. Also consider Nephrology."
`;

    return [
      {
        role: 'user',
        content: instructions
      }
    ];
  }
}