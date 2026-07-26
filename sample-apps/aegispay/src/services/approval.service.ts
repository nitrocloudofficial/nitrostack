// approval.service.ts — Mints and verifies approval tokens, and executes
// the actual payment once (and only once) a valid approval has been made.
//
// This is the enforcement point for CLAUDE.md rule 14: a token is minted
// ONLY inside `decide()`, ONLY on an 'approve' decision, and NEVER when the
// combined risk tier is BLOCKED. There is no parameter or flag anywhere in
// this file that bypasses that check.

import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'node:crypto';
import { InvoicesService } from './invoices.service.js';
import { RiskAssessmentService } from '../modules/risk/risk-assessment.service.js';
import { AuditService } from './audit.service.js';
import { invoices, payments } from './ledger.fixtures.js';
import type {
  ApprovalRequest,
  Receipt,
  RiskFlag,
  DecisionTier,
  Payment,
} from '../types/contracts.js';

const TIER_RANK: Record<DecisionTier, number> = {
  AUTO: 0,
  SINGLE_APPROVAL: 1,
  DUAL_APPROVAL: 2,
  BLOCKED: 3,
};

function worstTier(a: DecisionTier, b: DecisionTier): DecisionTier {
  return TIER_RANK[b] > TIER_RANK[a] ? b : a;
}

@Injectable({ deps: [InvoicesService, RiskAssessmentService, AuditService] })
export class ApprovalService {
  private approvals = new Map<string, ApprovalRequest>();

  constructor(
    private invoicesService: InvoicesService,
    private riskAssessmentService: RiskAssessmentService,
    private auditService: AuditService,
  ) {}

  requestApproval(draftId: string): ApprovalRequest {
    const draft = this.invoicesService.getDraft(draftId);
    if (!draft) {
      throw new Error(`Draft "${draftId}" not found`);
    }

    let flags: RiskFlag[] = [];
    let tier: DecisionTier = 'AUTO';

    for (const invoiceId of draft.invoiceIds) {
      const assessment = this.riskAssessmentService.assess(invoiceId);
      flags = flags.concat(assessment.flags);
      tier = worstTier(tier, assessment.tier);
    }

    const approvalId = `approval-${randomUUID()}`;
    const request: ApprovalRequest = {
      approvalId,
      draftId,
      total: draft.total,
      flags,
      tier,
      status: 'pending',
    };

    this.approvals.set(approvalId, request);
    return request;
  }

  decide(approvalId: string, decision: 'approve' | 'reject', decidedBy: string): ApprovalRequest | Receipt {
    const request = this.approvals.get(approvalId);
    if (!request) {
      throw new Error(`Approval "${approvalId}" not found`);
    }
    if (request.status !== 'pending') {
      throw new Error(`Approval "${approvalId}" already ${request.status} — cannot decide twice`);
    }

    if (decision === 'reject') {
      request.status = 'rejected';
      this.auditService.log({
        tool: 'execute_payment',
        subject: decidedBy,
        outcome: 'blocked',
        reason: 'rejected by controller',
      });
      return request;
    }

    // Unconditional — even a valid controller-role caller cannot approve a
    // BLOCKED tier. No token is minted, no payment is executed.
    if (request.tier === 'BLOCKED') {
      this.auditService.log({
        tool: 'execute_payment',
        subject: decidedBy,
        outcome: 'blocked',
        reason: 'tier is BLOCKED — deny-list match, no approval token can ever be minted',
      });
      throw new Error(`Cannot approve: tier is BLOCKED`);
    }

    const token = randomUUID();
    request.approvalToken = token;
    request.status = 'approved';

    const draft = this.invoicesService.getDraft(request.draftId);
    if (!draft) {
      throw new Error(`Draft "${request.draftId}" not found`);
    }

    for (const invoiceId of draft.invoiceIds) {
      const invoice = invoices.find((inv) => inv.id === invoiceId);
      if (!invoice) continue;

      invoice.status = 'paid';

      const payment: Payment = {
        id: 'pay-' + randomUUID(),
        vendorId: invoice.vendorId,
        amount: invoice.amount,
        destinationAccount: invoice.destinationAccount,
        paidAt: new Date().toISOString(),
      };
      payments.push(payment);
    }

    this.auditService.log({
      tool: 'execute_payment',
      subject: decidedBy,
      outcome: 'allowed',
    });

    const receipt: Receipt = {
      receiptId: 'receipt-' + randomUUID(),
      approvalId,
      invoiceIds: draft.invoiceIds,
      total: request.total,
      executedAt: new Date().toISOString(),
    };

    return receipt;
  }
}
