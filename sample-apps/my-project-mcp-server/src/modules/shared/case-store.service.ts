import { Injectable, OnModuleInit } from '@nitrostack/core';

/**
 * Thin HTTP client that delegates to the Care Mediator Express backend
 * (`backend/` — runs on localhost:4000 by default).
 *
 * All MCP tools that need *live* case data use this service instead of the
 * static mock-claims.json. CGHS rates and loan offers are reference data
 * (they don't change per-case) and are kept in their own JSON-backed services.
 */

const API_BASE = process.env.BACKEND_API_URL ?? 'http://localhost:4000';

export interface LiveCaseData {
  caseId: string;
  patientName: string;
  hospitalName: string;
  procedure: string;
  submittedAt: string;
  hospitalEstimate: number;
  insurerApproved: number;
  gap: number;
  claimStatus: 'approved' | 'partial' | 'denied' | 'pending' | 'more-info-requested';
  denialReason?: string;
  objectivityReport: {
    summary: string;
    flags: string[];
  };
  coverageExplainer: {
    covered: boolean;
    coverageLimit: number;
    waitingPeriodCleared: boolean;
    exclusionsApplicable: string[];
    networkStatus: 'in-network' | 'out-of-network' | 'unknown';
  };
  loanOffers: Array<{
    lenderName: string;
    apr: number;
    amount: number;
    flagged?: boolean;
    flagReason?: string;
  }>;
  recommendedOffer: { lenderName: string; apr: number; amount: number };
  timeline: Array<{ timestamp: string; actor: string; event: string }>;
}

/**
 * The shared "reconciled case" shape returned by every tool that surfaces a
 * full case view (`reconcile_case_by_id`, `get_live_case_status`). Both tools
 * are bound to the `case-summary` widget, so they must agree on field names —
 * `toCaseSummary` is the single place that builds this shape from raw
 * backend data, so the two tools can't drift apart.
 */
export interface CaseSummaryPayload {
  caseId: string;
  patientName: string;
  hospitalName: string;
  procedure: string;
  claimStatus: LiveCaseData['claimStatus'];
  denialReason: string | null;
  hospitalEstimate: number;
  insurerApproved: number;
  coverageGap: number;
  financingNeeded: boolean;
  recommendedLoan: LiveCaseData['recommendedOffer'] | null;
  loanOffers: LiveCaseData['loanOffers'];
  isConsistent: boolean;
  objectivitySummary: string;
  flags: string[];
  coverageExplainer: LiveCaseData['coverageExplainer'];
  latestTimelineEvent: LiveCaseData['timeline'][number] | null;
  recentTimeline: LiveCaseData['timeline'];
  timelineLength: number;
  submittedAt: string;
}

export function toCaseSummary(c: LiveCaseData): CaseSummaryPayload {
  return {
    caseId: c.caseId,
    patientName: c.patientName,
    hospitalName: c.hospitalName,
    procedure: c.procedure,
    claimStatus: c.claimStatus,
    denialReason: c.denialReason ?? null,
    hospitalEstimate: c.hospitalEstimate,
    insurerApproved: c.insurerApproved,
    coverageGap: c.gap,
    financingNeeded: c.gap > 0,
    recommendedLoan: c.gap > 0 ? c.recommendedOffer : null,
    loanOffers: c.gap > 0 ? c.loanOffers : [],
    isConsistent: c.objectivityReport.flags.length === 0,
    objectivitySummary: c.objectivityReport.summary,
    flags: c.objectivityReport.flags,
    coverageExplainer: c.coverageExplainer,
    latestTimelineEvent: c.timeline.at(-1) ?? null,
    recentTimeline: c.timeline.slice(-5),
    timelineLength: c.timeline.length,
    submittedAt: c.submittedAt,
  };
}

export type DecisionAction = 'approve' | 'partial' | 'deny' | 'more-info';

export interface SubmitDecisionInput {
  action: DecisionAction;
  /** Required for deny and more-info */
  note?: string;
  /** Required for partial */
  approvedAmount?: number;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    throw new Error(
      `Could not reach the Care Mediator backend at ${API_BASE}. ` +
        `Make sure backend/ is running (cd backend && npm run dev). Original error: ${err}`
    );
  }

  if (!res.ok) {
    let msg = `Backend returned ${res.status}`;
    try {
      const body = await res.json() as { error?: string };
      msg = body.error ?? msg;
    } catch { /* ignore JSON parse failure */ }
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

@Injectable()
export class CaseStoreService implements OnModuleInit {
  async onModuleInit() {
    // Probe the backend at startup so we log a clear message if it isn't up.
    try {
      await apiFetch<unknown>('/api/health');
      console.error('[CaseStoreService] ✅ Connected to Care Mediator backend at', API_BASE);
    } catch (err) {
      console.error('[CaseStoreService] ⚠️  Backend not reachable at startup:', (err as Error).message);
      console.error('[CaseStoreService]    Tools that need live case data will fail until the backend is running.');
    }
  }

  /** Fetch all cases (newest-first). */
  async listCases(): Promise<LiveCaseData[]> {
    return apiFetch<LiveCaseData[]>('/api/cases');
  }

  /** Fetch a single case by ID. Throws if not found. */
  async getCase(caseId: string): Promise<LiveCaseData> {
    return apiFetch<LiveCaseData>(`/api/cases/${encodeURIComponent(caseId)}`);
  }

  /**
   * Submit an insurer decision against a live case.
   * Maps to `POST /api/cases/:caseId/decision`.
   */
  async submitDecision(caseId: string, decision: SubmitDecisionInput): Promise<LiveCaseData> {
    return apiFetch<LiveCaseData>(`/api/cases/${encodeURIComponent(caseId)}/decision`, {
      method: 'POST',
      body: JSON.stringify(decision),
    });
  }

  /**
   * Trigger the objectivity check for a case.
   * Maps to `POST /api/cases/:caseId/objectivity-check`.
   */
  async runObjectivityCheck(caseId: string): Promise<LiveCaseData> {
    return apiFetch<LiveCaseData>(`/api/cases/${encodeURIComponent(caseId)}/objectivity-check`, {
      method: 'POST',
    });
  }
}
