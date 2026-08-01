import { Injectable, ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { ContractStoreService } from '../intake/contract-store.service.js';
import { RiskScoringService } from './risk-scoring.service.js';
import { NOT_LEGAL_ADVICE } from '../intake/contract.types.js';

@Injectable({ deps: [ContractStoreService, RiskScoringService] })
export class SentinelResources {
  constructor(
    private store: ContractStoreService,
    private scoring: RiskScoringService,
  ) {}

  @Resource({
    uri: 'contracts://portfolio',
    name: 'Contract Portfolio',
    title: 'Tracked contract portfolio',
    description:
      'The full list of tracked contracts with current status, risk score, classification (safe or danger), the clause text driving each score, deadlines, obligations and the recommended action recorded by the last sentinel cycle.',
    mimeType: 'application/json',
    annotations: { audience: ['assistant', 'user'], priority: 0.9 },
    metadata: { cacheable: false },
    examples: {
      response: {
        total: 9,
        contracts: [
          {
            id: 'ctr_northgate_msa',
            status: 'needs_attention',
            riskScore: 78,
            classification: 'danger',
          },
        ],
      },
    },
  })
  async getPortfolio(uri: string, ctx: ExecutionContext) {
    const contracts = this.store.list();
    const profile = this.store.getEffectiveProfile();
    const threshold = this.scoring.dangerThreshold(profile);

    ctx.logger.info('Portfolio resource read', { uri, total: contracts.length });

    const rows = contracts.map((contract) => {
      const assessment = this.scoring.assess(contract);
      return {
        id: contract.id,
        title: contract.title,
        counterparty: contract.counterparty,
        contractType: contract.contractType,
        imageUrl: contract.imageUrl,
        currency: contract.currency,
        annualValue: contract.annualValue,
        status: contract.status,
        deadline: contract.deadline,
        daysUntilDeadline: assessment.daysUntilDeadline,
        riskScore: assessment.riskScore,
        classification: assessment.classification,
        dangerThreshold: assessment.dangerThreshold,
        needsAction: assessment.needsAction,
        actionReasons: assessment.actionReasons,
        drivingClause: assessment.drivingClause,
        riskFactors: assessment.factors,
        scoreExplanation: assessment.scoreExplanation,
        clauses: contract.clauses,
        obligations: contract.obligations,
        recommendedAction: contract.recommendedAction ?? assessment.recommendedAction.action,
        recommendedActionDetail:
          contract.recommendedActionDetail ??
          `${assessment.recommendedAction.label}: ${assessment.recommendedAction.talkingPoints.join(' | ')}`,
        reviewCount: contract.reviewCount,
        lastCycleAt: contract.lastCycleAt,
        ingestedAt: contract.ingestedAt,
      };
    });

    const payload = {
      generatedAt: new Date().toISOString(),
      companyProfile: profile.isDefault
        ? null
        : {
            industry: profile.industry,
            companySize: profile.companySize,
            jurisdiction: profile.jurisdiction,
            riskTolerance: profile.riskTolerance,
          },
      dangerThreshold: threshold,
      total: rows.length,
      counts: {
        safe: rows.filter((row) => row.classification === 'safe').length,
        danger: rows.filter((row) => row.classification === 'danger').length,
        needsAttention: rows.filter((row) => row.status === 'needs_attention').length,
      },
      contracts: rows,
      disclaimer: NOT_LEGAL_ADVICE,
    };

    return { type: 'json' as const, data: JSON.parse(JSON.stringify(payload)) };
  }
}
