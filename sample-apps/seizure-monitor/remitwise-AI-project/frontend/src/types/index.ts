export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'INR'
  | 'AED'
  | 'CAD'
  | 'AUD'
  | 'SGD'
  | 'MYR'
  | 'PHP'
  | 'MXN';

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  currency: CurrencyCode;
  currencySymbol: string;
}

export interface Provider {
  id: string;
  name: string;
  logo: string;
  rating: number;
  reviewCount: number;
  transferSpeed: string;
  estimatedHours: number;
  exchangeRate: number;
  fee: number;
  fxMarkup: number; // percentage
  deliveryMethods: string[];
  paymentMethods: string[];
  pros: string[];
  cons: string[];
  badges: string[];
  isRecommended?: boolean;
}

export interface ExchangeRateData {
  base: CurrencyCode;
  target: CurrencyCode;
  rate: number;
  previousClose?: number;
  change24h: number;
  high24h: number;
  low24h: number;
  history7d: { date: string; rate: number }[];
  history30d: { date: string; rate: number }[];
  lastUpdated: string;
  provider?: string;
  source?: string;
  market?: string;
  cache?: string;
  latencyMs?: number;
  staleSeconds?: number;
  rawJson?: any;
}

export interface AgentStep {
  id: string;
  agentName: string;
  agentRole: 'Route Scout' | 'Timing Agent' | 'Compliance Agent' | 'Tracker Agent';
  avatar: string;
  description: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  confidenceScore: number;
  logs: { timestamp: string; message: string; type?: 'info' | 'success' | 'warn' }[];
  outputSummary?: string;
}

export interface ComplianceRule {
  countryCode: string;
  countryName: string;
  currency: string;
  flag: string;
  kycRequired: boolean;
  amlCheck: boolean;
  sanctionsScreening: boolean;
  riskLevel: 'Low' | 'Medium' | 'High';
  maxDailyLimit: number;
  requiredDocuments: {
    name: string;
    description: string;
    mandatory: boolean;
  }[];
  regulatoryBody: string;
  notes: string;
}

export interface TransferRequest {
  fromCountry: CountryOption;
  toCountry: CountryOption;
  amount: number;
  urgency: 'instant' | 'same-day' | 'standard';
  paymentMethod: string;
  receiveMethod: string;
}

export interface RecommendationResult {
  recommendedProvider: Provider;
  allProviders: Provider[];
  totalReceived: number;
  savingsVsBank: number;
  savingsPercentage: number;
  exchangeRate: number;
  estimatedArrival: string;
  riskScore: 'Low' | 'Medium' | 'High';
  confidenceScore: number;
  decisionFactors: {
    title: string;
    passed: boolean;
    description: string;
  }[];
  sourcesUsed: string[];
  trackingId: string;
  timestamp: string;
}

export interface TransferStatusStep {
  stage: string;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
  timestamp?: string;
}

export interface AgentPlanStep {
  agent: string;
  reason: string;
  priority: number;
  status?: 'completed' | 'running' | 'inactive';
  executionTimeMs?: number;
}

export interface AgentChatResponse {
  session_id: string;
  query: string | any;
  agents_used: string[];
  plan: AgentPlanStep[];
  results: Record<string, { status: string; data: any; execution_ms?: number }>;
  summary: string;
  status: string;
  total_execution_ms: number;
  metadata?: {
    planner_name?: string;
    provider_name?: string;
    confidence?: number;
    planning_latency_ms?: number;
  };
}

