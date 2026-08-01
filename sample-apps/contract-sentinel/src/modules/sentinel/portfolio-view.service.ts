import { Injectable } from '@nitrostack/core';
import { ContractStoreService } from '../intake/contract-store.service.js';
import { RiskScoringService } from './risk-scoring.service.js';
import {
  NOT_LEGAL_ADVICE,
  type Classification,
  type RiskAssessment,
  type TrackedContract,
} from '../intake/contract.types.js';

/** One card on the contract board. Mirrors the widget's `BoardCard` interface. */
export interface BoardCard {
  id: string;
  title: string;
  counterparty: string;
  contractType: string;
  imageUrl: string;
  currency: string;
  annualValue: number;
  status: string;
  deadline: string | null;
  daysUntilDeadline: number | null;
  riskScore: number;
  classification: Classification;
  dangerThreshold: number;
  needsAction: boolean;
  actionReasons: string[];
  /** The exact clause text that caused the classification. */
  drivingClause: {
    code: string;
    label: string;
    weight: number;
    clauseText: string;
    rationale: string;
  };
  factors: Array<{
    code: string;
    label: string;
    weight: number;
    clauseText: string;
    rationale: string;
  }>;
  scoreExplanation: string;
  recommendedAction: {
    action: string;
    label: string;
    talkingPoints: string[];
  };
  reviewCount: number;
  lastCycleAt: string | null;
  disclaimer: string;
}

export interface BoardPayload {
  generatedAt: string;
  profileSummary: string;
  dangerThreshold: number;
  filter: string;
  summary: {
    total: number;
    safe: number;
    danger: number;
    needsAttention: number;
    averageScore: number;
  };
  columns: {
    safe: BoardCard[];
    danger: BoardCard[];
  };
  disclaimer: string;
}

/**
 * Builds the contract-board payload shared by `review-portfolio` and
 * `run-sentinel-cycle`, so both tools can render the same widget.
 */
@Injectable({ deps: [ContractStoreService, RiskScoringService] })
export class PortfolioViewService {
  constructor(
    private store: ContractStoreService,
    private scoring: RiskScoringService,
  ) {}

  toCard(contract: TrackedContract, assessment: RiskAssessment): BoardCard {
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
      drivingClause: {
        code: assessment.drivingClause.code,
        label: assessment.drivingClause.label,
        weight: assessment.drivingClause.weight,
        clauseText: assessment.drivingClause.clauseText,
        rationale: assessment.drivingClause.rationale,
      },
      factors: assessment.factors.map((factor) => ({
        code: factor.code,
        label: factor.label,
        weight: factor.weight,
        clauseText: factor.clauseText,
        rationale: factor.rationale,
      })),
      scoreExplanation: assessment.scoreExplanation,
      recommendedAction: {
        action: assessment.recommendedAction.action,
        label: assessment.recommendedAction.label,
        talkingPoints: assessment.recommendedAction.talkingPoints,
      },
      reviewCount: contract.reviewCount,
      lastCycleAt: contract.lastCycleAt,
      disclaimer: assessment.disclaimer,
    };
  }

  /**
   * Build the full board. `filter` narrows which cards are returned but the
   * summary always reflects the filtered set so the UI stays consistent.
   */
  buildBoard(filter: 'all' | 'safe' | 'danger' | 'needs_attention' = 'all'): BoardPayload {
    const contracts = this.store.list();
    const profile = this.store.getEffectiveProfile();
    const threshold = this.scoring.dangerThreshold(profile);

    const cards = contracts.map((contract) => this.toCard(contract, this.scoring.assess(contract)));

    const filtered = cards.filter((card) => {
      if (filter === 'safe') return card.classification === 'safe';
      if (filter === 'danger') return card.classification === 'danger';
      if (filter === 'needs_attention') return card.status === 'needs_attention' || card.needsAction;
      return true;
    });

    const safe = filtered.filter((card) => card.classification === 'safe');
    const danger = filtered.filter((card) => card.classification === 'danger');
    const needsAttention = filtered.filter(
      (card) => card.status === 'needs_attention' || card.needsAction,
    ).length;
    const averageScore =
      filtered.length > 0
        ? Math.round(filtered.reduce((sum, card) => sum + card.riskScore, 0) / filtered.length)
        : 0;

    const sortByScore = (a: BoardCard, b: BoardCard) => b.riskScore - a.riskScore;

    return {
      generatedAt: new Date().toISOString(),
      profileSummary: profile.isDefault
        ? 'No company profile set — defaults to medium risk tolerance. Call set-company-profile for tailored scoring.'
        : `${profile.companySize}-person ${profile.industry} company in ${profile.jurisdiction}, ${profile.riskTolerance} risk tolerance.`,
      dangerThreshold: threshold,
      filter,
      summary: {
        total: filtered.length,
        safe: safe.length,
        danger: danger.length,
        needsAttention,
        averageScore,
      },
      columns: {
        safe: [...safe].sort(sortByScore),
        danger: [...danger].sort(sortByScore),
      },
      disclaimer: NOT_LEGAL_ADVICE,
    };
  }
}
