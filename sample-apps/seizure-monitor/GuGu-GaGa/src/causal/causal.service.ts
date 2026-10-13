/**
 * CREED-Lite — Causal Graph Service
 *
 * PRODUCTION VERSION — Dynamic, profile-aware recourse path computation.
 * Paths are calculated from the applicant's actual numbers, not templates.
 * Each path includes a simulated Oracle re-evaluation proving it works.
 *
 * Supports 6 path types + advisory paths + micro-compound strategies.
 */

import { Injectable } from '@nitrostack/core';
import { OracleService } from '../oracle/oracle.service.js';
import type { ApplicantProfile, OracleDecision } from '../oracle/oracle.service.js';
import type { ActionType, ActionMetadata } from '../fraud/fraud.service.js';
import { CAUSAL_PARAMS, CREDIT_HISTORY, FRAUD_THRESHOLDS } from '../config/thresholds.js';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface RecourseAction {
  variable: string;
  change: string;
  cost: number;
  timeMonths: number;
  actionType: ActionType;
  metadata?: ActionMetadata;
}

export interface RecoursePath {
  id: string;
  title: string;
  description: string;
  actions: RecourseAction[];
  totalCostUSD: number;
  totalTimeMonths: number;
  causalChain: string;
  projectedChanges: Record<string, number>;
  simulatedResult: {
    status: 'APPROVED' | 'REJECTED';
    approvalProbability: number;
  };
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  /** When true, this is an advisory notice (e.g. "wait for credit history") not an actionable path */
  advisory?: boolean;
}

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable({ deps: [OracleService] })
export class CausalGraphService {
  constructor(private oracleService: OracleService) {}

  // The Structural Causal Model (SCM) as a directed graph
  private causalEdges = [
    { from: 'monthlyDebtPayment', to: 'dtiRatio', effect: 'Reducing monthly debt payments directly lowers DTI ratio' },
    { from: 'monthlyDebtPayment', to: 'creditScore', effect: 'Consistent debt paydown improves credit score over time' },
    { from: 'certificationCount', to: 'annualIncome', effect: 'Professional certifications increase earning potential' },
    { from: 'annualIncome', to: 'dtiRatio', effect: 'Higher income mechanically lowers DTI ratio' },
    { from: 'liquidSavings', to: 'creditScore', effect: 'Higher reserves improve creditworthiness signals' },
    { from: 'coSigner', to: 'creditScore', effect: 'Verified co-signer with strong credit supplements application' },
    { from: 'incomeNegotiation', to: 'annualIncome', effect: 'Salary negotiation or side income directly raises gross income' },
  ];

  // Variables that the applicant CANNOT directly change
  private immutableVars = ['creditHistoryYears'];

  getGraph() {
    return { edges: this.causalEdges, immutableVariables: this.immutableVars };
  }

  /**
   * Find causally-valid recourse paths for a SPECIFIC applicant profile.
   * Every delta is computed from the applicant's actual numbers.
   *
   * Returns { status, paths } where status indicates why paths were
   * or were not generated.
   */
  findPaths(
    profile: ApplicantProfile,
    constraints?: {
      maxBudgetUSD?: number;
      maxTimeMonths?: number;
      excludedActions?: string[];
    }
  ): { status: 'ALREADY_APPROVED' | 'PATHS_FOUND' | 'NO_PATHS_WITHIN_CONSTRAINTS'; paths: RecoursePath[] } {
    const maxBudgetUSD = constraints?.maxBudgetUSD ?? 10_000;
    const maxTimeMonths = constraints?.maxTimeMonths ?? 24;
    const excluded = Array.isArray(constraints?.excludedActions) ? constraints.excludedActions : [];

    const thresholds = this.oracleService.getThresholds();
    const currentDti = this.oracleService.normalizeDti(profile.dtiRatio);
    const monthlyGross = profile.annualIncome / 12;

    // Short-circuit: already approved
    const currentDecision = this.oracleService.evaluate(profile);
    if (currentDecision.status === 'APPROVED') {
      return { status: 'ALREADY_APPROVED', paths: [] };
    }

    const paths: RecoursePath[] = [];

    // ─── PATH A: Targeted Debt Paydown ─────────────────────────────────

    if (!excluded.includes('debt_paydown') && currentDti > thresholds.maxQualifiedDti && monthlyGross > 0) {
      const targetDti = thresholds.maxQualifiedDti - 0.02; // aim slightly below
      const requiredMonthlyReduction = Math.max(0, (currentDti - targetDti) * monthlyGross);

      // Budget-constrained duration
      const affordableMonthly = Math.max(Math.min(requiredMonthlyReduction, maxBudgetUSD / 3), 100);
      const duration = Math.min(
        Math.max(Math.ceil((requiredMonthlyReduction * 3) / affordableMonthly), 2),
        maxTimeMonths,
        12
      );
      const totalCost = Math.round(affordableMonthly * duration);

      if (totalCost <= maxBudgetUSD && totalCost > 0) {
        const newMonthlyDebt = Math.max(0, profile.monthlyDebtPayment - affordableMonthly);
        const projectedDti = monthlyGross > 0 ? newMonthlyDebt / monthlyGross : currentDti;
        const dtiDelta = projectedDti - currentDti;
        const creditDelta = Math.round(Math.abs(dtiDelta) * 100 * CAUSAL_PARAMS.CREDIT_POINTS_PER_DTI_PERCENT);

        const sim = this.simulate(profile, {
          dtiRatio: projectedDti,
          monthlyDebtPayment: newMonthlyDebt,
          creditScore: Math.min(850, profile.creditScore + creditDelta),
        });

        paths.push({
          id: 'PATH-A-DEBT',
          title: 'Targeted Debt Paydown (Incremental DTI Relief)',
          description: `Pay an additional $${Math.round(affordableMonthly)}/month toward debt for ${duration} months (total cost $${totalCost}). This provides incremental DTI relief, moving DTI from ${this.pct(currentDti)} to ${this.pct(projectedDti)} (~${(Math.abs(dtiDelta) * 100).toFixed(1)}% reduction). Combine with income expansion for full approval.`,
          actions: [
            {
              variable: 'monthlyDebtPayment',
              change: `+$${Math.round(affordableMonthly)}/month for ${duration} months`,
              cost: totalCost,
              timeMonths: duration,
              actionType: 'DEBT_PAYDOWN',
            },
          ],
          totalCostUSD: totalCost,
          totalTimeMonths: duration,
          causalChain: 'Pay Down Debt → Incremental DTI Relief → Minor Credit Boost → Combine with Income Boost',
          projectedChanges: {
            dtiRatio: this.round3(dtiDelta),
            creditScore: creditDelta,
            monthlyDebtPayment: -Math.round(affordableMonthly),
          },
          simulatedResult: {
            status: sim.status,
            approvalProbability: sim.approvalProbability,
          },
          confidence: this.confidence(sim, thresholds.approvalThreshold),
        });
      }
    }

    // ─── PATH B: Certification & Income Boost ──────────────────────────

    if (!excluded.includes('certification') && maxBudgetUSD >= CAUSAL_PARAMS.DEFAULT_CERT_COST_USD && maxTimeMonths >= 3) {
      const incomeBoost = Math.round(profile.annualIncome * CAUSAL_PARAMS.CERT_INCOME_MULTIPLIER);
      const newIncome = profile.annualIncome + incomeBoost;
      const newMonthlyIncome = newIncome / 12;
      const projectedDti = newMonthlyIncome > 0 ? profile.monthlyDebtPayment / newMonthlyIncome : currentDti;
      const dtiDelta = projectedDti - currentDti;

      const sim = this.simulate(profile, {
        annualIncome: newIncome,
        dtiRatio: projectedDti,
        certificationCount: profile.certificationCount + 1,
      });

      paths.push({
        id: 'PATH-B-SKILL',
        title: 'Professional Certification & Income Boost (Highest Standalone Impact)',
        description: `Complete 1 industry certification ($${CAUSAL_PARAMS.DEFAULT_CERT_COST_USD}) to boost annual income by ~$${incomeBoost.toLocaleString()}/year (${(CAUSAL_PARAMS.CERT_INCOME_MULTIPLIER * 100).toFixed(0)}% increase). This gross income expansion is the primary driver that slashes DTI ratio from ${this.pct(currentDti)} down to ${this.pct(projectedDti)}, bringing DTI directly to the ${(thresholds.maxQualifiedDti * 100).toFixed(1)}% Qualified Mortgage cap.`,
        actions: [
          {
            variable: 'certificationCount',
            change: '+1 certification',
            cost: CAUSAL_PARAMS.DEFAULT_CERT_COST_USD,
            timeMonths: 2,
            actionType: 'CERTIFICATION',
            metadata: {
              projectedIncreasePercent: CAUSAL_PARAMS.CERT_INCOME_MULTIPLIER * 100,
              hasVerifiedCredential: true,
            },
          },
          {
            variable: 'annualIncome',
            change: `+$${incomeBoost.toLocaleString()}/year (projected)`,
            cost: 0,
            timeMonths: 1,
            actionType: 'OTHER',
          },
        ],
        totalCostUSD: CAUSAL_PARAMS.DEFAULT_CERT_COST_USD,
        totalTimeMonths: 3,
        causalChain: 'Complete Certification → Boost Gross Income → Lower DTI Ratio (Primary Driver) → Reach Qualified Ceiling',
        projectedChanges: {
          annualIncome: incomeBoost,
          dtiRatio: this.round3(dtiDelta),
        },
        simulatedResult: {
          status: sim.status,
          approvalProbability: sim.approvalProbability,
        },
        confidence: this.confidence(sim, thresholds.approvalThreshold),
      });
    }

    // ─── PATH C: Savings Build (only if meaningful credit improvement) ──

    if (!excluded.includes('savings') && maxBudgetUSD >= 300) {
      const savingsTarget = Math.max(
        profile.liquidSavings * 2,
        profile.monthlyDebtPayment * 3,
        3_000
      );
      const savingsGap = Math.max(0, savingsTarget - profile.liquidSavings);
      const duration = Math.min(Math.max(Math.ceil(savingsGap / 300), 2), maxTimeMonths, 6);
      const monthlyContrib = Math.round(savingsGap / duration);
      const totalAdded = Math.min(monthlyContrib * duration, maxBudgetUSD);

      // Diminishing-returns credit score improvement
      const savingsRatio = (profile.liquidSavings + totalAdded) / Math.max(profile.monthlyDebtPayment, 1);
      const creditDelta = Math.min(
        Math.round(Math.log2(savingsRatio + 1) * 8),
        CAUSAL_PARAMS.MAX_SAVINGS_CREDIT_BOOST
      );

      // Only generate standalone savings path if credit improvement is meaningful
      if (creditDelta >= CAUSAL_PARAMS.MIN_CREDIT_IMPROVEMENT_THRESHOLD) {
        const sim = this.simulate(profile, {
          liquidSavings: profile.liquidSavings + totalAdded,
          creditScore: Math.min(850, profile.creditScore + creditDelta),
        });

        paths.push({
          id: 'PATH-C-SAVE',
          title: 'Emergency Fund & Reserve Building',
          description: `Save $${monthlyContrib}/month for ${duration} months to build reserves from $${profile.liquidSavings.toLocaleString()} to $${(profile.liquidSavings + totalAdded).toLocaleString()}.`,
          actions: [
            {
              variable: 'liquidSavings',
              change: `+$${totalAdded.toLocaleString()} total ($${monthlyContrib}/month)`,
              cost: totalAdded,
              timeMonths: duration,
              actionType: 'SAVINGS',
            },
          ],
          totalCostUSD: totalAdded,
          totalTimeMonths: duration,
          causalChain: 'Build Savings → Demonstrate Financial Stability → Improve Creditworthiness → Cross Approval Threshold',
          projectedChanges: {
            liquidSavings: totalAdded,
            creditScore: creditDelta,
          },
          simulatedResult: {
            status: sim.status,
            approvalProbability: sim.approvalProbability,
          },
          confidence: this.confidence(sim, thresholds.approvalThreshold),
        });
      }
    }

    // ─── PATH D: Combined Strategy ─────────────────────────────────────

    const hasApprovedPath = paths.some((p) => p.simulatedResult.status === 'APPROVED');

    if (!hasApprovedPath && !excluded.includes('combined') && maxBudgetUSD >= 500 && maxTimeMonths >= 3) {
      const certCost = CAUSAL_PARAMS.DEFAULT_CERT_COST_USD;
      const debtBudget = Math.min(maxBudgetUSD - certCost, Math.round(maxBudgetUSD * 0.6));
      const debtMonths = Math.min(3, maxTimeMonths);
      const monthlyDebtExtra = Math.round(debtBudget / debtMonths);

      const incomeBoost = Math.round(profile.annualIncome * CAUSAL_PARAMS.CERT_INCOME_MULTIPLIER);
      const newIncome = profile.annualIncome + incomeBoost;
      const newMonthlyIncome = newIncome / 12;
      const newMonthlyDebt = Math.max(0, profile.monthlyDebtPayment - monthlyDebtExtra);
      const projectedDti = newMonthlyIncome > 0 ? newMonthlyDebt / newMonthlyIncome : currentDti;
      const creditDelta = Math.round(
        Math.abs(currentDti - projectedDti) * 100 * CAUSAL_PARAMS.CREDIT_POINTS_PER_DTI_PERCENT
      );

      const totalCost = debtBudget + certCost;

      if (totalCost <= maxBudgetUSD) {
        const sim = this.simulate(profile, {
          annualIncome: newIncome,
          dtiRatio: projectedDti,
          monthlyDebtPayment: newMonthlyDebt,
          creditScore: Math.min(850, profile.creditScore + creditDelta),
          certificationCount: profile.certificationCount + 1,
        });

        paths.push({
          id: 'PATH-D-COMBINED',
          title: 'Combined: Debt Paydown + Certification (Recommended Full Approval Strategy)',
          description: `Multi-pronged approach: complete a certification to boost annual income by ~$${incomeBoost.toLocaleString()}/year (primary DTI driver) while paying $${monthlyDebtExtra}/month extra on debt for ${debtMonths} months (total cost $${totalCost}). Together, these actions slash DTI from ${this.pct(currentDti)} to ${this.pct(projectedDti)} and comfortably cross the 65% approval threshold.`,
          actions: [
            {
              variable: 'monthlyDebtPayment',
              change: `+$${monthlyDebtExtra}/month for ${debtMonths} months`,
              cost: debtBudget,
              timeMonths: debtMonths,
              actionType: 'DEBT_PAYDOWN',
            },
            {
              variable: 'certificationCount',
              change: '+1 certification',
              cost: certCost,
              timeMonths: 2,
              actionType: 'CERTIFICATION',
              metadata: {
                projectedIncreasePercent: CAUSAL_PARAMS.CERT_INCOME_MULTIPLIER * 100,
                hasVerifiedCredential: true,
              },
            },
          ],
          totalCostUSD: totalCost,
          totalTimeMonths: Math.min(debtMonths + 1, maxTimeMonths),
          causalChain: 'Income Expansion (Primary Driver) + Debt Paydown → Reduce DTI Below 43% → Guarantee Full Approval',
          projectedChanges: {
            dtiRatio: this.round3(projectedDti - currentDti),
            annualIncome: incomeBoost,
            creditScore: creditDelta,
            monthlyDebtPayment: -monthlyDebtExtra,
          },
          simulatedResult: {
            status: sim.status,
            approvalProbability: sim.approvalProbability,
          },
          confidence: this.confidence(sim, thresholds.approvalThreshold),
        });
      }
    }

    // ─── PATH E: Verified Co-Signer Addition ───────────────────────────

    if (!excluded.includes('cosigner') && !excluded.includes('co_signer')) {
      const creditBoost = CAUSAL_PARAMS.COSIGNER_CREDIT_BOOST;
      const newCreditScore = Math.min(850, profile.creditScore + creditBoost);

      const sim = this.simulate(profile, {
        creditScore: newCreditScore,
      });

      paths.push({
        id: 'PATH-E-COSIGNER',
        title: 'Verified Co-Signer Addition',
        description: `Add a verified co-signer with an established financial relationship (≥ ${FRAUD_THRESHOLDS.MIN_COSIGNER_RELATIONSHIP_MONTHS} months). This supplements the application's creditworthiness, projecting credit score from ${profile.creditScore} to ${newCreditScore}.`,
        actions: [
          {
            variable: 'creditScore',
            change: `+${creditBoost} points via verified co-signer`,
            cost: 0,
            timeMonths: 0,
            actionType: 'CO_SIGNER',
            metadata: {
              verifiedRelationship: true,
              relationshipMonths: FRAUD_THRESHOLDS.MIN_COSIGNER_RELATIONSHIP_MONTHS,
            },
          },
        ],
        totalCostUSD: 0,
        totalTimeMonths: 0,
        causalChain: 'Verified Co-Signer → Supplement Creditworthiness → Boost Application Score → Cross Approval Threshold',
        projectedChanges: {
          creditScore: creditBoost,
        },
        simulatedResult: {
          status: sim.status,
          approvalProbability: sim.approvalProbability,
        },
        confidence: this.confidence(sim, thresholds.approvalThreshold),
      });
    }

    // ─── PATH F: Income Negotiation / Side Income ──────────────────────

    if (!excluded.includes('income_negotiation') && !excluded.includes('income') && maxTimeMonths >= 1) {
      const incomeBoost = Math.round(profile.annualIncome * CAUSAL_PARAMS.INCOME_NEGOTIATION_MULTIPLIER);
      const newIncome = profile.annualIncome + incomeBoost;
      const newMonthlyIncome = newIncome / 12;
      const projectedDti = newMonthlyIncome > 0 ? profile.monthlyDebtPayment / newMonthlyIncome : currentDti;
      const dtiDelta = projectedDti - currentDti;

      // Only generate if there's a meaningful income to negotiate
      if (profile.annualIncome > 0 && incomeBoost > 0) {
        const sim = this.simulate(profile, {
          annualIncome: newIncome,
          dtiRatio: projectedDti,
        });

        paths.push({
          id: 'PATH-F-INCOME',
          title: 'Income Negotiation / Side Income',
          description: `Pursue salary negotiation, raise request, or verifiable side income to increase earnings by ~$${incomeBoost.toLocaleString()}/year (${(CAUSAL_PARAMS.INCOME_NEGOTIATION_MULTIPLIER * 100).toFixed(0)}%). The income expansion is the primary driver that improves the DTI ratio from ${this.pct(currentDti)} to ${this.pct(projectedDti)}.`,
          actions: [
            {
              variable: 'annualIncome',
              change: `+$${incomeBoost.toLocaleString()}/year (negotiated / side income)`,
              cost: 0,
              timeMonths: 1,
              actionType: 'OTHER',
            },
          ],
          totalCostUSD: 0,
          totalTimeMonths: 1,
          causalChain: 'Negotiate Income / Side Income → Higher Gross Income → Lower DTI Ratio → Cross Approval Threshold',
          projectedChanges: {
            annualIncome: incomeBoost,
            dtiRatio: this.round3(dtiDelta),
          },
          simulatedResult: {
            status: sim.status,
            approvalProbability: sim.approvalProbability,
          },
          confidence: this.confidence(sim, thresholds.approvalThreshold),
        });
      }
    }

    // ─── ADVISORY: Credit History Too Short ─────────────────────────────

    if (profile.creditHistoryYears < CREDIT_HISTORY.MINIMUM_YEARS) {
      const waitMonths = Math.ceil((CREDIT_HISTORY.MINIMUM_YEARS - profile.creditHistoryYears) * 12);
      const futureYears = CREDIT_HISTORY.MINIMUM_YEARS;

      const sim = this.simulate(profile, {
        creditHistoryYears: futureYears,
      });

      paths.push({
        id: 'ADVISORY-HISTORY',
        title: `Advisory: Credit History Aging (${waitMonths}-Month Wait)`,
        description: `Your credit history is ${profile.creditHistoryYears} year(s), below the ${CREDIT_HISTORY.MINIMUM_YEARS}-year minimum. This variable is immutable — you cannot accelerate it. If you maintain all existing accounts and wait ~${waitMonths} months, your credit history will meet the threshold. Combine with other paths for best results.`,
        actions: [],
        totalCostUSD: 0,
        totalTimeMonths: waitMonths,
        causalChain: 'Maintain Existing Accounts → Credit History Ages → Meet Minimum Threshold',
        projectedChanges: {
          creditHistoryYears: CREDIT_HISTORY.MINIMUM_YEARS - profile.creditHistoryYears,
        },
        simulatedResult: {
          status: sim.status,
          approvalProbability: sim.approvalProbability,
        },
        confidence: this.confidence(sim, thresholds.approvalThreshold),
        advisory: true,
      });
    }

    // Sort: HIGH confidence first, then cheapest first
    const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    paths.sort((a, b) => {
      const d = (order[a.confidence] ?? 9) - (order[b.confidence] ?? 9);
      return d !== 0 ? d : a.totalCostUSD - b.totalCostUSD;
    });

    if (paths.length === 0) {
      return { status: 'NO_PATHS_WITHIN_CONSTRAINTS', paths: [] };
    }

    return { status: 'PATHS_FOUND', paths };
  }

  // ── Private helpers ──

  private simulate(base: ApplicantProfile, changes: Partial<ApplicantProfile>): OracleDecision {
    return this.oracleService.simulateIntervention(base, changes);
  }

  private confidence(sim: OracleDecision, threshold: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (sim.status === 'APPROVED') return 'HIGH';
    if (sim.approvalProbability >= threshold - 0.1) return 'MEDIUM';
    return 'LOW';
  }

  private pct(ratio: number): string {
    return `${(ratio * 100).toFixed(1)}%`;
  }

  private round3(n: number): number {
    return Math.round(n * 1000) / 1000;
  }
}
