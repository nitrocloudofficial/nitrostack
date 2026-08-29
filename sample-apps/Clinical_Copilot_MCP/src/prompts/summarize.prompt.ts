import { Injectable, PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * Clinical Copilot MCP Server - Patient Summarization Prompts
 *
 * Exposes reusable prompt templates for synthesizing electronic health records (EHR).
 */
@Injectable()
export class SummarizePrompts {
  @Prompt({
    name: 'patient_summary',
    description: 'Generates a structured prompt template for clinical patient record summarization.',
    arguments: [
      { name: 'patientId', description: 'Unique patient identifier (MRN or UUID)', required: true },
      { name: 'focusArea', description: 'Optional medical specialty focus area', required: false },
    ],
  })
  async getSummarizePrompt(args: { patientId: string; focusArea?: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Building patient summary prompt for patient: ${args.patientId}`);
    return {
      messages: [
        {
          role: 'system',
          content: 'You are an expert clinical AI assistant. Summarize the patient medical record accurately, emphasizing active diagnoses, abnormal lab values, vital trends, and current medications.',
        },
        {
          role: 'user',
          content: `Please synthesize the complete clinical summary for Patient ID: ${args.patientId}.${args.focusArea ? ` Focus specifically on: ${args.focusArea}.` : ''}`,
        },
      ],
    };
  }
}
