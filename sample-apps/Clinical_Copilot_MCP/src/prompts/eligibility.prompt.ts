import { Injectable, PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * Clinical Copilot MCP Server - Trial Eligibility Prompts
 *
 * Exposes prompt templates for evaluating patient eligibility against trial inclusion/exclusion criteria.
 */
@Injectable()
export class EligibilityPrompts {
  @Prompt({
    name: 'trial_eligibility_evaluation',
    description: 'Generates a prompt template for AI assessment of clinical trial inclusion and exclusion criteria.',
    arguments: [
      { name: 'patientId', description: 'Unique patient ID', required: true },
      { name: 'nctId', description: 'ClinicalTrials.gov NCT identifier', required: true },
    ],
  })
  async getEligibilityPrompt(args: { patientId: string; nctId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Building trial eligibility prompt for patient ${args.patientId} on NCT ${args.nctId}`);
    return {
      messages: [
        {
          role: 'system',
          content: 'You are a clinical trials matching specialist. Compare the patient data against inclusion and exclusion criteria of the study protocol. Provide a matching score (0-100%) and list satisfied or unsatisfied criteria.',
        },
        {
          role: 'user',
          content: `Evaluate eligibility for Patient ID: ${args.patientId} against Clinical Trial NCT ID: ${args.nctId}.`,
        },
      ],
    };
  }
}
