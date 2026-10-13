/**
 * seeds.ts — deterministic mock resolvers (CLAUDE.md rules 3 & 5).
 * Reads /mocks/*.json once and resolves bureau/bank/kyc/fraud/city by
 * PAN last digit and mobile suffix. NO real APIs, NO real PII, ever.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BureauReport, BankSummary, KycResult, FraudResult } from './types.js';
import { createHash } from 'node:crypto';

/** Resolve the /mocks dir robustly (works from project root AND from dist/). */
function resolveMockDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(process.cwd(), 'mocks'),
    join(here, '..', '..', 'mocks'), // dist/lib -> project root
    join(here, '..', '..', '..', 'mocks'),
    join(here, '..', 'mocks'),
  ];
  for (const c of candidates) if (existsSync(join(c, 'bureau_seed.json'))) return c;
  return join(process.cwd(), 'mocks');
}
const MOCK_DIR = resolveMockDir();

function load<T>(name: string): T {
  return JSON.parse(readFileSync(join(MOCK_DIR, name), 'utf8')) as T;
}

let _cache: {
  bureau: any;
  bank: any;
  kyc: any;
  fraud: any;
  city: any;
} | null = null;

function mocks() {
  if (!_cache) {
    _cache = {
      bureau: load('bureau_seed.json'),
      bank: load('bank_seed.json'),
      kyc: load('kyc_seed.json'),
      fraud: load('fraud_seed.json'),
      city: load('city_tiers.json'),
    };
  }
  return _cache;
}

/** Raw seed data (for the MCP Resources that expose reference data). */
export function allSeeds() {
  return mocks();
}

/** The last DIGIT in a PAN (PAN = 5 letters, 4 digits, 1 letter → last of the 4 digits). */
export function panLastDigit(pan: string): string {
  const digits = String(pan).match(/\d/g);
  return digits && digits.length ? digits[digits.length - 1] : '0';
}

/** Last two digits of a mobile number as an integer (0–99). */
export function mobileSuffix(mobile: string): number {
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length < 2) return 0;
  return parseInt(digits.slice(-2), 10);
}

export function resolveBureau(pan: string): BureauReport {
  const d = panLastDigit(pan);
  const p = mocks().bureau.byLastDigit[d] ?? mocks().bureau.byLastDigit['7'];
  // split active_emi across two illustrative tradelines
  const tl = (mocks().bureau.tradelineTemplate as any[]).map((t, i) => ({
    ...t,
    emi: i === 0 ? Math.round(p.active_emi * 0.4) : Math.round(p.active_emi * 0.6),
  }));
  return {
    score: p.score,
    dpd_max_12m: p.dpd_max_12m,
    dpd_max_24m: p.dpd_max_24m,
    writeoff_24m: p.writeoff_24m,
    inquiries_6m: p.inquiries_6m,
    active_emi: p.active_emi,
    tradelines: tl,
    reason_codes: [...p.reason_codes],
  };
}

export function resolveBank(mobile: string, months = 12): BankSummary {
  const s = mobileSuffix(mobile);
  const bands = mocks().bank.bands;
  let band = bands.stable;
  for (const key of Object.keys(bands)) {
    const [lo, hi] = bands[key].match;
    if (s >= lo && s <= hi) {
      band = bands[key];
      break;
    }
  }
  return {
    avg_salary_credit: band.avg_salary_credit,
    income_variance_pct: band.income_variance_pct,
    bounce_count: band.bounce_count,
    cash_withdrawal_ratio: band.cash_withdrawal_ratio,
    net_surplus: band.net_surplus,
    employer_consistency: band.employer_consistency,
    stability_index: band.stability_index,
    // carried for affordability (net take-home used in FOIR)
    ...( { net_income: band.net_income } as any ),
  } as BankSummary & { net_income: number };
}

/** net take-home income for FOIR (mock: from the AA band). */
export function resolveNetIncome(mobile: string): number {
  const s = mobileSuffix(mobile);
  const bands = mocks().bank.bands;
  for (const key of Object.keys(bands)) {
    const [lo, hi] = bands[key].match;
    if (s >= lo && s <= hi) return bands[key].net_income;
  }
  return bands.stable.net_income;
}

export function resolveKyc(pan: string, name: string): KycResult {
  const k = mocks().kyc;
  const pattern = new RegExp(k.panPattern);
  const status = pattern.test(String(pan).toUpperCase());
  const base = status
    ? k.byLastDigit[panLastDigit(pan)] ?? k.default
    : { kyc_status: 'FAIL', risk_flags: ['PAN_FORMAT_INVALID'] };
  const kyc_hash = createHash('sha256')
    .update(`${String(pan).toUpperCase()}|${String(name).toUpperCase()}`)
    .digest('hex')
    .slice(0, 32);
  return { kyc_status: base.kyc_status, kyc_hash, risk_flags: [...base.risk_flags] };
}

export function resolveFraud(mobile: string): FraudResult {
  const f = mocks().fraud;
  const s = mobileSuffix(mobile);
  if (f.rules.block_suffixes.includes(s)) return { ...f.block };
  if (s >= f.rules.review_from_suffix) return { ...f.review };
  return { ...f.clear };
}

export function resolveCity(city: string): { served: boolean; tier?: number; cap?: number } {
  const c = mocks().city.cities[String(city).toUpperCase().trim()];
  return c ? { served: true, tier: c.tier, cap: c.cap } : { served: false };
}
