// ═══════════════════════════════════════════════════════════════════════════════
// Compliance & Audit Sub-agent Tools
// logAuditEvent, maskSensitiveField, getAuditTrail
// ═══════════════════════════════════════════════════════════════════════════════

import { ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import type { ToolResult } from '../../shared-types.js';

interface AuditEntry {
    id: string;
    caseId: string;
    timestamp: string;
    actor: string;
    action: string;
    details: string;
    toolName?: string;
}

const LogAuditSchema = z.object({
    caseId: z.string().describe('Case this event belongs to'),
    actor: z.string().describe('Who triggered the action (e.g. "orchestrator", "identity-agent", "manual-review")'),
    action: z.string().describe('What happened (e.g. "tool_invoked", "claim_updated", "report_generated")'),
    details: z.string().describe('Human-readable description of the event'),
    toolName: z.string().optional().describe('Name of the tool that produced this event'),
});

const MaskFieldSchema = z.object({
    value: z.string().describe('The sensitive value to mask'),
    fieldType: z.enum(['pan', 'aadhaar', 'account_number', 'phone', 'email', 'name']).describe('Type of field for appropriate masking strategy'),
});

const AuditTrailSchema = z.object({
    caseId: z.string().describe('Case ID to retrieve audit trail for'),
});

@Injectable()
export class ComplianceTools {
    private readonly auditLog: AuditEntry[] = [];
    private auditCounter = 0;

    // ══════════════════════════════════════════════════════════════════════════
    // logAuditEvent — Timestamped database write
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'logAuditEvent',
        description: 'Record a timestamped audit event for compliance tracking. Every tool invocation, claim update, and decision should be logged.',
        inputSchema: LogAuditSchema,
    })
    async logAuditEvent(args: z.infer<typeof LogAuditSchema>): Promise<ToolResult> {
        try {
            const entry: AuditEntry = {
                id: `audit-${++this.auditCounter}`,
                caseId: args.caseId,
                timestamp: new Date().toISOString(),
                actor: args.actor,
                action: args.action,
                details: args.details,
                toolName: args.toolName,
            };

            this.auditLog.push(entry);

            return {
                status: 'success',
                data: { auditId: entry.id, timestamp: entry.timestamp },
            };
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // maskSensitiveField — String redaction
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'maskSensitiveField',
        description: 'Mask a sensitive field for display or logging. PAN → ABCDE****F, Aadhaar → XXXX-XXXX-1234, Account → ****3456, etc.',
        inputSchema: MaskFieldSchema,
    })
    async maskSensitiveField(args: z.infer<typeof MaskFieldSchema>): Promise<ToolResult> {
        try {
            let masked: string;
            const v = args.value;

            switch (args.fieldType) {
                case 'pan':
                    // Show first 5, mask next 4, show last 1: ABCDE****F
                    masked = v.length >= 10 ? v.slice(0, 5) + '****' + v.slice(-1) : '****';
                    break;
                case 'aadhaar':
                    // Show only last 4: XXXX-XXXX-1234
                    masked = v.length >= 12 ? 'XXXX-XXXX-' + v.slice(-4) : 'XXXX-XXXX-****';
                    break;
                case 'account_number':
                    // Show only last 4: ****3456
                    masked = v.length >= 4 ? '****' + v.slice(-4) : '****';
                    break;
                case 'phone':
                    // Show last 4: ******6789
                    masked = v.length >= 10 ? '******' + v.slice(-4) : '****';
                    break;
                case 'email':
                    // Show first 2 chars + domain: ab****@domain.com
                    const atIdx = v.indexOf('@');
                    if (atIdx > 2) {
                        masked = v.slice(0, 2) + '****' + v.slice(atIdx);
                    } else {
                        masked = '****' + (atIdx >= 0 ? v.slice(atIdx) : '');
                    }
                    break;
                case 'name':
                    // Show first and last name initial: P**** V****
                    masked = v.split(' ').map(w => w[0] + '****').join(' ');
                    break;
                default:
                    masked = '****';
            }

            return {
                status: 'success',
                data: { original: args.value, masked, fieldType: args.fieldType },
            };
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // getAuditTrail — Database read
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'getAuditTrail',
        description: 'Retrieve the complete audit trail for a specific case. Returns all logged events in chronological order.',
        inputSchema: AuditTrailSchema,
    })
    async getAuditTrail(args: z.infer<typeof AuditTrailSchema>): Promise<ToolResult> {
        try {
            const events = this.auditLog.filter(e => e.caseId === args.caseId);

            return {
                status: 'success',
                data: {
                    caseId: args.caseId,
                    totalEvents: events.length,
                    events: events.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
                },
            };
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }
}
