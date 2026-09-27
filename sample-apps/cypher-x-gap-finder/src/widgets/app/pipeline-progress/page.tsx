'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { CheckCircle2, Circle, AlertCircle, Loader2, Sparkles, FileText, Trophy, Target, Shield, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

const PIPELINE_STEPS = [
    { id: 1, name: 'Understanding Idea' },
    { id: 2, name: 'Discovering Competitors' },
    { id: 3, name: 'Extracting Competitor Profiles' },
    { id: 4, name: 'Comparing Competitors' },
    { id: 5, name: 'Market Gap Analysis' },
    { id: 6, name: 'Innovation Scoring' },
    { id: 7, name: 'Generating Report' }
];

export default function PipelineProgressWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();
    const [activeTab, setActiveTab] = useState<'report' | 'competitors' | 'gaps' | 'scores'>('report');

    const rawData = getToolOutput<any>();

    let parsedPayload: any = null;

    if (rawData) {
        let current = rawData;
        for (let i = 0; i < 5; i++) {
            if (typeof current === 'string') {
                try { current = JSON.parse(current); continue; } catch (e) { break; }
            }
            if (current && typeof current === 'object') {
                if ('result' in current && current.result) { current = current.result; continue; }
                if ('structuredContent' in current && current.structuredContent) { current = current.structuredContent; continue; }
                if ('content' in current && Array.isArray(current.content)) {
                    const textItem = current.content.find((c: any) => c && c.type === 'text')?.text;
                    if (textItem) {
                        try { current = JSON.parse(textItem); continue; } catch (e) { break; }
                    }
                }
            }
            break;
        }
        parsedPayload = current || {};
    }

    // Loading State
    if (!rawData) {
        return (
            <div style={{
                padding: '48px 24px',
                textAlign: 'center',
                color: isDark ? '#f3f4f6' : '#1f2937',
                background: isDark ? '#0b0f19' : '#f9fafb',
                fontFamily: 'Inter, system-ui, sans-serif',
                minHeight: '300px',
                borderRadius: '12px',
                border: `1px solid ${isDark ? '#1e293b' : '#e5e7eb'}`
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: `3px solid ${isDark ? '#6366f1' : '#4f46e5'}`,
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px auto'
                }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Orchestrating Competitive Pipeline...</h3>
                <p style={{ fontSize: '13px', color: isDark ? '#94a3b8' : '#6b7280', marginTop: '6px' }}>
                    Executing 7-step market research pipeline automatically
                </p>
            </div>
        );
    }

    const currentStepNum = parsedPayload?.currentStep || (parsedPayload?.report ? 7 : 1);
    const pipelineStatus = parsedPayload?.status || 'success';
    const failedStepName = parsedPayload?.failedStep || null;
    const errorMessage = parsedPayload?.error || null;

    const ideaAnalysis = parsedPayload?.ideaAnalysis || {};
    const competitors = parsedPayload?.competitors || [];
    const profiles = parsedPayload?.profiles || [];
    const comparison = parsedPayload?.comparison || {};
    const marketGaps = parsedPayload?.marketGaps || {};
    const innovationScores = parsedPayload?.innovationScores || {};
    const report = parsedPayload?.report || {};

    return (
        <div style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            background: isDark ? '#0b0f19' : '#ffffff',
            color: isDark ? '#f3f4f6' : '#1f2937',
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#1e293b' : '#e5e7eb'}`
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: `1px solid ${isDark ? '#1e293b' : '#f3f4f6'}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: isDark ? '#312e81' : '#e0e7ff',
                        color: isDark ? '#a5b4fc' : '#4338ca'
                    }}>
                        <Sparkles style={{ width: '22px', height: '22px' }} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                            {ideaAnalysis.category ? `${ideaAnalysis.category} Competitive Intelligence` : 'Competitive Research Pipeline'}
                        </h2>
                        <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#6b7280' }}>
                            {pipelineStatus === 'failed' ? 'Pipeline Halts on Error' : '7-Step Automated Pipeline Executed'}
                        </span>
                    </div>
                </div>

                {innovationScores?.overallScore && (
                    <div style={{
                        textAlign: 'right',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: isDark ? '#1e1b4b' : '#eef2ff',
                        border: `1px solid ${isDark ? '#4338ca' : '#c7d2fe'}`
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#a5b4fc' : '#4338ca' }}>Innovation Score</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: isDark ? '#818cf8' : '#3730a3' }}>
                            {innovationScores.overallScore}/100
                        </div>
                    </div>
                )}
            </div>

            {/* PIPELINE PROGRESS STEP TRACKER */}
            <div style={{
                background: isDark ? '#111827' : '#f9fafb',
                padding: '16px',
                borderRadius: '10px',
                border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
                marginBottom: '24px'
            }}>
                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', color: isDark ? '#9ca3af' : '#4b5563' }}>
                    Pipeline Progress (7 Steps):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {PIPELINE_STEPS.map((step) => {
                        const isDone = pipelineStatus === 'success' || currentStepNum > step.id;
                        const isCurrent = currentStepNum === step.id && pipelineStatus !== 'failed';
                        const isFailed = pipelineStatus === 'failed' && (failedStepName === step.name || currentStepNum === step.id);

                        return (
                            <div key={step.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '13px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                background: isFailed ? (isDark ? '#7f1d1d33' : '#fef2f2') : (isCurrent ? (isDark ? '#1e293b' : '#eff6ff') : 'transparent'),
                                border: isFailed ? `1px solid ${isDark ? '#991b1b' : '#fecaca'}` : '1px solid transparent'
                            }}>
                                {isDone && <CheckCircle2 style={{ width: '16px', height: '16px', color: '#16a34a', flexShrink: 0 }} />}
                                {isCurrent && <Loader2 style={{ width: '16px', height: '16px', color: '#2563eb', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                                {isFailed && <AlertCircle style={{ width: '16px', height: '16px', color: '#dc2626', flexShrink: 0 }} />}
                                {!isDone && !isCurrent && !isFailed && <Circle style={{ width: '16px', height: '16px', color: isDark ? '#4b5563' : '#d1d5db', flexShrink: 0 }} />}

                                <span style={{
                                    fontWeight: isCurrent || isFailed || isDone ? 600 : 400,
                                    color: isFailed ? '#dc2626' : (isDone ? (isDark ? '#f3f4f6' : '#111827') : (isDark ? '#9ca3af' : '#6b7280'))
                                }}>
                                    Step {step.id}: {step.name}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* ERROR BANNER IF PIPELINE FAILS */}
                {pipelineStatus === 'failed' && errorMessage && (
                    <div style={{
                        marginTop: '14px',
                        padding: '12px',
                        borderRadius: '8px',
                        background: isDark ? '#7f1d1d' : '#fee2e2',
                        color: isDark ? '#fecaca' : '#991b1b',
                        fontSize: '13px'
                    }}>
                        <strong>Pipeline Error at {failedStepName || 'Execution'}: </strong>
                        <span>{errorMessage}</span>
                    </div>
                )}
            </div>

            {/* IF PIPELINE COMPLETED: SHOW TABBED REPORT BREAKDOWN */}
            {pipelineStatus === 'success' && report?.title && (
                <div>
                    {/* Navigation Tabs */}
                    <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${isDark ? '#1e293b' : '#e5e7eb'}`, paddingBottom: '8px', marginBottom: '20px' }}>
                        <button
                            onClick={() => setActiveTab('report')}
                            style={{
                                padding: '8px 14px',
                                fontSize: '13px',
                                fontWeight: 600,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: activeTab === 'report' ? (isDark ? '#312e81' : '#e0e7ff') : 'transparent',
                                color: activeTab === 'report' ? (isDark ? '#a5b4fc' : '#4338ca') : (isDark ? '#9ca3af' : '#6b7280')
                            }}
                        >
                            📄 Executive Report
                        </button>
                        <button
                            onClick={() => setActiveTab('competitors')}
                            style={{
                                padding: '8px 14px',
                                fontSize: '13px',
                                fontWeight: 600,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: activeTab === 'competitors' ? (isDark ? '#312e81' : '#e0e7ff') : 'transparent',
                                color: activeTab === 'competitors' ? (isDark ? '#a5b4fc' : '#4338ca') : (isDark ? '#9ca3af' : '#6b7280')
                            }}
                        >
                            🏢 Competitors ({competitors.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('gaps')}
                            style={{
                                padding: '8px 14px',
                                fontSize: '13px',
                                fontWeight: 600,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: activeTab === 'gaps' ? (isDark ? '#312e81' : '#e0e7ff') : 'transparent',
                                color: activeTab === 'gaps' ? (isDark ? '#a5b4fc' : '#4338ca') : (isDark ? '#9ca3af' : '#6b7280')
                            }}
                        >
                            🎯 Market Gaps ({marketGaps.gaps?.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab('scores')}
                            style={{
                                padding: '8px 14px',
                                fontSize: '13px',
                                fontWeight: 600,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: activeTab === 'scores' ? (isDark ? '#312e81' : '#e0e7ff') : 'transparent',
                                color: activeTab === 'scores' ? (isDark ? '#a5b4fc' : '#4338ca') : (isDark ? '#9ca3af' : '#6b7280')
                            }}
                        >
                            ⚡ Innovation Radar
                        </button>
                    </div>

                    {/* TAB 1: EXECUTIVE REPORT */}
                    {activeTab === 'report' && (
                        <div>
                            <div style={{
                                background: isDark ? '#111827' : '#f9fafb',
                                padding: '16px',
                                borderRadius: '10px',
                                marginBottom: '16px',
                                borderLeft: `4px solid ${isDark ? '#6366f1' : '#4f46e5'}`
                            }}>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 700 }}>Executive Summary</h3>
                                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: isDark ? '#d1d5db' : '#374151' }}>
                                    {report.executiveSummary}
                                </p>
                            </div>

                            {/* Key Takeaways */}
                            {Array.isArray(report.keyTakeaways) && (
                                <div style={{ marginBottom: '20px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700 }}>Key Strategic Takeaways</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                                        {report.keyTakeaways.map((tk: string, idx: number) => (
                                            <div key={idx} style={{
                                                background: isDark ? '#1e293b' : '#eff6ff',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                color: isDark ? '#93c5fd' : '#1d4ed8'
                                            }}>
                                                • {tk}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Report Sections */}
                            {Array.isArray(report.sections) && report.sections.map((sec: any, idx: number) => (
                                <div key={idx} style={{
                                    background: isDark ? '#111827' : '#ffffff',
                                    border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
                                    borderRadius: '10px',
                                    padding: '16px',
                                    marginBottom: '12px'
                                }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700, color: isDark ? '#f3f4f6' : '#111827' }}>
                                        {sec.heading}
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: isDark ? '#9ca3af' : '#4b5563', whiteSpace: 'pre-line' }}>
                                        {sec.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TAB 2: COMPETITORS */}
                    {activeTab === 'competitors' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {competitors.map((comp: any, idx: number) => (
                                <div key={idx} style={{
                                    background: isDark ? '#111827' : '#f9fafb',
                                    border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
                                    borderRadius: '8px',
                                    padding: '12px 16px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong style={{ fontSize: '14px', fontWeight: 700 }}>{comp.name}</strong>
                                        <a href={comp.website} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#2563eb' }}>
                                            {comp.website}
                                        </a>
                                    </div>
                                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: isDark ? '#9ca3af' : '#4b5563' }}>
                                        {comp.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TAB 3: MARKET GAPS */}
                    {activeTab === 'gaps' && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                                {(marketGaps.gaps || []).map((gap: any, idx: number) => (
                                    <div key={idx} style={{
                                        background: isDark ? '#111827' : '#ffffff',
                                        border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
                                        borderRadius: '10px',
                                        padding: '14px'
                                    }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#166534' }}>
                                            Opportunity: {gap.opportunitySize || 'High'}
                                        </span>
                                        <h4 style={{ margin: '8px 0 6px 0', fontSize: '14px', fontWeight: 700 }}>{gap.title}</h4>
                                        <p style={{ margin: 0, fontSize: '12px', color: isDark ? '#9ca3af' : '#4b5563', lineHeight: 1.4 }}>
                                            {gap.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: INNOVATION SCORES */}
                    {activeTab === 'scores' && (
                        <div>
                            {innovationScores.explanation && (
                                <div style={{ background: isDark ? '#1e1b4b' : '#eef2ff', padding: '14px', borderRadius: '8px', border: `1px solid ${isDark ? '#4338ca' : '#c7d2fe'}`, marginBottom: '16px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: isDark ? '#a5b4fc' : '#4338ca', marginBottom: '4px' }}>AI Assessment</div>
                                    <div style={{ fontSize: '13px', color: isDark ? '#c7d2fe' : '#3730a3' }}>
                                        {innovationScores.explanation}
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ background: isDark ? '#111827' : '#f9fafb', padding: '14px', borderRadius: '8px', border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}` }}>
                                    <div style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>Problem Uniqueness</div>
                                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb' }}>
                                        {innovationScores.dimensionScores?.problemUniqueness || 80}/100
                                    </div>
                                </div>
                                <div style={{ background: isDark ? '#111827' : '#f9fafb', padding: '14px', borderRadius: '8px', border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}` }}>
                                    <div style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>Market Timing</div>
                                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a' }}>
                                        {innovationScores.dimensionScores?.marketTiming || 90}/100
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
