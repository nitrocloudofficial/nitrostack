'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { Lightbulb, Users, Target, HelpCircle, Tag, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

interface UnderstandIdeaOutput {
    category: string;
    coreProblem: string;
    targetAudience: string;
    valueProposition: string;
    keywords?: string[];
    competitorSearchPhrases?: string[];
}

const UnderstandIdeaOutputSchema = z.object({
    category: z.string().optional().catch(''),
    coreProblem: z.string().optional().catch(''),
    problem: z.string().optional().catch(''),
    targetAudience: z.string().optional().catch(''),
    targetUser: z.string().optional().catch(''),
    valueProposition: z.string().optional().catch(''),
    valueProp: z.string().optional().catch(''),
    keywords: z.array(z.string()).optional().catch([]),
    competitorSearchPhrases: z.array(z.string()).optional().catch([])
});

export default function IdeaSummaryWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();

    // Access tool output
    const data = getToolOutput<any>();

    // Validate and extract response defensively
    let validatedData: any = null;
    let validationError: string | null = null;

    if (data) {
        console.log('[STAGE 6: Widget input received (getToolOutput)]:\n', JSON.stringify(data, null, 2));

        let parsedData = data;

        for (let i = 0; i < 5; i++) {
            if (typeof parsedData === 'string') {
                try {
                    parsedData = JSON.parse(parsedData);
                    continue;
                } catch (e) {
                    break;
                }
            }

            if (parsedData && typeof parsedData === 'object') {
                if ('result' in parsedData && parsedData.result) {
                    parsedData = parsedData.result;
                    continue;
                }
                if ('structuredContent' in parsedData && parsedData.structuredContent) {
                    parsedData = parsedData.structuredContent;
                    continue;
                }
                if ('content' in parsedData && Array.isArray(parsedData.content)) {
                    const textItem = parsedData.content.find((c: any) => c && c.type === 'text')?.text;
                    if (textItem) {
                        try {
                            parsedData = JSON.parse(textItem);
                            continue;
                        } catch (e) {
                            break;
                        }
                    }
                }
            }
            break;
        }

        console.log('[STAGE 7: Widget Zod validation input]:\n', JSON.stringify(parsedData, null, 2));

        const parseResult = UnderstandIdeaOutputSchema.safeParse(parsedData || {});
        if (parseResult.success) {
            validatedData = parseResult.data;
        } else {
            console.error('Zod validation failed for understand_idea output:', parseResult.error);
            validationError = parseResult.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        }
    }

    if (!data) {
        return (
            <div style={{
                padding: '48px 24px',
                textAlign: 'center',
                color: isDark ? '#f3f4f6' : '#1f2937',
                background: isDark ? '#0b0f19' : '#f9fafb',
                fontFamily: 'system-ui, sans-serif',
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
                    Analyzing product idea...
                </div>
                <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#6b7280', marginTop: '4px' }}>
                    {isReady ? 'Consulting Gemini intelligence' : 'Connecting widget SDK...'}
                </div>
            </div>
        );
    }

    if (validationError && !validatedData) {
        return (
            <div style={{
                padding: '24px',
                color: isDark ? '#ef4444' : '#b91c1c',
                background: isDark ? '#1e1b4b' : '#fee2e2',
                borderRadius: '12px',
                border: `1px solid ${isDark ? '#ef4444' : '#f87171'}`,
                fontFamily: 'Inter, system-ui, sans-serif'
            }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>
                    Analysis Validation Error
                </h3>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                    The data received from the AI model did not match the expected format:
                </p>
                <code style={{
                    display: 'block',
                    marginTop: '12px',
                    padding: '8px',
                    background: isDark ? '#0f172a' : '#f1f5f9',
                    borderRadius: '6px',
                    fontSize: '12px',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap'
                }}>
                    {validationError}
                </code>
            </div>
        );
    }

    // Coalesce property names defensively
    const category = validatedData?.category || 'Startup';
    const coreProblem = validatedData?.coreProblem || validatedData?.problem || 'Problem Analysis';
    const targetAudience = validatedData?.targetAudience || validatedData?.targetUser || 'Target Customer Base';
    const valueProposition = validatedData?.valueProposition || validatedData?.valueProp || 'Value Proposition';
    
    const competitorSearchPhrases = validatedData?.competitorSearchPhrases ?? [];
    const keywordsArray = validatedData?.keywords ?? [];
    const phrasesToRender = competitorSearchPhrases.length > 0 ? competitorSearchPhrases : (keywordsArray.length > 0 ? keywordsArray : ['AI Platform', 'SaaS Solution']);

    // Premium styling details
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
            background: isDark ? 'linear-gradient(to right, #60a5fa, #a78bfa)' : 'linear-gradient(to right, #2563eb, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        subtitle: {
            margin: '4px 0 0 0',
            fontSize: '13px',
            color: isDark ? '#94a3b8' : '#6b7280',
        },
        categoryBadge: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.1)',
            color: isDark ? '#60a5fa' : '#2563eb',
            border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(37, 99, 235, 0.2)'}`,
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '16px',
            marginBottom: '24px',
        },
        card: {
            background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
            boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.02)',
            display: 'flex',
            gap: '14px',
            transition: 'transform 0.2s, border-color 0.2s',
        },
        iconWrapper: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            flexShrink: 0,
        },
        cardTitle: {
            margin: '0 0 4px 0',
            fontSize: '14px',
            fontWeight: 600,
            color: isDark ? '#94a3b8' : '#4b5563',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
        },
        cardText: {
            margin: 0,
            fontSize: '15px',
            lineHeight: 1.5,
            fontWeight: 500,
            color: isDark ? '#f3f4f6' : '#111827',
        },
        keywordSection: {
            background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(243, 244, 246, 0.8)',
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${isDark ? '#1e293b' : '#e5e7eb'}`,
        },
        keywordTitle: {
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: 600,
            color: isDark ? '#cbd5e1' : '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        },
        tagsContainer: {
            display: 'flex',
            flexWrap: 'wrap' as const,
            gap: '8px',
        },
        tag: {
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#cbd5e1' : '#4b5563',
            border: `1px solid ${isDark ? '#334155' : '#d1d5db'}`,
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
        }
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={{ flexGrow: 1 }}>
                    <h1 style={styles.title}>Idea Breakdown</h1>
                    <p style={styles.subtitle}>AI-Powered Competitive Research Assistant</p>
                </div>
                <div style={styles.categoryBadge}>
                    <Lightbulb size={14} />
                    <span>{category}</span>
                </div>
            </div>

            {/* Grid details */}
            <div style={styles.grid}>
                {/* Core Problem */}
                <div style={styles.card}>
                    <div style={{
                        ...styles.iconWrapper,
                        background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                        color: '#f87171'
                    }}>
                        <HelpCircle size={20} />
                    </div>
                    <div>
                        <h4 style={styles.cardTitle}>Core Problem</h4>
                        <p style={styles.cardText}>{coreProblem}</p>
                    </div>
                </div>

                {/* Target User */}
                <div style={styles.card}>
                    <div style={{
                        ...styles.iconWrapper,
                        background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                        color: '#34d399'
                    }}>
                        <Users size={20} />
                    </div>
                    <div>
                        <h4 style={styles.cardTitle}>Target Audience</h4>
                        <p style={styles.cardText}>{targetAudience}</p>
                    </div>
                </div>

                {/* Value Proposition */}
                <div style={styles.card}>
                    <div style={{
                        ...styles.iconWrapper,
                        background: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.08)',
                        color: '#a78bfa'
                    }}>
                        <Target size={20} />
                    </div>
                    <div>
                        <h4 style={styles.cardTitle}>Value Proposition</h4>
                        <p style={styles.cardText}>{valueProposition}</p>
                    </div>
                </div>
            </div>

            {/* Competitor Search Keywords */}
            <div style={styles.keywordSection}>
                <h4 style={styles.keywordTitle}>
                    <Tag size={16} style={{ color: isDark ? '#60a5fa' : '#2563eb' }} />
                    Competitive Search Phrases
                </h4>
                <div style={styles.tagsContainer}>
                    {phrasesToRender.map((word: string, idx: number) => (
                        <span key={idx} style={styles.tag}>
                            <CheckCircle2 size={12} style={{ color: isDark ? '#34d399' : '#059669' }} />
                            {word}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
