import type { Consent, ConsentAuditEntry, FiType } from '../types/index.js';
import { mockConsents, mockUsers, mockApplications } from '../data/mock.js';

/**
 * Consent Gate
 *
 * The single place that decides whether financial data may be released. Every
 * data-returning tool routes through `evaluateGate` before touching an account,
 * a liability, or a bureau record.
 *
 * This exists because a consent check that only *reports* status is decorative —
 * anyone can skip it and call the data tool directly. Enforcement has to live
 * next to the data, not in a separate advisory tool.
 */

/** Append-only audit trail. In production this would be a write-ahead store. */
export const consentAuditLog: ConsentAuditEntry[] = [];

let auditSeq = 0;

export function recordAudit(
  entry: Omit<ConsentAuditEntry, 'entryId' | 'timestamp'>
): ConsentAuditEntry {
  const full: ConsentAuditEntry = {
    entryId: `audit_${String(++auditSeq).padStart(4, '0')}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  consentAuditLog.push(full);
  return full;
}

/** Consents predating scoped requests are treated as DEPOSIT-only. */
const DEFAULT_FI_TYPES: FiType[] = ['DEPOSIT'];

export function consentFiTypes(consent: Consent): FiType[] {
  return consent.fiTypes && consent.fiTypes.length > 0
    ? consent.fiTypes
    : DEFAULT_FI_TYPES;
}

export function isExpired(consent: Consent, now = Date.now()): boolean {
  const expiry = Date.parse(consent.expiresAt);
  return Number.isFinite(expiry) && expiry < now;
}

export function consentsForUser(userId: string): Consent[] {
  return Array.from(mockConsents.values()).filter((c) => c.userId === userId);
}

export type GateStatus =
  | 'ALLOWED'
  | 'CONSENT_PENDING'
  | 'CONSENT_MISSING'
  | 'CONSENT_EXPIRED'
  | 'CONSENT_REVOKED'
  | 'SCOPE_VIOLATION';

export interface GateResult {
  allowed: boolean;
  status: GateStatus;
  reason: string;
  /** Consents that would authorise this access, once usable. */
  usableConsentIds: string[];
  /** What the caller must do next to clear the gate. */
  nextAction: string | null;
}

/**
 * Decide whether `userId`'s data may be released for the given FI types.
 *
 * Precedence is deliberate: an expired or revoked consent is a *worse* signal
 * than a merely pending one, and a granted-but-out-of-scope consent is a
 * compliance breach rather than a missing approval — so each is reported
 * distinctly instead of collapsing into a generic "denied".
 */
export function evaluateGate(
  userId: string,
  requiredFiTypes: FiType[] = ['DEPOSIT'],
  now = Date.now()
): GateResult {
  const name = mockUsers.get(userId)?.name ?? userId;
  const all = consentsForUser(userId);

  if (all.length === 0) {
    return {
      allowed: false,
      status: 'CONSENT_MISSING',
      reason: `No Account Aggregator consent exists for ${name}. Data cannot be requested until a consent is raised and approved.`,
      usableConsentIds: [],
      nextAction: 'Call request_customer_consent to raise an AA consent request.',
    };
  }

  const approved = all.filter((c) => c.status === 'approved');

  if (approved.length === 0) {
    const pending = all.filter((c) => c.status === 'pending');
    if (pending.length > 0) {
      return {
        allowed: false,
        status: 'CONSENT_PENDING',
        reason: `${name} has not yet approved the consent request in their AA app (${pending.length} pending).`,
        usableConsentIds: [],
        nextAction:
          'The customer must approve in their AA app. Simulate with approve_consent.',
      };
    }
    return {
      allowed: false,
      status: 'CONSENT_REVOKED',
      reason: `${name}'s consent was rejected or revoked. No data may be released.`,
      usableConsentIds: [],
      nextAction: 'A fresh consent request must be raised and approved.',
    };
  }

  const live = approved.filter((c) => !isExpired(c, now));

  if (live.length === 0) {
    return {
      allowed: false,
      status: 'CONSENT_EXPIRED',
      reason: `${name}'s consent has expired. Expired consent cannot be relied on for a fresh data pull.`,
      usableConsentIds: [],
      nextAction: 'Raise a new consent request with request_customer_consent.',
    };
  }

  // Scope: the union of FI types across live consents must cover what's asked.
  const granted = new Set<FiType>();
  for (const c of live) consentFiTypes(c).forEach((t) => granted.add(t));
  const missing = requiredFiTypes.filter((t) => !granted.has(t));

  if (missing.length > 0) {
    return {
      allowed: false,
      status: 'SCOPE_VIOLATION',
      reason: `${name}'s consent does not cover ${missing.join(', ')}. Granted scope: ${[...granted].join(', ')}. Requesting data outside the approved scope is a consent violation.`,
      usableConsentIds: live.map((c) => c.consentId),
      nextAction: `Raise a new consent request including ${missing.join(', ')}.`,
    };
  }

  return {
    allowed: true,
    status: 'ALLOWED',
    reason: `${name} has live AA consent covering ${requiredFiTypes.join(', ')}.`,
    usableConsentIds: live.map((c) => c.consentId),
    nextAction: null,
  };
}

/**
 * Per-FIP (per-bank) gate.
 *
 * Under AA, consent is granted institution by institution: an approved SBI
 * consent authorises SBI data and nothing else. So account-level access is
 * decided against the consent for that specific bank, not against the customer's
 * consents in aggregate. This is what lets us release one account while
 * withholding another for the same customer.
 */
export function evaluateGateForBank(
  userId: string,
  bankId: string,
  requiredFiTypes: FiType[] = ['DEPOSIT'],
  now = Date.now()
): GateResult {
  const name = mockUsers.get(userId)?.name ?? userId;
  const forBank = consentsForUser(userId).filter((c) => c.bankId === bankId);

  if (forBank.length === 0) {
    return {
      allowed: false,
      status: 'CONSENT_MISSING',
      reason: `No AA consent exists for ${name} at ${bankId.toUpperCase()}.`,
      usableConsentIds: [],
      nextAction: `Raise a consent request for ${bankId.toUpperCase()} with request_customer_consent.`,
    };
  }

  const approved = forBank.filter((c) => c.status === 'approved');

  if (approved.length === 0) {
    const pending = forBank.filter((c) => c.status === 'pending');
    return pending.length > 0
      ? {
          allowed: false,
          status: 'CONSENT_PENDING',
          reason: `${name} has not yet approved the ${bankId.toUpperCase()} consent in their AA app.`,
          usableConsentIds: [],
          nextAction: `Customer must approve in their AA app. Simulate with approve_consent for ${bankId}.`,
        }
      : {
          allowed: false,
          status: 'CONSENT_REVOKED',
          reason: `${name}'s ${bankId.toUpperCase()} consent was rejected or revoked.`,
          usableConsentIds: [],
          nextAction: `Raise a fresh consent request for ${bankId.toUpperCase()}.`,
        };
  }

  const live = approved.filter((c) => !isExpired(c, now));
  if (live.length === 0) {
    return {
      allowed: false,
      status: 'CONSENT_EXPIRED',
      reason: `${name}'s ${bankId.toUpperCase()} consent has expired.`,
      usableConsentIds: [],
      nextAction: `Raise a new consent request for ${bankId.toUpperCase()}.`,
    };
  }

  const granted = new Set<FiType>();
  for (const c of live) consentFiTypes(c).forEach((t) => granted.add(t));
  const missing = requiredFiTypes.filter((t) => !granted.has(t));

  if (missing.length > 0) {
    return {
      allowed: false,
      status: 'SCOPE_VIOLATION',
      reason: `${name}'s ${bankId.toUpperCase()} consent covers ${[...granted].join(', ')} but ${missing.join(', ')} was requested.`,
      usableConsentIds: live.map((c) => c.consentId),
      nextAction: `Raise a consent request including ${missing.join(', ')}.`,
    };
  }

  return {
    allowed: true,
    status: 'ALLOWED',
    reason: `${name} has live ${bankId.toUpperCase()} consent covering ${requiredFiTypes.join(', ')}.`,
    usableConsentIds: live.map((c) => c.consentId),
    nextAction: null,
  };
}

/**
 * Gate a data request and write the outcome to the audit trail.
 * Returns null when access is permitted; otherwise returns the refusal payload
 * the tool should return *instead of* any financial data.
 */
export function guardDataAccess(
  userId: string,
  actor: string,
  requiredFiTypes: FiType[],
  applicationId?: string,
  bankId?: string
) {
  const gate = bankId
    ? evaluateGateForBank(userId, bankId, requiredFiTypes)
    : evaluateGate(userId, requiredFiTypes);

  recordAudit({
    event: gate.allowed ? 'DATA_ACCESS_GRANTED' : 'DATA_ACCESS_BLOCKED',
    userId,
    applicationId,
    actor,
    fiTypes: requiredFiTypes,
    outcome: gate.allowed ? 'ALLOWED' : 'BLOCKED',
    reason: gate.reason,
    consentId: gate.usableConsentIds[0],
  });

  if (gate.allowed) return null;

  return {
    status: gate.status,
    blocked: true,
    userId,
    applicantName: mockUsers.get(userId)?.name ?? userId,
    requestedFiTypes: requiredFiTypes,
    reason: gate.reason,
    nextAction: gate.nextAction,
    dataReleased: false,
  };
}

/**
 * Resolve every applicant on an application (primary + co-applicants).
 * A joint application is only as open as its least-consented applicant.
 */
export function applicantsForApplication(applicationId: string): string[] {
  const app = mockApplications.get(applicationId);
  if (!app) return [];
  return [app.userId, ...(app.coApplicantUserIds ?? [])];
}
