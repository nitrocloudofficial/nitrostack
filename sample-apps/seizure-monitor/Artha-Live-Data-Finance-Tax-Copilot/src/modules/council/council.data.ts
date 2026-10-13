/**
 * Financial Council — shared constants & verdict vocabulary.
 *
 * The council is 3 deterministic "agent" scorers (tax / growth / safety) plus a
 * reconciler. Nothing here calls an LLM — the single client-side model narrates
 * the debate from the reasoning strings these tools return.
 */

export type Verdict = 'invest_elss' | 'invest_equity' | 'prepay_loan' | 'build_emergency_fund';

/** Documented long-term Indian equity assumption (overridable per call). */
export const ASSUMED_EQUITY_XIRR = 0.12;

/** Fallbacks used when the caller omits optional details. */
export const DEFAULT_LOAN_RATE = 0.09;      // typical home-loan rate
export const DEFAULT_EMERGENCY_MONTHS = 3;  // conservative when unknown

/** Section 80C annual cap (₹). */
export const SECTION_80C_LIMIT = 150_000;

export const VERDICT_LABELS: Record<Verdict, string> = {
    invest_elss: 'Invest in ELSS (tax-saving equity)',
    invest_equity: 'Invest in equity for growth',
    prepay_loan: 'Prepay the loan',
    build_emergency_fund: 'Build an emergency fund first',
};

/** Lowercase / trim / non-alphanumerics → underscore, so the reconciler is
 *  robust to whatever verdict strings the LLM passes back. */
export function normalizeVerdict(s: string): string {
    return (s ?? '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/** Human label for any (possibly unknown) verdict code. */
export function labelForVerdict(v: string): string {
    if (v in VERDICT_LABELS) return VERDICT_LABELS[v as Verdict];
    return v
        .split('_')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}
