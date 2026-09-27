/**
 * HealthPass Lite Prompts
 * 
 * Reusable prompt templates:
 * - explain-lab-report — Rewrite lab reports in patient-friendly language
 */

import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class HealthPassPrompts {
  /**
   * Explain Lab Report Prompt
   * Takes a lab report and rewrites it in plain, patient-friendly language
   * Explicitly avoids diagnosis and recommends professional consultation
   */
  @Prompt({
    name: 'explain-lab-report',
    description: 'Rewrite a lab report in plain, patient-friendly language without diagnosis. Always recommend consulting a doctor for interpretation.',
    arguments: [
      {
        name: 'testName',
        description: 'Name of the lab test (e.g., "Blood Glucose")',
        required: true
      },
      {
        name: 'result',
        description: 'The test result value',
        required: true
      },
      {
        name: 'unit',
        description: 'Unit of measurement (e.g., "mg/dL")',
        required: true
      },
      {
        name: 'normalRange',
        description: 'Normal range as a string (e.g., "70-100 mg/dL")',
        required: true
      },
      {
        name: 'isAbnormal',
        description: 'Whether the result is outside normal range (true/false)',
        required: true
      },
      {
        name: 'notes',
        description: 'Optional clinical notes',
        required: false
      }
    ]
  })
  async explainLabReport(
    input: {
      testName: string;
      result: string | number;
      unit: string;
      normalRange: string;
      isAbnormal: string | boolean;
      notes?: string;
    },
    ctx: ExecutionContext
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const testName = input.testName || 'Unknown Test';
    const result = input.result;
    const unit = input.unit || '';
    const normalRange = input.normalRange || 'Not specified';
    const isAbnormal = String(input.isAbnormal).toLowerCase() === 'true';
    const notes = input.notes || '';

    ctx.logger.info(`Explaining lab report: ${testName}`);

    // Build plain-language explanation
    let explanation = `## ${testName}\n\n`;
    explanation += `**Your Result:** ${result} ${unit}\n`;
    explanation += `**Normal Range:** ${normalRange}\n\n`;

    if (isAbnormal) {
      explanation += `**Status:** Your result is outside the normal range.\n\n`;
      explanation += `This means your test value is higher or lower than what is typically considered normal. `;
      explanation += `However, this does not necessarily indicate a problem — many factors can affect test results, `;
      explanation += `and a single abnormal result may not be significant.\n\n`;
    } else {
      explanation += `**Status:** Your result is within the normal range.\n\n`;
      explanation += `This is a good sign and suggests this particular measure is healthy.\n\n`;
    }

    if (notes) {
      explanation += `**Additional Notes:** ${notes}\n\n`;
    }

    explanation += `## Important\n\n`;
    explanation += `**Please consult your doctor for a complete interpretation of this result.** `;
    explanation += `Your doctor can explain what this result means for your health, consider it alongside other tests and your medical history, `;
    explanation += `and recommend any necessary follow-up or treatment. Do not attempt to self-diagnose or self-treat based on this information alone.\n`;

    ctx.logger.info(`Lab report explanation generated for ${testName}`);

    return {
      content: [
        {
          type: 'text',
          text: explanation
        }
      ]
    };
  }
}
