// src/widgets/app/integrity-report/page.tsx
'use client';

import React, { useState } from 'react';
import { useWidgetSDK, useWidgetState } from '@nitrostack/widgets';

/* ------------------------------------------------------------
 * Shared contracts
 * ------------------------------------------------------------
 * These are the SAME types the server emits, imported from
 * src/shared. They previously existed as a hand-maintained 90-line
 * mirror in this file, with no compile-time link to the server —
 * so any contract change silently desynchronised the UI and
 * rendered wrong data with no error.
 *
 * `import type` is erased at compile time, so nothing from outside
 * the Next.js root is pulled into the client bundle.
 * ---------------------------------------------------------- */

import type {
    AuditReport,
    ReportSeverity,
    TrustVerdictLevel,
    VerificationStatus,
} from '../../../shared/contracts';

import { COLORS } from '../../../shared/constants';

function colorForStatus(status: VerificationStatus): string {
    switch (status) {
        case 'SUPPORTED': return COLORS.GREEN;
        case 'CONTRADICTED': return COLORS.RED;
        case 'ERROR': return COLORS.RED;
        case 'NOT_ENOUGH_EVIDENCE': return COLORS.AMBER;
        case 'UNRELATED': return COLORS.BLUE;
        default: return COLORS.GRAY;
    }
}

function colorForSeverity(severity?: ReportSeverity): string {
    switch (severity) {
        case 'GREEN': return COLORS.GREEN;
        case 'AMBER': return COLORS.AMBER;
        case 'RED': return COLORS.RED;
        default: return COLORS.GRAY;
    }
}

function colorForVerdictLevel(level?: TrustVerdictLevel): string {
    switch (level) {
        case 'HIGH_TRUST': return COLORS.GREEN;
        case 'MODERATE_TRUST': return COLORS.AMBER;
        case 'LOW_TRUST': return COLORS.RED;
        case 'CRITICAL': return COLORS.CRITICAL;
        default: return COLORS.BLUE;
    }
}

function labelForStatus(status: VerificationStatus): string {
    switch (status) {
        case 'SUPPORTED': return 'Supported';
        case 'CONTRADICTED': return 'Contradicted';
        case 'NOT_ENOUGH_EVIDENCE': return 'Insufficient Evidence';
        case 'UNRELATED': return 'Unrelated';
        case 'ERROR': return 'Error / Failed';
        default: return status;
    }
}

/* ------------------------------------------------------------
 * Charts — inline SVG, no charting dependency
 * ---------------------------------------------------------- */

interface Slice { label: string; value: number; color: string }

/** Horizontal stacked bar. Renders nothing when there is no data. */
function DistributionBar({ slices, border }: { slices: Slice[]; border: string }) {
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return null;

    return (
        <div style={{ display: 'flex', width: '100%', height: 12, borderRadius: 999, overflow: 'hidden', border: `1px solid ${border}` }}>
            {slices.filter((s) => s.value > 0).map((s) => (
                <div
                    key={s.label}
                    title={`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}
                    style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
                />
            ))}
        </div>
    );
}

function ChartLegend({ slices, total, muted }: { slices: Slice[]; total: number; muted: string }) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8, fontSize: 11, color: muted }}>
            {slices.filter((s) => s.value > 0).map((s) => (
                <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                    {s.label} <strong style={{ color: s.color }}>{s.value}</strong>
                    {total > 0 && <span>({Math.round((s.value / total) * 100)}%)</span>}
                </span>
            ))}
        </div>
    );
}

/** Single-value progress bar, used for citation coverage. */
function CoverageBar({ ratio, color, border }: { ratio: number; color: string; border: string }) {
    const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
    return (
        <div style={{ width: '100%', height: 12, borderRadius: 999, overflow: 'hidden', border: `1px solid ${border}` }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 240ms ease' }} />
        </div>
    );
}

export default function IntegrityReportWidget() {
    const { isReady, getToolOutput, theme } = useWidgetSDK();
    const data = getToolOutput<AuditReport>();

    const [state, setState] = useWidgetState<{
        expandedClaims: Record<string, boolean>;
        filter: string;
        showDetails: boolean;
        search: string;
        sort: 'severity' | 'confidence' | 'document';
    }>(() => ({
        expandedClaims: {},
        filter: 'ALL',
        showDetails: true,
        search: '',
        sort: 'severity',
    }));

    const [copied, setCopied] = useState(false);

    const isDark = theme === 'dark';
    const bg = isDark ? '#0f172a' : '#ffffff';
    const cardBg = isDark ? '#1e293b' : '#f8fafc';
    const border = isDark ? '#334155' : '#e2e8f0';
    const text = isDark ? '#f8fafc' : '#0f172a';
    const muted = isDark ? '#94a3b8' : '#64748b';

    if (!isReady) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: text, fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>Connecting to Host...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div style={{ padding: 40, textAlign: 'center', background: bg, color: text, borderRadius: 16, border: `1px solid ${border}`, fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>No Audit Data Available</h3>
                <p style={{ margin: 0, color: muted, fontSize: 14 }}>Run <code>run_full_audit</code> to view the citation integrity analysis.</p>
            </div>
        );
    }

    if (typeof data !== 'object' || !Array.isArray((data as AuditReport).results)) {
        return (
            <div style={{ padding: 32, background: bg, color: text, borderRadius: 16, border: `2px solid ${COLORS.RED}`, fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: COLORS.RED }}>Malformed Audit Report</h3>
                <p style={{ margin: '0 0 12px 0', color: muted, fontSize: 14 }}>
                    The tool returned a payload this widget cannot render. Re-run <code>run_full_audit</code>;
                    if it persists the server and widget contracts are out of sync.
                </p>
                <pre style={{ margin: 0, padding: 12, background: cardBg, borderRadius: 8, fontSize: 11, color: muted, overflow: 'auto', maxHeight: 180 }}>
                    {JSON.stringify(data, null, 2).slice(0, 800)}
                </pre>
            </div>
        );
    }

    const { summary, results = [], claims = [], documentName = 'uploaded-document', integrityScore = 0, severity, durationMs = 0, generatedAt, verdict, offlineMode } = data;

    const claimMap = new Map((claims ?? []).map((c) => [c.id, c]));

    // Ordering weight for the "severity" sort: worst findings first, so a
    // reviewer sees contradictions before anything else.
    const SEVERITY_RANK: Record<string, number> = {
        CONTRADICTED: 0, ERROR: 1, NOT_ENOUGH_EVIDENCE: 2, UNRELATED: 3, SUPPORTED: 4,
    };

    const query = (state?.search ?? '').trim().toLowerCase();
    const sortMode = state?.sort ?? 'severity';

    const filteredResults = (results ?? [])
        .filter((r) => {
            if (!r) return false;
            if ((state?.filter ?? 'ALL') !== 'ALL' && r.status !== state?.filter) return false;
            if (query.length === 0) return true;

            const claim = claimMap.get(r.claimId);
            return `${claim?.text ?? ''} ${r.reason} ${r.metadata?.paperTitle ?? ''}`
                .toLowerCase()
                .includes(query);
        })
        .slice()
        .sort((a, b) => {
            if (sortMode === 'confidence') return (b.confidence ?? 0) - (a.confidence ?? 0);
            if (sortMode === 'document') {
                return (claimMap.get(a.claimId)?.paragraphIndex ?? 0)
                    - (claimMap.get(b.claimId)?.paragraphIndex ?? 0);
            }
            return (SEVERITY_RANK[a.status] ?? 9) - (SEVERITY_RANK[b.status] ?? 9);
        });

    const statusSlices: Slice[] = [
        { label: 'Supported', value: summary?.supported ?? 0, color: COLORS.GREEN },
        { label: 'Contradicted', value: summary?.contradicted ?? 0, color: COLORS.RED },
        { label: 'Insufficient', value: summary?.insufficientEvidence ?? 0, color: COLORS.AMBER },
        { label: 'Unrelated', value: summary?.unrelated ?? 0, color: COLORS.BLUE },
        { label: 'Errors', value: summary?.errors ?? 0, color: COLORS.PURPLE },
    ];

    const evidenceSlices: Slice[] = [
        {
            label: 'Supporting', color: COLORS.GREEN,
            value: results.reduce((n, r) => n + (r.supportingEvidence?.length ?? 0), 0),
        },
        {
            label: 'Contradicting', color: COLORS.RED,
            value: results.reduce((n, r) => n + (r.contradictingEvidence?.length ?? 0), 0),
        },
    ];

    const toggleExpand = (claimId: string) => {
        const current = state?.expandedClaims ?? {};
        setState({
            ...state,
            expandedClaims: { ...current, [claimId]: !current[claimId] },
        });
    };

    const handleCopyJson = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    const handleDownloadJson = () => {
        try {
            const blob = new Blob(
                [JSON.stringify(data, null, 2)],
                { type: "application/json" }
            );

            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;

            const safeName = (documentName || "audit")
                .replace(/[^a-zA-Z0-9]/g, "_")
                .toLowerCase();

            a.download = `vericite-report-${safeName}.json`;

            document.body.appendChild(a);   // <-- add this
            a.click();
            document.body.removeChild(a);   // <-- add this

            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download failed:", err);
        }
    };

    const severityColor = colorForSeverity(severity);
    const verdictColor = colorForVerdictLevel(verdict?.level);

    return (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: bg, color: text, padding: 24, borderRadius: 16, border: `1px solid ${border}`, maxWidth: 840, margin: '0 auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20, borderBottom: `1px solid ${border}`, paddingBottom: 16 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 24 }}>🛡️</span>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>VeriCite Audit Report</h1>
                    </div>
                    <p style={{ margin: '6px 0 0 0', color: muted, fontSize: 13 }}>
                        Document: <strong>{documentName}</strong> • Processed in {((durationMs || 0) / 1000).toFixed(2)}s
                    </p>
                    {offlineMode && (
                        <div
                            title="Evidence came from the local fixture corpus, not live scholarly APIs."
                            style={{
                                marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                                background: isDark ? '#422006' : '#fffbeb',
                                border: `1px solid ${isDark ? '#78350f' : '#fde68a'}`,
                                color: isDark ? '#fbbf24' : '#92400e',
                                borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                            }}
                        >
                            OFFLINE MODE — fixture evidence, not live providers
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleCopyJson} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`, background: cardBg, color: text, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {copied ? '✓ Copied' : 'Copy JSON'}
                    </button>
                    <button onClick={handleDownloadJson} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: COLORS.BLUE, color: '#ffffff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Download Report
                    </button>
                </div>
            </div>

            {/* Trust Verdict Banner (Explainable AI Panel) */}
            {verdict && (
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderLeft: `6px solid ${verdictColor}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ background: verdictColor, color: '#ffffff', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {(verdict.level || 'AUDIT').replace('_', ' ')}
                            </span>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{verdict.title || 'Audit Verdict'}</h2>
                        </div>
                        <span style={{ fontSize: 12, color: muted }}>Verdict Confidence: <strong>{Math.round((verdict.confidence || 0) * 100)}%</strong></span>
                    </div>

                    <p style={{ margin: '0 0 14px 0', fontSize: 14, lineHeight: 1.5, color: text }}>
                        {verdict.summary}
                    </p>

                    <button onClick={() => setState({ ...state, showDetails: !(state?.showDetails ?? true) })} style={{ background: 'transparent', border: 'none', color: COLORS.BLUE, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 12 }}>
                        {state?.showDetails ? '▲ Hide Verdict Details' : '▼ Show Verdict Details & Recommendations'}
                    </button>

                    {(state?.showDetails ?? true) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 12, borderTop: `1px solid ${border}` }}>
                            {/* Reasoning */}
                            {Array.isArray(verdict.reasoning) && verdict.reasoning.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: muted, marginBottom: 6 }}>Key Diagnostic Reasoning</div>
                                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: text }}>
                                        {verdict.reasoning.map((r, idx) => (
                                            <li key={idx} style={{ marginBottom: 4 }}>{r}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Strengths & Weaknesses Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                                {Array.isArray(verdict.strengths) && verdict.strengths.length > 0 && (
                                    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: 12 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.GREEN, marginBottom: 6 }}>✓ Strengths</div>
                                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: text }}>
                                            {verdict.strengths.map((s, idx) => <li key={idx} style={{ marginBottom: 3 }}>{s}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {Array.isArray(verdict.weaknesses) && verdict.weaknesses.length > 0 && (
                                    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: 12 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.RED, marginBottom: 6 }}>⚠ Weaknesses / Risks</div>
                                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: text }}>
                                            {verdict.weaknesses.map((w, idx) => <li key={idx} style={{ marginBottom: 3 }}>{w}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Actionable Recommendations */}
                            {Array.isArray(verdict.recommendations) && verdict.recommendations.length > 0 && (
                                <div style={{ background: isDark ? '#1e1b4b' : '#eff6ff', border: `1px solid ${isDark ? '#3730a3' : '#bfdbfe'}`, borderRadius: 8, padding: 12 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.BLUE, marginBottom: 6 }}>💡 Actionable Recommendations</div>
                                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: text }}>
                                        {verdict.recommendations.map((rec, idx) => <li key={idx} style={{ marginBottom: 4 }}>{rec}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Score & KPI Summary Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                {/* Score Radial Card */}
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ position: 'relative', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="90" height="90" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth="3.5" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={severityColor} strokeWidth="3.5" strokeDasharray={`${integrityScore ?? 0}, 100`} />
                        </svg>
                        <span style={{ position: 'absolute', fontSize: 22, fontWeight: 800, color: text }}>{integrityScore ?? 0}</span>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: severityColor }}>
                        {severity ?? 'AMBER'} Severity
                    </div>
                    <div style={{ fontSize: 11, color: muted }}>Integrity Score (0-100)</div>
                </div>

                {/* KPI Metrics Grid */}
                <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 10, padding: 12, borderLeft: `4px solid ${COLORS.GREEN}` }}>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{summary?.supported ?? 0}</div>
                        <div style={{ fontSize: 12, color: muted }}>Supported</div>
                    </div>
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 10, padding: 12, borderLeft: `4px solid ${COLORS.RED}` }}>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{summary?.contradicted ?? 0}</div>
                        <div style={{ fontSize: 12, color: muted }}>Contradicted</div>
                    </div>
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 10, padding: 12, borderLeft: `4px solid ${COLORS.AMBER}` }}>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{summary?.insufficientEvidence ?? 0}</div>
                        <div style={{ fontSize: 12, color: muted }}>Insufficient</div>
                    </div>
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 10, padding: 12, borderLeft: `4px solid ${COLORS.GRAY}` }}>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{summary?.missingCitation ?? 0}</div>
                        <div style={{ fontSize: 12, color: muted }}>Missing Citation</div>
                    </div>
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 10, padding: 12, borderLeft: `4px solid ${COLORS.BLUE}` }}>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{summary?.unrelated ?? 0}</div>
                        <div style={{ fontSize: 12, color: muted }}>Unrelated</div>
                    </div>
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 10, padding: 12, borderLeft: `4px solid ${COLORS.PURPLE}` }}>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{summary?.errors ?? 0}</div>
                        <div style={{ fontSize: 12, color: muted }}>Errors</div>
                    </div>
                </div>
            </div>

            {/* Distribution Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: muted, marginBottom: 10 }}>
                        Claim Distribution
                    </div>
                    <DistributionBar slices={statusSlices} border={border} />
                    <ChartLegend slices={statusSlices} total={summary?.totalClaims ?? 0} muted={muted} />
                </div>

                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: muted, marginBottom: 10 }}>
                        Citation Coverage
                    </div>
                    <CoverageBar
                        ratio={summary?.citationCoverage ?? 0}
                        color={severityColor}
                        border={border}
                    />
                    <div style={{ marginTop: 8, fontSize: 11, color: muted }}>
                        <strong style={{ color: text }}>{Math.round((summary?.citationCoverage ?? 0) * 100)}%</strong> of claims carry a linked reference
                        {' • '}
                        <strong style={{ color: text }}>{summary?.resolvedCitations ?? 0}</strong>/{summary?.totalCitations ?? 0} references confirmed
                        {(summary?.retractedCitations ?? 0) > 0 && (
                            <span style={{ color: COLORS.RED, fontWeight: 700 }}> • {summary?.retractedCitations} RETRACTED</span>
                        )}
                    </div>
                    {evidenceSlices.some((e) => e.value > 0) && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: muted, marginBottom: 6 }}>
                                Evidence Retrieved
                            </div>
                            <DistributionBar slices={evidenceSlices} border={border} />
                            <ChartLegend
                                slices={evidenceSlices}
                                total={evidenceSlices.reduce((n, e) => n + e.value, 0)}
                                muted={muted}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Search + Sort */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <input
                    type="search"
                    value={state?.search ?? ''}
                    onChange={(e) => setState({ ...state, search: e.target.value })}
                    placeholder="Search claims, reasons, papers…"
                    aria-label="Search claims"
                    style={{
                        flex: '1 1 200px', minWidth: 0, padding: '8px 12px', borderRadius: 8,
                        border: `1px solid ${border}`, background: bg, color: text, fontSize: 13,
                    }}
                />
                <select
                    value={sortMode}
                    onChange={(e) => setState({ ...state, sort: e.target.value as typeof sortMode })}
                    aria-label="Sort claims"
                    style={{
                        padding: '8px 12px', borderRadius: 8, border: `1px solid ${border}`,
                        background: bg, color: text, fontSize: 13, cursor: 'pointer',
                    }}
                >
                    <option value="severity">Sort: Most severe first</option>
                    <option value="confidence">Sort: Highest confidence</option>
                    <option value="document">Sort: Document order</option>
                </select>
            </div>

            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
                {['ALL', 'SUPPORTED', 'CONTRADICTED', 'NOT_ENOUGH_EVIDENCE', 'ERROR'].map((tab) => {
                    const active = (state?.filter ?? 'ALL') === tab;
                    return (
                        <button key={tab} onClick={() => setState({ ...state, filter: tab })} style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${active ? COLORS.BLUE : border}`, background: active ? COLORS.BLUE : cardBg, color: active ? '#ffffff' : text, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            {tab === 'ALL' ? `All Claims (${summary?.totalClaims ?? 0})` : labelForStatus(tab as VerificationStatus)}
                        </button>
                    );
                })}
            </div>

            {/* Claims Results Accordion */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredResults.length === 0 && (
                    <div style={{ padding: 24, textAlign: 'center', color: muted, fontSize: 13, background: cardBg, borderRadius: 10 }}>
                        {results.length === 0
                            ? 'No verifiable claims were extracted from this document.'
                            : query.length > 0
                                ? `No claims match "${query}".`
                                : 'No claims match the selected status filter.'}
                    </div>
                )}

                {filteredResults.map((r) => {
                    if (!r) return null;
                    const claim = claimMap.get(r.claimId);
                    const isExpanded = state?.expandedClaims?.[r.claimId] ?? false;
                    const statusColor = colorForStatus(r.status);

                    return (
                        <div key={r.claimId} style={{ background: cardBg, border: `1px solid ${border}`, borderLeft: `5px solid ${statusColor}`, borderRadius: 10, overflow: 'hidden' }}>
                            <div onClick={() => toggleExpand(r.claimId)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginBottom: 6 }}>
                                        {claim?.text ?? r.claimId}
                                        {(claim?.citationMarkers?.length ?? 0) > 0 && <span style={{ marginLeft: 8, color: COLORS.BLUE, fontSize: 12 }}>{claim?.citationMarkers.join(' ')}</span>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                                        <span style={{ color: statusColor, fontWeight: 700, textTransform: 'uppercase' }}>{labelForStatus(r.status)}</span>
                                        <span style={{ color: muted }}>•</span>
                                        <span style={{ color: muted }}>Confidence: <strong>{Math.round((r.confidence ?? 0) * 100)}%</strong></span>
                                        {r.metadata?.source && (
                                            <>
                                                <span style={{ color: muted }}>•</span>
                                                <span style={{ color: muted }}>Source: <strong>{r.metadata.source}</strong></span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <span style={{ fontSize: 16, color: muted }}>{isExpanded ? '▲' : '▼'}</span>
                            </div>

                            {isExpanded && (
                                <div style={{ padding: '0 16px 16px 16px', borderTop: `1px solid ${border}`, paddingTop: 12, marginTop: 4, fontSize: 13 }}>
                                    {r.reason && (
                                        <div style={{ marginBottom: 10, color: text }}>
                                            <strong>Verification Details:</strong> {r.reason}
                                        </div>
                                    )}

                                    {r.metadata?.paperTitle && (
                                        <div style={{ background: bg, padding: 10, borderRadius: 8, border: `1px solid ${border}`, marginBottom: 10 }}>
                                            <div style={{ fontWeight: 600, marginBottom: 2 }}>{r.metadata.paperTitle}</div>
                                            <div style={{ fontSize: 12, color: muted }}>
                                                {r.metadata.authors?.join(', ')} {r.metadata.year ? `(${r.metadata.year})` : ''} {r.metadata.journal ? `• ${r.metadata.journal}` : ''}
                                            </div>
                                            {r.metadata.doi && <div style={{ fontSize: 11, color: COLORS.BLUE, marginTop: 4 }}>DOI: {r.metadata.doi}</div>}
                                        </div>
                                    )}

                                    {r.evidence && (
                                        <div style={{ background: bg, padding: 10, borderRadius: 8, border: `1px solid ${border}`, fontStyle: 'italic', color: muted }}>
                                            "{r.evidence}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted }}>
                <span>VeriCite v1.0 • Autonomous Citation Integrity Auditor{offlineMode ? ' • offline fixtures' : ''}</span>
                <span>{generatedAt ? new Date(generatedAt).toLocaleString() : ''}</span>
            </div>
        </div>
    );
}
