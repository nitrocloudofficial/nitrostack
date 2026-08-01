/**
 * Benchmark interest rates (RBI repo + representative bank FD rates).
 *
 * HONESTY NOTE: RBI does not publish a free, keyless JSON API for the repo rate,
 * and FD rates vary by bank. So — unlike the AMFI NAV and Razorpay IFSC sources,
 * which are fetched LIVE per request — these are authoritative *dated* values
 * carrying an `asOf` date and source, and are overridable via environment
 * variables so an operator can keep them current. The Data Freshness Indicator
 * surfaces this distinction to the viewer.
 *
 * Update at each RBI Monetary Policy Committee (MPC) decision, or set:
 *   RBI_REPO_RATE=0.055   RATES_ASOF=2026-06-06
 */

export const RATES_ASOF = process.env.RATES_ASOF ?? '2025-06-06';

/** RBI repo rate as a fraction (e.g. 0.055 = 5.50%). Last MPC value; verify/override. */
export const REPO_RATE = process.env.RBI_REPO_RATE ? Number(process.env.RBI_REPO_RATE) : 0.055;

export interface FdBand {
    tenure: string;
    general: number; // fraction
    senior: number;  // fraction
}

/** Representative major-bank fixed-deposit rates (indicative, not a live quote). */
export const FD_RATES: FdBand[] = [
    { tenure: '1 year', general: 0.066, senior: 0.071 },
    { tenure: '3 years', general: 0.068, senior: 0.073 },
    { tenure: '5 years', general: 0.066, senior: 0.071 },
];

/** Documented long-term Indian equity assumption for comparisons. */
export const ASSUMED_EQUITY_RETURN = 0.12;

export const RATE_SOURCES = {
    repo: 'RBI Monetary Policy Committee (repo rate)',
    fd: 'Representative major-bank FD rates',
};

export const RATES_DISCLAIMER =
    `Repo & FD rates are authoritative dated values as of ${RATES_ASOF} (not a per-request live feed — RBI has no free API). ` +
    `Verify against rbi.org.in or override via the RBI_REPO_RATE / RATES_ASOF env vars.`;
