import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import {
  IncidentSeverity,
  IncidentType,
  IncidentStatus,
  NotificationStatus
} from '../../shared/index.js';

const IncidentInputSchema = z.object({
  id: z.string().optional().describe('Incident unique identifier (e.g. INC-2026-8902)'),
  title: z.string().optional().describe('Incident title or summary'),
  description: z.string().optional().describe('Detailed incident description'),
  incidentType: z.nativeEnum(IncidentType).optional().describe('Category of incident'),
  severity: z.nativeEnum(IncidentSeverity).optional().describe('Severity level'),
  source: z.string().optional().describe('Originating source system or detector')
});

export class MailTools {
  /**
   * Tool 1: notify_management
   * Generates executive-level notification for leadership and management.
   */
  @Tool({
    name: 'notify_management',
    description: 'Generates an executive-level notification detailing business impact, affected services, and recommended leadership actions.',
    inputSchema: z.object({
      incident: IncidentInputSchema.optional(),
      incidentId: z.string().optional(),
      severity: z.nativeEnum(IncidentSeverity).optional()
    })
  })
  async notifyManagement(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing notify_management tool', { input });

    const incidentId = input?.incident?.id || input?.incidentId || 'INC-2026-8902';
    const title = input?.incident?.title || 'Unauthorized Admin Privilege Escalation & Anomaly';
    const severity = input?.incident?.severity || input?.severity || IncidentSeverity.HIGH;

    return {
      status: 'success',
      message: 'Executive management notification generated.',
      notification: {
        recipient: 'executive-briefing@enterprise.internal',
        subject: `[EXECUTIVE ALERT - ${severity}] Security Incident Briefing: ${incidentId}`,
        message: `Executive Summary: Incident ${incidentId} (${title}) has been assessed as ${severity} severity. Primary authentication systems are contained. Estimated business impact is HIGH with active risk mitigation underway.`,
        status: NotificationStatus.SENT,
        timestamp: new Date().toISOString()
      },
      executiveSummary: {
        incidentId,
        severity,
        businessImpact: 'ELEVATED_RISK_CONTAINED',
        affectedServices: ['Authentication Service Gateway', 'Session Storage Cluster'],
        recommendedExecutiveActions: [
          'Authorize Emergency Cyber Response Budget',
          'Prepare External PR & Stakeholder Statement',
          'Convene Extraordinary Security Committee Briefing'
        ]
      }
    };
  }

  /**
   * Tool 2: notify_it_team
   * Generates detailed technical notification for IT/SOC engineering teams.
   */
  @Tool({
    name: 'notify_it_team',
    description: 'Generates a detailed technical notification for IT and SOC teams with attack vectors, affected hosts, and investigation priorities.',
    inputSchema: z.object({
      incidentId: z.string().optional(),
      targetHost: z.string().optional()
    })
  })
  async notifyItTeam(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing notify_it_team tool', { input });

    const incidentId = input?.incidentId || 'INC-2026-8902';
    const targetHost = input?.targetHost || 'prod-auth-primary-01';

    return {
      status: 'success',
      message: 'IT / SOC Technical dispatch notification generated.',
      notification: {
        recipient: 'soc-ops@enterprise.internal',
        subject: `[SOC DISPATCH] Technical Remediation Priority: ${targetHost} (${incidentId})`,
        message: `Technical Alert: Host ${targetHost} flagged for suspicious outbound C2 traffic on port 8443. Enforce network interface disconnection and capture memory dump for forensic analysis.`,
        status: NotificationStatus.SENT,
        timestamp: new Date().toISOString()
      },
      technicalBrief: {
        incidentId,
        targetHost,
        attackVector: 'CVE-2024-3094 SSH Tunnel RCE & Admin Token Reuse',
        containmentActions: [
          'DISCONNECT_NETWORK_INTERFACE:10.0.4.12',
          'REVOKE_ACTIVE_JWT_SESSIONS',
          'FLUSH_REDIS_CACHE_TOKENS'
        ],
        investigationPriorities: [
          'Extract Volatile RAM Artifacts',
          'Inspect Ingress Gateway Logs',
          'Verify Backup Node Integrity'
        ]
      }
    };
  }

  /**
   * Tool 3: send_customer_notification
   * Generates customer-facing service advisory notification.
   */
  @Tool({
    name: 'send_customer_notification',
    description: 'Generates a clear, professional customer-facing notification regarding service updates or security advisories.',
    inputSchema: z.object({
      incidentId: z.string().optional(),
      affectedService: z.string().optional()
    })
  })
  async sendCustomerNotification(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing send_customer_notification tool', { input });

    const incidentId = input?.incidentId || 'INC-2026-8902';
    const affectedService = input?.affectedService || 'Single Sign-On (SSO) Portal';

    return {
      status: 'success',
      message: 'Customer service advisory notification generated.',
      notification: {
        recipient: 'all-customers@service-advisory.org',
        subject: `Service Advisory: Scheduled Maintenance & Security Maintenance on ${affectedService}`,
        message: `Dear Valued Customer, Our engineering team is currently performing security maintenance on the ${affectedService}. All core services remain operational. As a precautionary measure, active sessions may require password re-authentication. Thank you for your patience.`,
        status: NotificationStatus.SENT,
        timestamp: new Date().toISOString()
      },
      customerAdvisory: {
        incidentId,
        affectedService,
        userImpactLevel: 'LOW_REAUTHENTICATION_REQUIRED',
        customerSupportLink: 'https://status.nexusos-enterprise.org'
      }
    };
  }

  /**
   * Tool 4: generate_incident_summary
   * Produces a structured incident summary covering all phases and next steps.
   */
  @Tool({
    name: 'generate_incident_summary',
    description: 'Produces a comprehensive, structured summary of the incident covering severity, affected systems, actions taken, and next steps.',
    inputSchema: z.object({
      incidentId: z.string().optional().describe('Target incident ID for summary generation')
    })
  })
  async generateIncidentSummary(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing generate_incident_summary tool', { input });

    const incidentId = input?.incidentId || 'INC-2026-8902';

    return {
      status: 'success',
      message: 'Structured incident summary generated successfully.',
      summary: {
        incidentId,
        incidentType: IncidentType.UNAUTHORIZED_ACCESS,
        severity: IncidentSeverity.HIGH,
        currentStatus: IncidentStatus.INVESTIGATING,
        affectedSystems: [
          'prod-auth-primary-01 (10.0.4.12)',
          'prod-auth-secondary-02 (10.0.4.13)',
          'redis-session-store-01 (10.0.8.90)'
        ],
        actionsTaken: [
          'Security MCP: Quarantined host prod-auth-primary-01',
          'Compliance MCP: Prepared 72h GDPR DPA notification draft',
          'Mail MCP: Dispatched technical alert to SOC Ops team'
        ],
        nextRecommendedSteps: [
          'Convene Arbitration MCP decision panel for permanent credential reset',
          'Deploy security patch CVE-2024-3094 to primary cluster',
          'File formal DPA breach report within 48 hours'
        ],
        generatedAt: new Date().toISOString()
      }
    };
  }
}
