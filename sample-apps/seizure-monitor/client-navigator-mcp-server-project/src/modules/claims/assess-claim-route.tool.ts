/**
 * TOOL 1: assess_claim_route
 * 
 * Deterministic 6-step cascade to determine the legal route for claiming an asset.
 * No LLM delegation. Identical inputs always produce identical output.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import {
  R1_NOMINEE_CLAIM,
  R2_SIMPLIFIED_PROCEDURE,
  R3_ABOVE_THRESHOLD,
  R4_SETTLEMENT_TIMELINE,
  NOMINEE_CUSTODIAN_RULE,
  getCourtFeeForState,
  getThresholdForAsset,
} from '../../fixtures/regulatory-rules.js';

const AssessClaimRouteInputSchema = z.object({
  assetType: z.enum([
    'bank_savings',
    'bank_fd',
    'life_insurance',
    'epf',
    'demat_shares',
    'mutual_fund',
    'post_office',
    'nps',
  ]),
  assetValueInr: z.number().positive(),
  hasWill: z.boolean(),
  nomineeStatus: z.enum(['valid', 'none', 'predeceased', 'minor']),
  isCooperativeBank: z.boolean().default(false),
  stateCode: z.string().optional(),
  claimantRelationship: z.enum(['spouse', 'son', 'daughter', 'mother', 'father', 'other']),
  religion: z.enum(['hindu', 'christian', 'parsi', 'other']),
  isDisputed: z.boolean().default(false),
});

export interface AssessClaimRouteOutput {
  route: string;
  reasoning: string;
  estimatedDays: { min: number; max: number };
  estimatedCostInr: { min: number; max: number };
  legalBasis: string;
  confidence: 'regulatory' | 'institution_policy' | 'estimate';
  sourceNote: string;
  requiresLegalAdvice: boolean;
  verificationNote: string;
  nomineeCustodianWarning: boolean;
}

export class AssessClaimRouteTool {
  @Tool({
    name: 'assess_claim_route',
    description:
      'Determines the legal route for claiming a deceased person\'s asset. Evaluates religion, dispute status, will, nominee status, asset type, and value to return the required procedure, estimated timeline, cost, and confidence level. Deterministic: identical inputs always produce identical output. No LLM delegation.',
    inputSchema: AssessClaimRouteInputSchema,
  })
  async execute(
    input: z.infer<typeof AssessClaimRouteInputSchema>,
    ctx: ExecutionContext
  ): Promise<AssessClaimRouteOutput> {
    const {
      assetType,
      assetValueInr,
      hasWill,
      nomineeStatus,
      isCooperativeBank,
      stateCode,
      claimantRelationship,
      religion,
      isDisputed,
    } = input;

    // STEP 1: Religion check
    if (religion === 'other') {
      return {
        route: 'OUT_OF_SCOPE',
        reasoning:
          'This server covers only the Hindu Succession Act 1956 and Indian Succession Act 1925. For other personal laws (Islamic, Christian, Parsi, etc.), you must consult a lawyer.',
        estimatedDays: { min: 0, max: 0 },
        estimatedCostInr: { min: 0, max: 0 },
        legalBasis: 'Hindu Succession Act 1956; Indian Succession Act 1925',
        confidence: 'regulatory',
        sourceNote: 'Server scope limitation',
        requiresLegalAdvice: true,
        verificationNote: 'Consult a lawyer for personal law outside Hindu and Indian Succession Acts.',
        nomineeCustodianWarning: false,
      };
    }

    // STEP 2: Disputed claim
    if (isDisputed) {
      return {
        route: 'COURT_REQUIRED',
        reasoning:
          'The claim is disputed. A court order (decree) is required to settle the dispute before the institution can release the asset.',
        estimatedDays: { min: 365, max: 1095 },
        estimatedCostInr: { min: 50000, max: 500000 },
        legalBasis: 'Indian Succession Act 1925; Code of Civil Procedure 1908',
        confidence: 'regulatory',
        sourceNote: 'Dispute resolution requires court intervention',
        requiresLegalAdvice: true,
        verificationNote: 'Engage a lawyer immediately to file a suit or defend the claim.',
        nomineeCustodianWarning: false,
      };
    }

    // STEP 3: Will exists
    if (hasWill) {
      return {
        route: 'WILL_EXECUTION',
        reasoning:
          'A will exists. Probate or letter of administration may be required depending on jurisdiction and institution. The executor or administrator must apply to the court.',
        estimatedDays: { min: 180, max: 540 },
        estimatedCostInr: { min: 25000, max: 200000 },
        legalBasis: 'Indian Succession Act 1925; Probate and Administration Act (varies by state)',
        confidence: 'institution_policy',
        sourceNote: 'Will execution requires court probate or letter of administration',
        requiresLegalAdvice: true,
        verificationNote:
          'Consult a lawyer to file for probate or letter of administration in the appropriate court.',
        nomineeCustodianWarning: false,
      };
    }

    // STEP 4: Minor nominee
    if (nomineeStatus === 'minor') {
      return {
        route: 'NOMINEE_CLAIM_VIA_GUARDIAN',
        reasoning:
          'The nominee is a minor. A legal guardian must apply on behalf of the minor. The institution will require guardianship documents.',
        estimatedDays: { min: 60, max: 180 },
        estimatedCostInr: { min: 10000, max: 50000 },
        legalBasis: 'Indian Succession Act 1925; Guardianship and Wards Act 1890',
        confidence: 'institution_policy',
        sourceNote: 'Minor nominee requires guardian intervention',
        requiresLegalAdvice: true,
        verificationNote: 'Consult a lawyer to establish guardianship if not already in place.',
        nomineeCustodianWarning: false,
      };
    }

    // STEP 5: Valid nominee
    if (nomineeStatus === 'valid') {
      if (assetType === 'bank_savings' || assetType === 'bank_fd') {
        return {
          route: 'NOMINEE_CLAIM',
          reasoning: `The nominee can claim this ${assetType === 'bank_savings' ? 'savings account' : 'fixed deposit'} directly. Per RBI Directions 2025 (R1), the bank must settle on claim form + death certificate + ID proof alone, within 15 calendar days. IMPORTANT: Under Indian law, the nominee receives the money as a custodian on behalf of the legal heirs, not as the owner of it. Per Shakti Yezdani v Jayanand Jayant Salgaonkar (Supreme Court, 14 December 2023) and Sarbati Devi v Usha Devi (1984) 1 SCC 424, receiving the money does not settle who is entitled to keep it. The legal heirs may later claim their share from the nominee.`,
          estimatedDays: { min: 15, max: 15 },
          estimatedCostInr: { min: 0, max: 500 },
          legalBasis: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025 (R1)',
          confidence: 'regulatory',
          sourceNote: 'RBI Directions 2025, effective 31 March 2026',
          requiresLegalAdvice: false,
          verificationNote:
            'Statutory 15-day settlement deadline. Cost is minimal (claim form, death certificate copies).',
          nomineeCustodianWarning: true,
        };
      } else {
        // Valid nominee for non-bank assets
        return {
          route: 'NOMINEE_CLAIM',
          reasoning: `The nominee can claim this ${assetType} directly. The institution will settle on claim form + death certificate + ID proof. Typical timeline 30–60 days. IMPORTANT: Under Indian law, the nominee receives the money as a custodian on behalf of the legal heirs, not as the owner of it. Per Shakti Yezdani v Jayanand Jayant Salgaonkar (Supreme Court, 14 December 2023) and Sarbati Devi v Usha Devi (1984) 1 SCC 424, receiving the money does not settle who is entitled to keep it. The legal heirs may later claim their share from the nominee.`,
          estimatedDays: { min: 30, max: 60 },
          estimatedCostInr: { min: 0, max: 1000 },
          legalBasis: 'Institution policy; Shakti Yezdani v Jayanand Jayant Salgaonkar (2023 INSC 1076)',
          confidence: 'institution_policy',
          sourceNote: 'Institution policy; nominee is custodian per Supreme Court ruling',
          requiresLegalAdvice: false,
          verificationNote:
            'Nominee receives as custodian. Legal heirs may later claim their share from the nominee.',
          nomineeCustodianWarning: true,
        };
      }
    }

    // STEP 6: No nominee or predeceased nominee
    if (nomineeStatus === 'none' || nomineeStatus === 'predeceased') {
      if (assetType === 'bank_savings' || assetType === 'bank_fd') {
        const threshold = isCooperativeBank ? 500000 : 1500000;
        if (assetValueInr <= threshold) {
          return {
            route: 'SIMPLIFIED_BANK_CLAIM',
            reasoning: `No valid nominee. Asset value INR ${assetValueInr} is below the threshold of INR ${threshold} for ${isCooperativeBank ? 'co-operative' : 'scheduled'} banks. Per RBI Directions 2025 (R2), a simplified procedure applies. Required documents: claim form, death certificate, ID proof, indemnity bond, legal heir certificate or affidavit, and a no-objection/disclaimer letter from other heirs where applicable. Bank must settle within 15–45 days.`,
            estimatedDays: { min: 15, max: 45 },
            estimatedCostInr: { min: 500, max: 5000 },
            legalBasis: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025 (R2)',
            confidence: 'regulatory',
            sourceNote: 'RBI Directions 2025, effective 31 March 2026',
            requiresLegalAdvice: false,
            verificationNote:
              'Simplified procedure applies below threshold. Cost includes legal heir certificate or affidavit, indemnity bond, and death certificate copies.',
            nomineeCustodianWarning: false,
          };
        } else {
          const stateCodeToUse = stateCode || 'TN';
          const courtFeeRow = getCourtFeeForState(stateCodeToUse);
          const estimatedCourtFeeInr = Math.min(
            Math.round((courtFeeRow.ratePercent / 100) * assetValueInr),
            courtFeeRow.capInr
          );
          return {
            route: 'SUCCESSION_CERTIFICATE',
            reasoning: `No valid nominee. Asset value INR ${assetValueInr} exceeds the threshold of INR ${threshold} for ${isCooperativeBank ? 'co-operative' : 'scheduled'} banks. Per RBI Directions 2025 (R3), a succession certificate is required. The family must apply to the district court. Estimated court fee: INR ${estimatedCourtFeeInr} (${courtFeeRow.ratePercent}% of asset value, capped at INR ${courtFeeRow.capInr} in ${stateCodeToUse}). Timeline: 180–540 days.`,
            estimatedDays: { min: 180, max: 540 },
            estimatedCostInr: { min: estimatedCourtFeeInr, max: estimatedCourtFeeInr + 50000 },
            legalBasis: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025 (R3); Court Fees Act 1870',
            confidence: 'estimate',
            sourceNote: `Court fee estimate for ${stateCodeToUse}: ${courtFeeRow.source}`,
            requiresLegalAdvice: true,
            verificationNote:
              'Succession certificate requires court application. Court fee is an estimate; verify with the district court.',
            nomineeCustodianWarning: false,
          };
        }
      } else if (assetType === 'epf') {
        return {
          route: 'EPFO_LEGAL_HEIR_CLAIM',
          reasoning:
            'No valid nominee. EPFO claims follow their own procedure. The legal heir must submit Form 20 (nomination form) and Form 10D (claim form) with employer attestation, death certificate, and ID proof. No value threshold applies.',
          estimatedDays: { min: 30, max: 90 },
          estimatedCostInr: { min: 500, max: 2000 },
          legalBasis: 'EPFO regulations; Employees\' Provident Funds and Miscellaneous Provisions Act 1952',
          confidence: 'institution_policy',
          sourceNote: 'EPFO regulations',
          requiresLegalAdvice: false,
          verificationNote:
            'EPFO claims require employer attestation. Contact the employer\'s HR department for Form 20 and Form 10D.',
          nomineeCustodianWarning: false,
        };
      } else {
        // Other asset types: use institution-policy thresholds
        const threshold = getThresholdForAsset(assetType, 'institution', isCooperativeBank);
        if (threshold && assetValueInr <= threshold.thresholdInr) {
          return {
            route: 'LEGAL_HEIR_CERTIFICATE',
            reasoning: `No valid nominee. Asset value INR ${assetValueInr} is below the institution-policy threshold of INR ${threshold.thresholdInr} for ${assetType}. A legal heir certificate is required. Timeline: 30–90 days.`,
            estimatedDays: { min: 30, max: 90 },
            estimatedCostInr: { min: 2000, max: 10000 },
            legalBasis: 'Institution policy',
            confidence: 'institution_policy',
            sourceNote: threshold.source,
            requiresLegalAdvice: false,
            verificationNote:
              'Legal heir certificate is a placeholder threshold. Verify with the institution for their actual policy.',
            nomineeCustodianWarning: false,
          };
        } else {
          const stateCodeToUse = stateCode || 'TN';
          const courtFeeRow = getCourtFeeForState(stateCodeToUse);
          const estimatedCourtFeeInr = Math.min(
            Math.round((courtFeeRow.ratePercent / 100) * assetValueInr),
            courtFeeRow.capInr
          );
          return {
            route: 'SUCCESSION_CERTIFICATE',
            reasoning: `No valid nominee. Asset value INR ${assetValueInr} exceeds the institution-policy threshold for ${assetType}. A succession certificate is required. The family must apply to the district court. Estimated court fee: INR ${estimatedCourtFeeInr} (${courtFeeRow.ratePercent}% of asset value, capped at INR ${courtFeeRow.capInr} in ${stateCodeToUse}). Timeline: 180–540 days.`,
            estimatedDays: { min: 180, max: 540 },
            estimatedCostInr: { min: estimatedCourtFeeInr, max: estimatedCourtFeeInr + 50000 },
            legalBasis: 'Court Fees Act 1870; Institution policy',
            confidence: 'estimate',
            sourceNote: `Court fee estimate for ${stateCodeToUse}: ${courtFeeRow.source}`,
            requiresLegalAdvice: true,
            verificationNote:
              'Succession certificate requires court application. Court fee is an estimate; verify with the district court.',
            nomineeCustodianWarning: false,
          };
        }
      }
    }

    // Fallback (should not reach here)
    return {
      route: 'UNKNOWN',
      reasoning: 'Unable to determine route. Please verify inputs.',
      estimatedDays: { min: 0, max: 0 },
      estimatedCostInr: { min: 0, max: 0 },
      legalBasis: 'Unknown',
      confidence: 'estimate',
      sourceNote: 'Fallback response',
      requiresLegalAdvice: true,
      verificationNote: 'Consult a lawyer.',
      nomineeCustodianWarning: false,
    };
  }
}
