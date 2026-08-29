import { z } from 'zod';

export type RiskLevel = 'SAFE' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL';

export interface Finding {
  category: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface McpToolOutput {
  id: string;
  timestamp: string;
  tool: string;
  input: Record<string, unknown>;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  summary: string;
  findings: Finding[];
  recommendations: string[];
  completedChecks: string[];
  failedChecks: string[];
  skippedChecks: string[];
  sourcesUsed: string[];
  limitations: string[];
  metadata: Record<string, unknown>;
}

export const McpOutputSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  tool: z.string(),
  input: z.record(z.unknown()),
  riskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['SAFE', 'SUSPICIOUS', 'HIGH', 'CRITICAL']),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  findings: z.array(z.object({
    category: z.string(),
    description: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  })),
  recommendations: z.array(z.string()),
  completedChecks: z.array(z.string()),
  failedChecks: z.array(z.string()),
  skippedChecks: z.array(z.string()),
  sourcesUsed: z.array(z.string()),
  limitations: z.array(z.string()),
  metadata: z.record(z.unknown()),
});

export function calculateRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 20) return 'SUSPICIOUS';
  return 'SAFE';
}

export function calculateEvidenceScore(findings: Finding[]): number {
  if (!findings || findings.length === 0) return 0;
  let total = 0;
  for (const f of findings) {
    if (f.severity === 'CRITICAL') total += 40;
    else if (f.severity === 'HIGH') total += 25;
    else if (f.severity === 'MEDIUM') total += 15;
    else if (f.severity === 'LOW') total += 5;
  }
  return Math.min(100, total);
}

export function computeDynamicConfidence(completedCount: number, totalExpected: number, apiCount: number): number {
  if (totalExpected === 0) return 0.5;
  const completionRatio = completedCount / totalExpected;
  const apiBonus = Math.min(0.3, apiCount * 0.1);
  return Math.min(0.99, Math.max(0.2, Number((completionRatio * 0.7 + apiBonus).toFixed(2))));
}

export function formatMcpOutput(
  tool: string,
  input: Record<string, unknown>,
  riskScore: number,
  confidence: number,
  summary: string,
  findings: Finding[],
  recommendations: string[],
  metadata: Record<string, unknown> = {},
  completedChecks: string[] = [],
  failedChecks: string[] = [],
  skippedChecks: string[] = [],
  sourcesUsed: string[] = [],
  limitations: string[] = []
): McpToolOutput {
  const calculatedScore = findings.length > 0 ? calculateEvidenceScore(findings) : Math.min(100, Math.max(0, Math.round(riskScore)));
  return {
    id: `tm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    tool,
    input,
    riskScore: calculatedScore,
    riskLevel: calculateRiskLevel(calculatedScore),
    confidence,
    summary,
    findings,
    recommendations,
    completedChecks,
    failedChecks,
    skippedChecks,
    sourcesUsed,
    limitations,
    metadata,
  };
}
