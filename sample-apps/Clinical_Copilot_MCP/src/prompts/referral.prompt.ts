import { Injectable, PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * Clinical Copilot MCP Server - Referral Prompts
 *
 * Exposes prompt templates for drafting formal specialist referral letters.
 */
@Injectable()
export class ReferralPrompts {
  @Prompt({
    name: 'specialist_referral_letter',
    description: 'Generates a prompt template for drafting clinical specialist referral letters.',
    arguments: [
      { name: 'patientId', description: 'Unique patient ID', required: true },
      { name: 'specialty', description: 'Target specialty (e.g. Cardiology, Neurology)', required: true },
      { name: 'clinicalReason', description: 'Primary reason for specialist referral', required: true },
    ],
  })
  async getReferralPrompt(args: { patientId: string; specialty: string; clinicalReason: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Building referral prompt for patient ${args.patientId} to ${args.specialty}`);
    return {
      messages: [
        {
          role: 'system',
          content: 'You are a clinical documentation specialist. Draft a clear, professional, HIPAA-compliant specialist referral letter detailing patient history, reason for consult, and relevant lab/imaging findings.',
        },
        {
          role: 'user',
          content: `Draft a formal ${args.specialty} referral letter for Patient ID: ${args.patientId}.\nReason for referral: ${args.clinicalReason}`,
        },
      ],
    };
  }
}
