/**
 * Capital-gains tax rules for mutual funds — FY 2025-26 (post Budget 2024,
 * rates effective for transfers on/after 23 July 2024).
 *
 *  Equity-oriented funds (≥65% equity):
 *    - STCG (held ≤12 months): 20% flat (Section 111A)
 *    - LTCG (held >12 months) : 12.5% on gains above the ₹1,25,000 annual
 *                               exemption (Section 112A), no indexation
 *
 *  Specified debt funds (units bought on/after 1 Apr 2023):
 *    - Taxed at the investor's slab rate regardless of holding period
 *      (no LTCG benefit, no indexation)
 *
 *  Health & Education Cess of 4% applies on the computed tax for all.
 */

export type FundType = 'equity' | 'debt' | 'hybrid_equity' | 'hybrid_debt';

export const CAPITAL_GAINS = {
    equity: {
        ltcgHoldingMonths: 12,
        ltcgRate: 0.125,
        ltcgExemption: 125_000,
        stcgRate: 0.20,
    },
    cessRate: 0.04,
    /** Fallback marginal rate for debt when neither income nor an explicit rate is given. */
    defaultDebtMarginalRate: 0.30,
};

export function isEquityType(t: FundType): boolean {
    return t === 'equity' || t === 'hybrid_equity';
}
