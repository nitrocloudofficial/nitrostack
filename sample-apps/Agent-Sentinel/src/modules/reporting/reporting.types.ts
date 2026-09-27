export type ReportType =
  | "EXECUTIVE"
  | "SECURITY"
  | "AUDIT"
  | "POLICY"
  | "AGENTS"
  | "INCIDENTS";

export type ReportFormat =
  | "JSON"
  | "CSV"
  | "PDF";

export interface ReportSummary {
  totalAgents: number;
  activeAgents: number;
  policyViolations: number;
  blockedRequests: number;
  quarantinedAgents: number;
  incidents: number;
  averageRiskScore: number;
}

export interface ReportMetadata {
  id: string;
  title: string;
  type: ReportType;
  format: ReportFormat;
  generatedAt: string;
  generatedBy: string;
}

export interface EnterpriseReport {
  metadata: ReportMetadata;
  summary: ReportSummary;
  recommendations: string[];
  data: unknown;
}