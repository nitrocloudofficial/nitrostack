/**
 * MedicineAI
 *
 * Single responsibility: drug interaction analysis, pharmacogenomics
 * conflict detection, and prescription validation (including software
 * registry-based medication origin/authenticity checks).
 *
 * Hard constraints (enforced by construction, not just convention):
 *  - No database access — this class has no reference to IDatabaseService.
 *  - No file access — no reference to IFileService.
 *  - No auth — never sees a JWT, API key, or Role.
 *  - Never calls another AI agent.
 *  - Only receives the minimal, pre-sanitized fields the AI Gateway hands it.
 */

import type { IAIAgent } from '../interfaces/gateway.interfaces.js';
import type { AITaskName } from '../types/gateway.types.js';

// ---------------------------------------------------------------------------
// Sanitized input shapes (already stripped of PII by the AI Gateway)
// ---------------------------------------------------------------------------

export interface GeneMarkerInput {
  gene: string;
  variant: string;
  phenotype: string;
}

export interface GeneConflictInput {
  drug: string;
  severity: 'high' | 'moderate' | 'low';
  risk: string;
  recommendation: string;
  fdaBoxedWarning: boolean;
}

export interface MedicineAnalysisInput {
  diagnosis?: string;
  prescription: string;
  /** Pharmacogenomic conflicts already looked up for this drug against the patient's markers. */
  geneConflicts: GeneConflictInput[];
  /** Other active medications (names only) for interaction checks. */
  activeMedications: string[];
  /** Known drug-drug interaction facts for the prescribed drug, pre-fetched. */
  knownInteractions: Array<{ drug: string; description: string; severity: 'high' | 'moderate' | 'low' }>;
  hasDocumentedAllergy: boolean;
}

export interface MedicineAnalysisOutput {
  medication: string;
  overallRisk: 'high' | 'moderate' | 'low' | 'none';
  geneRiskFlags: GeneConflictInput[];
  drugInteractions: Array<{ interactingDrug: string; description: string; severity: string }>;
  warnings: string[];
}

export interface DrugOriginInput {
  drugName: string;
  ndcResolved: boolean;
  manufacturer?: string;
  recallFound: boolean;
  counterfeitBatchMatch: boolean;
}

export interface DrugOriginOutput {
  drugName: string;
  authenticityStatus:
    | 'verified'
    | 'flagged_recall'
    | 'flagged_reported_counterfeit'
    | 'unrecognized_product';
  confidence: 'High' | 'Medium' | 'Low';
  explanation: string;
}

export class MedicineAI implements IAIAgent<MedicineAnalysisInput | DrugOriginInput, MedicineAnalysisOutput | DrugOriginOutput> {
  readonly name = 'MedicineAI';
  readonly handles: AITaskName[] = ['medicine-analysis', 'drug-origin'];

  async run(input: MedicineAnalysisInput | DrugOriginInput): Promise<MedicineAnalysisOutput | DrugOriginOutput> {
    if ('prescription' in input) {
      return this.analyzeMedicine(input);
    }
    return this.analyzeDrugOrigin(input);
  }

  // -------------------------------------------------------------------------
  // Drug interaction + pharmacogenomics analysis
  // -------------------------------------------------------------------------

  private analyzeMedicine(input: MedicineAnalysisInput): MedicineAnalysisOutput {
    const drugInteractions = input.knownInteractions
      .filter(i => input.activeMedications.map(m => m.toLowerCase()).includes(i.drug.toLowerCase()))
      .map(i => ({ interactingDrug: i.drug, description: i.description, severity: i.severity }));

    const severities = [
      ...input.geneConflicts.map(f => f.severity),
      ...drugInteractions.map(i => i.severity)
    ];

    let overallRisk: MedicineAnalysisOutput['overallRisk'] = 'none';
    if (severities.includes('high')) overallRisk = 'high';
    else if (severities.includes('moderate')) overallRisk = 'moderate';
    else if (severities.includes('low')) overallRisk = 'low';

    const warnings: string[] = [];
    if (input.geneConflicts.some(f => f.fdaBoxedWarning)) {
      warnings.push('FDA BLACK BOX WARNING: this drug-gene combination carries an FDA boxed warning.');
    }
    if (overallRisk === 'high') {
      warnings.push('HIGH RISK: one or more high-severity interactions detected — requires clinical review.');
    }
    if (input.hasDocumentedAllergy) {
      warnings.push('ALLERGY ALERT: patient has a documented allergy to this medication or a related substance.');
    }

    return {
      medication: input.prescription,
      overallRisk,
      geneRiskFlags: input.geneConflicts,
      drugInteractions,
      warnings
    };
  }

  // -------------------------------------------------------------------------
  // Medication origin / authenticity analysis
  // -------------------------------------------------------------------------

  private analyzeDrugOrigin(input: DrugOriginInput): DrugOriginOutput {
    if (input.counterfeitBatchMatch) {
      return {
        drugName: input.drugName,
        authenticityStatus: 'flagged_reported_counterfeit',
        confidence: 'High',
        explanation: 'Batch number matched an entry in the reported counterfeit batch registry.'
      };
    }
    if (input.recallFound) {
      return {
        drugName: input.drugName,
        authenticityStatus: 'flagged_recall',
        confidence: 'High',
        explanation: 'An active FDA recall was found for this product.'
      };
    }
    if (input.ndcResolved) {
      return {
        drugName: input.drugName,
        authenticityStatus: 'verified',
        confidence: input.manufacturer ? 'High' : 'Medium',
        explanation: `NDC resolved${input.manufacturer ? ` under manufacturer "${input.manufacturer}"` : ''}. No active recalls or counterfeit reports found.`
      };
    }
    return {
      drugName: input.drugName,
      authenticityStatus: 'unrecognized_product',
      confidence: 'Low',
      explanation: 'No confident match found in the FDA NDC registry.'
    };
  }
}
