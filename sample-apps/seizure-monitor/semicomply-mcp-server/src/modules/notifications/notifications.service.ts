import { Injectable } from '@nitrostack/core';
import { RootCauseResult } from '../root-cause-analysis/root-cause-analysis.service.js';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service.js';

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Stakeholder {
    name: string;
    email: string;
    role: string;
    notifyOn: Severity[];
}

export interface NotificationRecord {
    timestamp: string;
    incidentId: string;
    lotId: string;
    severity: Severity;
    recipients: string[];
    subject: string;
    status: string;
    channel: string;
    messageId?: string;
}

@Injectable({ deps: [GoogleSheetsService] })
export class NotificationsService {
    constructor(private readonly sheets: GoogleSheetsService) {}

    classifySeverity(result: RootCauseResult): Severity {
        const yieldMatch = result.overallYield?.match(/([\d.]+)%/);
        const yieldPct = yieldMatch ? parseFloat(yieldMatch[1]) : 100;
        const hasExcursion = result.telemetry?.hasExcursion ?? false;
        const totalFailures = result.failingBins.reduce((sum, bin) => sum + bin.count, 0);
        const hasShipmentRisk = result.shipmentRisk?.risk ?? false;

        if (yieldPct < 70 || (hasExcursion && totalFailures > 300) || (hasShipmentRisk && result.designImplicated)) {
            return 'Critical';
        }
        if (yieldPct < 80 || (hasExcursion && totalFailures > 100) || hasShipmentRisk) {
            return 'High';
        }
        if (yieldPct < 90 || hasExcursion || totalFailures > 50) {
            return 'Medium';
        }
        return 'Low';
    }

    async getStakeholders(severity: Severity, hasShipmentRisk: boolean): Promise<Stakeholder[]> {
        const stakeholders = await this.loadStakeholders();

        const matched = stakeholders.filter((stakeholder) => stakeholder.notifyOn.includes(severity));
        if (hasShipmentRisk) {
            const compliance = stakeholders.find((stakeholder) => stakeholder.role.toLowerCase() === 'export compliance officer');
            if (compliance && !matched.includes(compliance)) matched.push(compliance);
        }
        return matched;
    }

    async getAllStakeholders(): Promise<Stakeholder[]> {
        return this.loadStakeholders();
    }

    async getStakeholdersByRole(roles: string[]): Promise<Stakeholder[]> {
        const stakeholders = await this.loadStakeholders();
        const requestedRoles = roles.map((role) => this.normalizeRole(role)).filter(Boolean);
        const matched = stakeholders.filter((stakeholder) => {
            const searchableFields = [stakeholder.role, stakeholder.name].map((value) => this.normalizeRole(value));
            return requestedRoles.some((requested) => searchableFields.some((actual) => {
                if (actual === requested || actual.includes(requested)) return true;
                const requestedWords = requested.split(' ').filter(Boolean);
                return requestedWords.length > 1 && requestedWords.every((word) => actual.includes(word));
            }));
        });

        if (!matched.length) {
            throw new Error(`No stakeholder found for role(s): ${roles.join(', ')}. No email was sent.`);
        }
        return matched;
    }

    private normalizeRole(value: string): string {
        return value
            .replace(/\uFEFF/g, '')
            .replace(/\u00A0/g, ' ')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()
            .replace(/\s+/g, ' ');
    }

    private async loadStakeholders(): Promise<Stakeholder[]> {
        const rows = await this.sheets.fetchSheet('Stakeholders');
        const stakeholders = rows.map((row) => ({
            name: row.name || '',
            email: row.email || '',
            role: row.role || '',
            notifyOn: this.parseNotifyOn(row.notifyOn || ''),
        })).filter((stakeholder) => stakeholder.name && stakeholder.email && stakeholder.role);

        if (!stakeholders.length) {
            throw new Error('No valid stakeholders found in the Stakeholders tab.');
        }
        return stakeholders;
    }

    private parseNotifyOn(raw: string): Severity[] {
        const valid: Severity[] = ['Critical', 'High', 'Medium', 'Low'];
        const parsed = raw
            .replace(/"/g, '')
            .split(',')
            .map((value) => value.trim().toLowerCase())
            .filter((value): value is Lowercase<Severity> => ['critical', 'high', 'medium', 'low'].includes(value));
        const normalized = parsed.map((value) => (value.charAt(0).toUpperCase() + value.slice(1)) as Severity);
        return normalized.length ? normalized : valid;
    }

    generateEmail(result: RootCauseResult, severity: Severity, stakeholder: Stakeholder): { subject: string; html: string; text: string } {
        const prefix = { Critical: '[CRITICAL]', High: '[HIGH]', Medium: '[MEDIUM]', Low: '[LOW]' }[severity];
        const subject = `${prefix} Yield Incident — ${result.lotId} — ${result.overallYield} yield`;
        const bins = result.failingBins.map((bin) => `${bin.binCode}: ${bin.count} failures — ${bin.impact}`).join('\n');
        const telemetry = result.telemetry
            ? `Station: ${result.telemetry.stationId}\nRecipe: ${result.telemetry.recipeName}\nExcursion: ${result.telemetry.hasExcursion ? result.telemetry.chamberPressure : 'None'}`
            : 'MES telemetry: unavailable';
        const shipment = result.shipmentRisk ? `\nShipment Risk: ${result.shipmentRisk.risk ? 'FLAGGED' : 'Clear'}\n${result.shipmentRisk.reason}` : '';
        const text = [
            `INCIDENT NOTIFICATION — ${severity.toUpperCase()}`,
            `Lot: ${result.lotId}`,
            '',
            `Hi ${stakeholder.name},`,
            '',
            result.likelyRootCause,
            '',
            `Overall Yield: ${result.overallYield}`,
            `Wafers Tested: ${result.totalWafersTested}`,
            telemetry,
            '',
            'Failing Bins:',
            bins || 'None recorded',
            '',
            `Design Assessment: ${result.designNote}`,
            shipment,
        ].join('\n');

        const escapedRootCause = this.escapeHtml(result.likelyRootCause);
        const escapedNote = this.escapeHtml(result.designNote);
        const binRows = result.failingBins.map((bin) => `<tr><td style="padding:11px 12px;color:#344054;font-family:Consolas,monospace;font-size:12px;border-top:1px solid #eaecf0;">${this.escapeHtml(bin.binCode)}</td><td align="right" style="padding:11px 12px;color:#101828;font-size:13px;font-weight:700;border-top:1px solid #eaecf0;">${bin.count.toLocaleString()}</td><td style="padding:11px 12px;color:#667085;font-size:12px;border-top:1px solid #eaecf0;">${this.escapeHtml(bin.impact)}</td></tr>`).join('');
        const severityColor = { Critical: '#b42318', High: '#c2410c', Medium: '#a16207', Low: '#15803d' }[severity];
        const severityBackground = { Critical: '#fff1f0', High: '#fff7ed', Medium: '#fefce8', Low: '#f0fdf4' }[severity];
        const telemetryRows = result.telemetry
            ? `<tr><td style="padding:10px 12px;color:#667085;font-size:12px;border-bottom:1px solid #eaecf0;">Station</td><td style="padding:10px 12px;color:#101828;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #eaecf0;">${this.escapeHtml(result.telemetry.stationId)}</td></tr>
               <tr><td style="padding:10px 12px;color:#667085;font-size:12px;border-bottom:1px solid #eaecf0;">Recipe</td><td style="padding:10px 12px;color:#101828;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #eaecf0;">${this.escapeHtml(result.telemetry.recipeName)}</td></tr>
               <tr><td style="padding:10px 12px;color:#667085;font-size:12px;border-bottom:1px solid #eaecf0;">Chamber pressure</td><td style="padding:10px 12px;color:${result.telemetry.hasExcursion ? '#b42318' : '#15803d'};font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #eaecf0;">${this.escapeHtml(result.telemetry.chamberPressure)}</td></tr>
               <tr><td style="padding:10px 12px;color:#667085;font-size:12px;">Operator</td><td style="padding:10px 12px;color:#101828;font-size:13px;font-weight:600;text-align:right;">${this.escapeHtml(result.telemetry.operatorId)}</td></tr>`
            : '<tr><td style="padding:12px;color:#667085;font-size:13px;">MES telemetry unavailable</td></tr>';
        const shipmentHtml = result.shipmentRisk
            ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:${result.shipmentRisk.risk ? '#fff1f0' : '#f0fdf4'};border:1px solid ${result.shipmentRisk.risk ? '#fecdca' : '#bbf7d0'};border-radius:10px;"><tr><td style="padding:16px 18px;"><div style="font-size:12px;font-weight:700;color:${result.shipmentRisk.risk ? '#b42318' : '#15803d'};text-transform:uppercase;letter-spacing:.06em;">Shipment ${result.shipmentRisk.risk ? 'At Risk' : 'Clear'}</div><div style="margin-top:6px;color:#344054;font-size:13px;line-height:1.6;">${this.escapeHtml(result.shipmentRisk.reason)}</div></td></tr></table>`
            : '';
        const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;color:#101828;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;padding:28px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border:1px solid #eaecf0;border-radius:14px;overflow:hidden;"><tr><td style="background:#101828;padding:24px 28px;"><div style="color:#98a2b3;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Semiconductor Lifecycle MCP</div><div style="margin-top:8px;color:#ffffff;font-size:23px;font-weight:700;line-height:1.25;">Yield incident notification</div><div style="margin-top:6px;color:#d0d5dd;font-size:13px;">Lot ${this.escapeHtml(result.lotId)} · Automated engineering alert</div></td></tr><tr><td style="padding:28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td><div style="color:#344054;font-size:14px;line-height:1.6;">Hello ${this.escapeHtml(stakeholder.name)},</div><div style="margin-top:8px;color:#667085;font-size:14px;line-height:1.6;">A manufacturing yield incident requires your attention.</div></td><td align="right" valign="top"><span style="display:inline-block;background:${severityBackground};color:${severityColor};border:1px solid ${severityColor};border-radius:999px;padding:6px 11px;font-size:11px;font-weight:800;letter-spacing:.05em;">${severity.toUpperCase()}</span></td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;background:#f8fafc;border:1px solid #eaecf0;border-radius:10px;"><tr><td style="padding:18px 20px;"><div style="color:#667085;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Likely root cause</div><div style="margin-top:8px;color:#1d2939;font-size:14px;line-height:1.65;">${escapedRootCause}</div></td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr><td width="33%" style="padding:16px 14px;background:#f9fafb;border:1px solid #eaecf0;border-radius:10px 0 0 10px;"><div style="color:#667085;font-size:11px;font-weight:700;text-transform:uppercase;">Overall yield</div><div style="margin-top:7px;color:${severityColor};font-size:22px;font-weight:800;">${this.escapeHtml(result.overallYield)}</div></td><td width="33%" style="padding:16px 14px;background:#f9fafb;border-top:1px solid #eaecf0;border-bottom:1px solid #eaecf0;"><div style="color:#667085;font-size:11px;font-weight:700;text-transform:uppercase;">Wafers tested</div><div style="margin-top:7px;color:#101828;font-size:22px;font-weight:800;">${result.totalWafersTested.toLocaleString()}</div></td><td width="33%" style="padding:16px 14px;background:#f9fafb;border:1px solid #eaecf0;border-radius:0 10px 10px 0;"><div style="color:#667085;font-size:11px;font-weight:700;text-transform:uppercase;">Failing bins</div><div style="margin-top:7px;color:#101828;font-size:22px;font-weight:800;">${result.failingBins.length}</div></td></tr></table><div style="margin-top:26px;color:#101828;font-size:15px;font-weight:800;border-bottom:1px solid #eaecf0;padding-bottom:9px;">Failing bin analysis</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border:1px solid #eaecf0;border-radius:10px;overflow:hidden;"><tr style="background:#f9fafb;"><th align="left" style="padding:10px 12px;color:#667085;font-size:11px;text-transform:uppercase;">Bin code</th><th align="right" style="padding:10px 12px;color:#667085;font-size:11px;text-transform:uppercase;">Count</th><th align="left" style="padding:10px 12px;color:#667085;font-size:11px;text-transform:uppercase;">Impact</th></tr>${binRows || '<tr><td colspan="3" style="padding:12px;color:#667085;font-size:13px;">No failing bins recorded.</td></tr>'}</table><div style="margin-top:26px;color:#101828;font-size:15px;font-weight:800;border-bottom:1px solid #eaecf0;padding-bottom:9px;">MES telemetry</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border:1px solid #eaecf0;border-radius:10px;overflow:hidden;">${telemetryRows}</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#eff8ff;border:1px solid #b2ddff;border-radius:10px;"><tr><td style="padding:16px 18px;color:#175cd3;font-size:13px;line-height:1.6;"><strong>Design assessment:</strong> ${escapedNote}</td></tr></table>${shipmentHtml}<div style="margin-top:26px;padding-top:16px;border-top:1px solid #eaecf0;color:#98a2b3;font-size:11px;line-height:1.6;">This alert was generated automatically. Please validate the underlying MES and quality records before taking corrective action.</div></td></tr></table></td></tr></table></body></html>`;

        return { subject, html, text };
    }

    private escapeHtml(value: string): string {
        return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
    }

    async logAudit(record: NotificationRecord): Promise<void> {
        try {
            await this.sheets.appendRow('Notification Audit', [
                record.timestamp,
                record.incidentId,
                record.lotId,
                record.severity,
                record.recipients.join('; '),
                record.subject,
                record.status,
                record.channel,
                record.messageId || '',
            ]);
        } catch (error) {
            console.error('[Notifications] Failed to write audit log:', error);
        }
    }
}
