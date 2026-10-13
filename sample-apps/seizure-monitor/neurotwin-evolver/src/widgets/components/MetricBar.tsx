'use client';

export function MetricBar({
    label,
    value,
    max = 100,
    color,
    isDark,
    suffix = '%',
}: {
    label: string;
    value: number;
    max?: number;
    color: string;
    isDark: boolean;
    suffix?: string;
}) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 12,
                color: isDark ? '#94a3b8' : '#64748b',
            }}>
                <span>{label}</span>
                <span style={{ fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                    {value}{suffix}
                </span>
            </div>
            <div style={{
                height: 6, borderRadius: 999,
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%', width: `${pct}%`, background: color, borderRadius: 999,
                    transition: 'width 0.4s ease',
                }} />
            </div>
        </div>
    );
}
