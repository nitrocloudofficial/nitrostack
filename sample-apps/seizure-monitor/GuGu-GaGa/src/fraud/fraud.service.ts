/**
 * CREED-Lite — Fraud Safety Service
 *
 * PRODUCTION VERSION — Schema-based fraud detection using typed actionType
 * enums and structured metadata instead of brittle string matching.
 *
 * Detects 4 named fraud vectors:
 *   1. TRADELINE_RENTING
 *   2. LOAN_STACKING
 *   3. DEBT_PARKING
 *   4. UNVERIFIED_INCOME_INFLATION
 */

import { Injectable } from '@nitrostack/core';
import { FRAUD_THRESHOLDS } from '../config/thresholds.js';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ActionType =
  | 'DEBT_PAYDOWN'
  | 'CERTIFICATION'
  | 'SAVINGS'
  | 'CO_SIGNER'
  | 'MULTI_LENDER'
  | 'LOAN_PAYOFF'
  | 'OTHER';

export type FraudVector =
  | 'TRADELINE_RENTING'
  | 'LOAN_STACKING'
  | 'DEBT_PARKING'
  | 'UNVERIFIED_INCOME_INFLATION';

export type RerouteAction =
  | 'ATTACH_DISCLOSURE'
  | 'INJECT_DISCLOSURE_STEP'
  | 'INSERT_SEASONING_DELAY'
  | 'REQUIRE_PAYSTUB_VERIFICATION';

export interface ActionMetadata {
  /** Co-signer fields */
  verifiedRelationship?: boolean;
  relationshipMonths?: number;
  /** Multi-lender fields */
  pendingApplications?: number;
  disclosedToLender?: boolean;
  /** Payoff fields */
  followedByReapply?: boolean;
  daysBetweenPayoffAndReapply?: number;
  /** Income fields */
  projectedIncreasePercent?: number;
  hasVerifiedCredential?: boolean;
}

export interface RecourseAction {
  variable: string;
  change: string;
  cost: number;
  timeMonths: number;
  actionType?: ActionType;
  metadata?: ActionMetadata;
}

export interface FraudEvaluation {
  hasRisk: boolean;
  vector?: FraudVector;
  reason?: string;
  rerouteAction?: RerouteAction;
}

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class FraudSafetyService {

  // ── Historical Audit Database (simulated ground-truth data) ──

  getHistoricalAuditLogs() {
    return {
      bureauInquiryWindowDays: 30,
      knownFraudPatterns: [
        {
          id: 'FP-01',
          name: 'Tradeline Renting',
          vector: 'TRADELINE_RENTING' as const,
          description: 'Adding an authorized user or co-signer with unverified financial relationship (< 6 months).',
          detectionRule: `Co-signer / authorized user added within ${FRAUD_THRESHOLDS.MIN_COSIGNER_RELATIONSHIP_MONTHS * 30} days of loan application without relationship verification.`,
        },
        {
          id: 'FP-02',
          name: 'Loan Stacking',
          vector: 'LOAN_STACKING' as const,
          description: 'Applying for multiple unsecured loans simultaneously across different fintech lenders.',
          detectionRule: '>= 2 credit inquiries or applications recorded across lenders within 30 consecutive days.',
        },
        {
          id: 'FP-03',
          name: 'Debt Parking / Window Dressing',
          vector: 'DEBT_PARKING' as const,
          description: 'Temporarily paying off credit balances using short-term private loans right before application snapshot.',
          detectionRule: `Abrupt >30% balance reduction followed by reapplication in < ${FRAUD_THRESHOLDS.MAX_PAYOFF_REAPPLY_DAYS} days without verified source of funds.`,
        },
        {
          id: 'FP-04',
          name: 'Unverified Income Inflation',
          vector: 'UNVERIFIED_INCOME_INFLATION' as const,
          description: `Reporting a projected income increase exceeding ${FRAUD_THRESHOLDS.MAX_UNVERIFIED_INCOME_INCREASE_PCT}% without corresponding job change or credential.`,
          detectionRule: `Stated income change > ${FRAUD_THRESHOLDS.MAX_UNVERIFIED_INCOME_INCREASE_PCT}% without accredited certification or employer verification.`,
        },
      ],
      sampleAuditTrail: [
        { applicantId: 'APP-9021', date: '2026-07-01', event: 'Credit Inquiry (Lender A)' },
        { applicantId: 'APP-9021', date: '2026-07-10', event: 'Credit Inquiry (Lender B)' },
        { applicantId: 'APP-9021', date: '2026-07-15', event: 'Co-signer added (Relationship: Unverified)' },
      ],
    };
  }

  // ── Core Evaluation ──

  /**
   * Evaluate a path for ALL fraud violations (not just the first).
   * Returns an array of every detected fraud vector.
   */
  evaluateAllViolations(path: { actions?: RecourseAction[] }): FraudEvaluation[] {
    const actions = path.actions || [];
    const violations: FraudEvaluation[] = [];

    for (const action of actions) {
      const resolvedType = this.resolveActionType(action);

      // ── VECTOR 1: Tradeline Renting ──
      if (resolvedType === 'CO_SIGNER') {
        const meta = action.metadata || {};
        if (!meta.verifiedRelationship || (meta.relationshipMonths ?? 0) < FRAUD_THRESHOLDS.MIN_COSIGNER_RELATIONSHIP_MONTHS) {
          violations.push({
            hasRisk: true,
            vector: 'TRADELINE_RENTING',
            reason: `Co-signer relationship is unverified or < ${FRAUD_THRESHOLDS.MIN_COSIGNER_RELATIONSHIP_MONTHS} months old (Tradeline Renting risk).`,
            rerouteAction: 'ATTACH_DISCLOSURE',
          });
        }
      }

      // ── VECTOR 2: Loan Stacking ──
      if (resolvedType === 'MULTI_LENDER') {
        const meta = action.metadata || {};
        if ((meta.pendingApplications ?? 1) > 0 && !meta.disclosedToLender) {
          violations.push({
            hasRisk: true,
            vector: 'LOAN_STACKING',
            reason: 'Undisclosed pending credit applications within 30-day window (Loan Stacking risk).',
            rerouteAction: 'INJECT_DISCLOSURE_STEP',
          });
        }
      }

      // ── VECTOR 3: Debt Parking ──
      if (resolvedType === 'LOAN_PAYOFF') {
        const meta = action.metadata || {};
        if (meta.followedByReapply && (meta.daysBetweenPayoffAndReapply ?? 0) < FRAUD_THRESHOLDS.MAX_PAYOFF_REAPPLY_DAYS) {
          violations.push({
            hasRisk: true,
            vector: 'DEBT_PARKING',
            reason: `Payoff-to-reapplication window < ${FRAUD_THRESHOLDS.MAX_PAYOFF_REAPPLY_DAYS} days detected (Debt Parking / Window-Dressing risk).`,
            rerouteAction: 'INSERT_SEASONING_DELAY',
          });
        }
      }

      // ── VECTOR 4: Unverified Income Inflation ──
      if (resolvedType === 'CERTIFICATION' || resolvedType === 'OTHER') {
        const meta = action.metadata || {};
        if (
          meta.projectedIncreasePercent !== undefined &&
          meta.projectedIncreasePercent > FRAUD_THRESHOLDS.MAX_UNVERIFIED_INCOME_INCREASE_PCT &&
          !meta.hasVerifiedCredential
        ) {
          violations.push({
            hasRisk: true,
            vector: 'UNVERIFIED_INCOME_INFLATION',
            reason: `Projected income increase exceeds ${FRAUD_THRESHOLDS.MAX_UNVERIFIED_INCOME_INCREASE_PCT}% without verified credential or employment offer.`,
            rerouteAction: 'REQUIRE_PAYSTUB_VERIFICATION',
          });
        }
      }
    }

    return violations;
  }

  /**
   * Backward-compatible single-violation evaluation.
   * Returns the most severe violation, or { hasRisk: false } if clean.
   *
   * Severity order: DEBT_PARKING > LOAN_STACKING > TRADELINE_RENTING > UNVERIFIED_INCOME_INFLATION
   */
  evaluatePath(path: { actions?: RecourseAction[] }): FraudEvaluation {
    const violations = this.evaluateAllViolations(path);
    if (violations.length === 0) return { hasRisk: false };

    // Return most severe
    const severityOrder: FraudVector[] = [
      'DEBT_PARKING',
      'LOAN_STACKING',
      'TRADELINE_RENTING',
      'UNVERIFIED_INCOME_INFLATION',
    ];
    const sorted = violations.sort((a, b) => {
      const ai = severityOrder.indexOf(a.vector!);
      const bi = severityOrder.indexOf(b.vector!);
      return ai - bi;
    });
    return sorted[0];
  }

  // ── Flag & Reroute ──

  flagAndReroute(path: Record<string, unknown>, evaluation: FraudEvaluation): Record<string, unknown> {
    const modified = JSON.parse(JSON.stringify(path));
    modified.fraudMetadata = {
      flagged: true,
      vector: evaluation.vector,
      originalReason: evaluation.reason,
    };

    switch (evaluation.rerouteAction) {
      case 'ATTACH_DISCLOSURE':
        modified.title = `${path.title} (Verified Co-Signer Required)`;
        modified.warnings = [
          '⚠️ This path requires the co-signer to have a genuine, verifiable financial relationship (>6 months). An affidavit is required.',
        ];
        break;
      case 'INJECT_DISCLOSURE_STEP':
        modified.title = `${path.title} (With Multi-Lender Disclosure)`;
        if (Array.isArray(modified.actions)) {
          modified.actions.unshift({
            variable: 'disclosure',
            change: 'Submit multi-lender disclosure form',
            cost: 0,
            timeMonths: 0,
            actionType: 'OTHER',
          });
        }
        break;
      case 'INSERT_SEASONING_DELAY':
        modified.title = `${path.title} (With 30-Day Balance Seasoning)`;
        modified.totalTimeMonths = (modified.totalTimeMonths || 0) + 1;
        modified.warnings = [
          '⏳ A 30-day seasoning period is required after payoff before reapplying.',
        ];
        break;
      case 'REQUIRE_PAYSTUB_VERIFICATION':
        modified.title = `${path.title} (Income Audit Required)`;
        modified.warnings = [
          '📄 Income projection requires 2 recent paystubs or an official employment offer letter.',
        ];
        break;
    }

    return modified;
  }

  // ── Private: Resolve Action Type ──

  /**
   * Determines the ActionType using the typed `actionType` field first.
   * Falls back to best-effort inference from variable/change strings for
   * backward compatibility with untyped external input.
   */
  private resolveActionType(action: RecourseAction): ActionType {
    if (action.actionType) return action.actionType;

    // Backward-compatible inference from variable/change strings
    const v = (action.variable || '').toLowerCase();
    const c = (action.change || '').toLowerCase();

    if (v.includes('cosigner') || v.includes('co_signer') || v.includes('tradeline') || c.includes('co-signer')) {
      return 'CO_SIGNER';
    }
    if (v.includes('lender') || v.includes('stacking') || c.includes('multi-lender')) {
      return 'MULTI_LENDER';
    }
    if (v.includes('payoff') || v.includes('pay_off') || v === 'pay_off_loan' || c.includes('temporary payoff')) {
      return 'LOAN_PAYOFF';
    }
    if (v.includes('debt') || c.includes('debt')) {
      return 'DEBT_PAYDOWN';
    }
    if (v.includes('cert') || c.includes('certification')) {
      return 'CERTIFICATION';
    }
    if (v.includes('saving') || c.includes('save')) {
      return 'SAVINGS';
    }

    return 'OTHER';
  }
}
