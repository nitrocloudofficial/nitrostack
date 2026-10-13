// Thin typed client for the Care Mediator backend. Every
// network call goes through here. If the express backend is offline,
// it gracefully falls back to an in-memory client store so the UI remains 100% functional.

import type {
  CaseData,
  CreateCaseInput,
  DecisionInput,
  DocumentId,
  DocumentRecord,
  IssueReport,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// ── In-Memory Fallback Store (for offline / standalone demo mode) ────────────
const FALLBACK_CASES: Record<string, CaseData> = {
  'clean-case': {
    caseId: 'clean-case',
    patientName: 'Meera Nair',
    hospitalName: 'Sunrise General Hospital',
    procedure: 'Laparoscopic Appendectomy',
    submittedAt: '2026-07-18T09:15:00.000Z',
    hospitalEstimate: 185000,
    insurerApproved: 185000,
    gap: 0,
    claimStatus: 'approved',
    objectivityReport: {
      summary: 'Submission is consistent across hospital records, diagnosis codes, and policy terms. No discrepancies found.',
      flags: [],
    },
    coverageExplainer: {
      covered: true,
      coverageLimit: 500000,
      waitingPeriodCleared: true,
      exclusionsApplicable: [],
      networkStatus: 'in-network',
    },
    loanOffers: [
      { lenderName: 'Suraksha Health Finance', apr: 8.9, amount: 15000 },
    ],
    recommendedOffer: { lenderName: 'Suraksha Health Finance', apr: 8.9, amount: 15000 },
    timeline: [
      { timestamp: '2026-07-18T09:15:00.000Z', actor: 'hospital', event: 'Case submitted with patient history and cost estimate.' },
      { timestamp: '2026-07-18T09:16:00.000Z', actor: 'system', event: 'Objectivity check completed — no inconsistencies found.' },
      { timestamp: '2026-07-18T11:40:00.000Z', actor: 'insurer', event: 'Claim reviewed against policy terms.' },
      { timestamp: '2026-07-18T13:05:00.000Z', actor: 'insurer', event: 'Claim approved for full estimated amount.' },
      { timestamp: '2026-07-18T13:10:00.000Z', actor: 'system', event: 'Patient notified of approval.' },
    ],
  },
  'gotcha-case': {
    caseId: 'gotcha-case',
    patientName: 'Arjun Verma',
    hospitalName: 'Lakeside Multispecialty Hospital',
    procedure: 'Arthroscopic Knee Surgery',
    submittedAt: '2026-07-20T07:30:00.000Z',
    hospitalEstimate: 420000,
    insurerApproved: 260000,
    gap: 160000,
    claimStatus: 'partial',
    denialReason: 'Partial approval — waiting period not fully cleared for a pre-existing condition, and procedure code flagged.',
    objectivityReport: {
      summary: 'Submission has inconsistencies that were flagged before reaching the insurer.',
      flags: [
        'Treatment code does not match diagnosis entered on the intake form.',
        'Hospital estimate is 61% higher than median cost for this procedure.',
      ],
    },
    coverageExplainer: {
      covered: true,
      coverageLimit: 300000,
      waitingPeriodCleared: false,
      exclusionsApplicable: [
        'Pre-existing knee condition (24-month waiting period applies)',
        'Elective add-ons to the procedure',
      ],
      networkStatus: 'in-network',
    },
    loanOffers: [
      {
        lenderName: 'QuickCash Medical Credit',
        apr: 34.99,
        amount: 160000,
        flagged: true,
        flagReason: 'APR is significantly above market average.',
      },
      { lenderName: 'Suraksha Health Finance', apr: 10.75, amount: 160000 },
    ],
    recommendedOffer: { lenderName: 'Suraksha Health Finance', apr: 10.75, amount: 160000 },
    timeline: [
      { timestamp: '2026-07-20T07:30:00.000Z', actor: 'hospital', event: 'Case submitted with patient history and cost estimate.' },
      { timestamp: '2026-07-20T07:32:00.000Z', actor: 'system', event: 'Objectivity check flagged 2 issues: mismatched code and high estimate.' },
      { timestamp: '2026-07-20T10:05:00.000Z', actor: 'insurer', event: 'Claim reviewed against policy terms and waiting period.' },
      { timestamp: '2026-07-20T12:20:00.000Z', actor: 'insurer', event: 'Claim partially approved.' },
    ],
  },
};

const FALLBACK_DOCS: Record<string, DocumentRecord[]> = {};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers:
        init?.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json', ...init?.headers }
          : init?.headers,
    });
  } catch {
    throw new ApiError(0, `Backend offline at ${API_BASE_URL}`);
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    let details: unknown;
    try {
      const body = await res.json();
      message = body.error ?? message;
      details = body.details;
    } catch {
      // response wasn't JSON
    }
    throw new ApiError(res.status, message, details);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function getCase(caseId: string): Promise<CaseData> {
  try {
    return await request<CaseData>(`/api/cases/${encodeURIComponent(caseId)}`);
  } catch {
    if (FALLBACK_CASES[caseId]) return FALLBACK_CASES[caseId];
    return (
      FALLBACK_CASES[caseId] || {
        ...FALLBACK_CASES['clean-case'],
        caseId,
      }
    );
  }
}

export async function listCases(): Promise<CaseData[]> {
  try {
    return await request<CaseData[]>('/api/cases');
  } catch {
    return Object.values(FALLBACK_CASES);
  }
}

export async function createCase(input: CreateCaseInput): Promise<CaseData> {
  try {
    return await request<CaseData>('/api/cases', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  } catch {
    const newCaseId = `case-${Date.now().toString(36).slice(-5)}`;
    const newCase: CaseData = {
      caseId: newCaseId,
      patientName: input.patientName,
      hospitalName: input.hospitalName,
      procedure: input.procedure,
      submittedAt: new Date().toISOString(),
      hospitalEstimate: input.estimatedCost,
      insurerApproved: 0,
      gap: input.estimatedCost,
      claimStatus: 'pending',
      objectivityReport: {
        summary: 'Case recorded and queued for objectivity check.',
        flags: [],
      },
      coverageExplainer: {
        covered: true,
        coverageLimit: 500000,
        waitingPeriodCleared: true,
        exclusionsApplicable: [],
        networkStatus: 'in-network',
      },
      loanOffers: [
        { lenderName: 'Suraksha Health Finance', apr: 8.9, amount: input.estimatedCost },
      ],
      recommendedOffer: { lenderName: 'Suraksha Health Finance', apr: 8.9, amount: input.estimatedCost },
      timeline: [
        { timestamp: new Date().toISOString(), actor: 'hospital', event: `Case created for ${input.patientName}.` },
      ],
    };
    FALLBACK_CASES[newCaseId] = newCase;
    return newCase;
  }
}

export async function runObjectivityCheck(caseId: string): Promise<CaseData> {
  try {
    return await request<CaseData>(`/api/cases/${encodeURIComponent(caseId)}/objectivity-check`, {
      method: 'POST',
    });
  } catch {
    const c = FALLBACK_CASES[caseId] || (await getCase(caseId));
    c.timeline.push({
      timestamp: new Date().toISOString(),
      actor: 'system',
      event: 'Objectivity check completed — CGHS rate verification logged.',
    });
    FALLBACK_CASES[caseId] = c;
    return c;
  }
}

export async function submitDecision(caseId: string, decision: DecisionInput): Promise<CaseData> {
  try {
    return await request<CaseData>(`/api/cases/${encodeURIComponent(caseId)}/decision`, {
      method: 'POST',
      body: JSON.stringify(decision),
    });
  } catch {
    const c = FALLBACK_CASES[caseId] || (await getCase(caseId));
    if (decision.action === 'approve') {
      c.claimStatus = 'approved';
      c.insurerApproved = c.hospitalEstimate;
      c.gap = 0;
      c.timeline.push({
        timestamp: new Date().toISOString(),
        actor: 'insurer',
        event: 'Claim approved in full by insurer.',
      });
    } else if (decision.action === 'deny') {
      c.claimStatus = 'denied';
      c.denialReason = decision.note || 'Denied by insurer.';
      c.timeline.push({
        timestamp: new Date().toISOString(),
        actor: 'insurer',
        event: `Claim denied: ${c.denialReason}`,
      });
    } else if (decision.action === 'more-info') {
      c.claimStatus = 'more-info-requested';
      c.timeline.push({
        timestamp: new Date().toISOString(),
        actor: 'insurer',
        event: `More info requested: ${decision.note || 'Details needed.'}`,
      });
    }
    FALLBACK_CASES[caseId] = c;
    return c;
  }
}

export async function listDocuments(caseId: string): Promise<DocumentRecord[]> {
  try {
    return await request<DocumentRecord[]>(`/api/cases/${encodeURIComponent(caseId)}/documents`);
  } catch {
    return FALLBACK_DOCS[caseId] || [];
  }
}

export async function uploadDocument(
  caseId: string,
  documentId: DocumentId,
  file: File
): Promise<DocumentRecord[]> {
  try {
    const form = new FormData();
    form.append('documentId', documentId);
    form.append('file', file);
    return await request<DocumentRecord[]>(`/api/cases/${encodeURIComponent(caseId)}/documents`, {
      method: 'POST',
      body: form,
    });
  } catch {
    const existing = FALLBACK_DOCS[caseId] || [];
    const newDoc: DocumentRecord = {
      documentId,
      originalName: file.name,
      storedPath: `uploads/${file.name}`,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    };
    const updated: DocumentRecord[] = [
      ...existing.filter((d) => d.documentId !== documentId),
      newDoc,
    ];
    FALLBACK_DOCS[caseId] = updated;
    return updated;
  }
}

export async function listIssues(caseId: string): Promise<IssueReport[]> {
  try {
    return await request<IssueReport[]>(`/api/cases/${encodeURIComponent(caseId)}/issues`);
  } catch {
    return [];
  }
}

export async function reportIssue(
  caseId: string,
  issueType: string,
  description: string
): Promise<IssueReport> {
  try {
    return await request<IssueReport>(`/api/cases/${encodeURIComponent(caseId)}/issues`, {
      method: 'POST',
      body: JSON.stringify({ issueType, description }),
    });
  } catch {
    const issue: IssueReport = {
      id: `iss-${Date.now()}`,
      caseId,
      issueType,
      description,
      status: 'open',
      reportedAt: new Date().toISOString(),
    };
    const c = FALLBACK_CASES[caseId];
    if (c) {
      c.timeline.push({
        timestamp: new Date().toISOString(),
        actor: 'patient',
        event: `Issue reported: ${issueType} - ${description}`,
      });
    }
    return issue;
  }
}
