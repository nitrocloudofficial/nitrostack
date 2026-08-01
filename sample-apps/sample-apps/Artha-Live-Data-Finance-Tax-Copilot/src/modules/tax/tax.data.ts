/**
 * Income-tax slab data for FY 2025-26 (Assessment Year 2026-27).
 *
 * Sources (Union Budget 2025, Finance Act 2025):
 *   - New regime slabs revised: nil up to ₹4L, then 5/10/15/20/25/30% bands.
 *   - Section 87A rebate under the new regime: full rebate (tax nil) for taxable
 *     income up to ₹12,00,000 (max rebate ₹60,000), with marginal relief above it.
 *   - Standard deduction: ₹75,000 (new regime) / ₹50,000 (old regime) for salaried.
 *   - Old regime slabs & 87A (tax nil up to ₹5,00,000) are unchanged.
 *   - Health & Education Cess: 4% on (tax + surcharge) for both regimes.
 *
 * Slabs are kept data-driven so a new financial year is a one-object change.
 */

export type Regime = 'old' | 'new';
export type AgeGroup = 'below60' | '60to80' | 'above80';

export interface Slab {
    /** Upper bound of this band (inclusive). Use Infinity for the top band. */
    upTo: number;
    /** Marginal rate applied to income within this band (fraction, e.g. 0.05). */
    rate: number;
}

export interface SurchargeTier {
    /** Applies when total taxable income exceeds this amount. */
    aboveIncome: number;
    rate: number;
}

export interface RegimeConfig {
    regime: Regime;
    /** Slabs keyed by age group. New regime uses the same slabs for all ages. */
    slabs: Record<AgeGroup, Slab[]>;
    standardDeduction: number;
    /** Section 87A: taxable income at/below this pays zero tax. */
    rebateIncomeThreshold: number;
    /** Maximum rebate amount available under Section 87A. */
    rebateMaxAmount: number;
    /** Whether marginal relief applies just above the rebate threshold. */
    rebateMarginalRelief: boolean;
    /** Cap on the surcharge rate (new regime caps at 25%). */
    surchargeCap: number;
}

export const FINANCIAL_YEAR = 'FY 2025-26';
export const ASSESSMENT_YEAR = 'AY 2026-27';

/** Authoritative source for the slab data below (cite in outputs for credibility). */
export const TAX_SOURCE =
    'Finance Act 2025 / Union Budget 2025 · Income Tax Department, Govt. of India (incometax.gov.in) — FY 2025-26 (AY 2026-27)';

/** Health & Education Cess rate (both regimes). */
export const CESS_RATE = 0.04;

/** Surcharge tiers (applied to base tax before cess). */
export const SURCHARGE_TIERS: SurchargeTier[] = [
    { aboveIncome: 5_000_000, rate: 0.10 },
    { aboveIncome: 10_000_000, rate: 0.15 },
    { aboveIncome: 20_000_000, rate: 0.25 },
    { aboveIncome: 50_000_000, rate: 0.37 },
];

/** Deduction caps used by the old regime (₹). */
export const OLD_REGIME_DEDUCTION_CAPS = {
    section80C: 150_000, // incl. ELSS, PPF, EPF, life insurance, principal on home loan
    section80D: 100_000, // self + family + senior parents (upper bound)
    nps80CCD1B: 50_000,  // additional NPS
    homeLoanInterest24b: 200_000, // self-occupied property
};

const NEW_REGIME_SLABS: Slab[] = [
    { upTo: 400_000, rate: 0 },
    { upTo: 800_000, rate: 0.05 },
    { upTo: 1_200_000, rate: 0.10 },
    { upTo: 1_600_000, rate: 0.15 },
    { upTo: 2_000_000, rate: 0.20 },
    { upTo: 2_400_000, rate: 0.25 },
    { upTo: Infinity, rate: 0.30 },
];

export const NEW_REGIME: RegimeConfig = {
    regime: 'new',
    slabs: {
        below60: NEW_REGIME_SLABS,
        '60to80': NEW_REGIME_SLABS,
        above80: NEW_REGIME_SLABS,
    },
    standardDeduction: 75_000,
    rebateIncomeThreshold: 1_200_000,
    rebateMaxAmount: 60_000,
    rebateMarginalRelief: true,
    surchargeCap: 0.25,
};

export const OLD_REGIME: RegimeConfig = {
    regime: 'old',
    slabs: {
        below60: [
            { upTo: 250_000, rate: 0 },
            { upTo: 500_000, rate: 0.05 },
            { upTo: 1_000_000, rate: 0.20 },
            { upTo: Infinity, rate: 0.30 },
        ],
        '60to80': [
            { upTo: 300_000, rate: 0 },
            { upTo: 500_000, rate: 0.05 },
            { upTo: 1_000_000, rate: 0.20 },
            { upTo: Infinity, rate: 0.30 },
        ],
        above80: [
            { upTo: 500_000, rate: 0 },
            { upTo: 1_000_000, rate: 0.20 },
            { upTo: Infinity, rate: 0.30 },
        ],
    },
    standardDeduction: 50_000,
    rebateIncomeThreshold: 500_000,
    rebateMaxAmount: 12_500,
    rebateMarginalRelief: false,
    surchargeCap: 0.37,
};
