import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import {
  IncidentSeverity,
  IncidentType,
  IncidentStatus,
  ProposalPriority
} from '../../shared/index.js';

/**
 * Shared Zod Schema for Incident input parameters
 */
const IncidentInputSchema = z.object({
  id: z.string().optional().describe('Incident unique identifier (e.g. INC-2026-089)'),
  title: z.string().optional().describe('Title or summary of the incident'),
  description: z.string().optional().describe('Detailed incident description'),
  incidentType: z.nativeEnum(IncidentType).optional().describe('Category of incident'),
  severity: z.nativeEnum(IncidentSeverity).optional().describe('Severity level'),
  source: z.string().optional().describe('Originating source system or detector'),
  status: z.nativeEnum(IncidentStatus).optional().describe('Current status')
});

export class SecurityTools {
  /**
   * Tool 1: detect_attack
   * Evaluates security threat risk and generates containment proposals.
   */
  @Tool({
    name: 'detect_attack',
    description: 'Analyzes enterprise incident parameters, evaluates threat risk, and returns actionable containment proposals.',
    inputSchema: z.object({
      incident: IncidentInputSchema.optional(),
      incidentId: z.string().optional(),
      severity: z.nativeEnum(IncidentSeverity).optional(),
      source: z.string().optional()
    })
  })
  async detectAttack(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing detect_attack threat analysis', { input });

    const incidentId = input?.incident?.id || input?.incidentId || 'INC-2026-8902';
    const title = input?.incident?.title || 'Unauthorized Admin Privilege Escalation & Anomaly';
    const severity = input?.incident?.severity || input?.severity || IncidentSeverity.HIGH;
    const source = input?.incident?.source || input?.source || 'auth-service-gateway';

    const isHighSeverity = severity === IncidentSeverity.CRITICAL || severity === IncidentSeverity.HIGH;

    return {
      status: 'success',
      message: 'Threat detection analysis completed.',
      incident: {
        id: incidentId,
        title,
        severity,
        source,
        status: IncidentStatus.INVESTIGATING,
        timestamp: new Date().toISOString()
      },
      proposal: {
        agentName: 'SecurityMCP',
        priority: isHighSeverity ? ProposalPriority.URGENT : ProposalPriority.MEDIUM,
        recommendation: isHighSeverity
          ? `Immediate containment and asset isolation required for incident '${title}'.`
          : `Standard active security monitoring recommended for incident '${title}'.`,
        reasoning: `Incident severity is evaluated as ${severity} originating from source '${source}'. Risk of lateral network propagation detected.`,
        actions: isHighSeverity
          ? [
              'ISOLATE_AFFECTED_HOSTS',
              'REVOKE_ACTIVE_SESSIONS',
              'BLOCK_SUSPICIOUS_IPS',
              'ENABLE_FORENSIC_LOGGING'
            ]
          : [
              'ENFORCE_ENRICHED_LOGGING',
              'MONITOR_NETWORK_TRAFFIC',
              'SCHEDULE_FOLLOWUP_SCAN'
            ],
        timestamp: new Date().toISOString()
      },
      analysis: {
        lateralMovementRisk: isHighSeverity ? 'ELEVATED' : 'LOW',
        c2TrafficDetected: isHighSeverity,
        compromisedAccountCount: isHighSeverity ? 3 : 0
      }
    };
  }

  /**
   * Tool 2: scan_assets
   * Scans enterprise infrastructure and returns affected hosts and vulnerabilities.
   */
  @Tool({
    name: 'scan_assets',
    description: 'Scans enterprise infrastructure assets associated with an incident and identifies affected hosts and vulnerability signatures.',
    inputSchema: z.object({
      incidentId: z.string().optional().describe('Identifier of the incident'),
      targetSubnet: z.string().optional().describe('Subnet or system scope')
    })
  })
  async scanAssets(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing asset infrastructure scan', { input });

    const incidentId = input?.incidentId || 'INC-2026-8902';

    return {
      status: 'success',
      message: 'Enterprise asset infrastructure scan completed.',
      incidentId,
      scannedAssetsCount: 54,
      affectedSystems: [
        {
          name: 'prod-auth-primary-01',
          ip: '10.0.4.12',
          status: 'COMPROMISED',
          role: 'Authentication Service Core'
        },
        {
          name: 'prod-auth-secondary-02',
          ip: '10.0.4.13',
          status: 'ISOLATED',
          role: 'Secondary Auth Replica'
        },
        {
          name: 'redis-session-store-01',
          ip: '10.0.8.90',
          status: 'WARNING',
          role: 'Session Cache'
        },
        {
          name: 'k8s-ingress-gateway-east',
          ip: '10.0.1.5',
          status: 'NORMAL',
          role: 'Edge API Gateway'
        }
      ],
      vulnerabilitiesDetected: [
        {
          cve: 'CVE-2024-3094',
          severity: 'CRITICAL',
          description: 'Remote Code Execution Vulnerability in SSH Tunnel'
        },
        {
          cve: 'AUTH-PRIV-ESC-09',
          severity: 'HIGH',
          description: 'Unauthorized Admin Token Reuse'
        },
        {
          cve: 'NET-C2-TRAFFIC',
          severity: 'HIGH',
          description: 'Suspicious Outbound C2 Traffic on Port 8443'
        }
      ],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Tool 3: isolate_system
   * Generates prioritized system containment plan.
   */
  @Tool({
    name: 'isolate_system',
    description: 'Executes or generates emergency containment and isolation actions for targeted enterprise assets.',
    inputSchema: z.object({
      systemId: z.string().optional().describe('Specific system or host ID to isolate'),
      incidentId: z.string().optional().describe('Associated incident ID')
    })
  })
  async isolateSystem(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing system isolation containment plan', { input });

    const systemId = input?.systemId || 'prod-auth-primary-01';
    const incidentId = input?.incidentId || 'INC-2026-8902';

    return {
      status: 'success',
      message: `System isolation executed for system '${systemId}'.`,
      containmentPlan: {
        incidentId,
        isolatedSystem: systemId,
        isolationStatus: 'ACTIVE_QUARANTINE',
        executedActions: [
          `DISCONNECT_NETWORK_INTERFACE:${systemId}`,
          'REVOKE_IAM_ROLE_CREDENTIALS',
          'QUARANTINE_VIRTUAL_MACHINE',
          'APPLY_EMERGENCY_FIREWALL_RULES'
        ],
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Tool 4: generate_timeline
   * Generates a chronological incident response timeline.
   */
  @Tool({
    name: 'generate_timeline',
    description: 'Produces a detailed chronological incident response timeline from initial access vector to containment.',
    inputSchema: z.object({
      incidentId: z.string().optional().describe('Incident ID to generate timeline for')
    })
  })
  async generateTimeline(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating incident response timeline', { input });

    const incidentId = input?.incidentId || 'INC-2026-8902';

    return {
      status: 'success',
      message: 'Chronological incident timeline generated.',
      incidentId,
      timeline: [
        {
          timestamp: '2026-07-26T04:12:00Z',
          stage: 'Initial Vector',
          event: 'Suspicious IP 198.51.100.45 initiated connection to prod-auth-primary-01 on Port 8443.',
          severity: 'LOW'
        },
        {
          timestamp: '2026-07-26T04:15:22Z',
          stage: 'Anomaly Detected',
          event: 'Enriched log monitor flagged unauthorized admin token escalation attempt.',
          severity: 'MEDIUM'
        },
        {
          timestamp: '2026-07-26T04:18:10Z',
          stage: 'Alert Triggered',
          event: 'Security MCP raised CRITICAL alert INC-2026-8902 for auth-service.',
          severity: 'HIGH'
        },
        {
          timestamp: '2026-07-26T04:20:00Z',
          stage: 'Containment Initiated',
          event: 'Security MCP executed network interface disconnection for prod-auth-secondary-02.',
          severity: 'CRITICAL'
        }
      ]
    };
  }

  /**
   * Tool 5: calculate_risk
   * Computes mock enterprise risk score, business impact, and confidence.
   */
  @Tool({
    name: 'calculate_risk',
    description: 'Computes an enterprise risk score (0-100), financial risk exposure, business impact rating, and confidence level.',
    inputSchema: z.object({
      incidentId: z.string().optional().describe('Incident ID to evaluate risk for'),
      severity: z.nativeEnum(IncidentSeverity).optional().describe('Evaluated severity level')
    })
  })
  async calculateRisk(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Calculating enterprise risk score', { input });

    const incidentId = input?.incidentId || 'INC-2026-8902';
    const severity = input?.severity || IncidentSeverity.HIGH;

    let riskScore = 78;
    let impactLevel = 'HIGH';

    if (severity === IncidentSeverity.CRITICAL) {
      riskScore = 94;
      impactLevel = 'CRITICAL';
    } else if (severity === IncidentSeverity.MEDIUM) {
      riskScore = 48;
      impactLevel = 'MODERATE';
    } else if (severity === IncidentSeverity.LOW) {
      riskScore = 22;
      impactLevel = 'MINIMAL';
    }

    return {
      status: 'success',
      message: 'Enterprise risk calculation completed.',
      incidentId,
      riskAssessment: {
        riskScore,
        maxScore: 100,
        impactLevel,
        estimatedFinancialExposureUSD: '$125,000 - $450,000',
        confidencePercentage: 92,
        factors: [
          'Lateral Movement Capability',
          'Production Database Connectivity',
          'Active Admin Session Hijacking'
        ]
      },
      timestamp: new Date().toISOString()
    };
  }
}
