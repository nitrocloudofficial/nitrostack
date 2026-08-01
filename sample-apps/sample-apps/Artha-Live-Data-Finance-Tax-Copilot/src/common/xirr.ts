/**
 * XIRR (extended internal rate of return) and CAGR helpers for irregular
 * cash flows — used to compute *real* mutual-fund returns from NAV history.
 *
 * XIRR is the annualized rate `r` such that the net present value of all
 * cash flows discounted to the first flow's date equals zero:
 *
 *     Σ  amount_i / (1 + r) ^ (days_i / 365)  =  0
 *
 * Convention: outflows (investments) are negative, inflows (redemptions /
 * current value) are positive — the same sign convention as Excel's XIRR.
 */

export interface CashFlow {
    /** Negative for money paid in (investment), positive for money received. */
    amount: number;
    date: Date;
}

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

/**
 * Compute XIRR for a set of dated cash flows.
 * Uses Newton–Raphson, falling back to bisection when the derivative misbehaves.
 * Returns the annualized rate as a fraction (0.1234 === 12.34%).
 */
export function xirr(flows: CashFlow[], guess = 0.1): number {
    if (flows.length < 2) {
        throw new Error('XIRR requires at least two cash flows');
    }

    const sorted = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const t0 = sorted[0].date.getTime();
    const yearsFrom = (d: Date) => (d.getTime() - t0) / MS_PER_YEAR;

    const npv = (rate: number) =>
        sorted.reduce((sum, f) => sum + f.amount / Math.pow(1 + rate, yearsFrom(f.date)), 0);

    const dNpv = (rate: number) =>
        sorted.reduce((sum, f) => {
            const y = yearsFrom(f.date);
            if (y === 0) return sum;
            return sum - (y * f.amount) / Math.pow(1 + rate, y + 1);
        }, 0);

    // --- Newton–Raphson ---
    let rate = guess;
    for (let i = 0; i < 100; i++) {
        const value = npv(rate);
        if (Math.abs(value) < 1e-7) return rate;
        const derivative = dNpv(rate);
        if (derivative === 0) break;
        const next = rate - value / derivative;
        if (!Number.isFinite(next)) break;
        if (Math.abs(next - rate) < 1e-9) return next;
        rate = next;
    }

    // --- Bisection fallback on [-0.9999, 10] ---
    let lo = -0.9999;
    let hi = 10;
    let fLo = npv(lo);
    const fHi = npv(hi);
    if (fLo * fHi > 0) return rate; // cannot bracket a root; return best effort
    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        const fMid = npv(mid);
        if (Math.abs(fMid) < 1e-7) return mid;
        if (fLo * fMid < 0) {
            hi = mid;
        } else {
            lo = mid;
            fLo = fMid;
        }
    }
    return (lo + hi) / 2;
}

/**
 * Compound annual growth rate for a single lump sum.
 * `years` should be actual elapsed years (fractional allowed).
 */
export function cagr(startValue: number, endValue: number, years: number): number {
    if (startValue <= 0 || years <= 0) return 0;
    return Math.pow(endValue / startValue, 1 / years) - 1;
}

/** Elapsed years between two dates (actual/365). */
export function yearsBetween(from: Date, to: Date): number {
    return (to.getTime() - from.getTime()) / MS_PER_YEAR;
}
