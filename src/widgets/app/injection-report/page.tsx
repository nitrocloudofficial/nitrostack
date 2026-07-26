'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';

// Disable static generation - this is a dynamic widget
export const dynamic = 'force-dynamic';

interface QuarantineEntry {
    pattern_type: string;
    excerpt: string;
    location: string;
    action: string;
}

interface ExtractedFacts {
    cves: string[];
    techniques: string[];
    actors: string[];
    sectors: string[];
    indicators: string[];
}

interface WidgetData {
    source_url: string;
    extracted: ExtractedFacts;
    summary_facts: string[];
    trust: 'clean' | 'degraded' | 'unknown';
    injection_detected: boolean;
    quarantined: QuarantineEntry[];
    note?: string;
}

function TagList({ label, items, isDark }: { label: string; items: string[]; isDark: boolean }) {
    if (items.length === 0) return null;
    return (
        <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#9ca3af' : '#6b7280', marginBottom: '4px' }}>
                {label.toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {items.map((item) => (
                    <span
                        key={item}
                        style={{
                            fontSize: '12px',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            background: isDark ? '#1f2937' : '#f3f4f6',
                            color: isDark ? '#e5e7eb' : '#374151',
                        }}
                    >
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function InjectionReportWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();

    const textPrimary = isDark ? '#f9fafb' : '#111827';
    const textMuted = isDark ? '#9ca3af' : '#6b7280';
    const panelBg = isDark ? '#111827' : '#ffffff';
    const border = isDark ? '#333' : '#e5e7eb';

    if (!isReady || !data) {
        return (
            <div style={{ padding: '32px', textAlign: 'center', color: textMuted }}>
                {isReady ? 'No report data received yet.' : 'Connecting to host…'}
            </div>
        );
    }

    return (
        <div
            style={{
                background: isDark ? '#0a0a0a' : '#f9fafb',
                minHeight: '260px',
                maxHeight: maxHeight || '600px',
                overflow: 'auto',
                fontFamily: 'system-ui, sans-serif',
            }}
        >
            {data.injection_detected ? (
                <div
                    style={{
                        background: isDark ? '#450a0a' : '#dc2626',
                        color: '#fff',
                        padding: '16px 18px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                    }}
                >
                    <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.01em' }}>
                        ⚠ PROMPT INJECTION DETECTED — {data.quarantined.length} ATTEMPT{data.quarantined.length === 1 ? '' : 'S'} QUARANTINED
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.9 }}>
                        Blocked server-side before reaching the model. Trust: <strong>degraded</strong>.
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        background: isDark ? '#052e16' : '#16a34a',
                        color: '#fff',
                        padding: '14px 18px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                    }}
                >
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>✓ No injection attempts detected</div>
                    <div style={{ fontSize: '12px', marginTop: '2px', opacity: 0.9 }}>Trust: clean</div>
                </div>
            )}

            <div style={{ padding: '14px 18px' }}>
                <div style={{ fontSize: '11px', color: textMuted, marginBottom: '12px', wordBreak: 'break-all' }}>
                    Source: {data.source_url}
                </div>

                {data.injection_detected && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: textMuted, marginBottom: '6px' }}>
                            QUARANTINED CONTENT (never passed to the model)
                        </div>
                        {data.quarantined.map((q, i) => (
                            <div
                                key={i}
                                style={{
                                    background: panelBg,
                                    border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`,
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    marginBottom: '8px',
                                }}
                            >
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                                    <span
                                        style={{
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: '999px',
                                            background: isDark ? '#450a0a' : '#fee2e2',
                                            color: isDark ? '#fca5a5' : '#991b1b',
                                        }}
                                    >
                                        {q.pattern_type.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                    <span style={{ fontSize: '11px', color: textMuted }}>{q.location}</span>
                                </div>
                                <div style={{ fontSize: '12px', color: textPrimary, fontFamily: 'monospace' }}>
                                    &ldquo;{q.excerpt}&rdquo;
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div
                    style={{
                        background: panelBg,
                        border: `1px solid ${border}`,
                        borderRadius: '10px',
                        padding: '14px',
                    }}
                >
                    <div style={{ fontSize: '13px', fontWeight: 700, color: textPrimary, marginBottom: '10px' }}>
                        Extracted facts
                    </div>
                    <TagList label="CVEs" items={data.extracted.cves} isDark={isDark} />
                    <TagList label="ATT&CK techniques" items={data.extracted.techniques} isDark={isDark} />
                    <TagList label="Threat actors" items={data.extracted.actors} isDark={isDark} />
                    <TagList label="Targeted sectors" items={data.extracted.sectors} isDark={isDark} />
                    <TagList label="Indicators" items={data.extracted.indicators} isDark={isDark} />

                    {data.summary_facts.length > 0 && (
                        <ul style={{ margin: '10px 0 0 0', paddingLeft: '18px' }}>
                            {data.summary_facts.map((f, i) => (
                                <li key={i} style={{ fontSize: '12px', color: textMuted, marginBottom: '4px' }}>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    )}

                    {Object.values(data.extracted).every((arr) => arr.length === 0) && data.summary_facts.length === 0 && (
                        <p style={{ fontSize: '12px', color: textMuted, margin: 0 }}>No structured facts extracted from this page.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
