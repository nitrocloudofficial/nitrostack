/**
 * InstantPulse domain model.
 *
 * Every shape an application passes through on its way from "business filled in
 * a name" to "Green, here is your credit limit, here is your Stripe onboarding
 * link" lives here. Keep these free of SDK types so the analytics and risk
 * layers stay pure and testable.
 */

export type ApplicationStatus =
  | 'DRAFT'
  | 'BANK_CONNECTED'
  | 'DATA_SYNCED'
  | 'ANALYZED'
  | 'SCORED'
  | 'PENDING_REVIEW'
  | 'DOCUMENTS_REQUESTED'
  | 'APPROVED'
  | 'DECLINED'
  | 'ONBOARDING_STARTED';

export type RiskBand = 'GREEN' | 'YELLOW' | 'RED';

export type PersonaId = 'healthy' | 'volatile' | 'distressed' | 'default';

// ---------------------------------------------------------------------------
// Business profile
// ---------------------------------------------------------------------------

export interface BusinessProfile {
  businessName: string;
  industry: string;
  entityType?: string;
  ein?: string;
  yearsInOperation?: number;
  claimedMonthlyRevenue?: number;
  requestedAmount?: number;
  contactEmail?: string;
  country: string;
}

// ---------------------------------------------------------------------------
// Normalized bank data (Plaid shapes flattened into something scoreable)
// ---------------------------------------------------------------------------

export interface NormalizedAccount {
  accountId: string;
  name: string;
  officialName?: string;
  type: string;
  subtype?: string;
  mask?: string;
  currentBalance: number;
  availableBalance?: number;
  isoCurrencyCode: string;
}

/**
 * Plaid reports outflows as positive amounts. We invert on the way in so that
 * `amount > 0` always means money arriving. Everything downstream relies on it.
 */
export interface NormalizedTransaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  direction: 'inflow' | 'outflow';
  name: string;
  merchantName?: string;
  category: string[];
  primaryCategory: string;
  pending: boolean;
  isoCurrencyCode: string;
}

export interface LiabilitySummary {
  kind: 'credit' | 'student' | 'mortgage';
  accountId: string;
  outstanding: number;
  minimumPayment?: number;
  apr?: number;
  isOverdue: boolean;
}

export interface FinancialSnapshot {
  applicationId: string;
  fetchedAt: string;
  source: 'plaid_sandbox' | 'simulated';
  institutionName: string;
  windowDays: number;
  accounts: NormalizedAccount[];
  transactions: NormalizedTransaction[];
  liabilities: LiabilitySummary[];
  totalCurrentBalance: number;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface MonthlyBucket {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
  transactionCount: number;
  endingBalanceEstimate: number;
  /**
   * False for the partial months at either end of the window. Shown in the UI,
   * but excluded from averages and volatility — a half-observed month is not a
   * bad month.
   */
  isComplete: boolean;
}

export interface Anomaly {
  code: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  date?: string;
  amount?: number;
  penaltyPoints: number;
}

export interface CashFlowMetrics {
  windowDays: number;
  monthsObserved: number;
  monthly: MonthlyBucket[];

  avgMonthlyInflow: number;
  avgMonthlyOutflow: number;
  netMonthlyCashFlow: number;
  inflowOutflowRatio: number;

  revenueStability: number;
  /**
   * 0..1, grows with the number of complete months observed. Volatility measured
   * over two months is a real but weak estimate; the engine weights it accordingly.
   */
  revenueStabilityConfidence: number;
  revenueCoefficientOfVariation: number;
  revenueTrend: number;
  /**
   * R² of the trend regression, 0..1. Noisy revenue makes the slope unreliable,
   * so the engine blends the trend score toward neutral as this falls.
   */
  revenueTrendConfidence: number;

  currentBalance: number;
  minBalance: number;
  estimatedDailyBurn: number;
  daysCashOnHand: number;
  negativeBalanceDays: number;

  nsfCount: number;
  monthlyDebtService: number;
  debtServiceRatio: number;

  accountTenureDays: number;
  transactionsPerMonth: number;
  daysSinceLastInflow: number;
  largestSingleInflow: number;
  distinctInflowSources: number;

  anomalies: Anomaly[];
}

// ---------------------------------------------------------------------------
// Risk decision
// ---------------------------------------------------------------------------

/**
 * The transparency layer. Every point awarded or withheld produces one of
 * these, so a decision can always be read back as a list of sentences.
 */
export interface ReasonCode {
  code: string;
  factor: string;
  label: string;
  points: number;
  maxPoints: number;
  impact: 'positive' | 'neutral' | 'negative';
  explanation: string;
}

export interface PolicyFlag {
  code: string;
  label: string;
  explanation: string;
}

export interface CreditRecommendation {
  recommendedLimit: number;
  currency: string;
  revenueBasedCap: number;
  liquidityCap: number;
  affordabilityCap: number;
  bindingConstraint: string;
  requestedAmount?: number;
  requestCoverage?: number;
  explanation: string;
}

export interface RiskDecision {
  applicationId: string;
  scoredAt: string;
  policyVersion: string;

  rawScore: number;
  anomalyPenalty: number;
  score: number;

  band: RiskBand;
  bandReason: string;

  reasonCodes: ReasonCode[];
  hardBlockers: PolicyFlag[];
  softFlags: PolicyFlag[];

  credit: CreditRecommendation;
  nextAction: string;
  summary: string;
}

// ---------------------------------------------------------------------------
// Stripe / review / audit
// ---------------------------------------------------------------------------

export interface StripeOnboarding {
  accountId: string;
  onboardingUrl: string;
  expiresAt: string;
  startedAt: string;
  simulated: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  pendingRequirements: string[];
}

export interface DocumentRequest {
  requestId: string;
  documents: string[];
  note?: string;
  requestedBy: string;
  requestedAt: string;
  status: 'open' | 'fulfilled' | 'cancelled';
}

export interface DecisionOverride {
  previousBand: RiskBand;
  newBand: RiskBand;
  justification: string;
  officer: string;
  overriddenAt: string;
}

export interface AuditEntry {
  entryId: string;
  applicationId: string;
  at: string;
  actor: string;
  event: string;
  detail: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Application aggregate
// ---------------------------------------------------------------------------

export interface PlaidLink {
  itemId: string;
  /** Never returned to MCP clients — redacted by ApplicationStore.toPublic(). */
  accessToken: string;
  institutionId: string;
  institutionName: string;
  persona: PersonaId;
  connectedAt: string;
  simulated: boolean;
}

export interface Application {
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  status: ApplicationStatus;
  profile: BusinessProfile;
  plaid?: PlaidLink;
  snapshot?: FinancialSnapshot;
  metrics?: CashFlowMetrics;
  decision?: RiskDecision;
  stripe?: StripeOnboarding;
  override?: DecisionOverride;
  documentRequests: DocumentRequest[];
}

/** An Application safe to hand to an MCP client: no access tokens, no raw ledger. */
export type PublicApplication = Omit<Application, 'plaid' | 'snapshot'> & {
  plaid?: Omit<PlaidLink, 'accessToken'>;
  snapshotSummary?: {
    source: FinancialSnapshot['source'];
    institutionName: string;
    fetchedAt: string;
    windowDays: number;
    accountCount: number;
    transactionCount: number;
    totalCurrentBalance: number;
  };
};
