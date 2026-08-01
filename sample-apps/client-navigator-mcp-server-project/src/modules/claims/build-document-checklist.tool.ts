/**
 * TOOL 3: build_document_checklist
 * 
 * Merges multi-asset claims into ONE consolidated checklist.
 * De-duplicates documents, computes death certificate copies needed, flags lowest confidence.
 */

import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { getInstitutionByType } from '../../fixtures/institution-registry.js';

const BuildDocumentChecklistInputSchema = z.object({
  assets: z.array(
    z.object({
      assetType: z.string(),
      institutionType: z.string(),
      nomineeStatus: z.enum(['valid', 'none', 'predeceased', 'minor']),
      valueInr: z.number().positive(),
      isCooperativeBank: z.boolean().optional(),
    })
  ),
});

export interface DocumentChecklistItem {
  document: string;
  whereToObtain: string;
  copies: number;
  estimatedCostInr: number;
  notes: string;
}

export interface BuildDocumentChecklistOutput {
  sharedDocuments: DocumentChecklistItem[];
  assetSpecificDocuments: Array<{
    assetType: string;
    institutionType: string;
    documents: DocumentChecklistItem[];
  }>;
  deathCertificateCopiesNeeded: number;
  totalEstimatedCostInr: number;
  totalEstimatedDays: { min: number; max: number };
  costDriver: string;
  overallConfidence: 'regulatory' | 'institution_policy' | 'estimate';
  honestNote: string;
}

export class BuildDocumentChecklistTool {
  @Tool({
    name: 'build_document_checklist',
    description:
      'Consolidates document requirements across multiple assets into a single checklist. De-duplicates shared documents, computes death certificate copies needed (number of institutions + 2 spare), and flags the lowest confidence level used.',
    inputSchema: BuildDocumentChecklistInputSchema,
  })
  @Widget('claim-roadmap')
  async execute(
    input: z.infer<typeof BuildDocumentChecklistInputSchema>,
    ctx: ExecutionContext
  ): Promise<BuildDocumentChecklistOutput> {
    const { assets } = input;

    if (assets.length === 0) {
      return {
        sharedDocuments: [],
        assetSpecificDocuments: [],
        deathCertificateCopiesNeeded: 2,
        totalEstimatedCostInr: 0,
        totalEstimatedDays: { min: 0, max: 0 },
        costDriver: 'No assets provided',
        overallConfidence: 'estimate',
        honestNote: 'No assets to process.',
      };
    }

    // Shared documents (always needed)
    const sharedDocuments: DocumentChecklistItem[] = [
      {
        document: 'Death certificate',
        whereToObtain: 'Municipal corporation or local registrar (vital records office)',
        copies: assets.length + 2, // +2 spare
        estimatedCostInr: (assets.length + 2) * 50, // ~INR 50 per copy
        notes: 'Families routinely under-order. Get extra copies to avoid a second trip.',
      },
      {
        document: 'ID proof of claimant',
        whereToObtain: 'Aadhaar, PAN, Passport, Voter ID, or Driving License',
        copies: 1,
        estimatedCostInr: 0,
        notes: 'Original or certified copy. Verify with institution.',
      },
    ];

    // Asset-specific documents
    const assetSpecificDocuments: Array<{
      assetType: string;
      institutionType: string;
      documents: DocumentChecklistItem[];
    }> = [];

    let totalCostInr = 0;
    let maxDaysMin = 0;
    let maxDaysMax = 0;
    let lowestConfidence: 'regulatory' | 'institution_policy' | 'estimate' = 'regulatory';

    for (const asset of assets) {
      const institution = getInstitutionByType(asset.institutionType);
      if (!institution) {
        continue;
      }

      const assetDocs: DocumentChecklistItem[] = [];

      if (asset.nomineeStatus === 'valid') {
        // Nominee claim
        assetDocs.push({
          document: 'Claim form',
          whereToObtain: `${institution.name} website or branch`,
          copies: 1,
          estimatedCostInr: 0,
          notes: 'Institution-specific form',
        });
        assetDocs.push({
          document: 'Nominee ID proof',
          whereToObtain: 'Aadhaar, PAN, Passport, Voter ID',
          copies: 1,
          estimatedCostInr: 0,
          notes: 'Original or certified copy',
        });
      } else if (asset.nomineeStatus === 'none' || asset.nomineeStatus === 'predeceased') {
        // Non-nominee claim
        if (asset.assetType === 'bank_savings' || asset.assetType === 'bank_fd') {
          const threshold = asset.isCooperativeBank ? 500000 : 1500000;
          if (asset.valueInr <= threshold) {
            // Simplified procedure
            assetDocs.push({
              document: 'Claim form',
              whereToObtain: `${institution.name} website or branch`,
              copies: 1,
              estimatedCostInr: 0,
              notes: 'Simplified procedure form',
            });
            assetDocs.push({
              document: 'Legal heir certificate or affidavit',
              whereToObtain: 'Notary or revenue office',
              copies: 1,
              estimatedCostInr: 2000,
              notes: 'Affidavit is cheaper than legal heir certificate',
            });
            assetDocs.push({
              document: 'Indemnity bond',
              whereToObtain: 'Bank or notary',
              copies: 1,
              estimatedCostInr: 1000,
              notes: 'Bank may provide template',
            });
            assetDocs.push({
              document: 'No-objection letter from other heirs',
              whereToObtain: 'Self-drafted and signed by heirs',
              copies: 1,
              estimatedCostInr: 0,
              notes: 'If other heirs exist',
            });
          } else {
            // Succession certificate
            assetDocs.push({
              document: 'Succession certificate',
              whereToObtain: 'District court',
              copies: 1,
              estimatedCostInr: 15000,
              notes: 'Court fee is an estimate; verify with court',
            });
            assetDocs.push({
              document: 'Claim form',
              whereToObtain: `${institution.name} website or branch`,
              copies: 1,
              estimatedCostInr: 0,
              notes: 'Submitted with succession certificate',
            });
          }
        } else if (asset.assetType === 'epf') {
          assetDocs.push({
            document: 'EPFO Form 20 (Nomination)',
            whereToObtain: 'EPFO website or employer',
            copies: 1,
            estimatedCostInr: 0,
            notes: 'Employer attestation required',
          });
          assetDocs.push({
            document: 'EPFO Form 10D (Claim)',
            whereToObtain: 'EPFO website or employer',
            copies: 1,
            estimatedCostInr: 0,
            notes: 'Employer attestation required',
          });
        } else {
          // Other asset types
          assetDocs.push({
            document: 'Legal heir certificate or succession certificate',
            whereToObtain: 'Revenue office or district court',
            copies: 1,
            estimatedCostInr: 5000,
            notes: 'Depends on asset value and institution policy',
          });
          assetDocs.push({
            document: 'Claim form',
            whereToObtain: `${institution.name} website or branch`,
            copies: 1,
            estimatedCostInr: 0,
            notes: 'Institution-specific form',
          });
        }
      } else if (asset.nomineeStatus === 'minor') {
        assetDocs.push({
          document: 'Guardianship order',
          whereToObtain: 'District court',
          copies: 1,
          estimatedCostInr: 10000,
          notes: 'Court order establishing guardianship',
        });
        assetDocs.push({
          document: 'Claim form',
          whereToObtain: `${institution.name} website or branch`,
          copies: 1,
          estimatedCostInr: 0,
          notes: 'Submitted by guardian on behalf of minor',
        });
      }

      // Accumulate cost and duration
      for (const doc of assetDocs) {
        totalCostInr += doc.estimatedCostInr;
      }
      maxDaysMin = Math.max(maxDaysMin, institution.typicalDurationDays.min);
      maxDaysMax = Math.max(maxDaysMax, institution.typicalDurationDays.max);

      // Track lowest confidence
      if (institution.confidence === 'estimate') {
        lowestConfidence = 'estimate';
      } else if (institution.confidence === 'institution_policy' && lowestConfidence !== 'estimate') {
        lowestConfidence = 'institution_policy';
      }

      assetSpecificDocuments.push({
        assetType: asset.assetType,
        institutionType: asset.institutionType,
        documents: assetDocs,
      });
    }

    // Add shared document costs
    for (const doc of sharedDocuments) {
      totalCostInr += doc.estimatedCostInr;
    }

    // Determine cost driver
    let costDriver = 'Multiple assets';
    if (assets.length === 1) {
      costDriver = `${assets[0].assetType} (${assets[0].institutionType})`;
    }

    return {
      sharedDocuments,
      assetSpecificDocuments,
      deathCertificateCopiesNeeded: assets.length + 2,
      totalEstimatedCostInr: totalCostInr,
      totalEstimatedDays: { min: maxDaysMin, max: maxDaysMax },
      costDriver,
      overallConfidence: lowestConfidence,
      honestNote: `This is a consolidated estimate. Actual costs and timelines vary by institution and state. Verify with each institution before proceeding. Confidence level: ${lowestConfidence}.`,
    };
  }
}
