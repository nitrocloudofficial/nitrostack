import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { AlertService } from './alert.service.js';
import { InboxService }  from './inbox.service.js';
import { AuditLogService } from '../../shared/audit-log.service.js';

// ─── Shared schemas ───────────────────────────────────────────────────────────

const AlertTemplateEnum = z.enum([
  'exception_flagged',
  'task_routed',
  'sla_escalation',
  'daily_digest',
  'invoice_approved',
]);

const PriorityEnum = z.enum(['low', 'medium', 'high']);

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('communication')
export class CommunicationTools {
  constructor(
    private readonly alertService: AlertService,
    private readonly inboxService: InboxService,
    private readonly auditLog:     AuditLogService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // send_alert
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'send_alert',
    description:
      'Enqueue an alert email for delivery. Returns immediately with a queueId — the alert ' +
      'is sent asynchronously by the background worker (SMTP or dry-run if SMTP is not configured). ' +
      'Use template "exception_flagged" for invoice exceptions, "task_routed" for task assignments, ' +
      '"invoice_approved" for approval confirmations, "sla_escalation" for SLA breaches. ' +
      'Track delivery status with get_alert_status.',
    inputSchema: z.object({
      recipient: z.string().email().describe('Recipient email address'),
      template:  AlertTemplateEnum.describe('Email template key'),
      subject:   z.string().optional().describe('Override the template subject line'),
      payload:   z
        .record(z.unknown())
        .optional()
        .describe(
          'Template variables. For exception_flagged: { invoiceNumber, reason, workflowId }. ' +
          'For task_routed: { task, priority, assignedBy }. ' +
          'For invoice_approved: { invoiceNumber, vendor, amount, poNumber }.',
        ),
      priority: PriorityEnum.default('medium').describe('Alert priority (informational only — does not change queue order)'),
    }),
    outputSchema: z.object({
      queueId: z.number().describe('Queue row ID — pass to get_alert_status to track delivery'),
      status:  z.literal('queued'),
      message: z.string(),
    }),
  })
  async sendAlert(
    input: {
      recipient: string;
      template:  string;
      subject?:  string;
      payload?:  Record<string, unknown>;
      priority?: string;
    },
    ctx: ExecutionContext,
  ) {
    const t0 = Date.now();
    ctx.logger?.info(`[CommunicationTools] send_alert → ${input.recipient} (${input.template})`);

    const result = await this.alertService.enqueue({
      recipient: input.recipient,
      template:  input.template,
      subject:   input.subject,
      payload:   input.payload,
    });

    await this.auditLog.log({
      toolName:   'send_alert',
      input:      { recipient: input.recipient, template: input.template },
      output:     { queueId: result.queueId, status: result.status },
      durationMs: Date.now() - t0,
    });

    return {
      queueId: result.queueId,
      status:  'queued' as const,
      message: `Alert enqueued (id=${result.queueId}). Worker will deliver shortly.`,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // get_alert_status
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'get_alert_status',
    description:
      'Check the delivery status of a previously enqueued alert. ' +
      'Status lifecycle: queued → sending → sent | failed → dead_letter.',
    inputSchema: z.object({
      queueId: z.number().describe('The queueId returned by send_alert'),
    }),
    outputSchema: z.object({
      found:        z.boolean(),
      queueId:      z.number().optional(),
      status:       z.string().optional(),
      attemptCount: z.number().optional(),
      lastError:    z.string().nullable().optional(),
      sentAt:       z.string().nullable().optional(),
      createdAt:    z.string().optional(),
    }),
  })
  async getAlertStatus(input: { queueId: number }, ctx: ExecutionContext) {
    ctx.logger?.info(`[CommunicationTools] get_alert_status: #${input.queueId}`);
    const result = await this.alertService.getStatus(input.queueId);
    if (!result) return { found: false, queueId: input.queueId };
    return { found: true, ...result };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // list_recent_alerts
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'list_recent_alerts',
    description:
      'List the most recent alerts from the queue (newest first). ' +
      'Use this for operational visibility — see what was sent, what failed, what is queued.',
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe('Maximum number of alerts to return (default 20)'),
    }),
    outputSchema: z.object({
      alerts: z.array(
        z.object({
          queueId:      z.number(),
          status:       z.string(),
          attemptCount: z.number(),
          lastError:    z.string().nullable(),
          sentAt:       z.string().nullable(),
          createdAt:    z.string(),
        }),
      ),
      total: z.number(),
    }),
  })
  async listRecentAlerts(input: { limit?: number }, ctx: ExecutionContext) {
    ctx.logger?.info('[CommunicationTools] list_recent_alerts');
    const alerts = await this.alertService.listRecent(input.limit ?? 20);
    return { alerts, total: alerts.length };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // retry_failed_alerts
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'retry_failed_alerts',
    description:
      'Re-queue all failed and dead-lettered alerts back to "queued" status so the worker ' +
      'will attempt delivery again. Use this after fixing SMTP config or a transient network issue.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      requeued: z.number().describe('Number of alerts re-queued for retry'),
      message:  z.string(),
    }),
  })
  async retryFailedAlerts(_input: Record<string, never>, ctx: ExecutionContext) {
    const t0 = Date.now();
    ctx.logger?.info('[CommunicationTools] retry_failed_alerts');
    const result = await this.alertService.retryFailed();
    await this.auditLog.log({
      toolName:   'retry_failed_alerts',
      input:      {},
      output:     result,
      durationMs: Date.now() - t0,
    });
    return {
      requeued: result.requeued,
      message:  result.requeued > 0
        ? `${result.requeued} alert(s) re-queued. Worker will retry shortly.`
        : 'No failed alerts to retry.',
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // send_daily_digest
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'send_daily_digest',
    description:
      "Compose and enqueue today's operations digest email. " +
      'Includes invoice volume, auto-approval rate, STP rate, and open exception count. ' +
      'Call this at end-of-day or schedule it via a cron trigger.',
    inputSchema: z.object({
      recipient: z.string().email().describe('Email address to send the digest to'),
    }),
    outputSchema: z.object({
      queueId: z.number(),
      status:  z.literal('queued'),
      message: z.string(),
    }),
  })
  async sendDailyDigest(input: { recipient: string }, ctx: ExecutionContext) {
    const t0 = Date.now();
    ctx.logger?.info(`[CommunicationTools] send_daily_digest → ${input.recipient}`);
    const result = await this.inboxService.enqueueDailyDigest(input.recipient);
    await this.auditLog.log({
      toolName:   'send_daily_digest',
      input:      { recipient: input.recipient },
      output:     result,
      durationMs: Date.now() - t0,
    });
    return {
      queueId: result.queueId,
      status:  'queued' as const,
      message: `Daily digest enqueued (id=${result.queueId}) for ${input.recipient}.`,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // check_sla_escalations
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'check_sla_escalations',
    description:
      'Scan all open exceptions that have been unresolved past the SLA threshold ' +
      '(default 24 hours, configurable via SLA_ESCALATION_HOURS env var) and enqueue ' +
      'escalation alert emails. Idempotent — will not send duplicate escalations for the ' +
      'same exception on the same day. Schedule this every hour for continuous SLA monitoring.',
    inputSchema: z.object({
      escalationRecipient: z
        .string()
        .email()
        .describe('Email address of the manager/escalation target'),
    }),
    outputSchema: z.object({
      checked:   z.number().describe('Total open exceptions scanned'),
      escalated: z.number().describe('Number of new escalation alerts enqueued'),
      escalations: z.array(
        z.object({
          exceptionId:   z.number(),
          invoiceNumber: z.string().nullable(),
          reason:        z.string(),
          hoursOpen:     z.number(),
          alertQueueId:  z.number(),
        }),
      ),
    }),
  })
  async checkSlaEscalations(
    input: { escalationRecipient: string },
    ctx: ExecutionContext,
  ) {
    const t0 = Date.now();
    ctx.logger?.info(
      `[CommunicationTools] check_sla_escalations → ${input.escalationRecipient}`,
    );
    const result = await this.inboxService.checkSlaEscalations(input.escalationRecipient);
    await this.auditLog.log({
      toolName:   'check_sla_escalations',
      input:      { escalationRecipient: input.escalationRecipient },
      output:     { checked: result.checked, escalated: result.escalated },
      durationMs: Date.now() - t0,
    });
    return result;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ingest_email_inbox
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'ingest_email_inbox',
    description:
      'Poll an IMAP inbox for unread operational emails. Extracts attachments (invoices, POs, shipping docs) ' +
      'and queues them for classify_document → execute_workflow processing. ' +
      'Requires IMAP_HOST, IMAP_USER, IMAP_PASS environment variables. ' +
      'Returns "not_configured" status gracefully if IMAP is not set up.',
    inputSchema: z.object({
      inboxId: z
        .string()
        .default('primary')
        .describe('Logical inbox identifier for logging (e.g. "primary", "vendor-invoices")'),
    }),
    outputSchema: z.object({
      inboxId:            z.string(),
      messagesFound:      z.number(),
      attachmentsQueued:  z.number(),
      workflowsTriggered: z.number(),
      errors:             z.array(z.string()),
      status:             z.enum(['ok', 'not_configured', 'error']),
    }),
  })
  async ingestEmailInbox(input: { inboxId?: string }, ctx: ExecutionContext) {
    const t0 = Date.now();
    const inboxId = input.inboxId ?? 'primary';
    ctx.logger?.info(`[CommunicationTools] ingest_email_inbox: ${inboxId}`);
    const result = await this.inboxService.pollInbox(inboxId);
    await this.auditLog.log({
      toolName:   'ingest_email_inbox',
      input:      { inboxId },
      output:     { messagesFound: result.messagesFound, workflowsTriggered: result.workflowsTriggered },
      durationMs: Date.now() - t0,
    });
    return result;
  }
}
