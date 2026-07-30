'use client';

import { useTheme, useWidgetState, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';

// Disable static generation - this is a dynamic widget
export const dynamic = 'force-dynamic';

type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface VulnEntry {
    id: string;
    cve: string | null;
    summary?: string;
    priority: Priority;
    why: string;
    in_kev: boolean;
    ransomware_linked: boolean;
    epss: number | null;
}

interface RankedPackage {
    package: string;
    version: string;
    highest_priority: Priority;
    vulnerabilities: VulnEntry[];
}

interface WidgetData {
    packages_ranked: number;
    kev_source: string;
    ranked: RankedPackage[];
}

const PRIORITY_COLORS: Record<Priority, { bg: string; fg: string; darkBg: string; darkFg: string }> = {
    CRITICAL: { bg: '#fee2e2', fg: '#991b1b', darkBg: '#450a0a', darkFg: '#fca5a5' },
    HIGH: { bg: '#ffedd5', fg: '#9a3412', darkBg: '#431407', darkFg: '#fdba74' },
    MEDIUM: { bg: '#fef9c3', fg: '#854d0e', darkBg: '#422006', darkFg: '#fde047' },
    LOW: { bg: '#f3f4f6', fg: '#374151', darkBg: '#1f2937', darkFg: '#d1d5db' },
};

function PriorityBadge({ priority, isDark }: { priority: Priority; isDark: boolean }) {
    const c = PRIORITY_COLORS[priority];
    return (
        <span
            style={{
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.03em',
                background: isDark ? c.darkBg : c.bg,
                color: isDark ? c.darkFg : c.fg,
            }}
        >
            {priority}
        </span>
    );
}

export default function PriorityTableWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();

    const [state, setState] = useWidgetState<{ expanded: string[] }>(() => ({ expanded: [] }));

    const border = isDark ? '#333' : '#e5e7eb';
    const textPrimary = isDark ? '#f9fafb' : '#111827';
    const textMuted = isDark ? '#9ca3af' : '#6b7280';
    const panelBg = isDark ? '#111827' : '#ffffff';
    const rowHoverBg = isDark ? '#1f2937' : '#f9fafb';

    if (!isReady || !data) {
        return (
            <div style={{ padding: '32px', textAlign: 'center', color: textMuted }}>
                {isReady ? 'No priority data received yet.' : 'Connecting to host…'}
            </div>
        );
    }

    const toggle = (pkg: string) => {
        const expanded = state?.expanded ?? [];
        setState({ expanded: expanded.includes(pkg) ? expanded.filter((p) => p !== pkg) : [...expanded, pkg] });
    };

    return (
        <div
            style={{
                background: isDark ? '#0a0a0a' : '#f9fafb',
                minHeight: '300px',
                maxHeight: maxHeight || '600px',
                overflow: 'auto',
                fontFamily: 'system-ui, sans-serif',
            }}
        >
            <div
                style={{
                    background: panelBg,
                    borderBottom: `1px solid ${border}`,
                    padding: '14px 18px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                }}
            >
                <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: textPrimary }}>
                    Priority findings
                </h1>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: textMuted }}>
                    {data.packages_ranked} package{data.packages_ranked === 1 ? '' : 's'} ranked by real-world
                    exploitation evidence ({data.kev_source}), not raw CVSS.
                </p>
            </div>

            <div style={{ padding: '8px 12px' }}>
                {data.ranked.map((pkg) => {
                    const isExpanded = state?.expanded?.includes(pkg.package) ?? false;
                    return (
                        <div
                            key={pkg.package}
                            style={{
                                background: panelBg,
                                border: `1px solid ${border}`,
                                borderRadius: '10px',
                                marginBottom: '8px',
                                overflow: 'hidden',
                            }}
                        >
                            <button
                                onClick={() => toggle(pkg.package)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 14px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>
                                        {pkg.package}
                                    </span>
                                    <span style={{ fontSize: '12px', color: textMuted }}>{pkg.version}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '11px', color: textMuted }}>
                                        {pkg.vulnerabilities.length} vuln{pkg.vulnerabilities.length === 1 ? '' : 's'}
                                    </span>
                                    <PriorityBadge priority={pkg.highest_priority} isDark={isDark} />
                                    <span style={{ color: textMuted, fontSize: '12px' }}>{isExpanded ? '▾' : '▸'}</span>
                                </div>
                            </button>

                            {isExpanded && (
                                <div style={{ borderTop: `1px solid ${border}` }}>
                                    {pkg.vulnerabilities.map((v) => (
                                        <div
                                            key={v.id}
                                            style={{
                                                padding: '10px 14px',
                                                borderBottom: `1px solid ${border}`,
                                                background: rowHoverBg,
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <PriorityBadge priority={v.priority} isDark={isDark} />
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: textPrimary }}>
                                                    {v.cve ?? v.id}
                                                </span>
                                                {v.in_kev && (
                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: isDark ? '#fca5a5' : '#b91c1c' }}>
                                                        ● IN CISA KEV
                                                    </span>
                                                )}
                                                {v.ransomware_linked && (
                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: isDark ? '#fdba74' : '#c2410c' }}>
                                                        ● RANSOMWARE-LINKED
                                                    </span>
                                                )}
                                                {v.epss !== null && (
                                                    <span style={{ fontSize: '10px', color: textMuted }}>
                                                        EPSS {(v.epss * 100).toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                            {v.summary && (
                                                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: textMuted }}>{v.summary}</p>
                                            )}
                                            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: textMuted, fontStyle: 'italic' }}>
                                                {v.why}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: textMuted }}>
                Ranked by CISA KEV (confirmed exploitation) + FIRST EPSS, CVSS as corroborating color only.
            </div>
        </div>
    );
}
