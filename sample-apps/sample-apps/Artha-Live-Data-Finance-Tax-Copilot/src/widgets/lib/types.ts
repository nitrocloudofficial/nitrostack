/**
 * Shared widget-side types — these mirror the JSON returned by the backend
 * tools (see src/modules/**). Kept in one place so every widget reads the
 * same shapes via getToolOutput<T>().
 */

export type Regime = 'old' | 'new';

export interface SlabBreakdownRow {
    band: string;
    rate: number;
    taxableInBand: number;
    taxForBand: number;
}

export interface RegimeResult {
    regime: Regime;
    grossIncome: number;
    standardDeduction: number;
    otherDeductions: number;
    totalDeductions: number;
    taxableIncome: number;
    taxBeforeRebate: number;
    rebate87A: number;
    taxAfterRebate: number;
    surcharge: number;
    cess: number;
    totalTax: number;
    effectiveRate: number;
    slabBreakdown: SlabBreakdownRow[];
    appliedDeductions: Record<string, number>;
}

export interface TaxComparison {
    financialYear: string;
    assessmentYear: string;
    grossIncome: number;
    ageGroup: string;
    old: RegimeResult;
    new: RegimeResult;
    recommendation: {
        regime: Regime;
        totalTax: number;
        savesVsOther: number;
        note: string;
    };
}

export interface FundSearchResult {
    schemeCode: number;
    schemeName: string;
}

export interface FundSearchOutput {
    query: string;
    count: number;
    results: FundSearchResult[];
}

export interface FundNav {
    schemeCode: number;
    schemeName: string;
    fundHouse?: string;
    category?: string;
    nav: number;
    date: string;
    source?: string;
    fetchedAt?: string;
}

export interface FundReturns {
    scheme: { schemeCode: number; schemeName: string; fundHouse?: string; category?: string };
    investedAmount: number;
    investedDate: string;
    navAtInvestment: number;
    navAtInvestmentDate: string;
    latestNav: number;
    latestNavDate: string;
    unitsAllotted: number;
    currentValue: number;
    absoluteReturn: number;
    absoluteGain: number;
    holdingYears: number;
    cagr: number;
    xirr: number;
    source?: string;
    fetchedAt?: string;
}

export interface BankBranch {
    ifsc: string;
    bank: string;
    bankCode?: string;
    branch: string;
    address: string;
    city: string;
    district?: string;
    state: string;
    centre?: string;
    contact?: string;
    micr?: string | null;
    swift?: string | null;
    supports: { neft: boolean; rtgs: boolean; imps: boolean; upi: boolean };
    source?: string;
    fetchedAt?: string;
}

export type ComplianceCategory = 'ITR' | 'Advance Tax' | 'TDS' | 'Investment' | 'Audit' | 'GST';

export interface UpcomingEvent {
    id: string;
    title: string;
    category: ComplianceCategory;
    dueDate: string;
    description: string;
    appliesTo: string;
    daysRemaining: number;
}

export interface DeadlinesOutput {
    asOf: string;
    count: number;
    deadlines: UpcomingEvent[];
}

export interface ComplianceEvent {
    id: string;
    title: string;
    category: ComplianceCategory;
    dueDate: string;
    description: string;
    appliesTo: string;
}

export interface CalendarOutput {
    count: number;
    events: ComplianceEvent[];
}

// ─── Financial Council ───────────────────────────────────────────────────────

export interface AgentVerdict {
    agent: 'tax_saver' | 'growth' | 'safety';
    lens: string;
    verdict: string;
    verdictLabel: string;
    reasoning: string;
    score: number; // 0–10
    details: Record<string, string | number>;
}

export interface CouncilBreakdownRow {
    agent: string;
    verdict: string;
    verdictLabel: string;
    score: number;
    reasoning?: string;
}

export interface CouncilResult {
    finalRecommendation: string;
    finalLabel: string;
    agreementLevel: string;
    agreeCount: number;
    confidence: number; // 0–1
    breakdown: CouncilBreakdownRow[];
    rationale: string;
}

// ─── Deduction Optimizer ─────────────────────────────────────────────────────

export interface DeductionLine {
    name: string;
    section: string;
    used: number;
    cap: number;
    status: 'over' | 'under' | 'optimal';
    wasted: number;
    headroom: number;
    potentialTaxSaving: number;
}

export interface DeductionOptimizerResult {
    regime: 'old' | 'new';
    grossIncome: number;
    lines: DeductionLine[];
    totalWasted: number;
    totalUnclaimedSaving: number;
    flags: string[];
    note: string;
}

// ─── Capital Gains Estimator ─────────────────────────────────────────────────

export interface CapitalGainsEstimate {
    fundType: string;
    gainType: 'LTCG' | 'STCG' | 'Slab-rate (debt)';
    investedAmount: number;
    currentValue: number;
    investedDate: string;
    sellDate: string;
    holdingMonths: number;
    capitalGain: number;
    exemptionApplied: number;
    taxableGain: number;
    headlineRate: number;
    taxBeforeCess: number;
    cess: number;
    totalTax: number;
    netProceeds: number;
    effectiveTaxRate: number;
    reasoning: string;
    scheme?: { schemeCode: number; schemeName: string };
    source?: string;
    fetchedAt?: string;
    note: string;
}

// ─── Benchmark Rates / EMI vs Investment / Freshness ─────────────────────────

export interface FdBand {
    tenure: string;
    general: number;
    senior: number;
}

export interface BenchmarkRates {
    repoRate: number;
    fdRates: FdBand[];
    equityAssumption: number;
    asOf: string;
    fetchedAt: string;
    sources: { repo: string; fd: string };
    disclaimer: string;
}

export interface EmiVsInvestmentResult {
    amount: number;
    horizonYears: number;
    loanRate: number;
    investReturn: number;
    comparedAgainst: 'equity' | 'fd' | 'custom';
    prepayFutureValue: number;
    investFutureValue: number;
    difference: number;
    recommendation: 'invest' | 'prepay' | 'either';
    spread: number;
    reasoning: string;
    note: string;
    asOf: string;
    fetchedAt: string;
}

export interface DataSourceStatus {
    source: string;
    kind: 'live' | 'reference';
    status: 'ok' | 'unreachable';
    fetchedAt: string;
    latestDataDate?: string;
    asOf?: string;
    note: string;
}

export interface DataFreshness {
    generatedAt: string;
    sources: DataSourceStatus[];
}

// ─── Market News & Events ────────────────────────────────────────────────────

export interface MarketEvent {
    date: string;
    headline: string;
    source: string;
    event: string;
    index: string;
    indexChangePercent: number;
    tradingVolume: number;
    sentiment: string;
    sector: string;
    impact: string;
    company: string;
    url: string;
}

export interface SentimentSummary {
    total: number;
    bySentiment: Record<string, number>;
    byImpact: Record<string, number>;
    topSectors: Array<{ sector: string; count: number }>;
    netSentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface MarketNewsOutput {
    count: number;
    totalMatched: number;
    summary: SentimentSummary;
    events: MarketEvent[];
}

type Section<T> = { ok: true; data: T } | { ok: false; error: string };

export interface FinancePlan {
    generatedAt: string;
    request: { grossIncome: number; checkedFund: boolean; checkedBank: boolean };
    tax: TaxComparison;
    fund: Section<FundReturns> | null;
    bank: Section<BankBranch> | null;
    deadlines: UpcomingEvent[];
    summary: string;
    actionItems: string[];
}
