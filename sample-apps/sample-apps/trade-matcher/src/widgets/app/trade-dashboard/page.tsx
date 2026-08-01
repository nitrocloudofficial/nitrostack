'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWidgetSDK, WidgetLayout, useTheme } from '@nitrostack/widgets';

interface Correction {
    hasProposal: boolean;
    proposedField: string | null;
    proposedValue: string | null;
    proposedSystem: 'A' | 'B' | null;
    reasoning: string;
    confidence: string;
}

interface TradeBreak {
    breakId: string;
    discrepancy: string;
    explained: boolean;
    reason: string;
    confidence: string;
    status: 'resolved' | 'escalated';
    correction: Correction | null;
}

interface AccuracyStats {
    totalProcessed: number;
    resolvedCount: number;
    escalatedCount: number;
}

// Safety fallback if the live pipeline can't be reached / demo mode is toggled on
const initialBreaksData: TradeBreak[] = [
    { breakId: "BRK-001", discrepancy: "FX price mismatch", explained: true, reason: "FX rate discrepancy due to timezone difference in settlement systems. Applied correct rate.", confidence: "high", status: "resolved", correction: null },
    { breakId: "BRK-002", discrepancy: "Amount mismatch", explained: false, reason: "Trade amount mismatch exceeds standard tolerance. System A reports $50,000; System B reports $5,000.", confidence: "low", status: "escalated", correction: { hasProposal: true, proposedField: "price", proposedValue: "50000", proposedSystem: "B", reasoning: "System B's value looks like a decimal-place entry error (5,000 vs 50,000).", confidence: "medium" } },
    { breakId: "BRK-003", discrepancy: "Commission rounding", explained: true, reason: "Minor rounding error on commission fee (0.01 difference). Auto-resolved.", confidence: "high", status: "resolved", correction: null },
    { breakId: "BRK-004", discrepancy: "Missing LEI", explained: false, reason: "Counterparty LEI missing in System B data. Cannot verify trade identity.", confidence: "medium", status: "escalated", correction: { hasProposal: false, proposedField: null, proposedValue: null, proposedSystem: null, reasoning: "No clear evidence of which value is wrong -- this needs a human to check source records.", confidence: "low" } }
];

const fallbackStats: AccuracyStats = { totalProcessed: 4, resolvedCount: 2, escalatedCount: 2 };

function parseToolResult<T>(response: { result: string; structuredContent?: unknown; isError?: boolean }): T {
    if (response.isError) {
        throw new Error(response.result || 'Tool returned an error');
    }
    if (response.structuredContent !== undefined && response.structuredContent !== null) {
        return response.structuredContent as T;
    }
    try {
        return JSON.parse(response.result) as T;
    } catch {
        throw new Error(`Could not parse tool result as JSON: ${response.result}`);
    }
}

export default function Dashboard() {
    const { isReady, callTool } = useWidgetSDK();
    const theme = useTheme();

    const [breaks, setBreaks] = useState<TradeBreak[]>(initialBreaksData);
    const [stats, setStats] = useState<AccuracyStats>(fallbackStats);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pipelineError, setPipelineError] = useState<string | null>(null);

    // Guards against the mount-effect firing run_reconciliation twice
    // (React StrictMode double-invoke / widget remounts), which was
    // doubling Groq calls and causing the RPC timeout.
    const hasAutoRunRef = useRef(false);

    const runPipeline = useCallback(async () => {
        if (!isReady) return;
        setIsLoading(true);
        setPipelineError(null);

        try {
            const response = await callTool('run_reconciliation', { system: 'both' });
            const result = parseToolResult<{ breaks: TradeBreak[]; stats: AccuracyStats }>(response);
            setBreaks(result.breaks ?? []);
            setStats(result.stats ?? fallbackStats);
        } catch (err) {
            console.error('run_reconciliation failed, falling back to demo data.', err);
            setPipelineError(err instanceof Error ? err.message : 'Unknown pipeline error');
            setBreaks(initialBreaksData);
            setStats(fallbackStats);
        } finally {
            setIsLoading(false);
        }
    }, [isReady, callTool]);

    useEffect(() => {
        if (!isReady) return;

        if (!isDemoMode) {
            if (hasAutoRunRef.current) return; // already auto-ran once, don't fire again
            hasAutoRunRef.current = true;
            runPipeline();
        } else {
            hasAutoRunRef.current = false; // reset so leaving demo mode can auto-run again
            setBreaks(initialBreaksData);
            setStats(fallbackStats);
            setPipelineError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady, isDemoMode]);

    const handleOverride = async (id: string) => {
        setBreaks(currentBreaks =>
            currentBreaks.map(b =>
                b.breakId === id
                    ? { ...b, explained: true, status: 'resolved', reason: `Manually Overridden: ${b.reason}`, confidence: "high" }
                    : b
            )
        );

        if (isDemoMode || !isReady) {
            setStats(s => ({ ...s, resolvedCount: s.resolvedCount + 1, escalatedCount: Math.max(0, s.escalatedCount - 1) }));
            return;
        }

        try {
            const response = await callTool('resolve_or_escalate', {
                breakId: id,
                explained: true,
                reason: "Manually overridden by operator via Live Ops Dashboard",
                confidence: "high"
            });
            if (response.isError) {
                console.error(`resolve_or_escalate returned an error for ${id}: ${response.result}`);
            }
            const statsResponse = await callTool('get_accuracy_stats', {});
            const statsResult = parseToolResult<AccuracyStats>(statsResponse);
            setStats(statsResult);
        } catch (error) {
            console.error(`resolve_or_escalate failed for ${id}`, error);
        }
    };

    const totalBreaks = breaks.length;
    const resolvedBreaks = breaks.filter(b => b.status === 'resolved').length;
    const pendingBreaks = totalBreaks - resolvedBreaks;
    const dark = theme !== 'light';

    if (!isReady) {
        return (
            <WidgetLayout>
                <div style={{ padding: '40px', textAlign: 'center', color: '#a3a3a3' }}>
                    Connecting to MCP host...
                </div>
            </WidgetLayout>
        );
    }

    return (
        <WidgetLayout>
            <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', maxWidth: '900px', margin: '0 auto', backgroundColor: dark ? '#0a0a0a' : '#fafafa', color: dark ? '#ededed' : '#171717', minHeight: '100vh' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <button
                        onClick={runPipeline}
                        disabled={isDemoMode || isLoading}
                        style={{
                            backgroundColor: dark ? '#1a1a1a' : '#eee',
                            color: dark ? '#ededed' : '#171717',
                            border: '1px solid #333',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            cursor: isDemoMode || isLoading ? 'not-allowed' : 'pointer',
                            opacity: isDemoMode || isLoading ? 0.5 : 1
                        }}
                    >
                        Re-run pipeline
                    </button>

                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', backgroundColor: dark ? '#1a1a1a' : '#eee', padding: '8px 16px', borderRadius: '20px', border: '1px solid #333' }}>
                        <input
                            type="checkbox"
                            checked={isDemoMode}
                            onChange={() => setIsDemoMode(!isDemoMode)}
                            style={{ marginRight: '10px' }}
                        />
                        <span style={{ color: isDemoMode ? '#4ade80' : '#3b82f6', fontWeight: 'bold' }}>
                            {isDemoMode ? 'Fallback Data Active' : 'Live Tool Execution Active'}
                        </span>
                    </label>
                </div>

                <div style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
                    <h1 style={{ margin: '0 0 10px 0' }}>Trade Matcher Live Ops</h1>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ background: dark ? '#1a1a1a' : '#eee', padding: '10px 20px', borderRadius: '8px' }}>Breaks on screen: <strong>{totalBreaks}</strong></div>
                        <div style={{ background: '#0d2b14', padding: '10px 20px', borderRadius: '8px', color: '#4ade80' }}>Auto-Resolved: <strong>{resolvedBreaks}</strong></div>
                        <div style={{ background: '#3b1212', padding: '10px 20px', borderRadius: '8px', color: '#f87171' }}>Human Review: <strong>{pendingBreaks}</strong></div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '12px' }}>
                        <div style={{ background: '#111827', padding: '8px 16px', borderRadius: '8px', color: '#93c5fd', fontSize: '13px' }}>
                            Pipeline processed: <strong>{stats.totalProcessed}</strong>
                        </div>
                        <div style={{ background: '#111827', padding: '8px 16px', borderRadius: '8px', color: '#93c5fd', fontSize: '13px' }}>
                            Pipeline resolved: <strong>{stats.resolvedCount}</strong>
                        </div>
                        <div style={{ background: '#111827', padding: '8px 16px', borderRadius: '8px', color: '#93c5fd', fontSize: '13px' }}>
                            Pipeline escalated: <strong>{stats.escalatedCount}</strong>
                        </div>
                    </div>

                    {pipelineError && !isDemoMode && (
                        <div style={{ marginTop: '12px', color: '#f87171', fontSize: '13px' }}>
                            Pipeline error: {pipelineError} -- showing fallback data.
                        </div>
                    )}
                </div>

                <h2>Break Queue</h2>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#a3a3a3', backgroundColor: '#171717', borderRadius: '6px' }}>
                        <p>Running full reconciliation pipeline...</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {breaks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#a3a3a3', backgroundColor: '#171717', borderRadius: '6px' }}>
                                <p>No trade breaks found. System is fully reconciled!</p>
                            </div>
                        ) : (
                            breaks.map((tradeBreak) => (
                                <div key={tradeBreak.breakId} style={{
                                    borderLeft: tradeBreak.status === 'resolved' ? '5px solid #4ade80' : '5px solid #f87171',
                                    backgroundColor: '#171717',
                                    padding: '20px',
                                    borderRadius: '6px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {tradeBreak.breakId}
                                                <span style={{
                                                    fontSize: '12px',
                                                    padding: '3px 8px',
                                                    borderRadius: '12px',
                                                    backgroundColor: tradeBreak.status === 'resolved' ? '#0d2b14' : '#3b1212',
                                                    color: tradeBreak.status === 'resolved' ? '#4ade80' : '#f87171'
                                                }}>
                                                    {tradeBreak.status === 'resolved' ? 'RESOLVED' : 'ACTION REQUIRED'}
                                                </span>
                                            </h3>
                                            <p style={{ margin: 0, color: '#a3a3a3', maxWidth: '500px', lineHeight: '1.5' }}>
                                                {tradeBreak.reason}
                                            </p>
                                        </div>

                                        {tradeBreak.status === 'escalated' && (
                                            <button
                                                onClick={() => handleOverride(tradeBreak.breakId)}
                                                style={{
                                                    backgroundColor: '#dc2626',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '12px 20px',
                                                    borderRadius: '6px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s',
                                                    flexShrink: 0,
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                            >
                                                Override & Force Match
                                            </button>
                                        )}
                                    </div>

                                    {tradeBreak.status === 'escalated' && tradeBreak.correction?.hasProposal && (
                                        <div style={{
                                            marginTop: '14px',
                                            padding: '14px',
                                            backgroundColor: '#1c1500',
                                            border: '1px solid #78350f',
                                            borderRadius: '6px',
                                        }}>
                                            <div style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
                                                PROPOSED CORRECTION (awaiting approval)
                                            </div>
                                            <div style={{ color: '#e5e7eb', fontSize: '13px', lineHeight: '1.5' }}>
                                                System {tradeBreak.correction.proposedSystem}'s <strong>{tradeBreak.correction.proposedField}</strong> should likely be <strong>{tradeBreak.correction.proposedValue}</strong>.
                                            </div>
                                            <div style={{ color: '#a3a3a3', fontSize: '12px', marginTop: '6px' }}>
                                                {tradeBreak.correction.reasoning}
                                            </div>
                                        </div>
                                    )}

                                    {tradeBreak.status === 'escalated' && tradeBreak.correction && !tradeBreak.correction.hasProposal && (
                                        <div style={{ marginTop: '10px', color: '#737373', fontSize: '12px', fontStyle: 'italic' }}>
                                            No confident correction proposed -- needs manual investigation.
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </WidgetLayout>
    );
}