import { Injectable, OnModuleInit } from '@nitrostack/core';
import { DatabaseService } from '../../shared/database.service.js';
import { createTransport, type Transporter } from 'nodemailer';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'dead_letter';

export interface AlertTemplate {
  subject: string;
  text:    string;
  html?:   string;
}

export interface EnqueueOptions {
  recipient:  string;
  template:   string;      // template key, e.g. 'exception_flagged'
  subject?:   string;      // override subject
  payload?:   Record<string, unknown>;
  priority?:  'low' | 'medium' | 'high';
}

export interface AlertQueueRow {
  id:             number;
  recipient:      string;
  template:       string;
  subject:        string | null;
  payload:        string;
  status:         AlertStatus;
  attempt_count:  number;
  last_error:     string | null;
  created_at:     string;
  sent_at:        string | null;
  next_attempt_at:string | null;
}

export interface AlertStatusResult {
  queueId:      number;
  status:       AlertStatus;
  attemptCount: number;
  lastError:    string | null;
  sentAt:       string | null;
  createdAt:    string;
}

// ─── Retry backoff delays (seconds) ──────────────────────────────────────────

const RETRY_DELAYS_SEC = [60, 300, 900]; // 1 min, 5 min, 15 min
const MAX_ATTEMPTS     = 3;

// ─── Email template renderer ─────────────────────────────────────────────────

const TEMPLATES: Record<string, (payload: Record<string, unknown>) => AlertTemplate> = {
  exception_flagged: (p) => ({
    subject: `[ALE SCM] Invoice Exception: ${p['invoiceNumber'] ?? 'Unknown'}`,
    text:    `An invoice exception has been flagged.\n\nInvoice: ${p['invoiceNumber']}\nReason: ${p['reason']}\nWorkflow: ${p['workflowId']}\n\nPlease review it in the ALE SCM portal.`,
    html:    `<h2>Invoice Exception Flagged</h2><table style="font-family:sans-serif;border-collapse:collapse"><tr><td><b>Invoice</b></td><td>${p['invoiceNumber']}</td></tr><tr><td><b>Reason</b></td><td>${p['reason']}</td></tr><tr><td><b>Workflow ID</b></td><td>${p['workflowId']}</td></tr></table><p>Please review it in the ALE SCM portal.</p>`,
  }),

  task_routed: (p) => ({
    subject: `[ALE SCM] Action Required: ${p['task'] ?? 'Task assigned'}`,
    text:    `A task has been routed to you.\n\nTask: ${p['task']}\nPriority: ${p['priority']}\nAssigned by: ${p['assignedBy'] ?? 'system'}\n\nPlease action this at your earliest convenience.`,
    html:    `<h2>Task Assigned to You</h2><p><b>Task:</b> ${p['task']}</p><p><b>Priority:</b> ${p['priority']}</p><p><b>Assigned by:</b> ${p['assignedBy'] ?? 'system'}</p>`,
  }),

  sla_escalation: (p) => ({
    subject: `[ALE SCM] ⚠ SLA Breach: Exception #${p['exceptionId']} unresolved for ${p['hoursOpen']}h`,
    text:    `Exception #${p['exceptionId']} has been open for ${p['hoursOpen']} hours and requires immediate attention.\n\nInvoice: ${p['invoiceNumber']}\nReason: ${p['reason']}\nStatus: ${p['status']}\n\nPlease resolve this exception immediately.`,
    html:    `<h2 style="color:#c0392b">⚠ SLA Breach — Immediate Action Required</h2><p>Exception <b>#${p['exceptionId']}</b> has been unresolved for <b>${p['hoursOpen']} hours</b>.</p><table><tr><td><b>Invoice</b></td><td>${p['invoiceNumber']}</td></tr><tr><td><b>Reason</b></td><td>${p['reason']}</td></tr><tr><td><b>Status</b></td><td>${p['status']}</td></tr></table>`,
  }),

  daily_digest: (p) => ({
    subject: `[ALE SCM] Daily Digest — ${p['date']}: ${p['openExceptions']} open exceptions`,
    text:    `ALE SCM Daily Digest — ${p['date']}\n\nInvoices processed today: ${p['invoicesProcessed']}\nAuto-approved: ${p['autoApproved']}\nFlagged: ${p['flagged']}\nOpen exceptions: ${p['openExceptions']}\nSTP rate: ${p['stpRate']}%\n\nSee the full dashboard in the ALE SCM portal.`,
    html:    `<h2>ALE SCM — Daily Digest (${p['date']})</h2><table style="font-family:sans-serif;border-collapse:collapse;width:400px"><tr style="background:#2c3e50;color:white"><td style="padding:8px"><b>Metric</b></td><td style="padding:8px"><b>Value</b></td></tr><tr><td style="padding:8px">Invoices Processed</td><td style="padding:8px">${p['invoicesProcessed']}</td></tr><tr style="background:#ecf0f1"><td style="padding:8px">Auto-approved</td><td style="padding:8px">${p['autoApproved']}</td></tr><tr><td style="padding:8px">Flagged</td><td style="padding:8px">${p['flagged']}</td></tr><tr style="background:#ecf0f1"><td style="padding:8px">Open Exceptions</td><td style="padding:8px;color:${Number(p['openExceptions']) > 0 ? '#c0392b' : '#27ae60'}">${p['openExceptions']}</td></tr><tr><td style="padding:8px">STP Rate</td><td style="padding:8px">${p['stpRate']}%</td></tr></table>`,
  }),

  invoice_approved: (p) => ({
    subject: `[ALE SCM] Invoice ${p['invoiceNumber']} Auto-Approved`,
    text:    `Invoice ${p['invoiceNumber']} from ${p['vendor']} has been automatically approved.\n\nAmount: ${p['amount']} ${p['currency'] ?? 'USD'}\nPO: ${p['poNumber']}\n\nNo further action required.`,
    html:    `<h2 style="color:#27ae60">✓ Invoice Auto-Approved</h2><p>Invoice <b>${p['invoiceNumber']}</b> from <b>${p['vendor']}</b> has been automatically approved.</p><table><tr><td><b>Amount</b></td><td>${p['amount']} ${p['currency'] ?? 'USD'}</td></tr><tr><td><b>PO Number</b></td><td>${p['poNumber']}</td></tr></table>`,
  }),
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ deps: [DatabaseService] })
export class AlertService implements OnModuleInit {
  private transporter: Transporter | null = null;
  private smtpFrom = 'alerts@ale-scm.com';
  private configured = false;

  constructor(private readonly database: DatabaseService) {}

  onModuleInit(): void {
    const host = process.env['SMTP_HOST'];
    const port = parseInt(process.env['SMTP_PORT'] ?? '587', 10);
    const user = process.env['SMTP_USER'];
    const pass = process.env['SMTP_PASS'];
    this.smtpFrom = process.env['SMTP_FROM'] ?? 'alerts@ale-scm.com';

    if (!host || !user || !pass) {
      console.error(
        '[AlertService] SMTP not configured — running in dry-run mode. ' +
        'Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM in .env to enable real email delivery.',
      );
      return;
    }

    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,  // true for 465 (SSL), false for 587 (STARTTLS)
      auth: { user, pass },
    });

    this.configured = true;
    console.error(`[AlertService] SMTP configured (${host}:${port}) ✓`);
  }

  // ── Enqueue a new alert ───────────────────────────────────────────────────

  async enqueue(opts: EnqueueOptions): Promise<{ queueId: number; status: AlertStatus }> {
    const result = await this.database.sql(
      `INSERT INTO alerts_queue (recipient, template, subject, payload)
       VALUES (?, ?, ?, ?)
       RETURNING id`,
      opts.recipient,
      opts.template,
      opts.subject ?? null,
      JSON.stringify(opts.payload ?? {}),
    ) as { id: number }[];

    const queueId = result[0]?.id ?? 0;
    console.error(`[AlertService] Enqueued alert #${queueId} → ${opts.recipient} (${opts.template})`);
    return { queueId, status: 'queued' };
  }

  // ── Worker: flush queued alerts ───────────────────────────────────────────

  async flush(): Promise<{ processed: number; sent: number; failed: number }> {
    const now = new Date().toISOString();

    // Pick rows that are ready: queued immediately, OR failed rows whose retry window has elapsed
    const rows = await this.database.sql(
      `SELECT * FROM alerts_queue
       WHERE status IN ('queued', 'failed')
         AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
       ORDER BY id
       LIMIT 20`,
      now,
    ) as AlertQueueRow[];

    let sent = 0, failed = 0;

    for (const row of rows) {
      // Mark as 'sending' to prevent double-processing
      await this.database.sql(
        `UPDATE alerts_queue SET status = 'sending' WHERE id = ? AND status = 'queued'`,
        row.id,
      );

      try {
        await this.sendEmail(row);

        await this.database.sql(
          `UPDATE alerts_queue SET status='sent', sent_at=? WHERE id=?`,
          new Date().toISOString(), row.id,
        );

        // Append to immutable alerts log
        await this.database.sql(
          `INSERT INTO alerts (queue_id, recipient, template, status, payload, delivered_at)
           VALUES (?, ?, ?, 'sent', ?, ?)`,
          row.id, row.recipient, row.template, row.payload, new Date().toISOString(),
        );

        sent++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const newAttempt = row.attempt_count + 1;

        if (newAttempt >= MAX_ATTEMPTS) {
          await this.database.sql(
            `UPDATE alerts_queue
             SET status='dead_letter', attempt_count=?, last_error=?
             WHERE id=?`,
            newAttempt, errMsg, row.id,
          );
          console.error(`[AlertService] Alert #${row.id} dead-lettered after ${newAttempt} attempts: ${errMsg}`);
        } else {
          const delaySec = RETRY_DELAYS_SEC[newAttempt - 1] ?? 900;
          const nextAttempt = new Date(Date.now() + delaySec * 1000).toISOString();
          // Leave status as 'failed' with next_attempt_at set — flush() will re-pick it
          // once the delay elapses. Do NOT reset to 'queued' here or the delay is bypassed.
          await this.database.sql(
            `UPDATE alerts_queue
             SET status='failed', attempt_count=?, last_error=?, next_attempt_at=?
             WHERE id=?`,
            newAttempt, errMsg, nextAttempt, row.id,
          );
          console.error(`[AlertService] Alert #${row.id} failed (attempt ${newAttempt}/${MAX_ATTEMPTS}), retry at ${nextAttempt}`);
        }
        failed++;
      }
    }

    if (rows.length > 0) {
      console.error(`[AlertService] Flush: processed=${rows.length} sent=${sent} failed=${failed}`);
    }

    return { processed: rows.length, sent, failed };
  }

  // ── Retry dead-lettered / failed alerts ──────────────────────────────────

  async retryFailed(): Promise<{ requeued: number }> {
    const result = await this.database.sql(
      `UPDATE alerts_queue
       SET status='queued', next_attempt_at=NULL, last_error=NULL, attempt_count=0
       WHERE status IN ('failed', 'dead_letter')
       RETURNING id`,
    ) as { id: number }[];

    const requeued = result.length;
    console.error(`[AlertService] Re-queued ${requeued} failed/dead-letter alert(s)`);
    return { requeued };
  }

  // ── Get delivery status ───────────────────────────────────────────────────

  async getStatus(queueId: number): Promise<AlertStatusResult | null> {
    const rows = await this.database.sql(
      `SELECT id, status, attempt_count, last_error, sent_at, created_at
       FROM alerts_queue WHERE id = ?`,
      queueId,
    ) as AlertQueueRow[];

    if (!rows[0]) return null;
    const row = rows[0];
    return {
      queueId:      row.id,
      status:       row.status,
      attemptCount: row.attempt_count,
      lastError:    row.last_error,
      sentAt:       row.sent_at,
      createdAt:    row.created_at,
    };
  }

  // ── List recent alerts ────────────────────────────────────────────────────

  async listRecent(limit = 20): Promise<AlertStatusResult[]> {
    const rows = await this.database.sql(
      `SELECT id, status, attempt_count, last_error, sent_at, created_at
       FROM alerts_queue ORDER BY created_at DESC LIMIT ?`,
      limit,
    ) as AlertQueueRow[];

    return rows.map((r) => ({
      queueId:      r.id,
      status:       r.status,
      attemptCount: r.attempt_count,
      lastError:    r.last_error,
      sentAt:       r.sent_at,
      createdAt:    r.created_at,
    }));
  }

  // ── Internal: render template + send via SMTP ─────────────────────────────

  private async sendEmail(row: AlertQueueRow): Promise<void> {
    const payload = JSON.parse(row.payload || '{}') as Record<string, unknown>;
    const renderer = TEMPLATES[row.template];

    let subject: string;
    let text:    string;
    let html:    string | undefined;

    if (renderer) {
      const rendered = renderer(payload);
      subject = row.subject ?? rendered.subject;
      text    = rendered.text;
      html    = rendered.html;
    } else {
      // Unknown template — send raw payload as JSON
      subject = row.subject ?? `[ALE SCM] Notification: ${row.template}`;
      text    = `Template: ${row.template}\n\nPayload:\n${JSON.stringify(payload, null, 2)}`;
    }

    if (!this.configured || !this.transporter) {
      // Dry-run: log to stderr but don't actually send
      console.error(
        `[AlertService] DRY-RUN email → ${row.recipient} | subject="${subject}" | ` +
        `(SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS to send real emails)`,
      );
      return;
    }

    await this.transporter.sendMail({
      from:    this.smtpFrom,
      to:      row.recipient,
      subject,
      text,
      html,
    });
  }

  /** Check whether SMTP is configured (used by worker for logging). */
  get isConfigured(): boolean {
    return this.configured;
  }
}
