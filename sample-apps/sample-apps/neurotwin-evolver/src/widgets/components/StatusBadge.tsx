'use client';

const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
    nominal: { bg: 'rgba(34,197,94,0.15)', fg: '#22c55e', label: 'Nominal' },
    degraded: { bg: 'rgba(234,179,8,0.15)', fg: '#eab308', label: 'Degraded' },
    healing: { bg: 'rgba(59,130,246,0.15)', fg: '#3b82f6', label: 'Healing' },
    offline: { bg: 'rgba(239,68,68,0.15)', fg: '#ef4444', label: 'Offline' },
    detected: { bg: 'rgba(234,179,8,0.15)', fg: '#eab308', label: 'Detected' },
    mutating: { bg: 'rgba(168,85,247,0.15)', fg: '#a855f7', label: 'Mutating' },
    resolved: { bg: 'rgba(34,197,94,0.15)', fg: '#22c55e', label: 'Resolved' },
    low: { bg: 'rgba(34,197,94,0.15)', fg: '#22c55e', label: 'Low' },
    medium: { bg: 'rgba(234,179,8,0.15)', fg: '#eab308', label: 'Medium' },
    high: { bg: 'rgba(249,115,22,0.15)', fg: '#f97316', label: 'High' },
    critical: { bg: 'rgba(239,68,68,0.15)', fg: '#ef4444', label: 'Critical' },
};

export function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_COLORS[status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94a3b8', label: status };
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: cfg.bg,
                color: cfg.fg,
                whiteSpace: 'nowrap',
            }}
        >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.fg }} />
            {cfg.label}
        </span>
    );
}
