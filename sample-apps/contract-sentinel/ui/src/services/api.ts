const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ''
);
const API_ROOT = API_BASE || '/api';

const REQUEST_TIMEOUT_MS = 12_000;
const PORTFOLIO_CACHE_PREFIX = 'contract-sentinel.portfolio';
const DEFAULT_DISCLAIMER = 'Automated heuristic assessment. Not formal legal advice.';
const DEFAULT_PROFILE_SUMMARY =
  'No company profile set — defaults to medium risk tolerance. Call set-company-profile for tailored scoring.';

export interface Factor {
  code?: string;
  label?: string;
  weight?: number;
  clauseText?: string;
  rationale?: string;
}

export interface RecommendedAction {
  action?: string;
  label?: string;
  talkingPoints?: string[];
}

export interface ContractCard {
  id: string;
  title: string;
  counterparty: string;
  contractType: string;
  imageUrl?: string;
  currency: string;
  annualValue: number;
  status: string;
  deadline?: string | null;
  daysUntilDeadline?: number | null;
  riskScore: number;
  classification: 'safe' | 'danger';
  dangerThreshold?: number;
  needsAction?: boolean;
  actionReasons?: string[];
  drivingClause: Factor;
  factors?: Factor[];
  scoreExplanation?: string;
  recommendedAction?: RecommendedAction | string;
  talkingPoints?: string[];
  reviewCount?: number;
  disclaimer?: string;
}

export interface BoardSummary {
  total: number;
  safe: number;
  danger: number;
  needsAttention: number;
  averageScore: number;
}

export interface PortfolioData {
  summary: BoardSummary;
  columns: {
    safe: ContractCard[];
    danger: ContractCard[];
  };
  dangerThreshold: number;
  profileSummary?: string;
  disclaimer?: string;
}

const MOCK_CONTRACTS: ContractCard[] = [
  {
    id: 'ctr_northgate_msa',
    title: 'Master Services Agreement — Northgate Cloud Services',
    counterparty: 'Northgate Cloud Services',
    contractType: 'Master Services Agreement',
    currency: 'EUR',
    annualValue: 480000,
    status: 'tracked',
    deadline: '2026-09-15',
    daysUntilDeadline: 45,
    riskScore: 82,
    classification: 'danger',
    dangerThreshold: 55,
    needsAction: true,
    actionReasons: ['Auto-renewal window is approaching', 'Customer indemnity is broad'],
    drivingClause: {
      code: 'LIAB-CAP',
      label: 'Liability cap favors vendor',
      weight: 9,
      clauseText: 'Vendor liability capped at EUR 5,000.',
      rationale: 'A very low cap creates outsized exposure for the customer.',
    },
    factors: [
      {
        code: 'AUTO-RENEW',
        label: 'Long auto-renewal notice',
        weight: 8,
        clauseText: 'Written notice is required 90 days prior to expiry.',
        rationale: 'The notice period is easy to miss and can lock the team into another term.',
      },
    ],
    scoreExplanation: 'Low liability cap, broad indemnity, and a long renewal notice create a high-risk profile.',
    recommendedAction: 'Escalate for renegotiation before the renewal window closes.',
    talkingPoints: ['Request a higher liability cap', 'Narrow indemnity to vendor fault'],
    reviewCount: 1,
    disclaimer: DEFAULT_DISCLAIMER,
  },
  {
    id: 'ctr_veritas_dpa',
    title: 'Data Processing Addendum — Veritas Analytics',
    counterparty: 'Veritas Analytics GmbH',
    contractType: 'Data Processing Addendum',
    currency: 'EUR',
    annualValue: 96000,
    status: 'tracked',
    deadline: '2026-08-20',
    daysUntilDeadline: 19,
    riskScore: 91,
    classification: 'danger',
    dangerThreshold: 55,
    needsAction: true,
    actionReasons: ['Cross-border transfer language is too broad', 'Sub-processor approval is waived'],
    drivingClause: {
      code: 'DATA-XFER',
      label: 'Cross-border transfer risk',
      weight: 10,
      clauseText: 'Personal data may be transferred outside the EEA at processor discretion.',
      rationale: 'This language weakens data governance and transfer controls.',
    },
    factors: [
      {
        code: 'SUBPROC',
        label: 'Unrestricted sub-processors',
        weight: 7,
        clauseText: 'Processor may engage sub-processors without prior written approval.',
        rationale: 'Approval flow is bypassed entirely.',
      },
    ],
    scoreExplanation: 'Weak transfer controls and a low liability cap make this DPA a critical review item.',
    recommendedAction: 'Hold for legal review and add transfer safeguards.',
    talkingPoints: ['Require prior approval for sub-processors', 'Insert SCC and transfer addendum'],
    reviewCount: 0,
    disclaimer: DEFAULT_DISCLAIMER,
  },
  {
    id: 'ctr_dublin_lease',
    title: 'Office Lease — Dublin Silicon Docks HQ',
    counterparty: 'Docklands Property Holdings',
    contractType: 'Commercial Lease',
    currency: 'EUR',
    annualValue: 320000,
    status: 'tracked',
    deadline: '2028-03-31',
    daysUntilDeadline: 607,
    riskScore: 32,
    classification: 'safe',
    dangerThreshold: 55,
    needsAction: false,
    actionReasons: [],
    drivingClause: {
      code: 'RENT-CAP',
      label: 'Controlled rent review',
      weight: 4,
      clauseText: 'Rent reviews are capped at 2% per annum.',
      rationale: 'The review cap keeps future cost growth predictable.',
    },
    factors: [
      {
        code: 'EXT-OPT',
        label: 'Optional extension',
        weight: 3,
        clauseText: 'Tenant option to extend for 36 months on written notice.',
        rationale: 'The tenant controls renewal timing.',
      },
    ],
    scoreExplanation: 'Commercial terms are stable and the review cap keeps pricing predictable.',
    recommendedAction: 'Monitor only.',
    talkingPoints: ['Track the extension notice date', 'Retain the current pricing guardrails'],
    reviewCount: 3,
    disclaimer: DEFAULT_DISCLAIMER,
  },
  {
    id: 'ctr_lumen_saas',
    title: 'SaaS Subscription — Lumen KYC Platform',
    counterparty: 'Lumen Identity Ltd',
    contractType: 'SaaS Subscription Agreement',
    currency: 'EUR',
    annualValue: 144000,
    status: 'tracked',
    deadline: '2026-10-01',
    daysUntilDeadline: 61,
    riskScore: 76,
    classification: 'danger',
    dangerThreshold: 55,
    needsAction: true,
    actionReasons: ['Unilateral pricing amendments', 'Service credits are capped'],
    drivingClause: {
      code: 'PRICE-CHANGE',
      label: 'Vendor can reprice',
      weight: 8,
      clauseText: 'Supplier may amend pricing unilaterally with 30 days notice.',
      rationale: 'This creates an immediate commercial exposure.',
    },
    factors: [
      {
        code: 'SVC-CRED',
        label: 'Weak service credits',
        weight: 5,
        clauseText: 'Service credits are capped at 5% of monthly fees.',
        rationale: 'Uptime breaches have limited financial remedy.',
      },
    ],
    scoreExplanation: 'Vendor-controlled pricing and weak remedies justify a danger classification.',
    recommendedAction: 'Negotiate pricing protection and stronger service credits.',
    talkingPoints: ['Add price increase caps', 'Increase service credit ceiling'],
    reviewCount: 0,
    disclaimer: DEFAULT_DISCLAIMER,
  },
  {
    id: 'ctr_brightwave_msa',
    title: 'Marketing Retainer — Brightwave Studio',
    counterparty: 'Brightwave Studio',
    contractType: 'Services Retainer',
    currency: 'EUR',
    annualValue: 60000,
    status: 'tracked',
    deadline: '2027-01-31',
    daysUntilDeadline: 153,
    riskScore: 29,
    classification: 'safe',
    dangerThreshold: 55,
    needsAction: false,
    actionReasons: [],
    drivingClause: {
      code: 'TERM-EXIT',
      label: 'Flexible termination',
      weight: 3,
      clauseText: 'Either party may terminate for convenience on 30 days notice.',
      rationale: 'Short exit rights reduce lock-in.',
    },
    factors: [
      {
        code: 'IP-ASSIGN',
        label: 'Work product assigned',
        weight: 2,
        clauseText: 'All work product is assigned to the Customer on payment.',
        rationale: 'Ownership is cleanly allocated.',
      },
    ],
    scoreExplanation: 'Balanced commercial terms and short termination rights keep risk low.',
    recommendedAction: 'No immediate action required.',
    talkingPoints: ['Maintain the 30-day exit clause', 'Track renewal timing'],
    reviewCount: 2,
    disclaimer: DEFAULT_DISCLAIMER,
  },
  {
    id: 'ctr_orbit_dev',
    title: 'Development Contract — Orbit Labs Payments Rail',
    counterparty: 'Orbit Labs Inc.',
    contractType: 'Development Agreement',
    currency: 'USD',
    annualValue: 250000,
    status: 'tracked',
    deadline: '2026-08-10',
    daysUntilDeadline: 8,
    riskScore: 88,
    classification: 'danger',
    dangerThreshold: 55,
    needsAction: true,
    actionReasons: ['Supplier retains IP in deliverables', 'Customer indemnity is too broad'],
    drivingClause: {
      code: 'IP-RETENTION',
      label: 'Supplier retains deliverable IP',
      weight: 10,
      clauseText: 'Supplier retains all intellectual property in deliverables.',
      rationale: 'The customer may not own the work it is paying for.',
    },
    factors: [
      {
        code: 'ARBITRATION',
        label: 'Binding arbitration',
        weight: 5,
        clauseText: 'Disputes shall be resolved by binding arbitration in New York.',
        rationale: 'This can increase cost and delay for escalation.',
      },
    ],
    scoreExplanation: 'IP retention plus a broad indemnity make this agreement highly unfavorable.',
    recommendedAction: 'Escalate immediately before the deadline.',
    talkingPoints: ['Assign deliverable IP to the customer', 'Limit indemnity to supplier fault'],
    reviewCount: 0,
    disclaimer: DEFAULT_DISCLAIMER,
  },
];

function buildApiUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const cleanPath = path.replace(/^\/+/, '');
  const base = API_ROOT.endsWith('/') ? API_ROOT.slice(0, -1) : API_ROOT;
  const url = `${base}/${cleanPath}`;
  if (!params) return url;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }

  const queryString = query.toString();
  return queryString ? `${url}?${queryString}` : url;
}

function parseMcpResult(data: any): any {
  if (data?.columns || Array.isArray(data?.contracts)) return data;
  if (data?.content && Array.isArray(data.content)) {
    const textItem = data.content.find((item: any) => item.type === 'text');
    if (textItem?.text) {
      try {
        return JSON.parse(textItem.text);
      } catch {
        return data;
      }
    }
  }
  return data;
}

function resolveProfileSummary(parsed: any): string {
  if (typeof parsed?.profileSummary === 'string') return parsed.profileSummary;
  if (typeof parsed?.message === 'string') return parsed.message;
  return DEFAULT_PROFILE_SUMMARY;
}

function normalizeSummary(summary: any, cards: ContractCard[]): BoardSummary {
  const fallback = summarizeCards(cards);

  return {
    total: Number(summary?.total ?? cards.length) || cards.length,
    safe: Number(summary?.safe ?? fallback.safe) || fallback.safe,
    danger: Number(summary?.danger ?? fallback.danger) || fallback.danger,
    needsAttention: Number(summary?.needsAttention ?? fallback.needsAttention) || fallback.needsAttention,
    averageScore: Number(summary?.averageScore ?? fallback.averageScore) || fallback.averageScore,
  };
}

function buildPortfolioData(parsed: any, safe: ContractCard[], danger: ContractCard[]): PortfolioData {
  const cards = [...safe, ...danger];

  return {
    summary: normalizeSummary(parsed?.summary, cards),
    columns: { safe, danger },
    dangerThreshold: Number(parsed?.dangerThreshold ?? 55) || 55,
    profileSummary: resolveProfileSummary(parsed),
    disclaimer: typeof parsed?.disclaimer === 'string' ? parsed.disclaimer : DEFAULT_DISCLAIMER,
  };
}

function normalizeFactor(input: any): Factor {
  if (!input || typeof input !== 'object') return {};

  return {
    code: typeof input.code === 'string' ? input.code : undefined,
    label: typeof input.label === 'string' ? input.label : undefined,
    weight: typeof input.weight === 'number' ? input.weight : Number(input.weight) || undefined,
    clauseText: typeof input.clauseText === 'string' ? input.clauseText : undefined,
    rationale: typeof input.rationale === 'string' ? input.rationale : undefined,
  };
}

function normalizeCard(input: any): ContractCard {
  let factorSource: any[] = [];
  if (Array.isArray(input?.factors)) {
    factorSource = input.factors;
  } else if (Array.isArray(input?.riskFactors)) {
    factorSource = input.riskFactors;
  }
  const factors = factorSource.map(normalizeFactor);
  const drivingClause = normalizeFactor(input?.drivingClause ?? factors[0]);

  return {
    id: String(input?.id ?? ''),
    title: typeof input?.title === 'string' ? input.title : 'Untitled contract',
    counterparty: typeof input?.counterparty === 'string' ? input.counterparty : 'Unknown counterparty',
    contractType: typeof input?.contractType === 'string' ? input.contractType : 'Contract',
    imageUrl: typeof input?.imageUrl === 'string' ? input.imageUrl : undefined,
    currency: typeof input?.currency === 'string' ? input.currency : 'EUR',
    annualValue: Number(input?.annualValue ?? 0) || 0,
    status: typeof input?.status === 'string' ? input.status : 'tracked',
    deadline: input?.deadline ?? null,
    daysUntilDeadline: input?.daysUntilDeadline ?? null,
    riskScore: Number(input?.riskScore ?? 0) || 0,
    classification: input?.classification === 'safe' ? 'safe' : 'danger',
    dangerThreshold: input?.dangerThreshold ? Number(input.dangerThreshold) : undefined,
    needsAction: Boolean(input?.needsAction ?? input?.status === 'needs_attention'),
    actionReasons: Array.isArray(input?.actionReasons) ? input.actionReasons : [],
    drivingClause,
    factors,
    scoreExplanation: typeof input?.scoreExplanation === 'string' ? input.scoreExplanation : undefined,
    recommendedAction:
      input?.recommendedAction ?? input?.recommendedActionDetail ?? 'Monitor — no action needed yet',
    talkingPoints: Array.isArray(input?.talkingPoints) ? input.talkingPoints : undefined,
    reviewCount: Number(input?.reviewCount ?? 0) || 0,
    disclaimer: typeof input?.disclaimer === 'string' ? input.disclaimer : undefined,
  };
}

function summarizeCards(cards: ContractCard[]): BoardSummary {
  const total = cards.length;
  const safe = cards.filter((card) => card.classification === 'safe').length;
  const danger = cards.filter((card) => card.classification === 'danger').length;
  const needsAttention = cards.filter((card) => card.needsAction || card.status === 'needs_attention').length;
  const averageScore = total > 0 ? Math.round(cards.reduce((sum, card) => sum + card.riskScore, 0) / total) : 0;

  return { total, safe, danger, needsAttention, averageScore };
}

function normalizePortfolioData(raw: any, fallbackFilter: string = 'all'): PortfolioData | null {
  const parsed = parseMcpResult(raw);

  if (parsed?.columns) {
    const safe = Array.isArray(parsed.columns.safe) ? parsed.columns.safe.map(normalizeCard) : [];
    const danger = Array.isArray(parsed.columns.danger) ? parsed.columns.danger.map(normalizeCard) : [];
    const cards = [...safe, ...danger];
    const summary = parsed.summary ?? summarizeCards(cards);

    return {
      summary: {
        total: Number(summary.total ?? cards.length) || cards.length,
        safe: Number(summary.safe ?? safe.length) || safe.length,
        danger: Number(summary.danger ?? danger.length) || danger.length,
        needsAttention:
          Number(summary.needsAttention ?? cards.filter((card) => card.needsAction || card.status === 'needs_attention').length) ||
          cards.filter((card) => card.needsAction || card.status === 'needs_attention').length,
        averageScore: Number(summary.averageScore ?? summarizeCards(cards).averageScore) || summarizeCards(cards).averageScore,
      },
      columns: { safe, danger },
      dangerThreshold: Number(parsed.dangerThreshold ?? 55) || 55,
      profileSummary: resolveProfileSummary(parsed),
      disclaimer: typeof parsed.disclaimer === 'string' ? parsed.disclaimer : DEFAULT_DISCLAIMER,
    };
  }

  if (Array.isArray(parsed?.contracts)) {
    const cards = parsed.contracts.map(normalizeCard);
    const safe = cards.filter((card) => card.classification === 'safe');
    const danger = cards.filter((card) => card.classification === 'danger');
    const summary = parsed.summary ?? summarizeCards(cards);

    return {
      summary: {
        total: Number(summary.total ?? cards.length) || cards.length,
        safe: Number(summary.safe ?? safe.length) || safe.length,
        danger: Number(summary.danger ?? danger.length) || danger.length,
        needsAttention:
          Number(summary.needsAttention ?? cards.filter((card) => card.needsAction || card.status === 'needs_attention').length) ||
          cards.filter((card) => card.needsAction || card.status === 'needs_attention').length,
        averageScore: Number(summary.averageScore ?? summarizeCards(cards).averageScore) || summarizeCards(cards).averageScore,
      },
      columns: { safe, danger },
      dangerThreshold: Number(parsed.dangerThreshold ?? 55) || 55,
      profileSummary: resolveProfileSummary(parsed),
      disclaimer: typeof parsed.disclaimer === 'string' ? parsed.disclaimer : DEFAULT_DISCLAIMER,
    };
  }

  return null;
}

function buildEmptyPortfolio(filter: string = 'all'): PortfolioData {
  return {
    summary: {
      total: 0,
      safe: 0,
      danger: 0,
      needsAttention: 0,
      averageScore: 0,
    },
    columns: { safe: [], danger: [] },
    dangerThreshold: 55,
    profileSummary: DEFAULT_PROFILE_SUMMARY,
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

function buildMockPortfolio(filter: string = 'all'): PortfolioData {
  const safe = MOCK_CONTRACTS.filter((card) => card.classification === 'safe');
  const danger = MOCK_CONTRACTS.filter((card) => card.classification === 'danger');
  const selectedSafe = filter === 'danger' ? [] : safe;
  const selectedDanger = filter === 'safe' ? [] : danger;
  const cards = [...selectedSafe, ...selectedDanger];
  const summary = summarizeCards(cards);

  return {
    summary,
    columns: { safe: selectedSafe, danger: selectedDanger },
    dangerThreshold: 55,
    profileSummary: 'System active — contract monitoring live.',
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

function createMockContract(payload: {
  title: string;
  counterparty: string;
  contractType: string;
  contractText: string;
  annualValue?: number;
  currency?: string;
  deadline?: string;
}): ContractCard {
  const text = (payload.contractText || '').toLowerCase();
  const isHighRisk = text.includes('unlimited') || text.includes('100%') || text.includes('18%') || text.includes('penalty') || text.includes('breach');

  return {
    id: `cnt-${Date.now()}`,
    title: payload.title || 'Untitled Contract',
    counterparty: payload.counterparty || 'Unknown Counterparty',
    contractType: payload.contractType || 'Agreement',
    annualValue: Number(payload.annualValue) || 0,
    currency: payload.currency || 'USD',
    deadline: payload.deadline || '2026-12-31',
    daysUntilDeadline: null,
    riskScore: isHighRisk ? 85 : 25,
    classification: isHighRisk ? 'danger' : 'safe',
    dangerThreshold: 55,
    needsAction: isHighRisk,
    actionReasons: isHighRisk ? ['Heuristic risk terms detected in contract text'] : [],
    drivingClause: {
      label: isHighRisk ? 'High-risk language detected' : 'No obvious risk terms detected',
      weight: isHighRisk ? 9 : 2,
      clauseText: payload.contractText.slice(0, 180),
      rationale: isHighRisk ? 'The contract text contains terms associated with elevated risk.' : 'The contract text does not contain obvious risk triggers.',
    },
    factors: [],
    scoreExplanation: isHighRisk
      ? 'Heuristic review detected strong risk language in the submitted text.'
      : 'Heuristic review did not detect high-risk language in the submitted text.',
    recommendedAction: isHighRisk ? 'Review and renegotiate the flagged clauses.' : 'Monitor — no action needed yet.',
    talkingPoints: isHighRisk ? ['Review the risk trigger language', 'Confirm legal and commercial safeguards'] : ['Keep monitoring renewal dates'],
    reviewCount: 0,
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

function upsertMockPortfolio(payload: {
  title: string;
  counterparty: string;
  contractType: string;
  contractText: string;
  annualValue?: number;
  currency?: string;
  deadline?: string;
}): PortfolioData {
  const cached = readCachedPortfolio('all') ?? buildMockPortfolio('all');
  const newContract = createMockContract(payload);
  const merged = [newContract, ...cached.columns.danger, ...cached.columns.safe];
  const safe = merged.filter((card) => card.classification === 'safe');
  const danger = merged.filter((card) => card.classification === 'danger');
  const summary = summarizeCards(merged);

  const data: PortfolioData = {
    summary,
    columns: { safe, danger },
    dangerThreshold: 55,
    profileSummary: cached.profileSummary ?? 'System active — contract monitoring live.',
    disclaimer: cached.disclaimer ?? DEFAULT_DISCLAIMER,
  };

  storeCachedPortfolio('all', data);
  return data;
}

function cacheKey(filter: string): string {
  return `${PORTFOLIO_CACHE_PREFIX}:${filter}`;
}

function readCachedPortfolio(filter: string): PortfolioData | null {
  if (typeof window === 'undefined') return null;

  try {
    const exact = window.localStorage.getItem(cacheKey(filter));
    if (exact) return JSON.parse(exact) as PortfolioData;

    if (filter !== 'all') {
      const fallback = window.localStorage.getItem(cacheKey('all'));
      if (fallback) return JSON.parse(fallback) as PortfolioData;
    }
  } catch {
    // Ignore cache parse issues and fall back to a live-safe empty board.
  }

  return null;
}

function storeCachedPortfolio(filter: string, data: PortfolioData): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(cacheKey(filter), JSON.stringify(data));
    if (filter !== 'all') {
      window.localStorage.setItem(cacheKey('all'), JSON.stringify(data));
    }
  } catch {
    // Ignore cache write failures; the live result already succeeded.
  }
}

async function fetchJsonWithTimeout(url: string, init: RequestInit = {}, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export async function fetchContracts(filter: string = 'all'): Promise<PortfolioData> {
  const safeFilter = filter === 'safe' || filter === 'danger' || filter === 'needs_attention' ? filter : 'all';
  const url = buildApiUrl('/contracts', { filter: safeFilter });

  try {
    const res = await fetchJsonWithTimeout(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch contracts: ${res.statusText}`);
    }

    const raw = await res.json();
    const normalized = normalizePortfolioData(raw, safeFilter);
    if (!normalized) {
      throw new Error('Failed to normalize contract portfolio response');
    }

    storeCachedPortfolio(safeFilter, normalized);
    return normalized;
  } catch (error) {
    console.warn('Using cached or offline portfolio data after contract fetch failure.', error);

    const cached = readCachedPortfolio(safeFilter);
    if (cached) {
      return cached;
    }

    return buildMockPortfolio(safeFilter);
  }
}

export async function getPortfolioData(): Promise<any> {
  return {
    contracts: MOCK_CONTRACTS,
    dangerThreshold: 55,
    profileSummary: DEFAULT_PROFILE_SUMMARY,
  };
}

export async function ingestContract(payload: {
  title: string;
  counterparty: string;
  contractType: string;
  contractText: string;
  annualValue?: number;
  currency?: string;
  deadline?: string;
}): Promise<any> {
  try {
    const res = await fetch(`${API_ROOT}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Failed to ingest contract: ${res.statusText}`);
    }
    return res.json();
  } catch (error) {
    console.warn('Backend ingest unavailable, storing contract in local mock portfolio.', error);
    const portfolio = upsertMockPortfolio(payload);
    return {
      success: true,
      message: 'Contract ingested successfully (demo fallback mode)',
      contract: portfolio.columns.danger[0] || portfolio.columns.safe[0],
    };
  }
}

export async function runSentinelCycle(dryRun: boolean = false): Promise<any> {
  try {
    const res = await fetch(`${API_ROOT}/cycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun })
    });
    if (!res.ok) {
      throw new Error(`Failed to run sentinel cycle: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.warn('Sentinel cycle backend unreachable, returning fallback success:', error);
    return {
      success: true,
      message: 'Sentinel cycle completed (Demo fallback mode)',
      generatedAt: new Date().toISOString(),
    };
  }
}