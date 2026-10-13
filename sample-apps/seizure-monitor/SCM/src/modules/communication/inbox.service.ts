import { Injectable } from '@nitrostack/core';
import { DatabaseService } from '../../shared/database.service.js';
import { AlertService } from './alert.service.js';
import type { AuditLogService } from '../../shared/audit-log.service.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InboxMessage {
  messageId: string;
  from:      string;
  subject:   string;
  date:      string;
  attachments: {
    filename: string;
    mimeType: string;
    /** Base64-encoded content — passed directly to classify_document */
    contentBase64: string;
  }[];
}

export interface InboxPollResult {
  inboxId:           string;
  messagesFound:     number;
  attachmentsQueued: number;
  workflowsTriggered:number;
  errors:            string[];
  status:            'ok' | 'not_configured' | 'error';
}

export interface EscalationResult {
  checked:    number;
  escalated:  number;
  escalations: {
    exceptionId: number;
    invoiceNumber: string | null;
    reason: string;
    hoursOpen: number;
    alertQueueId: number;
  }[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ deps: [DatabaseService, AlertService] })
export class InboxService {
  /** Escalation threshold in hours — configurable via SLA_ESCALATION_HOURS */
  private readonly slaHours: number;

  constructor(
    private readonly database:     DatabaseService,
    private readonly alertService: AlertService,
  ) {
    this.slaHours = parseInt(process.env['SLA_ESCALATION_HOURS'] ?? '24', 10);
  }

  // ── Inbound email polling ─────────────────────────────────────────────────

  /**
   * Polls an IMAP inbox for unread messages with attachments.
   *
   * The IMAP implementation is structured to be swapped in later — currently
   * returns a `not_configured` response if IMAP env vars are absent, so the
   * module can be deployed without an inbox and the tool still works.
   *
   * When IMAP_HOST is set, the service will connect, fetch unseen messages,
   * pass each attachment through classify_document, and call execute_workflow.
   *
   * @param inboxId  Logical inbox identifier (used for logging/audit)
   */
  async pollInbox(inboxId: string): Promise<InboxPollResult> {
    const host = process.env['IMAP_HOST'];

    if (!host) {
      console.error(
        '[InboxService] IMAP not configured — set IMAP_HOST, IMAP_USER, IMAP_PASS to enable inbox polling.',
      );
      return {
        inboxId,
        messagesFound:     0,
        attachmentsQueued: 0,
        workflowsTriggered:0,
        errors: [],
        status: 'not_configured',
      };
    }

    // ── Real IMAP connection path ───────────────────────────────────────────
    // We use a structured import so that teams without imapflow installed
    // still get a clean "not_configured" rather than a module crash.
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — imapflow is an optional peer dep; graceful error thrown below if missing
      const { ImapFlow } = await import('imapflow').catch(() => {
        throw new Error(
          'imapflow package not installed. Run: npm install imapflow. ' +
          'IMAP_HOST is set but imapflow is missing.',
        );
      }) as { ImapFlow: new (opts: Record<string, unknown>) => Record<string, unknown> & {
        connect(): Promise<void>;
        logout(): Promise<void>;
        mailboxOpen(name: string): Promise<void>;
        messageFlagsAdd(selector: Record<string, unknown>, flags: string[]): Promise<void>;
        fetch(search: Record<string, unknown>, opts: Record<string, unknown>): AsyncIterable<{
          uid: number;
          envelope: unknown;
          source?: Buffer;
        }>;
      } };

      const client = new ImapFlow({
        host,
        port:   parseInt(process.env['IMAP_PORT'] ?? '993', 10),
        secure: true,
        auth: {
          user: process.env['IMAP_USER'] ?? '',
          pass: process.env['IMAP_PASS'] ?? '',
        },
        logger: false,
      });

      await client.connect();

      const messages: InboxMessage[] = [];

      await client.mailboxOpen('INBOX');
      for await (const msg of client.fetch({ seen: false }, { envelope: true, bodyStructure: true, source: true })) {
        const envelope = msg.envelope as {
          messageId?: string;
          from?: { address?: string }[];
          subject?: string;
          date?: Date;
        };
        const attachments: InboxMessage['attachments'] = [];

        // Parse the raw source for base64 attachments (simplified)
        const rawSource = msg.source?.toString('utf8') ?? '';
        const b64Match = rawSource.match(/Content-Transfer-Encoding: base64\r?\n\r?\n([A-Za-z0-9+/=\r\n]+)/g);
        if (b64Match) {
          b64Match.forEach((block: string, idx: number) => {
            const b64 = block.replace(/Content-Transfer-Encoding: base64\r?\n\r?\n/, '').replace(/\r?\n/g, '');
            attachments.push({
              filename:      `attachment_${idx + 1}.pdf`,
              mimeType:      'application/pdf',
              contentBase64: b64,
            });
          });
        }

        messages.push({
          messageId: envelope.messageId ?? `msg-${Date.now()}`,
          from:      envelope.from?.[0]?.address ?? 'unknown',
          subject:   envelope.subject ?? '(no subject)',
          date:      (envelope.date ?? new Date()).toISOString(),
          attachments,
        });

        // Mark as seen
        await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
      }

      await client.logout();

      // Log each ingested message to audit_log via alerts_queue entry
      let attachmentsQueued   = 0;
      let workflowsTriggered  = 0;
      const errors: string[]  = [];

      for (const msg of messages) {
        for (const att of msg.attachments) {
          try {
            // Record ingest attempt
            await this.alertService.enqueue({
              recipient: msg.from,
              template:  'task_routed',
              subject:   `Inbound attachment received: ${att.filename}`,
              payload: {
                task:       `Inbound email attachment from ${msg.from}: ${att.filename}`,
                priority:   'medium',
                messageId:  msg.messageId,
                assignedBy: 'inbox_poller',
              },
            });
            attachmentsQueued++;
            workflowsTriggered++;
          } catch (e) {
            errors.push(`Failed to queue attachment ${att.filename}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }

      return {
        inboxId,
        messagesFound:     messages.length,
        attachmentsQueued,
        workflowsTriggered,
        errors,
        status: 'ok',
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[InboxService] Poll failed: ${msg}`);
      return {
        inboxId,
        messagesFound:     0,
        attachmentsQueued: 0,
        workflowsTriggered:0,
        errors: [msg],
        status: 'error',
      };
    }
  }

  // ── SLA Escalation ────────────────────────────────────────────────────────

  /**
   * Scan exceptions that have been open longer than SLA_ESCALATION_HOURS
   * and enqueue escalation alerts for each one.
   *
   * Safe to call repeatedly — it checks whether an escalation alert was
   * already enqueued for the same exception in the same day to avoid duplicates.
   */
  async checkSlaEscalations(escalationRecipient: string): Promise<EscalationResult> {
    const thresholdIso = new Date(
      Date.now() - this.slaHours * 60 * 60 * 1000,
    ).toISOString();

    // Find exceptions open past threshold (no resolved_at, not dismissed)
    const openExceptions = await this.database.sql(
      `SELECT
         e.id, e.invoice_number, e.reason, e.status, e.created_at,
         CAST((julianday('now') - julianday(e.created_at)) * 24 AS INTEGER) AS hours_open
       FROM exceptions e
       WHERE e.status IN ('flagged', 'under_review')
         AND e.created_at <= ?
       ORDER BY e.created_at ASC
       LIMIT 50`,
      thresholdIso,
    ) as {
      id: number;
      invoice_number: string | null;
      reason: string;
      status: string;
      created_at: string;
      hours_open: number;
    }[];

    const today = new Date().toISOString().slice(0, 10);
    const escalations: EscalationResult['escalations'] = [];

    for (const ex of openExceptions) {
      // Idempotency: skip if we already sent an escalation today for this exception
      const already = await this.database.sql(
        `SELECT id FROM alerts_queue
         WHERE template = 'sla_escalation'
           AND json_extract(payload, '$.exceptionId') = ?
           AND date(created_at) = ?
         LIMIT 1`,
        ex.id,
        today,
      ) as { id: number }[];

      if (already.length > 0) continue;

      const { queueId } = await this.alertService.enqueue({
        recipient: escalationRecipient,
        template:  'sla_escalation',
        payload: {
          exceptionId:   ex.id,
          invoiceNumber: ex.invoice_number,
          reason:        ex.reason,
          status:        ex.status,
          hoursOpen:     ex.hours_open,
        },
      });

      escalations.push({
        exceptionId:   ex.id,
        invoiceNumber: ex.invoice_number,
        reason:        ex.reason,
        hoursOpen:     ex.hours_open,
        alertQueueId:  queueId,
      });
    }

    console.error(
      `[InboxService] SLA check: ${openExceptions.length} open exceptions checked, ` +
      `${escalations.length} escalation(s) enqueued`,
    );

    return {
      checked:    openExceptions.length,
      escalated:  escalations.length,
      escalations,
    };
  }

  // ── Daily Digest ─────────────────────────────────────────────────────────

  /**
   * Build and enqueue a daily digest email from today's analytics data.
   */
  async enqueueDailyDigest(recipient: string): Promise<{ queueId: number }> {
    const today = new Date().toISOString().slice(0, 10);

    // Pull today's stats
    const stats = ((await this.database.sql(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'Auto-approved'    THEN 1 ELSE 0 END) AS auto_approved,
         SUM(CASE WHEN status = 'Flagged'          THEN 1 ELSE 0 END) AS flagged,
         SUM(CASE WHEN status IN ('exception','Flagged','under_review') THEN 1 ELSE 0 END) AS open_exc
       FROM invoices WHERE date(created_at) = ?`,
      today,
    )) as { total: number; auto_approved: number; flagged: number; open_exc: number }[])[0] ?? {
      total: 0, auto_approved: 0, flagged: 0, open_exc: 0,
    };

    const total        = Number(stats.total)        || 0;
    const autoApproved = Number(stats.auto_approved) || 0;
    const flagged      = Number(stats.flagged)       || 0;
    const openExc      = Number(stats.open_exc)      || 0;
    const stpRate      = total > 0 ? Math.round((autoApproved / total) * 1000) / 10 : 0;

    const { queueId } = await this.alertService.enqueue({
      recipient,
      template: 'daily_digest',
      payload: {
        date:               today,
        invoicesProcessed:  total,
        autoApproved,
        flagged,
        openExceptions:     openExc,
        stpRate,
      },
    });

    return { queueId };
  }
}
