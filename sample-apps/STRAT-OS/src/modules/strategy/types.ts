export interface StrategyRequest {
  company: string;
  industry: string;
  objective: string;
  budget?: number;
  employees?: number;
}

export interface AnalysisResult {
  section: string;
  summary: string;
  findings: string[];
  recommendations: string[];
}

export interface StrategyResponse {
  executiveSummary: string;
  market: AnalysisResult;
  finance: AnalysisResult;
  hr: AnalysisResult;
  legal: AnalysisResult;
  compliance: AnalysisResult;
  finalRecommendation: string;
}