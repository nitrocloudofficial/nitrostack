import { Injectable } from '@nitrostack/core';
import type { RiskAssessment, RiskFactors } from '../types/index.js';
import {
  DataLoaderService,
  KnowledgeInputError,
} from './data-loader.service.js';
import { ValidationService } from './validation.service.js';

const FINANCIAL_TERMS = /pricing|discount|expense|budget|cost|payment|hotel|meal|flight|stipend|vendor|approval threshold/i;
const COMPLIANCE_TERMS = /retention|security|legal|privacy|password|mfa|classification|deletion|audit|compliance/i;
const OPERATIONAL_TERMS = /process|workflow|approval|approver|rotation|equipment|remote|vendor|procedure|sop|operations/i;

@Injectable({ deps: [DataLoaderService, ValidationService] })
export class RiskService {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly validationService: ValidationService,
  ) {}

  assessRisk(documentId: string, claimId: string): RiskAssessment {
    const document = this.dataLoader.getDocumentById(documentId);
    if (!document) {
      throw new KnowledgeInputError(`Unknown document: ${documentId}`);
    }
    const claim = document.claims.find((item) => item.id === claimId);
    if (!claim) {
      throw new KnowledgeInputError(
        `Unknown claim ${claimId} in document ${documentId}`,
      );
    }

    const dependency = this.dataLoader.getDependencyForClaim(documentId, claimId);
    if (!dependency) {
      throw new KnowledgeInputError(
        `Claim has no authoritative dependency: ${claimId}`,
      );
    }

    const source = this.dataLoader.getSourceById(dependency.source_id);
    if (!source || source.facts[dependency.fact_key] === undefined) {
      throw new KnowledgeInputError(
        `Unknown authoritative fact: ${dependency.source_id}.${dependency.fact_key}`,
      );
    }

    const validation = this.validationService.validateClaim(
      documentId,
      claimId,
    );
    const searchableText = [
      source.id,
      source.title,
      dependency.fact_key,
      claim.text,
    ].join(' ');
    const factors: RiskFactors = {
      customer_facing: document.customer_facing,
      financial_impact: FINANCIAL_TERMS.test(searchableText),
      compliance_impact: COMPLIANCE_TERMS.test(searchableText),
      operational_impact: OPERATIONAL_TERMS.test(searchableText),
      confirmed_conflict: validation.status === 'CONFLICT',
      document_criticality: document.criticality,
    };
    const riskScore = calculateRiskScore(factors);

    return {
      document_id: document.id,
      document_title: document.title,
      claim_id: claim.id,
      risk_level: riskLevel(riskScore),
      risk_score: riskScore,
      factors,
      reasons: buildReasons(factors),
    };
  }
}

export function calculateRiskScore(factors: RiskFactors): number {
  let score = 0;
  if (factors.confirmed_conflict) score += 30;
  if (factors.customer_facing) score += 25;
  if (factors.financial_impact) score += 20;
  if (factors.compliance_impact) score += 15;
  if (factors.operational_impact) score += 10;

  switch (factors.document_criticality) {
    case 'critical':
      score += 10;
      break;
    case 'high':
      score += 5;
      break;
    case 'medium':
      score += 2;
      break;
    case 'low':
      break;
  }

  return Math.min(score, 100);
}

export function riskLevel(score: number): RiskAssessment['risk_level'] {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function buildReasons(factors: RiskFactors): string[] {
  const reasons: string[] = [];
  if (factors.confirmed_conflict) reasons.push('Claim conflicts with authoritative knowledge');
  if (factors.customer_facing) reasons.push('Document is customer-facing');
  if (factors.financial_impact) reasons.push('Fact has potential financial impact');
  if (factors.compliance_impact) reasons.push('Fact has potential compliance impact');
  if (factors.operational_impact) reasons.push('Fact has potential operational impact');
  reasons.push(`Document criticality is ${factors.document_criticality}`);
  return reasons;
}
