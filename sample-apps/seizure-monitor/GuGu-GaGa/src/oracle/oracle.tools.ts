/**
 * CREED-Lite — Oracle MCP Tools
 *
 * Exposes evaluate_applicant and simulate_intervention as MCP tools.
 * Uses NitroStack DI, @Cache, @RateLimit, @UseInterceptors, and ctx.logger.
 */

import {
  ToolDecorator as Tool,
  ResourceDecorator as Resource,
  z,
  ExecutionContext,
  Injectable,
  Cache,
  RateLimit,
  UseInterceptors,
  UseFilters,
} from '@nitrostack/core';
import { OracleService } from './oracle.service.js';
import { AuditInterceptor } from '../common/audit.interceptor.js';
import { CREEDExceptionFilter } from '../common/creed-exception.filter.js';

@Injectable({ deps: [OracleService] })
export class OracleTools {
  constructor(private oracleService: OracleService) {}

  // ── Resource: Underwriting Policy ──

  @Resource({
    uri: 'policy://underwriting-thresholds',
    name: 'Bank Underwriting & Fraud Policy Manual',
    description:
      'Underwriting risk thresholds and structural causal model policy rules enforced by the bank.',
    mimeType: 'application/json',
  })
  async getUnderwritingPolicy(_ctx: ExecutionContext) {
    const t = this.oracleService.getThresholds();
    return {
      policyName: 'NitroBank Underwriting & Causal Recourse Policy v2.0',
      scoringModel: 'Continuous piecewise-linear (no step-function cliffs)',
      thresholds: {
        primeCreditScore: t.primeCreditScore,
        superPrimeCreditScore: t.superPrimeCreditScore,
        maxQualifiedDti: t.maxQualifiedDti,
        minIncomeUsd: t.minimumIncome,
        minCreditHistoryYears: t.minimumHistory,
        approvalThreshold: `${t.approvalThreshold * 100}%`,
      },
      fraudPreventionRules: [
        { vector: 'TRADELINE_RENTING', check: 'Unverified co-signer relationship < 6 months' },
        { vector: 'LOAN_STACKING', check: 'Undisclosed pending applications within 30 days' },
        { vector: 'DEBT_PARKING', check: 'Payoff-to-reapplication window < 14 days' },
        { vector: 'UNVERIFIED_INCOME_INFLATION', check: 'Income increase > 50% without credential' },
      ],
    };
  }

  // ── Tool: Evaluate Applicant ──

  @Tool({
    name: 'evaluate_applicant',
    description:
      'Evaluate a loan applicant against the bank underwriting model. Returns APPROVED/REJECTED with continuous probability score, component-level breakdown, and risk factors.',
    inputSchema: z.object({
      creditScore: z.number().min(300).max(850).describe('FICO credit score (300-850)'),
      dtiRatio: z
        .number()
        .min(0)
        .max(100)
        .describe('Debt-to-income ratio — accepts both decimal (0.48) and percentage (48) formats'),
      annualIncome: z.number().min(0).describe('Annual income in USD'),
      liquidSavings: z.number().min(0).describe('Liquid savings in USD'),
      creditHistoryYears: z.number().min(0).describe('Years of credit history'),
      monthlyDebtPayment: z.number().min(0).describe('Monthly debt payment in USD'),
      certificationCount: z.number().min(0).default(0).describe('Number of professional certifications'),
    }),
  })
  @Cache({ ttl: 60, key: (input) => JSON.stringify(input) })
  @RateLimit({ requests: 100, window: '1m' })
  @UseInterceptors(AuditInterceptor)
  @UseFilters(CREEDExceptionFilter)
  async evaluateApplicant(input: Record<string, unknown>, ctx: ExecutionContext) {
    ctx.logger.info('Evaluating applicant', {
      creditScore: Number(input.creditScore),
      dtiRatio: Number(input.dtiRatio),
    });

    const decision = this.oracleService.evaluate(input as any);

    ctx.logger.info('Decision reached', {
      status: decision.status,
      probability: decision.approvalProbability,
    });

    return {
      decision: decision.status,
      approvalProbability: `${(decision.approvalProbability * 100).toFixed(1)}%`,
      riskFactors: decision.riskFactors,
      scoreBreakdown: decision.scoreBreakdown,
      message:
        decision.status === 'REJECTED'
          ? 'Application denied. Use find_recourse_paths to discover actionable, budget-constrained paths to approval.'
          : 'Application approved. No recourse action needed.',
    };
  }

  // ── Tool: Simulate Intervention ──

  @Tool({
    name: 'simulate_intervention',
    description:
      'Simulate what happens if the applicant makes specific financial changes. Compares before/after against the bank model with full score breakdown.',
    inputSchema: z.object({
      originalProfile: z.object({
        creditScore: z.number(),
        dtiRatio: z.number(),
        annualIncome: z.number(),
        liquidSavings: z.number(),
        creditHistoryYears: z.number(),
        monthlyDebtPayment: z.number(),
        certificationCount: z.number().default(0),
      }),
      proposedChanges: z.object({
        creditScore: z.number().optional(),
        dtiRatio: z.number().optional(),
        annualIncome: z.number().optional(),
        liquidSavings: z.number().optional(),
        monthlyDebtPayment: z.number().optional(),
        certificationCount: z.number().optional(),
      }),
    }),
  })
  @UseInterceptors(AuditInterceptor)
  @UseFilters(CREEDExceptionFilter)
  async simulateIntervention(input: Record<string, unknown>, ctx: ExecutionContext) {
    const { originalProfile, proposedChanges } = input as any;

    ctx.logger.info('Simulating intervention', { proposedChanges });

    const before = this.oracleService.evaluate(originalProfile);
    const after = this.oracleService.simulateIntervention(originalProfile, proposedChanges);

    const probabilityDelta = after.approvalProbability - before.approvalProbability;

    return {
      beforeIntervention: {
        status: before.status,
        probability: `${(before.approvalProbability * 100).toFixed(1)}%`,
        scoreBreakdown: before.scoreBreakdown,
      },
      afterIntervention: {
        status: after.status,
        probability: `${(after.approvalProbability * 100).toFixed(1)}%`,
        scoreBreakdown: after.scoreBreakdown,
      },
      probabilityChange: `${probabilityDelta > 0 ? '+' : ''}${(probabilityDelta * 100).toFixed(1)}%`,
      outcomeFlipped: before.status === 'REJECTED' && after.status === 'APPROVED',
      message:
        after.status === 'APPROVED'
          ? '✅ This intervention path leads to APPROVAL!'
          : '❌ This intervention is not sufficient. Try additional changes or use find_recourse_paths for optimized suggestions.',
    };
  }
}
