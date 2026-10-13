/**
 * Formatting helpers for Indian currency / percentages.
 * Kept dependency-free so tool outputs read cleanly in any MCP client.
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
});

/** Format a number as Indian rupees, e.g. 1850000 -> "₹18,50,000". */
export function formatINR(amount: number): string {
    return inrFormatter.format(Math.round(amount));
}

/** Format a fraction (0.1234) as a percentage string ("12.34%"). */
export function formatPercent(fraction: number, decimals = 2): string {
    return `${(fraction * 100).toFixed(decimals)}%`;
}

/** Round money to the nearest rupee. */
export function roundMoney(amount: number): number {
    return Math.round(amount);
}
