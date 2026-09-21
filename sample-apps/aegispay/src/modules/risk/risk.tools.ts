import { ToolDecorator as Tool, Widget, UseGuards, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { JWTGuard } from '../../guards/jwt.guard.js';
import { RiskAssessmentService } from './risk-assessment.service.js';

// See invoices.tools.ts for why @Injectable({ deps: [...] }) is required on
// tool controllers, not just services/guards.
@Injectable({ deps: [RiskAssessmentService] })
export class RiskTools {
  constructor(private riskAssessmentService: RiskAssessmentService) {}

  @Tool({
    name: 'assess_payment_risk',
    description:
      'Run the deterministic risk engine against a pending invoice and return its risk flags and approval tier (AUTO, SINGLE_APPROVAL, DUAL_APPROVAL, or BLOCKED).',
    inputSchema: z.object({
      invoiceId: z
        .string()
        .describe('ID of the invoice to assess, e.g. "INV-0018". Must currently exist in the invoice queue.'),
    }),
    examples: {
      request: { invoiceId: 'INV-0018' },
      response: {
        invoiceId: 'INV-0018',
        flags: [
          {
            ruleId: 'FIRST_TIME_PAYEE',
            severity: 'medium',
            evidence: 'No prior payment history found for vendor CYBERDYNE-20.',
          },
        ],
        tier: 'SINGLE_APPROVAL',
      },
    },
  })
  @UseGuards(JWTGuard)
  @Widget('risk-breakdown')
  async assessPaymentRisk(input: any, ctx: ExecutionContext) {
    return this.riskAssessmentService.assess(input.invoiceId);
  }
}
