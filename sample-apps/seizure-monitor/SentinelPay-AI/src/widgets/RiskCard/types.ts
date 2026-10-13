/**
 * SentinelPay AI — RiskCard Widget Types
 * Source: Technical Specification §3.1 (widgets/RiskCard), §5.7, §10.7
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskFactorView {
  name: "beneficiaryMismatch" | "amountAnomaly" | "policyViolation";
  weight: number;
  triggered: boolean;
}

export interface RiskCardProps {
  caseId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactorView[];
}
