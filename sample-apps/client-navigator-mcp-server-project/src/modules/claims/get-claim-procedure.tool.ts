/**
 * TOOL 2: get_claim_procedure
 * 
 * Registry lookup by institution type.
 * Returns ordered steps, documents required, form names, portal URL, typical duration, statutory deadline, contact hint, source, asOfDate, confidence.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { getInstitutionByType } from '../../fixtures/institution-registry.js';

const GetClaimProcedureInputSchema = z.object({
  institutionType: z.enum([
    'bank',
    'cooperative_bank',
    'lic',
    'life_insurance',
    'epfo',
    'epf',
    'depository',
    'demat',
    'mutual_fund',
    'post_office',
    'nps',
    'iepf',
    'land_records',
  ]),
  hasNominee: z.boolean(),
  isCooperativeBank: z.boolean().optional(),
});

export interface GetClaimProcedureOutput {
  institutionName: string;
  orderedSteps: string[];
  documentsRequired: string[];
  formNames: string[];
  portalUrl: string | null;
  typicalDurationDays: { min: number; max: number };
  statutoryDeadlineDays: number | null;
  contactHint: string;
  source: string;
  asOfDate: string;
  confidence: 'regulatory' | 'institution_policy' | 'estimate';
}

export class GetClaimProcedureTool {
  @Tool({
    name: 'get_claim_procedure',
    description:
      'Returns the step-by-step procedure for claiming an asset from a specific institution. Includes required documents, form names, portal URL, typical duration, and statutory deadline if applicable.',
    inputSchema: GetClaimProcedureInputSchema,
  })
  async execute(
    input: z.infer<typeof GetClaimProcedureInputSchema>,
    ctx: ExecutionContext
  ): Promise<GetClaimProcedureOutput> {
    const { institutionType, hasNominee } = input;

    const institution = getInstitutionByType(institutionType);
    if (!institution) {
      throw new Error(`Unknown institution type: ${institutionType}`);
    }

    // Build ordered steps based on nominee status
    const orderedSteps = hasNominee
      ? [
          '1. Obtain death certificate (multiple copies)',
          '2. Gather nominee ID proof',
          '3. Complete claim form (available from institution)',
          '4. Submit claim form + death certificate + ID proof to institution',
          '5. Institution verifies documents',
          '6. Institution releases funds to nominee',
        ]
      : [
          '1. Obtain death certificate (multiple copies)',
          '2. Obtain legal heir certificate or succession certificate (if required)',
          '3. Gather ID proof of claimant',
          '4. Complete claim form (available from institution)',
          '5. Submit claim form + death certificate + legal heir certificate + ID proof to institution',
          '6. Institution verifies documents',
          '7. Institution releases funds to legal heir',
        ];

    // Build documents required
    const documentsRequired = hasNominee
      ? [
          'Death certificate (original + 2–3 copies)',
          'Nominee ID proof (Aadhaar, PAN, Passport, Voter ID)',
          'Claim form (from institution)',
          'Passbook or account statement (if applicable)',
        ]
      : [
          'Death certificate (original + 2–3 copies)',
          'Legal heir certificate or succession certificate',
          'Claimant ID proof (Aadhaar, PAN, Passport, Voter ID)',
          'Claim form (from institution)',
          'Passbook or account statement (if applicable)',
          'No-objection letter from other heirs (if applicable)',
        ];

    // Build form names
    const formNames: string[] = [];
    if (input.institutionType === 'epfo' || input.institutionType === 'epf') {
      formNames.push('EPFO Form 20 (Nomination)', 'EPFO Form 10D (Claim)');
    } else if (institutionType === 'iepf') {
      formNames.push('IEPF Claim Form');
    } else {
      formNames.push('Claim Form (institution-specific)');
    }

    return {
      institutionName: institution.name,
      orderedSteps,
      documentsRequired,
      formNames,
      portalUrl: institution.claimPortal,
      typicalDurationDays: institution.typicalDurationDays,
      statutoryDeadlineDays: institution.statutoryDeadlineDays,
      contactHint: `Contact the ${institution.name} customer service or visit their website for claim forms and portal access.`,
      source: institution.source,
      asOfDate: institution.asOfDate,
      confidence: institution.confidence,
    };
  }
}
