import { ToolDecorator as Tool, Widget, UseGuards, ExecutionContext, Injectable, RateLimit, z } from '@nitrostack/core';
import { JWTGuard } from '../../guards/jwt.guard.js';
import { ControllerGuard } from '../../guards/controller.guard.js';
import { ApprovalService } from '../../services/approval.service.js';

// See invoices.tools.ts for why @Injectable({ deps: [...] }) is required on
// tool controllers, not just services/guards.
@Injectable({ deps: [ApprovalService] })
export class PaymentsTools {
  constructor(private approvalService: ApprovalService) {}

  @Tool({
    name: 'request_approval',
    description:
      'Submit a drafted payment batch for human approval. Runs the risk engine against every invoice in the draft and returns an approval request that renders as an interactive card. Does NOT execute the payment.',
    inputSchema: z.object({
      draftId: z
        .string()
        .describe('ID of the payment draft returned by draft_payment_batch, e.g. "draft-..." Must reference an existing draft.'),
    }),
    examples: {
      request: { draftId: 'draft-3f9a1c20-3b3e-4b7e-9e2d-8b0f2a1e6c4d' },
      response: {
        approvalId: 'approval-7b1e4a2c-9d3f-4c5e-a1b2-6f8d0e2a4b6c',
        draftId: 'draft-3f9a1c20-3b3e-4b7e-9e2d-8b0f2a1e6c4d',
        total: 84000000,
        flags: [
          {
            ruleId: 'FIRST_TIME_PAYEE',
            severity: 'medium',
            evidence: 'No prior payment history found for vendor CYBERDYNE-20.',
          },
        ],
        tier: 'SINGLE_APPROVAL',
        status: 'pending',
      },
    },
  })
  @UseGuards(JWTGuard)
  @RateLimit({ requests: 10, window: '1m' })
  @Widget('approval-card')
  async requestApproval(input: any, ctx: ExecutionContext) {
    return this.approvalService.requestApproval(input.draftId);
  }

  @Tool({
    name: 'execute_payment',
    description:
      'Approve or reject a pending approval request and, if approved, execute the underlying payment. Requires a controller-role identity in addition to a valid session. There is no way to execute a payment without going through request_approval first.',
    inputSchema: z.object({
      approval_id: z
        .string()
        .describe('ID of the approval request returned by request_approval, e.g. "approval-...".'),
      decision: z
        .enum(['approve', 'reject'])
        .describe('Whether to approve (execute the payment) or reject (cancel) the approval request.'),
    }),
    examples: {
      request: { approval_id: 'approval-7b1e4a2c-9d3f-4c5e-a1b2-6f8d0e2a4b6c', decision: 'approve' },
      response: {
        receiptId: 'receipt-9a2c4e6f-1b3d-4a5c-8e0f-2b4d6f8a0c1e',
        invoiceIds: ['INV-0008'],
        total: 84000000,
        executedAt: '2026-07-25T12:00:00+05:30',
      },
    },
  })
  @UseGuards(JWTGuard, ControllerGuard)
  @RateLimit({ requests: 10, window: '1m' })
  @Widget('receipt')
  async executePayment(input: any, ctx: ExecutionContext) {
    const decidedBy = ctx.auth?.subject ?? 'unknown';
    return this.approvalService.decide(input.approval_id, input.decision, decidedBy);
  }
}
