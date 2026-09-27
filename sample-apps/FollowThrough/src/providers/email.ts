import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { EmailMessage } from '../common/types.js';

function addressText(addr: unknown): string {
  if (!addr) {
    return '';
  }
  if (Array.isArray(addr)) {
    return addr.map((a) => (a as { text?: string }).text ?? '').join(', ');
  }
  return (addr as { text?: string }).text ?? '';
}

export interface EmailSearchInput {
  query_terms: string[];
  since: string;
  to_domain_hint?: string;
}

export interface EmailSendInput {
  to: string;
  subject: string;
  text: string;
}

export class EmailProvider {
  private smtp = {
    host: process.env.EMAIL_SMTP_HOST ?? '',
    port: Number(process.env.EMAIL_SMTP_PORT ?? 587),
    user: process.env.EMAIL_SMTP_USER ?? '',
    pass: process.env.EMAIL_SMTP_PASS ?? '',
    from: process.env.EMAIL_FROM ?? process.env.EMAIL_SMTP_USER ?? '',
  };

  private imap = {
    host: process.env.EMAIL_IMAP_HOST ?? '',
    port: Number(process.env.EMAIL_IMAP_PORT ?? 993),
    user: process.env.EMAIL_IMAP_USER ?? '',
    pass: process.env.EMAIL_IMAP_PASS ?? '',
    mailbox: process.env.EMAIL_IMAP_MAILBOX ?? 'INBOX',
  };

  get canSend(): boolean {
    return !!(this.smtp.host && this.smtp.user);
  }

  get canSearch(): boolean {
    return !!(this.imap.host && this.imap.user);
  }

  async send(input: EmailSendInput): Promise<{ message_id: string }> {
    const transport = nodemailer.createTransport({
      host: this.smtp.host,
      port: this.smtp.port,
      secure: this.smtp.port === 465,
      auth: this.smtp.user ? { user: this.smtp.user, pass: this.smtp.pass } : undefined,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
    try {
      const info = await transport.sendMail({
        from: this.smtp.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
      });
      return { message_id: info.messageId ?? '' };
    } finally {
      transport.close();
    }
  }

  async search(input: EmailSearchInput): Promise<EmailMessage[]> {
    const client = new ImapFlow({
      host: this.imap.host,
      port: this.imap.port,
      secure: this.imap.port === 993,
      auth: { user: this.imap.user, pass: this.imap.pass },
      connectionTimeout: 20000,
    });
    const results: EmailMessage[] = [];
    try {
      await client.connect();
      const lock = await client.getMailboxLock(this.imap.mailbox);
      try {
        const since = new Date(`${input.since}T00:00:00Z`);
        const terms = input.query_terms.filter(Boolean);
        const criteria: Record<string, unknown> = { since };
        if (terms.length === 1) {
          criteria.text = terms[0];
        } else if (terms.length > 1) {
          criteria.or = terms.map((t) => ({ text: t }));
        }
        const uids = await client.search(criteria);
        for (const uid of (Array.isArray(uids) ? uids : []).slice(0, 50)) {
          const msg = await client.fetchOne(uid, { source: true });
          if (!msg || !msg.source) {
            continue;
          }
          const parsed = await simpleParser(msg.source);
          const from = addressText(parsed.from);
          const to = addressText(parsed.to);
          if (input.to_domain_hint && !`${from} ${to}`.toLowerCase().includes(input.to_domain_hint.toLowerCase())) {
            continue;
          }
          const timestamp = (parsed.date ?? new Date()).toISOString().slice(0, 10);
          results.push({
            message_id: `eml_${uid}`,
            from,
            to,
            subject: parsed.subject ?? '',
            body: parsed.text ?? '',
            timestamp,
          });
        }
      } finally {
        lock.release();
      }
    } finally {
      try {
        await client.logout();
      } catch {
        // best effort disconnect
      }
    }
    return results;
  }
}
