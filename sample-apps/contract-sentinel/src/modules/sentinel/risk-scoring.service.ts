import { Injectable } from '@nitrostack/core';
import { ContractStoreService } from '../intake/contract-store.service.js';
import {
  NOT_LEGAL_ADVICE,
  type CompanyProfile,
  type ExtractedClause,
  type RecommendedAction,
  type RecommendedActionCode,
  type RiskAssessment,
  type RiskFactor,
  type TrackedContract,
} from '../intake/contract.types.js';

/** Deadline within this many days counts as "close" and triggers action. */
const DEADLINE_WARNING_DAYS = 120;

/** A single scoring heuristic. */
interface ScoringRule {
  code: string;
  label: string;
  weight: number;
  /** Clause types this rule looks at; empty = any clause. */
  clauseTypes: string[];
  /** All of these phrases (lower-cased) must be absent for the rule to fire. */
  absent?: string[];
  /** Any of these phrases (lower-cased) must be present for the rule to fire. */
  present: string[];
  rationale: string;
}

const RULES: ScoringRule[] = [
  {
    code: 'auto_renewal_long',
    label: 'Long auto-renewal term',
    weight: 22,
    clauseTypes: ['auto_renewal'],
    present: ['24 months', '36 months', '24-month', 'two years'],
    rationale:
      'The contract rolls over for two years or more automatically, locking in current terms long after the review window closes.',
  },
  {
    code: 'auto_renewal',
    label: 'Auto-renewal present',
    weight: 12,
    clauseTypes: ['auto_renewal'],
    present: ['auto-renewal', 'auto renewal', 'automatic renewal', 'automatically renew'],
    rationale:
      'The contract renews itself unless notice is served, so an unnoticed deadline silently extends the commitment.',
  },
  {
    code: 'long_notice_period',
    label: 'Long notice period',
    weight: 14,
    clauseTypes: ['notice_period', 'auto_renewal'],
    present: ['90 days prior', '120 days prior', '180 days', '90 days', '120 days'],
    rationale:
      'A 90+ day notice window means the real decision deadline is months before the stated expiry date.',
  },
  {
    code: 'low_liability_cap',
    label: 'Very low liability cap',
    weight: 24,
    clauseTypes: ['liability_cap'],
    present: [
      'capped at eur 5,000',
      'capped at usd 10,000',
      'eur 5,000',
      'usd 10,000',
      'three months',
      'preceding three months',
    ],
    rationale:
      'The counterparty caps its exposure at a token amount, so the financial downside of their failure sits with us.',
  },
  {
    code: 'unlimited_own_liability',
    label: 'Unlimited liability on us',
    weight: 20,
    clauseTypes: ['liability_cap'],
    present: ['unlimited liability for the customer', 'unlimited liability'],
    rationale: 'Our side carries uncapped liability while the counterparty is capped — an asymmetric allocation.',
  },
  {
    code: 'one_sided_indemnity',
    label: 'One-sided indemnity against us',
    weight: 22,
    clauseTypes: ['indemnity'],
    present: [
      'customer indemnifies',
      'controller indemnifies',
      'indemnifies vendor',
      'indemnifies supplier',
      'indemnifies processor',
      'indemnifies reseller',
    ],
    rationale:
      'We indemnify the counterparty rather than the reverse, so their liabilities can be passed back to us.',
  },
  {
    code: 'foreign_governing_law',
    label: 'Foreign governing law',
    weight: 16,
    clauseTypes: ['governing_law'],
    present: ['delaware', 'usa', 'new york', 'singapore', 'germany', 'england'],
    rationale:
      'Governing law sits outside our home jurisdiction, raising enforcement cost and regulatory friction.',
  },
  {
    code: 'binding_arbitration_abroad',
    label: 'Binding arbitration abroad',
    weight: 12,
    clauseTypes: ['dispute_resolution'],
    present: ['arbitration in new york', 'arbitration in singapore', 'binding arbitration'],
    rationale: 'Disputes must be arbitrated overseas, which removes access to local courts and raises costs.',
  },
  {
    code: 'data_transfer_risk',
    label: 'Unconstrained data handling',
    weight: 20,
    clauseTypes: ['data_protection'],
    present: [
      'without prior written approval',
      'outside the eea',
      "processor's discretion",
      'indemnifies vendor for all data breach',
      'all data breach claims',
    ],
    rationale:
      'Sub-processing or international transfers happen without our approval, which is a direct regulatory exposure.',
  },
  {
    code: 'unilateral_pricing',
    label: 'Unilateral price changes',
    weight: 14,
    clauseTypes: ['pricing'],
    present: ['amend pricing unilaterally', 'may amend pricing', 'price increase'],
    rationale: 'The supplier can change price without our agreement, so budget certainty is not contractual.',
  },
  {
    code: 'weak_service_credits',
    label: 'Service credits capped low',
    weight: 8,
    clauseTypes: ['service_level'],
    present: ['credits capped at 5%', 'service credits capped'],
    rationale: 'The only remedy for downtime is a small credit, which does not cover the business impact.',
  },
  {
    code: 'supplier_owns_ip',
    label: 'Supplier retains IP',
    weight: 18,
    clauseTypes: ['intellectual_property'],
    present: ['supplier retains all intellectual property', 'revocable licence', 'revocable license'],
    rationale:
      'We fund the build but the supplier keeps the IP under a revocable licence, so continuity depends on them.',
  },
  {
    code: 'exclusivity_no_minimum',
    label: 'Exclusivity with no minimum',
    weight: 16,
    clauseTypes: ['exclusivity'],
    present: ['no minimum revenue commitment', 'exclusivity is granted'],
    rationale:
      'We grant exclusive rights without any revenue floor, so a passive partner can block the territory.',
  },
  // ---- mitigating factors (negative weight) ----
  {
    code: 'termination_for_convenience',
    label: 'Termination for convenience (mitigating)',
    weight: -18,
    clauseTypes: ['termination'],
    present: ['terminated for convenience', 'termination for convenience'],
    rationale: 'Either party can walk away on short notice, which caps the downside of any other clause.',
  },
  {
    code: 'no_auto_renewal',
    label: 'No auto-renewal (mitigating)',
    weight: -12,
    clauseTypes: ['auto_renewal', 'termination', 'term'],
    present: ['no auto-renewal applies', 'no automatic renewal'],
    rationale: 'The contract expires rather than rolling over, so nothing is locked in by inattention.',
  },
  {
    code: 'mutual_liability_cap',
    label: 'Mutual, proportionate liability cap (mitigating)',
    weight: -12,
    clauseTypes: ['liability_cap', 'indemnity'],
    present: [
      "each party's liability is capped",
      'each party indemnifies the other',
      'no cap on defence costs',
    ],
    rationale: 'Risk allocation is symmetric between the parties, which is the expected market position.',
  },
  {
    code: 'capped_price_review',
    label: 'Capped price escalation (mitigating)',
    weight: -8,
    clauseTypes: ['pricing'],
    present: ['capped at 2% per annum', 'fees are fixed'],
    rationale: 'Price escalation is contractually bounded, so cost exposure is predictable.',
  },
];

const ACTION_LABELS: Record<RecommendedActionCode, string> = {
  renew_as_is: 'Renew as-is',
  renegotiate: 'Renegotiate',
  let_lapse: 'Let lapse',
  monitor: 'Monitor — no action needed yet',
};

/**
 * Heuristic risk scoring. Every score is accompanied by:
 *  - the exact clause text that drove it,
 *  - a per-factor rationale and weight,
 *  - the profile adjustment applied,
 *  - a not-legal-advice disclaimer.
 *
 * There is no external legal API; all reasoning is local and inspectable.
 */
@Injectable({ deps: [ContractStoreService] })
export class RiskScoringService {
  constructor(private store: ContractStoreService) {}

  /** Danger threshold implied by the company's risk tolerance. */
  dangerThreshold(profile: Pick<CompanyProfile, 'riskTolerance'>): number {
    if (profile.riskTolerance === 'low') return 45;
    if (profile.riskTolerance === 'high') return 70;
    return 55;
  }

  /** Multiplier applied to the raw score based on risk tolerance. */
  private toleranceMultiplier(profile: Pick<CompanyProfile, 'riskTolerance'>): number {
    if (profile.riskTolerance === 'low') return 1.15;
    if (profile.riskTolerance === 'high') return 0.85;
    return 1;
  }

  assess(contract: TrackedContract, now: Date = new Date()): RiskAssessment {
    const profile = this.store.getEffectiveProfile();
    const factors = this.buildFactors(contract, profile);

    const rawScore = factors.reduce((sum, factor) => sum + factor.weight, 0);
    const multiplier = this.toleranceMultiplier(profile);
    const boundedScore = Math.max(0, Math.min(100, Math.round(rawScore * multiplier)));
    const threshold = this.dangerThreshold(profile);
    const classification = boundedScore >= threshold ? 'danger' : 'safe';

    const drivingClause = this.pickDrivingClause(factors, contract);
    const daysUntilDeadline = this.daysUntilDeadline(contract.deadline, now);

    const actionReasons: string[] = [];
    if (daysUntilDeadline !== null && daysUntilDeadline <= DEADLINE_WARNING_DAYS) {
      actionReasons.push(
        daysUntilDeadline < 0
          ? `Deadline ${contract.deadline} has already passed (${Math.abs(daysUntilDeadline)} days ago).`
          : `Deadline ${contract.deadline} is ${daysUntilDeadline} days away, inside the ${DEADLINE_WARNING_DAYS}-day action window.`,
      );
    }
    if (classification === 'danger') {
      actionReasons.push(
        `Risk score ${boundedScore} is at or above the ${threshold}-point danger threshold for ${profile.riskTolerance} risk tolerance.`,
      );
    }
    if (contract.reviewCount === 0) {
      actionReasons.push('No review has ever been recorded against this contract — it is unmanaged.');
    }

    const needsAction = actionReasons.length > 0;
    const recommendedAction = this.recommendAction({
      contract,
      score: boundedScore,
      classification,
      daysUntilDeadline,
      factors,
      needsAction,
    });

    const positive = factors.filter((f) => f.weight > 0);
    const mitigating = factors.filter((f) => f.weight < 0);

    const scoreExplanation = [
      `Score ${boundedScore}/100 (${classification.toUpperCase()}), threshold ${threshold}.`,
      positive.length > 0
        ? `Aggravating factors: ${positive.map((f) => `${f.label} +${f.weight}`).join(', ')}.`
        : 'No aggravating clauses matched.',
      mitigating.length > 0
        ? `Mitigating factors: ${mitigating.map((f) => `${f.label} ${f.weight}`).join(', ')}.`
        : 'No mitigating clauses matched.',
      `Raw total ${rawScore} × ${multiplier} tolerance multiplier = ${boundedScore}.`,
      `Primary driver: ${drivingClause.label} — "${drivingClause.clauseText}"`,
    ].join(' ');

    const profileAdjustment = profile.isDefault
      ? `No company profile set; defaulted to medium risk tolerance (threshold ${threshold}, multiplier ${multiplier}).`
      : `Scored for a ${profile.companySize}-person ${profile.industry} company in ${profile.jurisdiction}: ${profile.riskTolerance} risk tolerance applies a ${multiplier}× multiplier and a ${threshold}-point danger threshold.`;

    return {
      contractId: contract.id,
      riskScore: boundedScore,
      classification,
      dangerThreshold: threshold,
      drivingClause,
      factors,
      scoreExplanation,
      daysUntilDeadline,
      needsAction,
      actionReasons,
      recommendedAction,
      profileAdjustment,
      disclaimer: NOT_LEGAL_ADVICE,
    };
  }

  // ---------------------------------------------------------------- internals

  private buildFactors(
    contract: TrackedContract,
    profile: CompanyProfile & { isDefault: boolean },
  ): RiskFactor[] {
    const clauses = contract.clauses ?? [];
    const factors: RiskFactor[] = [];

    for (const rule of RULES) {
      const match = this.findClauseForRule(clauses, rule);
      if (!match) continue;

      // Jurisdiction rule is only a risk when the law differs from our own.
      if (rule.code === 'foreign_governing_law' && !profile.isDefault) {
        if (match.text.toLowerCase().includes(profile.jurisdiction.toLowerCase())) continue;
      }

      factors.push({
        code: rule.code,
        label: rule.label,
        weight: rule.weight,
        clauseText: match.text,
        rationale: rule.rationale,
      });
    }

    // Dedupe overlapping auto-renewal rules: keep the heavier long-term variant only.
    const hasLongRenewal = factors.some((f) => f.code === 'auto_renewal_long');
    const deduped = hasLongRenewal ? factors.filter((f) => f.code !== 'auto_renewal') : factors;

    if (deduped.length === 0) {
      const fallback = clauses[0];
      deduped.push({
        code: 'no_flagged_clauses',
        label: 'No high-risk clause patterns matched',
        weight: 5,
        clauseText: fallback ? fallback.text : contract.contractText.slice(0, 220),
        rationale:
          'None of the known high-risk clause patterns were found. A small baseline score remains because heuristic parsing can miss bespoke drafting.',
      });
    }

    return deduped;
  }

  private findClauseForRule(clauses: ExtractedClause[], rule: ScoringRule): ExtractedClause | null {
    const pool =
      rule.clauseTypes.length > 0
        ? clauses.filter((clause) => rule.clauseTypes.includes(clause.type))
        : clauses;

    for (const clause of pool) {
      const haystack = clause.text.toLowerCase();
      if (rule.absent && rule.absent.some((phrase) => haystack.includes(phrase))) continue;
      if (rule.present.some((phrase) => haystack.includes(phrase))) return clause;
    }
    return null;
  }

  private pickDrivingClause(factors: RiskFactor[], contract: TrackedContract): RiskFactor {
    const positives = factors.filter((f) => f.weight > 0);
    const pool = positives.length > 0 ? positives : factors;
    const sorted = [...pool].sort((a, b) => b.weight - a.weight);
    if (sorted.length > 0) return sorted[0];

    return {
      code: 'no_clauses_extracted',
      label: 'No clauses extracted',
      weight: 0,
      clauseText: contract.contractText.slice(0, 220) || 'No contract text available.',
      rationale: 'The contract text could not be parsed into clauses, so no evidence is available.',
    };
  }

  private daysUntilDeadline(deadline: string | null, now: Date): number | null {
    if (!deadline) return null;
    const target = Date.parse(`${deadline}T00:00:00Z`);
    if (Number.isNaN(target)) return null;
    return Math.round((target - now.getTime()) / 86_400_000);
  }

  private recommendAction(args: {
    contract: TrackedContract;
    score: number;
    classification: 'safe' | 'danger';
    daysUntilDeadline: number | null;
    factors: RiskFactor[];
    needsAction: boolean;
  }): RecommendedAction {
    const { contract, score, classification, daysUntilDeadline, factors, needsAction } = args;
    const aggravating = factors.filter((f) => f.weight > 0).sort((a, b) => b.weight - a.weight);

    if (!needsAction) {
      return {
        action: 'monitor',
        label: ACTION_LABELS.monitor,
        talkingPoints: [
          `Score ${score} sits below the danger threshold and no deadline pressure applies.`,
          'Re-check on the next scheduled sentinel cycle.',
        ],
      };
    }

    // Severe risk plus low commercial value → walking away is the cheapest fix.
    if (score >= 70 && contract.annualValue > 0 && contract.annualValue <= 100_000) {
      return {
        action: 'let_lapse',
        label: ACTION_LABELS.let_lapse,
        talkingPoints: [
          `Risk score ${score} is severe while annual value is only ${contract.currency} ${contract.annualValue.toLocaleString('en-IE')} — the exposure is not worth the spend.`,
          `Serve notice before ${contract.deadline ?? 'the renewal date'} so the term is not extended automatically.`,
          `Primary problem clause: "${aggravating[0]?.clauseText ?? 'n/a'}"`,
          'Start sourcing a replacement supplier now so there is no service gap.',
        ],
      };
    }

    if (classification === 'danger' || aggravating.length >= 2) {
      const talkingPoints = aggravating.slice(0, 4).map(
        (factor) => `${factor.label} (+${factor.weight}): ${factor.rationale} Clause: "${factor.clauseText}"`,
      );
      if (daysUntilDeadline !== null) {
        talkingPoints.push(
          daysUntilDeadline < 0
            ? `The ${contract.deadline} deadline has passed — confirm whether the term already rolled over before opening talks.`
            : `Open negotiations now: only ${daysUntilDeadline} days remain before ${contract.deadline}, and notice periods bite earlier.`,
        );
      }
      return { action: 'renegotiate', label: ACTION_LABELS.renegotiate, talkingPoints };
    }

    return {
      action: 'renew_as_is',
      label: ACTION_LABELS.renew_as_is,
      talkingPoints: [
        `Score ${score} is below the danger threshold, so the commercial terms are acceptable as drafted.`,
        daysUntilDeadline !== null
          ? `Confirm renewal ahead of ${contract.deadline} (${daysUntilDeadline} days) so it does not lapse unintentionally.`
          : 'No deadline extracted — confirm the renewal date with the counterparty.',
        `Watch this clause on the next cycle: "${aggravating[0]?.clauseText ?? factors[0]?.clauseText ?? 'n/a'}"`,
      ],
    };
  }
}
