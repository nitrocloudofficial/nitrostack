/**
 * DisputeTools
 * 
 * Two NitroStack @Tool-decorated methods:
 * 1. audit_amazon_incident — read-only, no guard, returns all 4 fraud signals
 * 2. dispatch_safet_claim_email — has side effect (email), guarded + widget-bound
 */

import { Injectable, ToolDecorator as Tool, UseGuards, Widget, ExecutionContext, z } from '@nitrostack/core';
import { MockAmazonService } from '../services/mock-amazon.service.js';
import { FraudScoringService } from '../services/fraud-scoring.service.js';
import { AuditLogService } from '../services/audit-log.service.js';
import { EmailService } from '../services/email.service.js';
import { ClaimReviewGuard } from '../guards/claim-review.guard.js';

// Zod schemas for input validation
const AuditAmazonIncidentSchema = z.object({
  orderId: z.string().describe('Amazon order ID, e.g. 408-98213-1102'),
});

const DispatchSafeTClaimEmailSchema = z.object({
  orderId: z.string().describe('Amazon order ID'),
  claimValueINR: z.number().describe('Claim value in INR'),
  fraudScore: z.number().describe('Computed fraud confidence score (0-100)'),
  recipientEmail: z.string().email().describe('Email address for the Safe-T Claim'),
});

const DispatchSafeTClaimSchema = z.object({
  investigationResult: z.object({
    orderId: z.string().describe('Amazon order ID'),
    claimValueINR: z.number().describe('Claim value in INR'),
    fraudScore: z.number().describe('Computed fraud confidence score (0-100)'),
    recipientEmail: z.string().email().optional().describe('Email address for the Safe-T Claim'),
  }).describe('Fraud investigation result to turn into a Safe-T claim'),
});

const HealthCheckSchema = z.object({}).strict();

// Widget metadata
function sentryflowWidget(route: string) {
  return {
    route,
    prefersBorder: true,
    csp: {
      resourceDomains: ['https://images.unsplash.com'],
    },
  };
}

@Injectable({
  deps: [MockAmazonService, FraudScoringService, AuditLogService, EmailService],
})
export class DisputeTools {
  constructor(
    private readonly amazon: MockAmazonService,
    private readonly scoring: FraudScoringService,
    private readonly auditLog: AuditLogService,
    private readonly email: EmailService,
  ) {}

  /**
   * Tool 1: audit_amazon_incident
   * 
   * Read-only tool — no guard, no widget.
   * Pulls dispatch/return weight logs and courier notes for an Amazon order,
   * computes fraud confidence score with all 4 named signals.
   * 
   * This is where the agent gathers evidence. The tool call is visible in
   * NitroStudio's trace view, showing the Zod-validated payload and the
   * returned signals with individual pass/fail status.
   */
  @Tool({
    name: 'audit_amazon_incident',
    description:
      'Pulls dispatch/return weight logs and courier notes for an Amazon order and computes a fraud confidence score with named signals.',
    inputSchema: AuditAmazonIncidentSchema,
    examples: {
      request: { orderId: '408-98213-1102' },
      response: {
        orderId: '408-98213-1102',
        claimValueINR: 45000,
        score: 100,
        signals: [
          {
            name: 'weight_mismatch',
            weight: 0.55,
            triggered: true,
            detail: 'Dispatched 250g, returned 45g (82.0% loss)',
          },
          {
            name: 'return_velocity',
            weight: 0.25,
            triggered: true,
            detail: 'Account return rate (90d): 55%',
          },
          {
            name: 'courier_seal_flag',
            weight: 0.2,
            triggered: true,
            detail: 'seal_intact_but_light, buyer claims empty box received',
          },
          {
            name: 'legitimate_return_indicator',
            weight: -0.3,
            triggered: false,
            detail: 'No pattern of SKU-level damage complaints',
          },
        ],
      },
    },
  })
  async auditAmazonIncident(
    input: z.infer<typeof AuditAmazonIncidentSchema>,
    ctx?: ExecutionContext,
  ) {
    ctx?.logger?.info('Auditing Amazon incident', { orderId: input.orderId });

    // Fetch dispatch, return, and order metadata
    const dispatch = await this.amazon.getDispatchLog(input.orderId);
    const returned = await this.amazon.getReturnLog(input.orderId);
    const orderMeta = await this.amazon.getOrderMeta(input.orderId);

    // Compute fraud score with all 4 signals
    const result = this.scoring.scoreIncident(dispatch, returned, orderMeta);

    // Log to audit trail
    await this.auditLog.record({
      orderId: input.orderId,
      action: 'audit',
      result,
    });

    ctx?.logger?.info('Audit complete', {
      orderId: input.orderId,
      fraudScore: result.score,
      signalsTriggered: result.signals.filter(s => s.triggered).length,
    });

    return {
      orderId: input.orderId,
      claimValueINR: orderMeta.claimValueINR,
      score: result.score,
      signals: result.signals,
    };
  }

  /**
   * Tool 2: dispatch_safet_claim_email
   * 
   * Has side effect (email dispatch), so it gets:
   * - @UseGuards(ClaimReviewGuard) — blocks if claim > ₹20k OR fraud score 50-80
   * - @Widget('sentry-amazon-widget') — renders for human approval when blocked
   * 
   * When the guard blocks, the widget renders inline in the chat.
   * The user clicks "Approve & Dispatch" in the widget, which re-invokes the tool
   * with the same parameters (the guard will still block, but the widget handles
   * the approval flow).
   */
  @Tool({
    name: 'dispatch_safet_claim_email',
    description: 'Sends a formal Safe-T Claim dispute email once a human has approved the incident.',
    inputSchema: DispatchSafeTClaimEmailSchema,
    examples: {
      request: {
        orderId: '408-98213-1102',
        claimValueINR: 45000,
        fraudScore: 100,
        recipientEmail: 'judge@example.com',
      },
      response: {
        status: 'sent',
        orderId: '408-98213-1102',
        messageId: 'msg_1234567890',
      },
    },
  })
  @UseGuards(ClaimReviewGuard as any)
  @Widget(sentryflowWidget('sentry-amazon-widget'))
  async dispatchSafeTClaimEmail(
    input: z.infer<typeof DispatchSafeTClaimEmailSchema>,
    ctx?: ExecutionContext,
  ) {
    return this.dispatchSafeTClaimInternal(input, ctx);
  }

  /**
   * Tool 3: dispatch_safet_claim
   *
   * Canonical tool for the hackathon flow. It accepts an investigation result and
   * routes through the same approval guard and widget experience as the legacy
   * email-specific tool, without changing the underlying business logic.
   */
  @Tool({
    name: 'dispatch_safet_claim',
    description: 'Turns a fraud investigation result into a Safe-T Claim workflow action while preserving the same guard and widget-based review experience.',
    inputSchema: DispatchSafeTClaimSchema,
    examples: {
      request: {
        investigationResult: {
          orderId: '408-98213-1102',
          claimValueINR: 45000,
          fraudScore: 100,
          recipientEmail: 'judge@example.com',
        },
      },
      response: {
        status: 'sent',
        orderId: '408-98213-1102',
        messageId: 'msg_1234567890',
      },
    },
  })
  @UseGuards(ClaimReviewGuard as any)
  @Widget(sentryflowWidget('sentry-amazon-widget'))
  async dispatchSafetClaim(
    input: z.infer<typeof DispatchSafeTClaimSchema>,
    ctx?: ExecutionContext,
  ) {
    return this.dispatchSafeTClaimInternal(
      {
        orderId: input.investigationResult.orderId,
        claimValueINR: input.investigationResult.claimValueINR,
        fraudScore: input.investigationResult.fraudScore,
        recipientEmail: input.investigationResult.recipientEmail ?? 'judge@example.com',
      },
      ctx,
    );
  }

  /**
   * Tool 4: health_check
   *
   * Returns runtime status for the SentryFlow server and its key workflows.
   */
  @Tool({
    name: 'health_check',
    description: 'Returns the current health status of the SentryFlow MCP server and its key workflows.',
    inputSchema: HealthCheckSchema,
    examples: {
      request: {},
      response: {
        status: 'ok',
        service: 'sentryflow',
        checks: {
          audit: 'ready',
          claimReview: 'ready',
          widgets: 'ready',
        },
      },
    },
  })
  async healthCheck(
    _input: z.infer<typeof HealthCheckSchema>,
    ctx?: ExecutionContext,
  ) {
    ctx?.logger?.info('Health check requested');

    return {
      status: 'ok',
      service: 'sentryflow',
      checks: {
        audit: 'ready',
        claimReview: 'ready',
        widgets: 'ready',
      },
    };
  }

  private async dispatchSafeTClaimInternal(
    input: z.infer<typeof DispatchSafeTClaimEmailSchema>,
    ctx?: ExecutionContext,
  ) {
    ctx?.logger?.info('Dispatching Safe-T Claim email', {
      orderId: input.orderId,
      claimValueINR: input.claimValueINR,
      fraudScore: input.fraudScore,
    });

    const emailResult = await this.email.sendSafeTClaim(input);

    await this.auditLog.record({
      orderId: input.orderId,
      action: 'dispatch',
      input: {
        orderId: input.orderId,
        claimValueINR: input.claimValueINR,
        fraudScore: input.fraudScore,
        recipientEmail: input.recipientEmail,
      },
    });

    ctx?.logger?.info('Safe-T Claim email dispatched', {
      orderId: input.orderId,
      messageId: emailResult.messageId,
    });

    return {
      status: 'sent',
      orderId: input.orderId,
      messageId: emailResult.messageId,
    };
  }
}
