/**
 * engine.ts — the golden-path orchestration as PURE-ish functions over `store`.
 * Both the MCP tool handlers (src/tools/*) and the tests/regression drive THESE
 * functions, so tool behavior and tested behavior are identical by construction.
 *
 * Gated steps (pullBureau, fetchBankStatements) call validConsent() as their
 * FIRST line and return the exact refusal payload — the signature feature.
 */
import { randomUUID } from 'node:crypto';
import { store } from './store.js';
import { issueToken, validConsent, refusal, consentHash, nowSeconds, ALL_SCOPES } from './consent.js';
import { resolveBureau, resolveBank, resolveKyc, resolveFraud, resolveCity, resolveNetIncome } from './seeds.js';
import { computeAffordability } from './affordability.js';
import { underwrite } from './scorecard.js';
import { generateOffers } from './offers.js';
import { createSanction } from './sanction.js';
import { POLICY } from './policy.js';
import type {
  CaseRecord, ConsentScope, ConsentRefusal, KycResult, FraudResult,
  BureauReport, BankSummary, Affordability, Decision, Offer, SanctionResult,
} from './types.js';

function isRevoked(jti: string): boolean {
  return store.isRevoked(jti);
}

// ---------- Tool 1: qualify_lead ----------
export function qualifyLead(input: {
  session_id: string;
  purpose: string;
  amount: number;
  tenure_months: number;
  employment: string;
  city: string;
  income_band?: string;
}): { lead_id: string; prelim_eligibility: string; next_step: string; intent_flag: 'FAST_TRACK' | 'STANDARD'; notes: string[] } {
  const lead_id = `VITTA-${randomUUID().slice(0, 8).toUpperCase()}`;
  const intent_flag: 'FAST_TRACK' | 'STANDARD' = /medical|emergenc|hospital|urgent/i.test(input.purpose)
    ? 'FAST_TRACK'
    : 'STANDARD';

  const city = resolveCity(input.city);
  const notes: string[] = [];
  let prelim = 'ELIGIBLE';
  if (!city.served) { prelim = 'INELIGIBLE_CITY'; notes.push('City not currently served.'); }
  if (!POLICY.eligible_employment.includes(input.employment as any)) { prelim = 'INELIGIBLE_EMPLOYMENT'; notes.push('Employment type ineligible.'); }
  if (input.amount < POLICY.min_amount) { prelim = 'BELOW_MIN_AMOUNT'; notes.push(`Minimum amount is ₹${POLICY.min_amount}.`); }

  const rec: CaseRecord = {
    lead_id,
    session_id: input.session_id,
    created_at: new Date().toISOString(),
    purpose: input.purpose,
    intent_flag,
    amount: input.amount,
    tenure_months: input.tenure_months,
    employment: input.employment as any,
    city: input.city,
    income_band: input.income_band,
    prelim_eligibility: prelim,
    status: 'QUALIFIED',
  };
  store.putCase(rec);
  store.audit(input.session_id, 'qualify_lead', 'LEAD_QUALIFIED', { lead_id, purpose: input.purpose, amount: input.amount, city: input.city, prelim, intent_flag });

  return { lead_id, prelim_eligibility: prelim, next_step: 'record_consent', intent_flag, notes };
}

// ---------- Tool 2: record_consent (consent_token issuer) ----------
export function recordConsent(input: {
  session_id: string;
  lead_id: string;
  consent_text_version: string;
  accepted: boolean;
  channel: string;
  scopes?: ConsentScope[];
}):
  | { accepted: false; message: string }
  | { accepted: true; consent_token: string; jti: string; ts: string; hash: string; scopes: ConsentScope[]; expires_at: string } {
  const ts = new Date().toISOString();
  if (!input.accepted) {
    store.audit(input.session_id, 'record_consent', 'CONSENT_DECLINED', { lead_id: input.lead_id, version: input.consent_text_version });
    return { accepted: false, message: 'Consent not granted — data-pull tools will refuse to run.' };
  }
  const scopes = input.scopes?.length ? input.scopes : [...ALL_SCOPES];
  const { token, payload } = issueToken({ lead_id: input.lead_id, scopes, version: input.consent_text_version });
  const hash = consentHash({ lead_id: input.lead_id, version: input.consent_text_version, ts, channel: input.channel });
  store.putConsentProof(payload.jti, { lead_id: input.lead_id, ts, channel: input.channel, version: input.consent_text_version, hash, scopes });
  store.patchCase(input.lead_id, { status: 'CONSENTED' });
  store.audit(input.session_id, 'record_consent', 'CONSENT_GRANTED', { lead_id: input.lead_id, version: input.consent_text_version, channel: input.channel, scopes, hash });
  // jti is returned so revoke_consent is usable without decoding the token
  return { accepted: true, consent_token: token, jti: payload.jti, ts, hash, scopes, expires_at: new Date(payload.exp * 1000).toISOString() };
}

// ---------- Tool 3: verify_kyc ----------
export function verifyKyc(input: { session_id: string; lead_id: string; pan: string; name: string; dob?: string }): KycResult {
  const kyc = resolveKyc(input.pan, input.name);
  store.patchCase(input.lead_id, { pan: input.pan, name: input.name, kyc, status: 'KYC_' + kyc.kyc_status });
  store.audit(input.session_id, 'verify_kyc', 'KYC_CHECKED', { lead_id: input.lead_id, pan: input.pan, name: input.name, kyc_status: kyc.kyc_status, risk_flags: kyc.risk_flags });
  return kyc;
}

// ---------- Tool 4: screen_fraud ----------
export function screenFraud(input: { session_id: string; lead_id: string; identifiers: { mobile: string; pan?: string; device?: string } }): FraudResult {
  const fraud = resolveFraud(input.identifiers.mobile);
  store.patchCase(input.lead_id, { mobile: input.identifiers.mobile, fraud });
  store.audit(input.session_id, 'screen_fraud', 'FRAUD_SCREENED', { lead_id: input.lead_id, mobile: input.identifiers.mobile, verdict: fraud.verdict, score: fraud.score, signals: fraud.signals });
  return fraud;
}

// ---------- Tool 5: pull_bureau ⚿ ----------
export function pullBureau(input: { session_id: string; lead_id: string; consent_token: unknown; pan: string }): BureauReport | ConsentRefusal {
  const c = validConsent(input.consent_token, 'CREDIT_BUREAU', { now: nowSeconds(), isRevoked, leadId: input.lead_id });
  if (!c.ok) {
    store.audit(input.session_id, 'pull_bureau', 'CONSENT_GATE_BLOCKED', { lead_id: input.lead_id, required_scope: 'CREDIT_BUREAU', code: c.code });
    return refusal(c.code);
  }
  const bureau = resolveBureau(input.pan);
  store.patchCase(input.lead_id, { bureau });
  store.audit(input.session_id, 'pull_bureau', 'BUREAU_PULLED', { lead_id: input.lead_id, pan: input.pan, score: bureau.score, reason_codes: bureau.reason_codes });
  return bureau;
}

// ---------- Tool 6: fetch_bank_statements ⚿ ----------
export function fetchBankStatements(input: { session_id: string; lead_id: string; consent_token: unknown; months?: number }): BankSummary | ConsentRefusal {
  const c = validConsent(input.consent_token, 'BANK_STATEMENTS', { now: nowSeconds(), isRevoked, leadId: input.lead_id });
  if (!c.ok) {
    store.audit(input.session_id, 'fetch_bank_statements', 'CONSENT_GATE_BLOCKED', { lead_id: input.lead_id, required_scope: 'BANK_STATEMENTS', code: c.code });
    return refusal(c.code);
  }
  const rec = store.getCase(input.lead_id);
  const mobile = rec?.mobile ?? '9000000000';
  const bank = resolveBank(mobile, input.months ?? 12);
  store.patchCase(input.lead_id, { bank });
  store.audit(input.session_id, 'fetch_bank_statements', 'BANK_FETCHED', { lead_id: input.lead_id, months: input.months ?? 12, net_surplus: bank.net_surplus, stability_index: bank.stability_index });
  return bank;
}

// ---------- Tool 7: compute_affordability ----------
export function computeAffordabilityStep(input: { session_id: string; lead_id: string; requested_amount?: number; tenure_months?: number }): Affordability {
  const rec = must(input.lead_id);
  if (!rec.bureau || !rec.bank) throw new Error('AFFORDABILITY_PRECONDITION: run pull_bureau and fetch_bank_statements first');
  const net_income = resolveNetIncome(rec.mobile ?? '9000000000');
  // Overrides become the case's requested terms — underwrite/generate_offers must
  // see the SAME tenure/amount this affordability was computed against.
  const requested_amount = input.requested_amount ?? rec.amount ?? 0;
  const tenure_months = input.tenure_months ?? rec.tenure_months ?? 36;
  const aff = computeAffordability({
    requested_amount,
    tenure_months,
    bureau: rec.bureau,
    bank: rec.bank,
    net_income,
  });
  store.patchCase(input.lead_id, { affordability: aff, amount: requested_amount, tenure_months });
  store.audit(input.session_id, 'compute_affordability', 'AFFORDABILITY_COMPUTED', { lead_id: input.lead_id, foir: aff.foir, dti: aff.dti, proposed_emi: aff.proposed_emi, tenure_months, requested_amount });
  return aff;
}

// ---------- Tool 8: underwrite ----------
export function underwriteStep(input: { session_id: string; lead_id: string }): Decision {
  const rec = must(input.lead_id);
  if (!rec.bureau || !rec.affordability) throw new Error('UNDERWRITE_PRECONDITION: run compute_affordability first');
  const cap = resolveCity(rec.city ?? '').cap ?? 700000;
  const decision = underwrite({
    requested_amount: rec.amount ?? 0,
    tenure_months: rec.tenure_months ?? 36,
    employment: rec.employment ?? 'SALARIED',
    segment_cap: cap,
    bureau: rec.bureau,
    affordability: rec.affordability,
  });
  store.patchCase(input.lead_id, { decision, status: `DECISION_${decision.outcome}` });
  store.audit(input.session_id, 'underwrite', 'DECISION', { lead_id: input.lead_id, outcome: decision.outcome, max_amount: decision.max_amount, score: decision.score, reason_codes: decision.reason_codes });
  return decision;
}

// ---------- Tool 9: generate_offers ----------
export function generateOffersStep(input: { session_id: string; lead_id: string }): { offers: Offer[]; recommended_offer_id: string } {
  const rec = must(input.lead_id);
  if (!rec.decision) throw new Error('OFFERS_PRECONDITION: run underwrite first');
  const result = generateOffers({
    lead_id: input.lead_id,
    decision: rec.decision,
    tenure_months: rec.tenure_months ?? 36,
    intent_flag: rec.intent_flag,
    affordability: rec.affordability
      ? { existing_emi: rec.affordability.existing_emi, net_income: rec.affordability.net_income }
      : undefined,
  });
  store.patchCase(input.lead_id, { offers: result.offers, recommended_offer_id: result.recommended_offer_id });
  store.audit(input.session_id, 'generate_offers', 'OFFERS_GENERATED', { lead_id: input.lead_id, count: result.offers.length, recommended: result.recommended_offer_id });
  return result;
}

// ---------- Tool 10: create_sanction_letter ----------
export function createSanctionStep(input: { session_id: string; lead_id: string; offer_id: string }): SanctionResult | { error: string; hint: string } {
  const rec = must(input.lead_id);
  const offer = rec.offers?.find((o) => o.offer_id === input.offer_id);
  if (!offer) return { error: 'OFFER_NOT_FOUND', hint: 'Pass an offer_id returned by generate_offers' };
  const sanction = createSanction(rec, offer);
  store.patchCase(input.lead_id, { sanction, status: 'SANCTIONED' });
  store.audit(input.session_id, 'create_sanction_letter', 'SANCTION_CREATED', { lead_id: input.lead_id, offer_id: input.offer_id, amount: offer.amount, hash: sanction.hash });
  return sanction;
}

// ---------- Fast-path: run the whole post-consent chain in ONE call ----------
// Collapses verify_kyc → screen_fraud → pull_bureau ⚿ → fetch_bank_statements ⚿
// → compute_affordability → underwrite so agentic clients that cap tool-calls-per-turn
// don't stall mid-chain. The consent gate is STILL enforced (pull/fetch refuse without
// a valid, in-scope, lead-bound token). Returns a Decision-shaped object so the
// underwriting-result widget renders the gauge.
export function advanceApplication(input: {
  session_id: string;
  lead_id: string;
  consent_token: unknown;
  pan: string;
  name: string;
  mobile: string;
  dob?: string;
}): (Decision & { kyc_status: string; fraud_verdict: string; foir: number; bureau_score: number; net_income: number; existing_emi: number }) | ConsentRefusal {
  const kyc = verifyKyc({ session_id: input.session_id, lead_id: input.lead_id, pan: input.pan, name: input.name, dob: input.dob });
  const fraud = screenFraud({ session_id: input.session_id, lead_id: input.lead_id, identifiers: { mobile: input.mobile, pan: input.pan } });

  const bureau = pullBureau({ session_id: input.session_id, lead_id: input.lead_id, consent_token: input.consent_token, pan: input.pan });
  if ('error' in bureau) return bureau; // consent gate refusal — short-circuit
  const bank = fetchBankStatements({ session_id: input.session_id, lead_id: input.lead_id, consent_token: input.consent_token });
  if ('error' in bank) return bank;

  const aff = computeAffordabilityStep({ session_id: input.session_id, lead_id: input.lead_id });
  const decision = underwriteStep({ session_id: input.session_id, lead_id: input.lead_id });

  return {
    ...decision,
    kyc_status: kyc.kyc_status,
    fraud_verdict: fraud.verdict,
    foir: aff.foir,
    net_income: aff.net_income,
    existing_emi: aff.existing_emi,
    bureau_score: bureau.score,
  };
}

// ---------- Tools 11 & 12: audit ----------
export function logAuditEvent(input: { session_id: string; actor: string; event: string; payload: Record<string, unknown> }): { ack: true; seq: number } {
  return store.audit(input.session_id, input.actor, input.event, input.payload);
}
export function getAuditTrail(input: { session_id: string; view?: 'FULL' | 'SUMMARY' | 'COMPLIANCE_VIEW' }) {
  return store.trail(input.session_id, input.view ?? 'FULL');
}

// revoke helper (SHOULD-HAVE: DPDP withdrawal)
export function revokeConsent(input: { session_id: string; lead_id: string; jti: string }): { revoked: true } {
  store.revoke(input.jti);
  store.audit(input.session_id, 'record_consent', 'CONSENT_REVOKED', { lead_id: input.lead_id, jti: input.jti });
  return { revoked: true };
}

function must(leadId: string): CaseRecord {
  const rec = store.getCase(leadId);
  if (!rec) throw new Error(`CASE_NOT_FOUND: ${leadId}. Run qualify_lead first.`);
  return rec;
}
