export interface DeclarativeModel {
  id: string;
  domain: string;
  mode: "equations" | "rates" | "rules";
  stateVars: string[];
  params: Record<string, number>;
  equations?: Record<string, string>;
  rates?: Record<string, string>;
  rules?: { condition: string; effect: string }[];
  knownFormulaReference: string | null;
  assumptions: string[];
  confidence: "high" | "medium" | "low";
  requiresExpertReview: boolean;
  status: "draft" | "reviewed" | "trusted";
  reviewedBy?: string;
}
