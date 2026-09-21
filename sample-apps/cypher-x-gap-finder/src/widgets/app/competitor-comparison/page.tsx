'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { Trophy, CheckCircle, XCircle, Star, Layers, BarChart3, Users, Zap } from 'lucide-react';
import { z } from 'zod';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

const TopCompetitorBadgeSchema = z.object({
    name: z.string().optional().catch('Competitor'),
    badge: z.string().optional().catch('Top Competitor'),
    keyDifferentiator: z.string().optional().catch('')
});

const ComparisonTableRowSchema = z.object({
    feature: z.string().optional().catch('Feature'),
    category: z.string().optional().catch('General'),
    scores: z.record(z.string(), z.string()).optional().catch({})
});

const FeatureMatrixItemSchema = z.object({
    name: z.string().optional().catch('Company'),
    pricing: z.string().optional().catch('Freemium'),
    targetAudience: z.string().optional().catch('General'),
    strengthsCount: z.number().optional().catch(0),
    weaknessesCount: z.number().optional().catch(0)
});

const CompareCompetitorsOutputSchema = z.object({
    marketLeader: z.string().optional().catch('Market Leader'),
    summary: z.string().optional().catch(''),
    topCompetitors: z.array(TopCompetitorBadgeSchema).optional().catch([]),
    comparisonTable: z.array(ComparisonTableRowSchema).optional().catch([]),
    featureMatrix: z.array(FeatureMatrixItemSchema).optional().catch([]),
    status: z.string().optional(),
    message: z.string().optional()
});

export default function CompetitorComparisonWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();
    const [activeTab, setActiveTab] = useState<'matrix' | 'features'>('matrix');

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

        const safeResult = CompareCompetitorsOutputSchema.safeParse(current || {});
        if (safeResult.success) {
            parsedPayload = safeResult.data;
        } else {
            parsedPayload = current || {};
        }
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
                minHeight: '220px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                border: `1px solid ${isDark ? '#1e293b' : '#e5e7eb'}`
            }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: `3px solid ${isDark ? '#3b82f6' : '#2563eb'}`,
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '14px'
                }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>Comparing Competitors...</div>
                <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#6b7280', marginTop: '4px' }}>
                    Building feature comparison matrix and winner rankings
                </div>
            </div>
        );
    }

    const topCompetitors = parsedPayload?.topCompetitors || [];
    const comparisonTable = parsedPayload?.comparisonTable || [];
    const featureMatrix = parsedPayload?.featureMatrix || [];

    // Empty State
    if (topCompetitors.length === 0 && comparisonTable.length === 0) {
        return (
            <div style={{
                padding: '36px 20px',
                textAlign: 'center',
                color: isDark ? '#94a3b8' : '#6b7280',
                background: isDark ? '#0b0f19' : '#f9fafb',
                fontFamily: 'Inter, system-ui, sans-serif',
                borderRadius: '12px',
                border: `1px solid ${isDark ? '#1e293b' : '#e5e7eb'}`
            }}>
                <BarChart3 style={{ width: '32px', height: '32px', margin: '0 auto 12px auto', opacity: 0.6 }} />
                <div style={{ fontSize: '15px', fontWeight: 600, color: isDark ? '#f3f4f6' : '#1f2937' }}>
                    No Comparison Data Available
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                    Extract competitor profiles first before generating a matrix comparison.
                </div>
            </div>
        );
    }

    // Extract all unique company names across comparison table
    const companyNames: string[] = Array.from(new Set([
        ...topCompetitors.map((t: any) => t.name),
        ...featureMatrix.map((f: any) => f.name),
        ...comparisonTable.flatMap((row: any) => Object.keys(row.scores || {}))
    ])).filter(Boolean);

    return (
        <div style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            background: isDark ? '#0b0f19' : '#ffffff',
            color: isDark ? '#f3f4f6' : '#1f2937',
            padding: '20px',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#1e293b' : '#e5e7eb'}`
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: `1px solid ${isDark ? '#1e293b' : '#f3f4f6'}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        padding: '8px',
                        borderRadius: '8px',
                        background: isDark ? '#312e81' : '#e0e7ff',
                        color: isDark ? '#a5b4fc' : '#4338ca'
                    }}>
                        <Trophy style={{ width: '20px', height: '20px' }} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Competitor Comparison</h2>
                        <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#6b7280' }}>
                            Market Leader: <strong style={{ color: '#eab308' }}>{parsedPayload?.marketLeader || 'Leading Platform'}</strong>
                        </span>
                    </div>
                </div>

                {/* Tab Controls */}
                <div style={{ display: 'flex', gap: '6px', background: isDark ? '#111827' : '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
                    <button
                        onClick={() => setActiveTab('matrix')}
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: activeTab === 'matrix' ? (isDark ? '#374151' : '#ffffff') : 'transparent',
                            color: activeTab === 'matrix' ? (isDark ? '#ffffff' : '#1f2937') : (isDark ? '#9ca3af' : '#6b7280'),
                            boxShadow: activeTab === 'matrix' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        Overview Matrix
                    </button>
                    <button
                        onClick={() => setActiveTab('features')}
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: activeTab === 'features' ? (isDark ? '#374151' : '#ffffff') : 'transparent',
                            color: activeTab === 'features' ? (isDark ? '#ffffff' : '#1f2937') : (isDark ? '#9ca3af' : '#6b7280'),
                            boxShadow: activeTab === 'features' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        Feature Comparison
                    </button>
                </div>
            </div>

            {/* Narrative Summary */}
            {parsedPayload?.summary && (
                <div style={{
                    background: isDark ? '#111827' : '#f9fafb',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    marginBottom: '20px',
                    borderLeft: `4px solid ${isDark ? '#6366f1' : '#4f46e5'}`
                }}>
                    <strong style={{ color: isDark ? '#818cf8' : '#4f46e5' }}>Executive Analysis: </strong>
                    <span>{parsedPayload.summary}</span>
                </div>
            )}

            {/* Top Competitor Winner Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {topCompetitors.map((comp: any, idx: number) => (
                    <div key={idx} style={{
                        background: isDark ? '#111827' : '#ffffff',
                        border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    background: idx === 0 ? '#fef3c7' : '#e0e7ff',
                                    color: idx === 0 ? '#b45309' : '#3730a3'
                                }}>
                                    🏆 {comp.badge || 'Competitor'}
                                </span>
                            </div>
                            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700 }}>{comp.name}</h3>
                            <p style={{ margin: 0, fontSize: '12px', color: isDark ? '#9ca3af' : '#4b5563', lineHeight: 1.4 }}>
                                {comp.keyDifferentiator}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* TAB 1: OVERVIEW MATRIX */}
            {activeTab === 'matrix' && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '13px',
                        textAlign: 'left'
                    }}>
                        <thead>
                            <tr style={{ background: isDark ? '#111827' : '#f9fafb', borderBottom: `2px solid ${isDark ? '#1f2937' : '#e5e7eb'}` }}>
                                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Competitor</th>
                                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Pricing Tier</th>
                                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Target Audience</th>
                                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Strengths</th>
                                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Weaknesses</th>
                            </tr>
                        </thead>
                        <tbody>
                            {featureMatrix.map((item: any, idx: number) => (
                                <tr key={idx} style={{ borderBottom: `1px solid ${isDark ? '#1f2937' : '#f3f4f6'}` }}>
                                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.name}</td>
                                    <td style={{ padding: '10px 12px', color: isDark ? '#9ca3af' : '#4b5563' }}>{item.pricing}</td>
                                    <td style={{ padding: '10px 12px', color: isDark ? '#9ca3af' : '#4b5563' }}>{item.targetAudience}</td>
                                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                        <span style={{ color: '#16a34a', fontWeight: 700 }}>+{item.strengthsCount || 3}</span>
                                    </td>
                                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                        <span style={{ color: '#dc2626', fontWeight: 700 }}>-{item.weaknessesCount || 2}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB 2: DETAILED FEATURE COMPARISON TABLE */}
            {activeTab === 'features' && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        textAlign: 'left'
                    }}>
                        <thead>
                            <tr style={{ background: isDark ? '#111827' : '#f9fafb', borderBottom: `2px solid ${isDark ? '#1f2937' : '#e5e7eb'}` }}>
                                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Feature</th>
                                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Category</th>
                                {companyNames.map((cName, cIdx) => (
                                    <th key={cIdx} style={{ padding: '10px 12px', fontWeight: 700 }}>{cName}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {comparisonTable.map((row: any, rIdx: number) => (
                                <tr key={rIdx} style={{ borderBottom: `1px solid ${isDark ? '#1f2937' : '#f3f4f6'}` }}>
                                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.feature}</td>
                                    <td style={{ padding: '10px 12px', color: isDark ? '#9ca3af' : '#6b7280' }}>
                                        <span style={{
                                            fontSize: '11px',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: isDark ? '#1f2937' : '#f3f4f6'
                                        }}>
                                            {row.category || 'General'}
                                        </span>
                                    </td>
                                    {companyNames.map((cName, cIdx) => {
                                        const score = row.scores?.[cName] || 'Standard';
                                        return (
                                            <td key={cIdx} style={{ padding: '10px 12px', color: isDark ? '#d1d5db' : '#374151' }}>
                                                {score}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
