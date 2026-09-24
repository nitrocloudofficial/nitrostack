import { Injectable, OnEvent } from '@nitrostack/core';
import { AuditRecord, AuditEventType } from './audit.types.js';

// ---------------------------------------------------------------------------
// In-memory compliance log (singleton — persists for the server's lifetime)
// ---------------------------------------------------------------------------
let auditLog: AuditRecord[] = [];
let auditCounter = 0;

function nextAuditId(): string {
  auditCounter += 1;
  return `AUD-${String(auditCounter).padStart(3, '0')}`;
}

function appendRecord(record: Omit<AuditRecord, 'auditId' | 'timestamp'>): AuditRecord {
  const full: AuditRecord = {
    auditId: nextAuditId(),
    timestamp: new Date().toISOString(),
    ...record,
  };
  auditLog.push(full);
  // Emit to server console so ops can tail logs
  console.error(
    `[AUDIT] ${full.eventType.toUpperCase()} | ${full.auditId} | ${full.actionDescription}`,
  );
  return full;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * AuditService — subscribes to ticket lifecycle events and maintains an
 * immutable SOC-2 style compliance log of all automated access operations.
 *
 * Registered as a singleton provider so the same log instance is shared
 * across the entire server lifetime and accessible via AuditResources.
 */
@Injectable({ deps: [] })
export class AuditService {

  // --- Event Handlers -------------------------------------------------------

  @OnEvent('ticket.created')
  onTicketCreated(data: { ticketId: string; employeeId: string; issueText: string }) {
    appendRecord({
      eventType: 'ticket.created',
      ticketId: data.ticketId,
      employeeId: data.employeeId,
      actionDescription: `New support ticket opened: "${data.issueText}"`,
      automated: true,
      simulatedNotification:
        `Hi ${data.employeeId}, your IT support ticket ${data.ticketId} has been received. ` +
        `We'll diagnose your issue shortly.`,
    });
  }

  @OnEvent('ticket.diagnosed')
  onTicketDiagnosed(data: { ticketId: string; employeeId: string; rootCause: string; fixable: boolean }) {
    appendRecord({
      eventType: 'ticket.diagnosed',
      ticketId: data.ticketId,
      employeeId: data.employeeId,
      rootCause: data.rootCause,
      actionDescription:
        `Diagnosis complete — root cause: "${data.rootCause}". ` +
        (data.fixable ? 'Auto-remediation available.' : 'Manual escalation required.'),
      automated: true,
      simulatedNotification:
        `Hi ${data.employeeId}, we've diagnosed your issue on ticket ${data.ticketId}. ` +
        (data.fixable
          ? 'An automated fix is being applied now.'
          : 'This issue requires IT admin review and has been escalated.'),
    });
  }

  @OnEvent('ticket.resolved')
  onTicketResolved(data: { ticketId: string; employeeId: string; rootCause: string; step: string }) {
    appendRecord({
      eventType: 'ticket.resolved',
      ticketId: data.ticketId,
      employeeId: data.employeeId,
      rootCause: data.rootCause,
      actionDescription: `Ticket auto-resolved. Action taken: ${data.step}`,
      automated: true,
      simulatedNotification:
        `✅ Hi ${data.employeeId}, your access issue (${data.ticketId}) has been resolved. ` +
        `${data.step} If you still have trouble, please open a new ticket.`,
    });
  }

  @OnEvent('ticket.escalated')
  onTicketEscalated(data: { ticketId: string; employeeId: string; rootCause: string; reason: string }) {
    appendRecord({
      eventType: 'ticket.escalated',
      ticketId: data.ticketId,
      employeeId: data.employeeId,
      rootCause: data.rootCause,
      actionDescription: `Ticket escalated to IT admin — reason: ${data.reason}`,
      automated: false,
      simulatedNotification:
        `🚨 Hi ${data.employeeId}, your ticket ${data.ticketId} requires manual IT admin review. ` +
        `Our team will contact you within one business day.`,
    });
  }

  @OnEvent('access.action')
  onAccessAction(data: { action: string; employeeId?: string; toolName?: string; detail: string }) {
    appendRecord({
      eventType: 'access.action',
      employeeId: data.employeeId,
      actionDescription: `Direct access intervention (${data.action}): ${data.detail}`,
      automated: true,
      simulatedNotification: data.employeeId
        ? `ℹ️ Hi ${data.employeeId}, an IT access update was applied directly: ${data.detail}`
        : undefined,
    });
  }

  // --- Public Accessors (used by AuditResources) ----------------------------

  /** Return a snapshot of the full audit log */
  getHistory(): AuditRecord[] {
    return [...auditLog];
  }

  /** Return the N most recent records (default 10) */
  getRecent(limit = 10): AuditRecord[] {
    return auditLog.slice(-limit).reverse();
  }

  /** Return records filtered by event type */
  getByEventType(eventType: AuditEventType): AuditRecord[] {
    return auditLog.filter(r => r.eventType === eventType);
  }
}

// Export log accessor for use in resources without creating a second instance
export function getAuditLog(): AuditRecord[] { return auditLog; }
export function getRecentAuditLog(limit: number): AuditRecord[] { return auditLog.slice(-limit).reverse(); }
