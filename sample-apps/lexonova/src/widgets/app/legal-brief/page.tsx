'use client';

import React from 'react';
import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { Shield, Clock, FileText, AlertTriangle, Scale, CheckCircle } from 'lucide-react';

// Disable static generation
export const dynamic = 'force-dynamic';

interface CaseData {
    workerName: string;
    employerName: string;
    employmentType: string;
    state: string;
    incidentDate?: string;
    issueSummary: string;
    timeline: string[];
    potentialIssues: { issue: string; reason: string }[];
    evidence: string[];
    lawCitations: string[];
    filingDeadline: string;
    recommendedAuthority: string;
}

export default function LegalBriefWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();

    const data = getToolOutput<CaseData>();

    if (!data) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: isDark ? '#fff' : '#000',
            }}>
                Loading legal brief details... {isReady ? '(SDK ready but no data)' : '(waiting for SDK)'}
            </div>
        );
    }

    const {
        workerName,
        employerName,
        employmentType,
        state,
        incidentDate,
        issueSummary,
        timeline,
        potentialIssues,
        evidence,
        lawCitations,
        filingDeadline,
        recommendedAuthority,
    } = data;

    return (
        <div style={{
            background: isDark ? '#121212' : '#ffffff',
            color: isDark ? '#f3f4f6' : '#1f2937',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: `1px solid ${isDark ? '#2d2d2d' : '#e5e7eb'}`,
            maxHeight: maxHeight || '800px',
            overflow: 'auto',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Disclaimer */}
            <div style={{
                fontSize: '11px',
                color: isDark ? '#6b7280' : '#9ca3af',
                textAlign: 'center',
                paddingBottom: '8px',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
            }}>
                Informational only — not legal advice.
            </div>

            {/* Header */}
            <div style={{ borderBottom: `2px solid ${isDark ? '#2d2d2d' : '#e5e7eb'}`, paddingBottom: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={28} style={{ color: '#3b82f6' }} />
                    <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>LexoNova Legal Brief</h1>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Case Profile: {workerName} vs. {employerName}
                </p>
            </div>

            {/* Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', background: isDark ? '#1a1a1a' : '#f9fafb', border: `1px solid ${isDark ? '#2d2d2d' : '#f3f4f6'}` }}>
                    <span style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280', display: 'block' }}>Jurisdiction / State</span>
                    <strong style={{ fontSize: '15px' }}>{state}</strong>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', background: isDark ? '#1a1a1a' : '#f9fafb', border: `1px solid ${isDark ? '#2d2d2d' : '#f3f4f6'}` }}>
                    <span style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280', display: 'block' }}>Employment Type</span>
                    <strong style={{ fontSize: '15px' }}>{employmentType}</strong>
                </div>
                {incidentDate && (
                    <div style={{ padding: '12px', borderRadius: '8px', background: isDark ? '#1a1a1a' : '#f9fafb', border: `1px solid ${isDark ? '#2d2d2d' : '#f3f4f6'}` }}>
                        <span style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280', display: 'block' }}>Incident Date</span>
                        <strong style={{ fontSize: '15px' }}>{incidentDate}</strong>
                    </div>
                )}
            </div>

            {/* Issue Summary */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} style={{ color: '#3b82f6' }} /> Issue Summary
                </h2>
                <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6', color: isDark ? '#d1d5db' : '#374151' }}>
                    {issueSummary}
                </p>
            </div>

            {/* Timeline */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={20} style={{ color: '#3b82f6' }} /> Timeline of Events
                </h2>
                <div style={{ paddingLeft: '8px', borderLeft: `2px solid ${isDark ? '#2d2d2d' : '#e5e7eb'}` }}>
                    {timeline.map((item, idx) => (
                        <div key={idx} style={{ position: 'relative', marginBottom: '12px', paddingLeft: '16px' }}>
                            <div style={{
                                position: 'absolute',
                                left: '-21px',
                                top: '4px',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#3b82f6'
                            }} />
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{item}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Potential Issues */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={20} style={{ color: '#f59e0b' }} /> Identified Legal Issues
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {potentialIssues.map((pi, idx) => (
                        <div key={idx} style={{ padding: '12px', borderRadius: '8px', borderLeft: '4px solid #f59e0b', background: isDark ? '#201a10' : '#fef3c7' }}>
                            <strong style={{ display: 'block', fontSize: '14px', color: isDark ? '#fbcfe8' : '#92400e' }}>Possible {pi.issue}</strong>
                            <span style={{ fontSize: '14px', color: isDark ? '#fef3c7' : '#78350f' }}>because {pi.reason}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Citations & Evidence */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Scale size={18} style={{ color: '#10b981' }} /> Applicable Law Citations
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: isDark ? '#d1d5db' : '#374151' }}>
                        {lawCitations.map((cit, idx) => (
                            <li key={idx} style={{ marginBottom: '6px' }}>{cit}</li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={18} style={{ color: '#10b981' }} /> Supporting Evidence
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: isDark ? '#d1d5db' : '#374151' }}>
                        {evidence.map((ev, idx) => (
                            <li key={idx} style={{ marginBottom: '6px' }}>{ev}</li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Deadline and Authority */}
            <div style={{ borderTop: `1px solid ${isDark ? '#2d2d2d' : '#e5e7eb'}`, paddingTop: '16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <span style={{ fontSize: '13px', color: isDark ? '#9ca3af' : '#6b7280', display: 'block' }}>Filing Deadline Notice</span>
                    <strong style={{ fontSize: '15px', color: '#ef4444' }}>{filingDeadline}</strong>
                </div>
                <div>
                    <span style={{ fontSize: '13px', color: isDark ? '#9ca3af' : '#6b7280', display: 'block' }}>Recommended Authority</span>
                    <strong style={{ fontSize: '15px', color: '#10b981' }}>{recommendedAuthority}</strong>
                </div>
            </div>
        </div>
    );
}
