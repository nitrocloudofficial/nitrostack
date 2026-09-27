'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { Globe, ExternalLink, Trophy, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

interface Competitor {
    name: string;
    website: string;
    description: string;
    reason: string;
}

interface DiscoverCompetitorsOutput {
    competitors: Competitor[];
}

const CompetitorSchema = z.object({
    name: z.string(),
    website: z.string(),
    description: z.string(),
    reason: z.string()
});

const DiscoverCompetitorsOutputSchema = z.object({
    competitors: z.array(CompetitorSchema)
});

export default function CompetitorListWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput, openExternal } = useWidgetSDK();

    // Access tool output
    const data = getToolOutput<any>();

    // Log the complete tool response before rendering
    if (data) {
        console.log('Complete tool response received in competitor-list widget:', JSON.stringify(data, null, 2));
    }

    // Normalize and unwrap tool output data
    let status: string | undefined = undefined;
    let message: string | undefined = undefined;
    let errorMsg: string | undefined = undefined;
    let competitors: Competitor[] = [];

    if (data) {
        let parsedData = data;

        if (typeof data === 'string') {
            try {
                parsedData = JSON.parse(data);
            } catch (e) {
                console.error('Widget: Failed to parse tool output string as JSON:', e);
            }
        }

        if (parsedData && typeof parsedData === 'object') {
            if ('structuredContent' in parsedData && parsedData.structuredContent) {
                parsedData = parsedData.structuredContent;
            } else if ('content' in parsedData && Array.isArray(parsedData.content)) {
                const textContent = parsedData.content.find((c: any) => c.type === 'text')?.text;
                if (textContent) {
                    try {
                        const inner = JSON.parse(textContent);
                        if (inner && typeof inner === 'object') {
                            parsedData = inner;
                        }
                    } catch (e) {}
                }
            }
        }

        if (parsedData && typeof parsedData === 'object') {
            status = parsedData.status;
            message = parsedData.message;
            errorMsg = parsedData.error;
            if (Array.isArray(parsedData.competitors)) {
                competitors = parsedData.competitors;
            }
        } else if (Array.isArray(parsedData)) {
            competitors = parsedData;
        }
    }

    // Loading State
    if (!data) {
        return (
            <div style={{
                padding: '48px 24px',
                textAlign: 'center',
                color: isDark ? '#f3f4f6' : '#1f2937',
                background: isDark ? '#0b0f19' : '#f9fafb',
                fontFamily: 'Inter, system-ui, sans-serif',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                border: `1px solid ${isDark ? '#1e293b' : '#e5e7eb'}`
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: `3px solid ${isDark ? '#3b82f6' : '#2563eb'}`,
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '16px'
                }} />
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
                <div style={{ fontSize: '15px', fontWeight: 500 }}>
                    Searching competitive landscape...
                </div>
                <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#6b7280', marginTop: '4px' }}>
                    {isReady ? 'Discovering competitors via Tavily' : 'Connecting widget SDK...'}
                </div>
            </div>
        );
    }

    // Empty State / Non-Success Handling
    if (competitors.length === 0) {
        // 1. No competitors found
        if (status === 'no_results' || message === 'No competitors were found for this startup idea.') {
            return (
                <div style={{
                    padding: '36px 24px',
                    textAlign: 'center',
                    color: isDark ? '#94a3b8' : '#4b5563',
                    background: isDark ? '#0b0f19' : '#f9fafb',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    borderRadius: '12px',
                    border: `1px solid ${isDark ? '#1e293b' : '#e5e7eb'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '200px'
                }}>
                    <Globe size={32} style={{ marginBottom: '12px', opacity: 0.7 }} />
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>No competitors were found for this startup idea.</div>
                </div>
            );
        }

        // 2. Descriptive API Error / Failure State
        if (status === 'error' || status === 'rate_limit' || status === 'api_error' || errorMsg) {
            const displayError = errorMsg || message || 'An error occurred during competitive research.';
            return (
                <div style={{
                    padding: '24px',
                    color: isDark ? '#f87171' : '#dc2626',
                    background: isDark ? '#181013' : '#fef2f2',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    borderRadius: '12px',
                    border: `1px solid ${isDark ? '#7f1d1d' : '#fca5a5'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600 }}>
                        <AlertCircle size={18} />
                        <span>Search Error</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word', color: isDark ? '#fca5a5' : '#b91c1c' }}>
                        {displayError}
                    </p>
                </div>
            );
        }

        // 4. Default Empty Input State
        return (
            <div style={{
                padding: '36px 24px',
                textAlign: 'center',
                color: isDark ? '#e2e8f0' : '#1f2937',
                background: isDark ? 'linear-gradient(135deg, #0b0f19 0%, #111827 100%)' : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                fontFamily: 'Inter, system-ui, sans-serif',
                borderRadius: '16px',
                border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '240px'
            }}>
                <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🔍</span> No Competitors Yet
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: isDark ? '#94a3b8' : '#4b5563' }}>
                    Please enter:
                </p>
                <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 16px 0',
                    textAlign: 'left',
                    display: 'inline-block',
                    fontSize: '14px',
                    lineHeight: 1.8,
                    color: isDark ? '#cbd5e1' : '#374151'
                }}>
                    <li>• Category</li>
                    <li>• Core Problem</li>
                    <li>• Target Audience</li>
                    <li>• Keywords</li>
                </ul>
                <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#94a3b8' : '#4b5563' }}>
                    Then click <span style={{ fontWeight: 700, color: isDark ? '#38bdf8' : '#0284c7' }}>Discover Competitors</span>
                </div>
            </div>
        );
    }

    // Premium Styling
    const styles = {
        container: {
            background: isDark ? 'linear-gradient(135deg, #0b0f19 0%, #111827 100%)' : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
            color: isDark ? '#f3f4f6' : '#1f2937',
            padding: '24px',
            fontFamily: 'Inter, system-ui, sans-serif',
            maxHeight: maxHeight || '800px',
            overflowY: 'auto' as const,
            borderRadius: '16px',
            border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
            boxShadow: isDark ? '0 10px 30px -10px rgba(0,0,0,0.7)' : '0 10px 30px -10px rgba(0,0,0,0.05)',
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
            borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
            paddingBottom: '16px',
        },
        title: {
            margin: 0,
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            background: isDark ? 'linear-gradient(to right, #38bdf8, #818cf8)' : 'linear-gradient(to right, #0284c7, #4f46e5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        subtitle: {
            margin: '4px 0 0 0',
            fontSize: '13px',
            color: isDark ? '#94a3b8' : '#6b7280',
        },
        badge: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            background: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.1)',
            color: isDark ? '#818cf8' : '#4f46e5',
            border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(79, 70, 229, 0.2)'}`,
        },
        list: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '16px',
        },
        card: {
            background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
            boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '12px',
            transition: 'transform 0.2s ease, border-color 0.2s ease',
        },
        cardHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        companyName: {
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: isDark ? '#f3f4f6' : '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        visitButton: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            color: isDark ? '#38bdf8' : '#0284c7',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
            transition: 'background-color 0.2s',
        },
        description: {
            margin: 0,
            fontSize: '14px',
            lineHeight: 1.5,
            color: isDark ? '#cbd5e1' : '#4b5563',
        },
        reasonSection: {
            background: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.05)',
            border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)'}`,
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
        },
        reasonText: {
            margin: 0,
            fontSize: '13px',
            lineHeight: 1.4,
            fontWeight: 500,
            color: isDark ? '#93c5fd' : '#0369a1',
        }
    };

    const handleVisitWebsite = (url: string) => {
        if (openExternal) {
            openExternal(url);
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={{ flexGrow: 1 }}>
                    <h1 style={styles.title}>Competitor Discovery</h1>
                    <p style={styles.subtitle}>AI-Powered Competitive Research Assistant</p>
                </div>
                <div style={styles.badge}>
                    <Trophy size={14} />
                    <span>{competitors.length} Found</span>
                </div>
            </div>

            {/* List */}
            <div style={styles.list}>
                {competitors.map((company, index) => (
                    <div key={index} style={styles.card} className="competitor-card">
                        <div style={styles.cardHeader}>
                            <h3 style={styles.companyName}>
                                <Globe size={16} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
                                {company.name}
                            </h3>
                            <button 
                                onClick={() => handleVisitWebsite(company.website)}
                                style={styles.visitButton}
                                title={`Visit ${company.name}`}
                            >
                                <span>Visit</span>
                                <ExternalLink size={12} />
                            </button>
                        </div>

                        <p style={styles.description}>{company.description}</p>

                        <div style={styles.reasonSection}>
                            <Sparkles size={14} style={{ color: isDark ? '#38bdf8' : '#0284c7', flexShrink: 0, marginTop: '2px' }} />
                            <p style={styles.reasonText}>
                                <strong>Rationale:</strong> {company.reason}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
