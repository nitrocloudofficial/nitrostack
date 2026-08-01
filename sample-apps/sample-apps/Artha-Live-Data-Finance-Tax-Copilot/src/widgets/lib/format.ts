/** Formatting helpers shared across all finance widgets. */

const inr = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
    return inr.format(Math.round(amount ?? 0));
}

export function formatPct(fraction: number, decimals = 2): string {
    return `${((fraction ?? 0) * 100).toFixed(decimals)}%`;
}

/** Format an ISO timestamp as "26 Jul 2026, 15:30". */
export function formatDateTime(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/** Format an ISO date (yyyy-mm-dd) as "26 Jul 2026". */
export function formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    });
}
