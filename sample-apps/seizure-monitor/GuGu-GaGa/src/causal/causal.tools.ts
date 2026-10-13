/**
 * CREED-Lite — Causal Recourse MCP Tools
 *
 * Exposes get_causal_graph and find_recourse_paths as MCP tools.
 * find_recourse_paths now requires the full applicant profile so
 * recourse is computed from the applicant's actual financial numbers.
 */

import {
  ToolDecorator as Tool,
  z,
  ExecutionContext,
  Injectable,
  UseInterceptors,
  UseFilters,
} from '@nitrostack/core';
import { CausalGraphService } from './causal.service.js';
import { FraudSafetyService } from '../fraud/fraud.service.js';
import { AuditInterceptor } from '../common/audit.interceptor.js';
import { CREEDExceptionFilter } from '../common/creed-exception.filter.js';

@Injectable({ deps: [CausalGraphService, FraudSafetyService] })
export class CausalTools {
  constructor(
    private causalService: CausalGraphService,
    private fraudService: FraudSafetyService,
  ) {}

  // ── Tool: Get Causal Graph ──

  @Tool({
    name: 'get_causal_graph',
    description:
      'Returns the structural causal model (SCM) showing how financial variables are causally connected. Use this to understand which actions affect which outcomes.',
    inputSchema: z.object({}),
  })
  @UseInterceptors(AuditInterceptor)
  async getCausalGraph(_input: Record<string, unknown>, _ctx: ExecutionContext) {
    return this.causalService.getGraph();
  }

  // ── Tool: Find Recourse Paths ──

  @Tool({
    name: 'find_recourse_paths',
    description:
      'Find causally valid and fraud-checked action paths that can flip a loan rejection to approval. Computes individualized recourse from the applicant\'s actual profile. Each path includes a simulated Oracle re-evaluation proving whether it achieves approval.',
    inputSchema: z.object({
      // Applicant profile (required for dynamic computation)
      creditScore: z.number().min(300).max(850).describe('FICO credit score (300-850)'),
      dtiRatio: z
        .number()
        .min(0)
        .max(100)
        .describe('Debt-to-income ratio — accepts decimal (0.48) or percentage (48)'),
      annualIncome: z.number().min(0).describe('Annual income in USD'),
      liquidSavings: z.number().min(0).describe('Liquid savings in USD'),
      creditHistoryYears: z.number().min(0).describe('Years of credit history'),
      monthlyDebtPayment: z.number().min(0).describe('Monthly debt payment in USD'),
      certificationCount: z.number().min(0).default(0).describe('Number of professional certifications'),
      // Constraints
      maxBudgetUSD: z.number().default(1000).describe('Maximum budget the applicant can spend (USD)'),
      maxTimeMonths: z.number().default(6).describe('Maximum months the applicant is willing to wait'),
      excludedActions: z
        .array(z.string())
        .default([])
        .describe('Actions the applicant cannot take (e.g., "certification", "debt_paydown", "savings", "combined")'),
    }),
  })
  @UseInterceptors(AuditInterceptor)
  @UseFilters(CREEDExceptionFilter)
  async findRecoursePaths(input: Record<string, unknown>, ctx: ExecutionContext) {
    ctx.logger.info('Finding recourse paths', {
      creditScore: String(input.creditScore),
      dtiRatio: String(input.dtiRatio),
      maxBudgetUSD: String(input.maxBudgetUSD),
    });

    // Build the profile from input
    const profile = {
      creditScore: input.creditScore as number,
      dtiRatio: input.dtiRatio as number,
      annualIncome: input.annualIncome as number,
      liquidSavings: input.liquidSavings as number,
      creditHistoryYears: input.creditHistoryYears as number,
      monthlyDebtPayment: input.monthlyDebtPayment as number,
      certificationCount: (input.certificationCount as number) ?? 0,
    };

    const constraints = {
      maxBudgetUSD: input.maxBudgetUSD as number,
      maxTimeMonths: input.maxTimeMonths as number,
      excludedActions: input.excludedActions as string[],
    };

    // Step 1: Generate candidate paths from causal graph (dynamic per-profile)
    const { status, paths: rawPaths } = this.causalService.findPaths(profile, constraints);

    // Step 2: Handle already-approved case
    if (status === 'ALREADY_APPROVED') {
      ctx.logger.info('Applicant is already approved — no recourse needed');
      return {
        status: 'ALREADY_APPROVED',
        totalPathsGenerated: 0,
        pathsLeadingToApproval: 0,
        pathsReturned: 0,
        paths: [],
        note: 'This applicant already meets the approval threshold. No recourse action is needed.',
      };
    }

    // Step 3: Handle no-paths-within-constraints case
    if (status === 'NO_PATHS_WITHIN_CONSTRAINTS') {
      ctx.logger.info('No paths exist within the given constraints');
      return {
        status: 'NO_PATHS_WITHIN_CONSTRAINTS',
        totalPathsGenerated: 0,
        pathsLeadingToApproval: 0,
        pathsReturned: 0,
        paths: [],
        note: `No recourse paths could be generated within the budget of $${constraints.maxBudgetUSD} and ${constraints.maxTimeMonths}-month time limit. Try increasing the budget, extending the timeline, or removing excluded actions.`,
      };
    }

    // Step 4: Run each path through fraud safety checks
    const evaluatedPaths = rawPaths.map((path) => {
      // Skip fraud check for advisory-only paths (no actions)
      if (path.advisory || path.actions.length === 0) {
        return {
          ...path,
          fraudSafety: { checked: false, advisory: true },
        };
      }

      const fraudCheck = this.fraudService.evaluatePath({ actions: path.actions });
      if (fraudCheck.hasRisk) {
        const rerouted = this.fraudService.flagAndReroute(path as any, fraudCheck);
        return {
          ...rerouted,
          fraudSafety: {
            checked: true,
            originallyFlagged: true,
            vector: fraudCheck.vector,
            resolution: fraudCheck.rerouteAction,
          },
        };
      }
      return {
        ...path,
        fraudSafety: { checked: true, originallyFlagged: false },
      };
    });

    const approvedPaths = evaluatedPaths.filter(
      (p: any) => p.simulatedResult?.status === 'APPROVED'
    );
    const advisoryPaths = evaluatedPaths.filter(
      (p: any) => p.advisory === true
    );

    ctx.logger.info('Recourse paths generated', {
      total: rawPaths.length,
      leadToApproval: approvedPaths.length,
      advisory: advisoryPaths.length,
    });

    return {
      status: 'PATHS_FOUND',
      totalPathsGenerated: rawPaths.length,
      pathsLeadingToApproval: approvedPaths.length,
      advisoryPaths: advisoryPaths.length,
      pathsReturned: evaluatedPaths.length,
      paths: evaluatedPaths,
      note: 'All paths are computed from the applicant\'s actual profile and validated against the Structural Causal Model. Each path includes a simulated Oracle re-evaluation. Advisory paths indicate factors that cannot be directly changed but affect the outcome.',
    };
  }
}
