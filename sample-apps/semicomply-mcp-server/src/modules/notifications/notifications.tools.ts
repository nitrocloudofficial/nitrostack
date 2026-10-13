import { Injectable, ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { RootCauseAnalysisService } from '../root-cause-analysis/root-cause-analysis.service.js';
import { EmailService } from './email.service.js';
import { NotificationsService, Severity } from './notifications.service.js';

@Injectable({ deps: [RootCauseAnalysisService, NotificationsService, EmailService] })
export class NotificationsTools {
    constructor(
        private readonly rootCauseService: RootCauseAnalysisService,
        private readonly notificationsService: NotificationsService,
        private readonly emailService: EmailService,
    ) {}

    @Tool({
        name: 'notify_incident_stakeholders',
        title: 'Notify Incident Stakeholders',
        description: 'Analyzes a yield incident, classifies severity, loads stakeholders from Google Sheets, generates role-specific emails, and sends them through the configured email provider. Set allStakeholders=true when the user asks to email everyone. For a role-specific request such as Design Lead, use recipientRoles so the address is resolved from the Stakeholders tab. Never invent an email address. Use dryRun=true to preview without sending.',
        inputSchema: z.object({
            lotId: z.string().describe('The lot ID to analyze and notify about, e.g. LOT-8923'),
            shipmentId: z.string().optional().describe('Optional shipment ID to include shipment risk context'),
            dryRun: z.boolean().optional().describe('Preview recipients without sending email. Defaults to false.'),
            allStakeholders: z.boolean().optional().describe('Send to every valid stakeholder in the Stakeholders tab, ignoring severity filters.'),
            recipientRoles: z.array(z.string()).optional().describe('Optional stakeholder roles to resolve from the Stakeholders tab, e.g. ["Design Lead"].'),
            customRecipients: z.array(z.object({ name: z.string(), email: z.string(), role: z.string() })).optional().describe('Optional recipient override.'),
        }),
        annotations: { readOnlyHint: false, destructiveHint: false },
        invocation: { invoking: 'Analyzing incident and notifying stakeholders...', invoked: 'Incident notifications sent' },
    })
    async notify(input: { lotId: string; shipmentId?: string; dryRun?: boolean; allStakeholders?: boolean; recipientRoles?: string[]; customRecipients?: { name: string; email: string; role: string }[] }, ctx: ExecutionContext) {
        try {
            const lotId = String(input.lotId).replace(/^lotId:\s*/i, '').trim();
            const shipmentId = input.shipmentId ? String(input.shipmentId).replace(/^shipmentId:\s*/i, '').trim() : undefined;
            const dryRun = input.dryRun ?? false;
            const incidentId = `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Math.floor(Math.random() * 900) + 100)}`;
            const result = await this.rootCauseService.analyze(lotId, shipmentId);

            const severity = this.notificationsService.classifySeverity(result);
            let stakeholders: { name: string; email: string; role: string; notifyOn: Severity[] }[];
            stakeholders = input.customRecipients?.length
                ? input.customRecipients.map((recipient) => ({ ...recipient, notifyOn: ['Critical', 'High', 'Medium', 'Low'] as Severity[] }))
                : input.recipientRoles?.length
                    ? await this.notificationsService.getStakeholdersByRole(input.recipientRoles)
                : input.allStakeholders
                    ? await this.notificationsService.getAllStakeholders()
                : await this.notificationsService.getStakeholders(severity, result.shipmentRisk?.risk ?? false);

            const sent: { name: string; email: string; status: string }[] = [];
            const now = new Date().toISOString();
            for (const stakeholder of stakeholders) {
                const email = this.notificationsService.generateEmail(result, severity, stakeholder);
                if (dryRun) {
                    sent.push({ name: stakeholder.name, email: stakeholder.email, status: 'dry-run' });
                    continue;
                }

                const delivery = await this.emailService.send({ to: [stakeholder.email], ...email });
                sent.push({ name: stakeholder.name, email: stakeholder.email, status: delivery.success ? 'sent' : `failed: ${delivery.error}` });
                await this.notificationsService.logAudit({
                    timestamp: now,
                    incidentId,
                    lotId,
                    severity,
                    recipients: [stakeholder.email],
                    subject: email.subject,
                    status: delivery.success ? 'sent' : 'failed',
                    channel: 'email',
                    messageId: delivery.messageId,
                });
            }

            return {
                incidentId,
                lotId,
                severity,
                yield: result.overallYield,
                rootCause: result.likelyRootCause,
                emailsSent: sent.filter((recipient) => recipient.status === 'sent').length,
                dryRun,
                recipients: sent,
                auditLogged: !dryRun,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            ctx.logger.error(`[Notifications] Notification failed: ${message}`);
            return { error: `Notification failed: ${message}` };
        }
    }
}
