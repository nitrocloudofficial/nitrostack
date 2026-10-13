/**
 * CREED-Lite — Fraud Check MCP Tools
 *
 * Exposes check_fraud_safety tool and fraud audit logs resource.
 * Uses NitroStack DI, @UseGuards, and structured action schemas.
 */

import {
  ToolDecorator as Tool,
  ResourceDecorator as Resource,
  z,
  ExecutionContext,
  Injectable,
  UseGuards,
  UseInterceptors,
  UseFilters,
} from '@nitrostack/core';
import { FraudSafetyService } from './fraud.service.js';
import { FraudSafetyGuard } from './fraud.guard.js';
import { AuditInterceptor } from '../common/audit.interceptor.js';
import { CREEDExceptionFilter } from '../common/creed-exception.filter.js';

@Injectable({ deps: [FraudSafetyService] })
export class FraudTools {
  constructor(private fraudService: FraudSafetyService) {}

  // ── Resource: Historical Audit Logs ──

  @Resource({
    uri: 'fraud://historical-audit-logs',
    name: 'Fraud Detection Audit Database & Pattern Rules',
    description:
      'Ground-truth historical inquiry audit logs, detection rules, and pattern signatures for Tradeline Renting, Loan Stacking, Debt Parking, and Unverified Income Inflation.',
    mimeType: 'application/json',
  })
  async getFraudAuditLogs(_ctx: ExecutionContext) {
    return this.fraudService.getHistoricalAuditLogs();
  }

  // ── Tool: Check Fraud Safety ──

  @Tool({
    name: 'check_fraud_safety',
    description:
      'Check a proposed action path against 4 named industry fraud vectors: Tradeline Renting, Loan Stacking, Debt Parking, and Unverified Income Inflation. Uses typed action schemas for reliable detection.',
    inputSchema: z.object({
      pathId: z.string().describe('The ID of the recourse path to check'),
      actions: z.array(
        z.object({
          variable: z.string().describe('The financial variable being changed'),
          change: z.string().describe('Description of the change'),
          cost: z.number().default(0).describe('Cost in USD'),
          timeMonths: z.number().default(0).describe('Duration in months'),
          actionType: z
            .enum(['DEBT_PAYDOWN', 'CERTIFICATION', 'SAVINGS', 'CO_SIGNER', 'MULTI_LENDER', 'LOAN_PAYOFF', 'OTHER'])
            .optional()
            .describe('Typed action category (recommended for accurate detection). Falls back to string inference if omitted.'),
          metadata: z
            .object({
              verifiedRelationship: z.boolean().optional(),
              relationshipMonths: z.number().optional(),
              pendingApplications: z.number().optional(),
              disclosedToLender: z.boolean().optional(),
              followedByReapply: z.boolean().optional(),
              daysBetweenPayoffAndReapply: z.number().optional(),
              projectedIncreasePercent: z.number().optional(),
              hasVerifiedCredential: z.boolean().optional(),
            })
            .optional()
            .describe('Structured metadata for fraud evaluation'),
        })
      ).describe('The list of actions in the path'),
    }),
  })
  @UseGuards(FraudSafetyGuard as any)
  @UseInterceptors(AuditInterceptor)
  @UseFilters(CREEDExceptionFilter)
  async checkFraudSafety(input: Record<string, unknown>, ctx: ExecutionContext) {
    ctx.logger.info('Checking fraud safety', { pathId: String(input.pathId) });

    const allViolations = this.fraudService.evaluateAllViolations({
      actions: input.actions as any[],
    });

    if (allViolations.length === 0) {
      return {
        pathId: String(input.pathId),
        isSafe: true,
        violationCount: 0,
        violations: [],
      };
    }

    return {
      pathId: String(input.pathId),
      isSafe: false,
      violationCount: allViolations.length,
      violations: allViolations.map((v) => ({
        fraudVector: v.vector,
        reason: v.reason,
        resolution: v.rerouteAction,
      })),
      primaryVector: allViolations[0].vector,
      primaryReason: allViolations[0].reason,
      primaryResolution: allViolations[0].rerouteAction,
    };
  }
}
