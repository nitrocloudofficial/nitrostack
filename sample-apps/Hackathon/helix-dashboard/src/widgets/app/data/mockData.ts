export interface DepartmentDrift {
  id: string;
  name: string;
  code: string;
  driftScore: number; // 0.00 to 1.00
  status: 'aligned' | 'moderate' | 'severe';
  topDriftTopic: string;
  lead: string;
  trendHistory: number[]; // 7 days of historical drift scores
  activeAlertsCount: number;
  cohesionIndex: number; // percentage
  flaggedCount: number;
}

export interface TelemetrySignal {
  id: string;
  timestamp: string;
  source: 'Slack' | 'Teams' | 'Jira' | 'Confluence';
  department: 'Engineering' | 'Product' | 'Sales' | 'Marketing' | 'Legal' | 'Legal & Risk';
  severity: 'Low' | 'Med' | 'High';
  payloadPreview: string;
  fullRawMessage: string;
  matchedBaselineId: string;
  matchedBaselineTitle: string;
  driftScore: number;
  llmReasoning: string;
  sender: string;
  channelOrTicket: string;
  rawJson: object;
}

export interface StrategicBaseline {
  id: string;
  code: string;
  title: string;
  category: 'Security & Compliance' | 'Pricing & SLA Governance' | 'Legal & Risk Control' | 'Brand & Market Claims' | 'Product Architecture';
  description: string;
  toleranceThreshold: number; // 0.10 to 0.50
  activeMonitorsCount: number;
  alignedCount: number;
  driftedCount: number;
  status: 'Active' | 'Review Required';
  createdDate: string;
}

export interface InterventionLog {
  id: string;
  timestamp: string;
  targetUnit: string;
  recipient: string;
  baselineCode: string;
  baselineTitle: string;
  channel: 'Slack Nudge Bot' | 'Jira Policy Banner' | 'Teams Executive Alert' | 'Email Escalation';
  status: 'Delivered' | 'Acknowledged' | 'Actioned' | 'Escalated';
  nudgeMessage: string;
  resolutionTime: string;
  driftDelta: number;
}

export const INITIAL_DEPARTMENTS: DepartmentDrift[] = [
  {
    id: 'dept-eng',
    name: 'Engineering',
    code: 'ENG',
    driftScore: 0.68,
    status: 'severe',
    topDriftTopic: 'Bypassing SOC2 Security Audit to Hit Release Target',
    lead: 'Marcus Vance (VP Eng)',
    trendHistory: [0.32, 0.41, 0.48, 0.55, 0.59, 0.64, 0.68],
    activeAlertsCount: 6,
    cohesionIndex: 72.4,
    flaggedCount: 18
  },
  {
    id: 'dept-prod',
    name: 'Product',
    code: 'PRD',
    driftScore: 0.38,
    status: 'moderate',
    topDriftTopic: 'Unapproved Feature Scope Creep without Architecture Signoff',
    lead: 'Elena Rostova (Head of Product)',
    trendHistory: [0.28, 0.30, 0.35, 0.36, 0.37, 0.39, 0.38],
    activeAlertsCount: 3,
    cohesionIndex: 84.1,
    flaggedCount: 9
  },
  {
    id: 'dept-leg',
    name: 'Legal & Risk',
    code: 'LGL',
    driftScore: 0.45,
    status: 'moderate',
    topDriftTopic: 'Custom IP Indemnity Clause Amendments in Enterprise MSAs',
    lead: 'David Chen (Chief Legal Officer)',
    trendHistory: [0.20, 0.25, 0.31, 0.38, 0.42, 0.44, 0.45],
    activeAlertsCount: 4,
    cohesionIndex: 81.0,
    flaggedCount: 11
  },
  {
    id: 'dept-sales',
    name: 'Sales & Revenue',
    code: 'SLS',
    driftScore: 0.25,
    status: 'aligned',
    topDriftTopic: 'Non-standard Discounting SLA Exceptions',
    lead: 'Sarah Jenkins (CRO)',
    trendHistory: [0.42, 0.38, 0.35, 0.30, 0.28, 0.26, 0.25],
    activeAlertsCount: 1,
    cohesionIndex: 92.6,
    flaggedCount: 4
  },
  {
    id: 'dept-mkt',
    name: 'Global Marketing',
    code: 'MKT',
    driftScore: 0.12,
    status: 'aligned',
    topDriftTopic: 'Minor Performance Benchmark Wording Variance',
    lead: 'Amara Okafor (CMO)',
    trendHistory: [0.18, 0.16, 0.15, 0.14, 0.13, 0.12, 0.12],
    activeAlertsCount: 0,
    cohesionIndex: 96.8,
    flaggedCount: 2
  }
];

export const INITIAL_STREAM_SIGNALS: TelemetrySignal[] = [
  {
    id: 'sig-101',
    timestamp: '14:52:19',
    source: 'Jira',
    department: 'Engineering',
    severity: 'High',
    payloadPreview: 'ENG-4892: Closed ticket without SecOps mandatory security signoff...',
    fullRawMessage: 'Ticket ENG-4892 marked as "RESOLVED/DEPLOYED". Comment from @m.vance: "Waiving the SecOps code review for sprint release deadline. We will patch vulnerability in hotfix release next week."',
    matchedBaselineId: 'base-sec-01',
    matchedBaselineTitle: 'Mandatory SOC2 & Pre-Release SecOps Gateways',
    driftScore: 0.88,
    llmReasoning: 'Engineering leadership explicitly bypassed mandatory pre-release security validation to preserve release velocity, violating policy SEC-01 which strictly forbids unreviewed production deployments.',
    sender: 'marcus.vance@helix.internal',
    channelOrTicket: 'Jira #ENG-4892',
    rawJson: {
      ticket_id: 'ENG-4892',
      status: 'RESOLVED',
      override_flag: true,
      author: 'marcus.vance',
      severity_score: 0.88,
      risk_factors: ['SOC2_VIOLATION', 'UNREVIEWED_CODE_MERGE']
    }
  },
  {
    id: 'sig-102',
    timestamp: '14:48:05',
    source: 'Slack',
    department: 'Sales',
    severity: 'Med',
    payloadPreview: '#deal-desk: Offering Enterprise Client Acme Corp 35% custom discount...',
    fullRawMessage: '#deal-desk chat message from @s.jenkins: "Approved 35% discount rate for Acme Corp 3-year term. Bypassed CFO approval threshold of 25% due to fiscal quarter deadline pressure."',
    matchedBaselineId: 'base-prc-02',
    matchedBaselineTitle: 'Commercial Pricing & Discounting Authorization Thresholds',
    driftScore: 0.48,
    llmReasoning: 'Discount level (35%) exceeds maximum self-authorization cap (25%) without logged executive signoff, introducing margin variance.',
    sender: 'sarah.jenkins@helix.internal',
    channelOrTicket: '#deal-desk-west',
    rawJson: {
      channel: '#deal-desk-west',
      discount_rate: 0.35,
      threshold_cap: 0.25,
      override_level: 'CRO_SOLO',
      deal_value_usd: 1200000
    }
  },
  {
    id: 'sig-103',
    timestamp: '14:41:30',
    source: 'Teams',
    department: 'Product',
    severity: 'Med',
    payloadPreview: 'Product Sync: Added custom enterprise API endpoint specification...',
    fullRawMessage: 'Teams transcript from Product Architecture Call: "We decided to build custom database sync hooks for Client Zenith. Skipping standard API gateway rate limiting schema."',
    matchedBaselineId: 'base-arch-03',
    matchedBaselineTitle: 'Unified API Gateway & Microservice Rate Limiting Standard',
    driftScore: 0.52,
    llmReasoning: 'Unsanctioned architectural detour bypassing API gateway rate limit enforcement, threatening core platform tenant isolation.',
    sender: 'elena.rostova@helix.internal',
    channelOrTicket: 'Teams: Product Architecture',
    rawJson: {
      meeting: 'Product Architecture Review',
      bypassed_layer: 'API_GATEWAY_RATE_LIMITER',
      custom_hook_requested: true
    }
  },
  {
    id: 'sig-104',
    timestamp: '14:35:12',
    source: 'Confluence',
    department: 'Legal & Risk',
    severity: 'High',
    payloadPreview: 'MSA Spec Edit: Modified IP ownership indemnity clause for Tier-1 Customer...',
    fullRawMessage: 'Confluence Page "Standard MSA Template v4.2" revised by @d.chen: "Added clause 14.b waiving standard liability capping in favor of unlimited mutual indemnity for data loss."',
    matchedBaselineId: 'base-leg-01',
    matchedBaselineTitle: 'Enterprise Liability Capping & IP Indemnity Baseline',
    driftScore: 0.79,
    llmReasoning: 'Clause edit eliminates standard $10M liability ceiling without Board Audit Committee review, exposing high enterprise financial risk.',
    sender: 'david.chen@helix.internal',
    channelOrTicket: 'Confluence: Legal/Templates/MSA',
    rawJson: {
      page: 'Standard MSA Template v4.2',
      clause_modified: '14.b',
      liability_cap: 'UNLIMITED',
      baseline_max_usd: 10000000
    }
  },
  {
    id: 'sig-105',
    timestamp: '14:29:44',
    source: 'Slack',
    department: 'Engineering',
    severity: 'High',
    payloadPreview: '#infrastructure: Disabling TLS 1.3 requirement for legacy gateway...',
    fullRawMessage: 'Slack message in #infrastructure-alerts: "Disabling TLS strict enforcement on service cluster us-east-1 node-04 to allow legacy customer ingestion service connection."',
    matchedBaselineId: 'base-sec-01',
    matchedBaselineTitle: 'Mandatory SOC2 & Pre-Release SecOps Gateways',
    driftScore: 0.84,
    llmReasoning: 'Lowering encryption transport standards below TLS 1.3 policy threshold breaches ISO27001 compliance criteria.',
    sender: 'alex.k@helix.internal',
    channelOrTicket: '#infrastructure-alerts',
    rawJson: {
      cluster: 'us-east-1',
      protocol_downgrade: 'TLS_1.0_ENABLED',
      target_baseline: 'TLS_1.3_STRICT'
    }
  },
  {
    id: 'sig-106',
    timestamp: '14:20:10',
    source: 'Teams',
    department: 'Marketing',
    severity: 'Low',
    payloadPreview: 'Press Release Draft: Claiming 99.999% uptime benchmark...',
    fullRawMessage: 'Teams chat in Marketing PR: "Drafting Q3 press release highlighting 99.999% uptime capability across all multi-region deployments."',
    matchedBaselineId: 'base-mkt-04',
    matchedBaselineTitle: 'Verifiable Product Claims & External Communication Governance',
    driftScore: 0.22,
    llmReasoning: 'Claimed SLA (99.999%) slightly exceeds actual verified platform benchmark (99.99%), requiring engineering data validation prior to release.',
    sender: 'amara.okafor@helix.internal',
    channelOrTicket: 'Teams: Marketing PR',
    rawJson: {
      claimed_sla: '99.999%',
      actual_sla: '99.99%',
      status: 'MINOR_DRIFT'
    }
  },
  {
    id: 'sig-107',
    timestamp: '14:14:02',
    source: 'Jira',
    department: 'Product',
    severity: 'Low',
    payloadPreview: 'PRD-102: Postponed multi-factor auth mandate for enterprise trial users...',
    fullRawMessage: 'Jira PRD-102: "Pushing mandatory MFA enrollment requirement from onboarding step to week 2 to increase trial conversion rate."',
    matchedBaselineId: 'base-sec-01',
    matchedBaselineTitle: 'Mandatory SOC2 & Pre-Release SecOps Gateways',
    driftScore: 0.35,
    llmReasoning: 'Deferring MFA enforcement creates a temporary window of unauthenticated access for trial accounts.',
    sender: 'devon.t@helix.internal',
    channelOrTicket: 'Jira #PRD-102',
    rawJson: {
      ticket_id: 'PRD-102',
      policy: 'MFA_ONBOARDING',
      deferred_days: 14
    }
  },
  {
    id: 'sig-108',
    timestamp: '14:05:55',
    source: 'Slack',
    department: 'Legal & Risk',
    severity: 'Med',
    payloadPreview: '#compliance: Data retention policy exception granted for EMEA vendor...',
    fullRawMessage: 'Slack #compliance-logs: "Granted 90-day extension on data deletion request for legacy EMEA customer data processing pipeline."',
    matchedBaselineId: 'base-leg-01',
    matchedBaselineTitle: 'Enterprise Liability Capping & IP Indemnity Baseline',
    driftScore: 0.58,
    llmReasoning: 'Extending data retention beyond GDPR 30-day mandate increases regulatory compliance audit risk.',
    sender: 'lisa.w@helix.internal',
    channelOrTicket: '#compliance-logs',
    rawJson: {
      regulation: 'GDPR_ARTICLE_17',
      max_allowed_days: 30,
      granted_days: 90
    }
  }
];

export const INITIAL_BASELINES: StrategicBaseline[] = [
  {
    id: 'base-sec-01',
    code: 'SEC-01',
    title: 'Mandatory SOC2 & Pre-Release SecOps Gateways',
    category: 'Security & Compliance',
    description: 'Every code commit, architectural change, and infrastructure deployment must pass automated SecOps compliance inspection and receive formal security signoff before production deployment.',
    toleranceThreshold: 0.15,
    activeMonitorsCount: 14,
    alignedCount: 9,
    driftedCount: 5,
    status: 'Active',
    createdDate: '2026-01-15'
  },
  {
    id: 'base-prc-02',
    code: 'PRC-02',
    title: 'Commercial Pricing & Discounting Authorization Thresholds',
    category: 'Pricing & SLA Governance',
    description: 'Discounting above 25% requires formal CFO signoff. Contract SLA uptime commitments above 99.9% require Infrastructure VP approval.',
    toleranceThreshold: 0.20,
    activeMonitorsCount: 8,
    alignedCount: 6,
    driftedCount: 2,
    status: 'Active',
    createdDate: '2026-02-01'
  },
  {
    id: 'base-leg-01',
    code: 'LEG-01',
    title: 'Enterprise Liability Capping & IP Indemnity Baseline',
    category: 'Legal & Risk Control',
    description: 'All customer Master Service Agreements must retain standard liability caps equal to 12-month fees paid, capped at $10M max without Board Audit approval.',
    toleranceThreshold: 0.25,
    activeMonitorsCount: 6,
    alignedCount: 4,
    driftedCount: 2,
    status: 'Review Required',
    createdDate: '2026-01-20'
  },
  {
    id: 'base-mkt-04',
    code: 'MKT-04',
    title: 'Verifiable Product Claims & External Communication Governance',
    category: 'Brand & Market Claims',
    description: 'Public performance benchmarks, SLA guarantees, and security assertions in marketing materials must be mathematically verified by Product telemetry.',
    toleranceThreshold: 0.10,
    activeMonitorsCount: 10,
    alignedCount: 9,
    driftedCount: 1,
    status: 'Active',
    createdDate: '2026-03-10'
  },
  {
    id: 'base-arch-03',
    code: 'ARCH-03',
    title: 'Unified API Gateway & Microservice Rate Limiting Standard',
    category: 'Product Architecture',
    description: 'All enterprise customer integrations must route through the central API Gateway with standardized rate limiting and multi-tenant isolation.',
    toleranceThreshold: 0.20,
    activeMonitorsCount: 12,
    alignedCount: 10,
    driftedCount: 2,
    status: 'Active',
    createdDate: '2026-02-18'
  }
];

export const INITIAL_INTERVENTIONS: InterventionLog[] = [
  {
    id: 'nudge-501',
    timestamp: '14:53:00',
    targetUnit: 'Engineering - Marcus Vance',
    recipient: 'marcus.vance@helix.internal',
    baselineCode: 'SEC-01',
    baselineTitle: 'Mandatory SOC2 & Pre-Release SecOps Gateways',
    channel: 'Slack Nudge Bot',
    status: 'Delivered',
    nudgeMessage: '[ALERT] HELIX Cognitive Guardian: Jira ticket ENG-4892 was closed without required SecOps review. Please attach security verification before deployment.',
    resolutionTime: 'Pending (ETA 15m)',
    driftDelta: -0.12
  },
  {
    id: 'nudge-502',
    timestamp: '14:49:12',
    targetUnit: 'Sales - Sarah Jenkins',
    recipient: 'sarah.jenkins@helix.internal',
    baselineCode: 'PRC-02',
    baselineTitle: 'Commercial Pricing & Discounting Authorization Thresholds',
    channel: 'Jira Policy Banner',
    status: 'Acknowledged',
    nudgeMessage: '[INFO] Discount override of 35% for Acme Corp flagged. CFO signoff link attached for rapid 1-click authorization.',
    resolutionTime: '8 mins',
    driftDelta: -0.20
  },
  {
    id: 'nudge-503',
    timestamp: '14:36:00',
    targetUnit: 'Legal - David Chen',
    recipient: 'david.chen@helix.internal',
    baselineCode: 'LEG-01',
    baselineTitle: 'Enterprise Liability Capping & IP Indemnity Baseline',
    channel: 'Teams Executive Alert',
    status: 'Escalated',
    nudgeMessage: '[ALERT] High Liability Exposure: Unlimited indemnity clause detected in MSA draft. Audit Committee notification triggered.',
    resolutionTime: 'Escalated to Board',
    driftDelta: 0.00
  },
  {
    id: 'nudge-504',
    timestamp: '14:15:30',
    targetUnit: 'Product - Elena Rostova',
    recipient: 'elena.rostova@helix.internal',
    baselineCode: 'ARCH-03',
    baselineTitle: 'Unified API Gateway & Microservice Rate Limiting Standard',
    channel: 'Slack Nudge Bot',
    status: 'Actioned',
    nudgeMessage: '[SUCCESS] Architectural Nudge: Custom DB hook converted to standard API Gateway rate limiter policy.',
    resolutionTime: '4 mins',
    driftDelta: -0.32
  }
];
