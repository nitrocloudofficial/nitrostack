'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { ExternalLink, CheckCircle, AlertTriangle, ShieldCheck, DollarSign, Briefcase, Zap, Cpu, Award } from 'lucide-react';
import { z } from 'zod';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

const CompetitorProfileSchema = z.object({
    name: z.string().optional().catch('Unknown Competitor'),
    website: z.string().optional().catch('https://example.com'),
    overview: z.string().optional().catch(''),
    problemSolved: z.string().optional().catch(''),
    targetCustomers: z.string().optional().catch(''),
    pricingModel: z.string().optional().catch('Freemium / Paid Tier'),
    keyFeatures: z.array(z.string()).optional().catch([]),
    techStack: z.array(z.string()).optional().catch([]),
    businessModel: z.string().optional().catch('B2B SaaS'),
    funding: z.string().optional().catch('Undisclosed'),
    strengths: z.array(z.string()).optional().catch([]),
    weaknesses: z.array(z.string()).optional().catch([]),
    usp: z.string().optional().catch('')
});

const ExtractCompetitorProfilesOutputSchema = z.object({
    profiles: z.array(CompetitorProfileSchema).optional().catch([]),
    status: z.string().optional(),
    message: z.string().optional()
});

export default function CompetitorProfileWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    const rawData = getToolOutput<any>();

    let parsedPayload: any = null;
    let errorMessage: string | null = null;

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

        const safeResult = ExtractCompetitorProfilesOutputSchema.safeParse(current || {});
        if (safeResult.success) {
            parsedPayload = safeResult.data;
        } else {
            parsedPayload = { profiles: Array.isArray(current?.profiles) ? current.profiles : [] };
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
                <div style={{ fontSize: '15px', fontWeight: 600 }}>Extracting Competitor Profiles...</div>
                <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#6b7280', marginTop: '4px' }}>
                    Gathering pricing, tech stack, strengths & weaknesses
                </div>
            </div>
        );
    }

    const profilesList = parsedPayload?.profiles || [];

    // Empty State
    if (profilesList.length === 0) {
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
                <Briefcase style={{ width: '32px', height: '32px', margin: '0 auto 12px auto', opacity: 0.6 }} />
                <div style={{ fontSize: '15px', fontWeight: 600, color: isDark ? '#f3f4f6' : '#1f2937' }}>
                    No Competitor Profiles Available
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                    Provide a list of discovered competitors to extract detailed profiles.
                </div>
            </div>
        );
    }

    return (
        <div style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            background: isDark ? '#0b0f19' : '#ffffff',
            color: isDark ? '#f3f4f6' : '#1f2937',
            padding: '20px',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#1e293b' : '#e5e7eb'}`
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: `1px solid ${isDark ? '#1e293b' : '#f3f4f6'}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        padding: '8px',
                        borderRadius: '8px',
                        background: isDark ? '#1e293b' : '#eff6ff',
                        color: isDark ? '#60a5fa' : '#2563eb'
                    }}>
                        <Award style={{ width: '20px', height: '20px' }} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Competitor Profiles</h2>
                        <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#6b7280' }}>
                            {profilesList.length} company profiles analyzed
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {profilesList.map((prof: any, idx: number) => {
                    const companyName = prof.name || `Competitor ${idx + 1}`;
                    const isExpanded = expandedCard === companyName || profilesList.length === 1;

                    return (
                        <div key={idx} style={{
                            background: isDark ? '#111827' : '#f9fafb',
                            borderRadius: '10px',
                            border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
                            padding: '16px',
                            transition: 'all 0.2s ease'
                        }}>
                            {/* Card Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '6px',
                                            background: isDark ? '#374151' : '#dbeafe',
                                            color: isDark ? '#9ca3af' : '#1d4ed8',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px'
                                        }}>
                                            {companyName.charAt(0)}
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{companyName}</h3>
                                        {prof.website && (
                                            <a 
                                                href={prof.website} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                style={{ color: isDark ? '#60a5fa' : '#2563eb', display: 'flex', alignItems: 'center' }}
                                            >
                                                <ExternalLink style={{ width: '14px', height: '14px' }} />
                                            </a>
                                        )}
                                    </div>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: isDark ? '#9ca3af' : '#4b5563', lineHeight: 1.4 }}>
                                        {prof.overview || 'Comprehensive competitor in this product segment.'}
                                    </p>
                                </div>

                                <button
                                    onClick={() => setExpandedCard(isExpanded ? null : companyName)}
                                    style={{
                                        background: isDark ? '#1f2937' : '#e5e7eb',
                                        color: isDark ? '#f3f4f6' : '#374151',
                                        border: 'none',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    {isExpanded ? 'Collapse' : 'Details'}
                                </button>
                            </div>

                            {/* Metadata Pills */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    background: isDark ? '#1e293b' : '#e0e7ff',
                                    color: isDark ? '#818cf8' : '#3730a3',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <DollarSign style={{ width: '12px', height: '12px' }} /> {prof.pricingModel || 'Freemium'}
                                </span>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    background: isDark ? '#1e293b' : '#fef3c7',
                                    color: isDark ? '#fbbf24' : '#92400e',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <Briefcase style={{ width: '12px', height: '12px' }} /> {prof.businessModel || 'B2B SaaS'}
                                </span>
                                {prof.funding && (
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        background: isDark ? '#1e293b' : '#dcfce7',
                                        color: isDark ? '#4ade80' : '#166534',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <Zap style={{ width: '12px', height: '12px' }} /> {prof.funding}
                                    </span>
                                )}
                            </div>

                            {/* Expandable Details */}
                            {isExpanded && (
                                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}` }}>
                                    {prof.usp && (
                                        <div style={{ marginBottom: '12px', fontSize: '13px' }}>
                                            <strong style={{ color: isDark ? '#60a5fa' : '#2563eb' }}>Unique Selling Proposition (USP): </strong>
                                            <span>{prof.usp}</span>
                                        </div>
                                    )}

                                    {/* Strengths & Weaknesses */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                        <div style={{ background: isDark ? '#064e3b22' : '#f0fdf4', padding: '10px', borderRadius: '8px', border: `1px solid ${isDark ? '#064e3b' : '#bbf7d0'}` }}>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <ShieldCheck style={{ width: '14px', height: '14px' }} /> Key Strengths
                                            </div>
                                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: isDark ? '#d1d5db' : '#374151' }}>
                                                {(prof.strengths || ['Established platform', 'Good market presence']).map((st: string, sIdx: number) => (
                                                    <li key={sIdx} style={{ marginBottom: '2px' }}>{st}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div style={{ background: isDark ? '#7f1d1d22' : '#fef2f2', padding: '10px', borderRadius: '8px', border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}` }}>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <AlertTriangle style={{ width: '14px', height: '14px' }} /> Key Weaknesses
                                            </div>
                                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: isDark ? '#d1d5db' : '#374151' }}>
                                                {(prof.weaknesses || ['Higher pricing tier', 'Complex setup']).map((wk: string, wIdx: number) => (
                                                    <li key={wIdx} style={{ marginBottom: '2px' }}>{wk}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Key Features */}
                                    {Array.isArray(prof.keyFeatures) && prof.keyFeatures.length > 0 && (
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#9ca3af' : '#4b5563' }}>
                                                Key Features:
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {prof.keyFeatures.map((ft: string, fIdx: number) => (
                                                    <span key={fIdx} style={{
                                                        fontSize: '11px',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        background: isDark ? '#1f2937' : '#f3f4f6',
                                                        border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        <CheckCircle style={{ width: '10px', height: '10px', color: '#16a34a' }} /> {ft}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tech Stack */}
                                    {Array.isArray(prof.techStack) && prof.techStack.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#9ca3af' : '#4b5563', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Cpu style={{ width: '12px', height: '12px' }} /> Tech Stack:
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {prof.techStack.map((tech: string, tIdx: number) => (
                                                    <span key={tIdx} style={{
                                                        fontSize: '11px',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        background: isDark ? '#111827' : '#e0f2fe',
                                                        color: isDark ? '#93c5fd' : '#0369a1',
                                                        fontFamily: 'monospace'
                                                    }}>
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
