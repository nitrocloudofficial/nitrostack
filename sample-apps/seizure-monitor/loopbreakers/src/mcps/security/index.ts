/**
 * Security MCP Server Module
 * 
 * Enterprise Security MCP responsible for detecting attacks, scanning enterprise assets,
 * and recommending system isolation and containment actions.
 */

import {
  Incident,
  Proposal,
  IncidentSeverity,
  ProposalPriority,
} from '../../shared/index.js';

/**
 * Summary result returned by the scan_assets tool.
 */
export interface AssetScanSummary {
  /** Identifier of the incident being scanned */
  incidentId: string;
  /** Total count of enterprise assets scanned */
  scannedAssetsCount: number;
  /** List of affected or compromised system names */
  affectedSystems: string[];
  /** List of identified vulnerabilities or threat signatures */
  vulnerabilitiesDetected: string[];
  /** Threat severity level assessed from the scan */
  threatLevel: IncidentSeverity;
  /** Timestamp when the asset scan completed */
  timestamp: Date;
}

/**
 * Tool 1: detect_attack
 *
 * Analyzes an enterprise incident to evaluate severity and threat risk.
 * If the incident severity is CRITICAL or HIGH, returns a Proposal recommending immediate containment.
 * Otherwise, returns a Proposal recommending standard security monitoring.
 *
 * @param incident - The enterprise incident to analyze.
 * @returns Strongly typed Proposal object with recommended actions.
 */
export function detect_attack(incident: Incident): Proposal {
  const isHighSeverity =
    incident.severity === IncidentSeverity.CRITICAL ||
    incident.severity === IncidentSeverity.HIGH;

  if (isHighSeverity) {
    return {
      agentName: 'SecurityMCP',
      priority: ProposalPriority.URGENT,
      recommendation: `Immediate containment and asset isolation required for incident '${incident.title}'.`,
      reasoning: `Incident severity is ${incident.severity} originating from source '${incident.source}'. Elevated threat level detected with risk of lateral propagation.`,
      actions: [
        'ISOLATE_AFFECTED_HOSTS',
        'REVOKE_ACTIVE_SESSIONS',
        'BLOCK_SUSPICIOUS_IPS',
        'ENABLE_FORENSIC_LOGGING',
      ],
      timestamp: new Date(),
    };
  }

  return {
    agentName: 'SecurityMCP',
    priority: ProposalPriority.MEDIUM,
    recommendation: `Standard active security monitoring recommended for incident '${incident.title}'.`,
    reasoning: `Incident severity is ${incident.severity} from source '${incident.source}'. Immediate system isolation is not required, but continuous log analysis is advised.`,
    actions: [
      'ENFORCE_ENRICHED_LOGGING',
      'MONITOR_NETWORK_TRAFFIC',
      'SCHEDULE_FOLLOWUP_SCAN',
    ],
    timestamp: new Date(),
  };
}

/**
 * Tool 2: scan_assets
 *
 * Simulates scanning enterprise infrastructure assets associated with an incident.
 * Returns a mock summary detailing affected systems and detected vulnerabilities.
 *
 * @param incident - The enterprise incident specifying the scan scope.
 * @returns A mock summary of scanned assets and affected systems.
 */
export function scan_assets(incident: Incident): AssetScanSummary {
  // Enterprise mock asset database mapping based on incident source/description
  const mockSystemsMap: Record<string, string[]> = {
    'auth-service': ['prod-auth-primary-01', 'prod-auth-secondary-02', 'redis-session-store'],
    'database': ['db-primary-cluster-01', 'db-replica-node-02'],
    'gateway': ['k8s-ingress-gateway-east', 'api-gateway-edge-01'],
    'workstation': ['ws-user-sec-104', 'ws-admin-dev-012'],
  };

  const matchedKey = Object.keys(mockSystemsMap).find((key) =>
    incident.source.toLowerCase().includes(key) || incident.description.toLowerCase().includes(key)
  );

  const affectedSystems = matchedKey
    ? mockSystemsMap[matchedKey]
    : [`sys-${incident.source.toLowerCase().replace(/[^a-z0-9]/g, '-')}-01`, 'core-network-switch-01'];

  return {
    incidentId: incident.id,
    scannedAssetsCount: 42,
    affectedSystems,
    vulnerabilitiesDetected: [
      'CVE-2024-3094 (Remote Code Execution Risk)',
      'UNAUTHORIZED_ADMIN_PRIVILEGE_ESCALATION',
      'SUSPICIOUS_OUTBOUND_C2_TRAFFIC',
    ],
    threatLevel: incident.severity,
    timestamp: new Date(),
  };
}

/**
 * Tool 3: isolate_system
 *
 * Simulates isolating enterprise systems affected by a security incident.
 * Returns a Proposal detailing containment actions such as network interface disconnection.
 *
 * @param incident - The enterprise incident requiring asset containment.
 * @returns Strongly typed Proposal object describing system isolation steps.
 */
export function isolate_system(incident: Incident): Proposal {
  return {
    agentName: 'SecurityMCP',
    priority: ProposalPriority.URGENT,
    recommendation: `Execute mandatory system isolation for affected assets under incident '${incident.id}'.`,
    reasoning: `Triggered emergency asset containment for source system '${incident.source}'. Network interfaces will be severed to prevent threat propagation.`,
    actions: [
      `DISCONNECT_NETWORK_INTERFACE:${incident.source}`,
      'QUARANTINE_VIRTUAL_MACHINES',
      'APPLY_FIREWALL_BLOCK_RULES',
      'REVOKE_IAM_ROLE_CREDENTIALS',
    ],
    timestamp: new Date(),
  };
}

/**
 * Tool registry metadata for NitroStack Studio discovery.
 */
export const securityTools = [
  {
    name: 'detect_attack',
    description: 'Analyzes incident severity and returns containment or monitoring proposals.',
    handler: detect_attack,
  },
  {
    name: 'scan_assets',
    description: 'Scans enterprise assets associated with an incident and returns affected systems.',
    handler: scan_assets,
  },
  {
    name: 'isolate_system',
    description: 'Simulates system isolation and returns containment action proposals.',
    handler: isolate_system,
  },
];

/**
 * Security MCP Module definition for NitroStack.
 */
export const SecurityMcpModule = {
  name: 'SecurityMCP',
  version: '1.0.0',
  description: 'Enterprise Security MCP responsible for threat detection, asset scanning, and system isolation.',
  tools: {
    detect_attack,
    scan_assets,
    isolate_system,
  },
  registry: securityTools,
};