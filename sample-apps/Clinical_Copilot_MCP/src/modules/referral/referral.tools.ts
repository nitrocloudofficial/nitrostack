import { ControllerDecorator as Controller, ToolDecorator as Tool, Injectable, z, ExecutionContext } from '@nitrostack/core';
import { ReferralService } from '../../services/referral.service.js';

/**
 * Request DTO interface for generate_referral tool
 */
export interface GenerateReferralInput {
  patientId: string;
  trialId: string;
}

/**
 * Response DTO interface for generate_referral tool
 */
export interface GenerateReferralOutput {
  success: boolean;
  referralId: string;
  patientId: string;
  trialId: string;
  pdfUrl: string;
  llm: 'Gemini' | 'Grok' | 'Template';
}

/**
 * Clinical Copilot MCP Server - Referral Tools
 *
 * Implements the generate_referral MCP Tool:
 * 1. Reads patient profile, processed reports, and search history from MongoDB
 * 2. Fetches clinical trial details from ClinicalTrials.gov API v2
 * 3. Performs LLM reasoning for clinical summary and recommendation (Gemini -> Grok -> Template)
 * 4. Generates a styled PDF referral document
 * 5. Uploads the generated PDF to Supabase Storage ('referrals' bucket)
 * 6. Records referral metadata in MongoDB ('referrals' collection)
 * 7. Returns execution confirmation payload
 */
@Controller()
@Injectable({ deps: [ReferralService] })
export class ReferralTools {
  constructor(private readonly referralService: ReferralService) {}

  @Tool({
    name: 'generate_referral',
    description: 'Generates a professional Clinical Trial Referral PDF document with LLM reasoning (Gemini/Grok/Template), uploads to Supabase Storage, and logs metadata in MongoDB.',
    inputSchema: z.object({
      patientId: z.string().describe('Target patient identifier (e.g. PAT001)'),
      trialId: z.string().describe('Target clinical trial NCT ID (e.g. NCT01234567)'),
    }),
  })
  async generateReferral(
    input: GenerateReferralInput,
    ctx: ExecutionContext
  ): Promise<GenerateReferralOutput> {
    ctx.logger.info(`Executing generate_referral for patientId: '${input.patientId}', trialId: '${input.trialId}'`);

    try {
      const result = await this.referralService.generateReferral(input.patientId, input.trialId);
      ctx.logger.info(`Successfully generated referral '${result.referralId}' (LLM: ${result.llm})`);
      return result;
    } catch (err: any) {
      throw new Error(`Referral Generation Failed: ${err.message}`);
    }
  }
}
