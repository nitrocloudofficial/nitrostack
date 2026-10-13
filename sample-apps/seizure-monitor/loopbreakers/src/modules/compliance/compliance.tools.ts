import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import {
  IncidentSeverity,
  IncidentType,
  ProposalPriority
} from '../../shared/index.js';

const IncidentInputSchema = z.object({
  id: z.string().optional().describe('Incident unique identifier (e.g. INC-2026-089)'),
  title: z.string().optional().describe('Incident title or summary'),
  description: z.string().optional().describe('Detailed incident description'),
  incidentType: z.nativeEnum(IncidentType).optional().describe('Category of incident'),
  severity: z.nativeEnum(IncidentSeverity).optional().describe('Severity level'),
  source: z.string().optional().describe('Originating source system or detector'),
  containsPersonalData: z.boolean().optional().describe('Whether personal or customer PII data is involved')
});

export class ComplianceTools {
  /**
   * Tool 1: check_gdpr
   * Analyzes personal data breach risks under GDPR regulations.
   */
  @Tool({
    name: 'check_gdpr',
    description: 'Evaluates an incident for GDPR personal data exposure risks and returns regulatory reporting proposals.',
    inputSchema: z.object({
      incident: IncidentInputSchema.optional(),
      incidentId: z.string().optional(),
      containsPersonalData: z.boolean().optional()
    })
  })
  async checkGdpr(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing check_gdpr evaluation', { input });

    const incidentId = input?.incident?.id || input?.incidentId || 'INC-2026-8902';
    const hasPersonalData = input?.containsPersonalData ?? input?.incident?.containsPersonalData ?? true;

    return {
      status: 'success',
      message: 'GDPR compliance evaluation completed.',
      incidentId,
      gdprAssessment: {
        regulation: 'EU General Data Protection Regulation (GDPR)',
        personalDataExposed: hasPersonalData,
        article33NotificationRequired: hasPersonalData,
        dpaNotificationDeadlineHours: 72,
        article34DataSubjectNoticeRequired: hasPersonalData,
        complianceStatus: hasPersonalData ? 'ACTION_REQUIRED' : 'COMPLIANT',
        riskLevel: hasPersonalData ? 'HIGH' : 'LOW'
      },
      proposal: {
        agentName: 'ComplianceMCP',
        priority: hasPersonalData ? ProposalPriority.URGENT : ProposalPriority.LOW,
        recommendation: hasPersonalData
          ? 'Mandatory 72-Hour Data Protection Authority (DPA) notification required under GDPR Article 33.'
          : 'No personal data exposure detected. Standard logging sufficient.',
        reasoning: hasPersonalData
          ? 'Incident source includes user authentication databases and PII session caches. Breach poses risk to rights and freedoms of natural persons.'
          : 'Incident is confined to infrastructure telemetry without customer PII access.',
        actions: hasPersonalData
          ? [
              'FILE_FORMAL_DPA_NOTIFICATION_72H',
              'ISSUE_DATA_SUBJECT_BREACH_NOTICE',
              'PREPARE_DATA_PROTECTION_IMPACT_ASSESSMENT',
              'PRESERVE_FORENSIC_AUDIT_LOGS'
            ]
          : [
              'LOG_COMPLIANCE_REVIEW_RECORD'
            ],
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Tool 2: check_iso27001
   * Evaluates incident against ISO/IEC 27001 Annex A security controls.
   */
  @Tool({
    name: 'check_iso27001',
    description: 'Evaluates an incident against ISO/IEC 27001 security controls and returns compliance gap recommendations.',
    inputSchema: z.object({
      incidentId: z.string().optional().describe('Incident identifier'),
      severity: z.nativeEnum(IncidentSeverity).optional().describe('Incident severity')
    })
  })
  async checkIso27001(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing check_iso27001 control evaluation', { input });

    const incidentId = input?.incidentId || 'INC-2026-8902';

    return {
      status: 'success',
      message: 'ISO 27001 control evaluation completed.',
      incidentId,
      isoAssessment: {
        standard: 'ISO/IEC 27001:2022',
        evaluatedControls: [
          {
            controlId: 'A.5.24',
            name: 'Information Security Incident Management Planning',
            status: 'COMPLIANT',
            comment: 'Incident triage and response plan activated within SLA.'
          },
          {
            controlId: 'A.8.8',
            name: 'Management of Technical Vulnerabilities',
            status: 'NON_COMPLIANT',
            comment: 'Unpatched SSH vulnerability (CVE-2024-3094) exploited.'
          },
          {
            controlId: 'A.8.15',
            name: 'Logging and Monitoring',
            status: 'COMPLIANT',
            comment: 'Audit logs captured initial privilege escalation attempt.'
          }
        ],
        complianceScore: '75%'
      },
      proposal: {
        agentName: 'ComplianceMCP',
        priority: ProposalPriority.HIGH,
        recommendation: 'Address technical vulnerability management gaps under ISO 27001 Control A.8.8.',
        reasoning: 'Non-compliance identified in technical patch management cycle leading to unauthorized entry vector.',
        actions: [
          'APPLY_SECURITY_PATCH_CVE_2024_3094',
          'CONDUCT_ROOT_CAUSE_NON_CONFORMITY_ANALYSIS',
          'UPDATE_ISMS_RISK_REGISTER',
          'SCHEDULE_INTERNAL_AUDIT_REVIEW'
        ],
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Tool 3: generate_compliance_report
   * Produces a structured compliance summary and documentation audit report.
   */
  @Tool({
    name: 'generate_compliance_report',
    description: 'Generates a comprehensive compliance summary including impacted regulations, reporting deadlines, and required documentation.',
    inputSchema: z.object({
      incidentId: z.string().optional().describe('Target incident ID for compliance reporting')
    })
  })
  async generateComplianceReport(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating comprehensive compliance report', { input });

    const incidentId = input?.incidentId || 'INC-2026-8902';

    return {
      status: 'success',
      message: 'Comprehensive compliance report generated successfully.',
      complianceReport: {
        incidentId,
        overallStatus: 'AT_RISK',
        impactedRegulations: [
          {
            name: 'GDPR (EU 2016/679)',
            status: 'ACTION_REQUIRED',
            deadline: '2026-07-29T04:18:10Z (72 Hours remaining)',
            mandatoryReporting: true
          },
          {
            name: 'ISO/IEC 27001:2022',
            status: 'NON_CONFORMITY_DETECTED',
            deadline: 'Next Audit Cycle (30 Days)',
            mandatoryReporting: false
          },
          {
            name: 'NIS2 Directive (EU 2022/2555)',
            status: 'EARLY_WARNING_REQUIRED',
            deadline: '24 Hours Initial Notification',
            mandatoryReporting: true
          }
        ],
        requiredDocumentation: [
          'Incident Triage Log (Form COMP-101)',
          'Data Protection Impact Assessment (DPIA-2026)',
          'Root Cause Non-Conformity Record (NCR-8902)',
          'Post-Incident Remediation Sign-off'
        ],
        recommendedActions: [
          'Submit 72h GDPR DPA Breach Notification',
          'Issue NIS2 24h Early Warning Notice to Computer Security Incident Response Team',
          'Archive Audit Logs to Immutable Compliance Storage',
          'Initiate Management Review of ISMS Controls'
        ],
        generatedAt: new Date().toISOString()
      }
    };
  }
}
