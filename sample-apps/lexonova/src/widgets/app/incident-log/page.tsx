'use client';

import React from 'react';
import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { Calendar, User, MapPin, Eye, FileText } from 'lucide-react';

// Disable static generation
export const dynamic = 'force-dynamic';

interface IncidentEntry {
    date: string;
    time?: string;
    location?: string;
    whoPresent?: string;
    description: string;
    evidenceSaved?: string;
}

interface IncidentLogData {
    incidents: IncidentEntry[];
}

export default function IncidentLogWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();

    const data = getToolOutput<IncidentLogData>();

    if (!data) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: isDark ? '#fff' : '#000',
            }}>
                Loading incident log... {isReady ? '(SDK ready but no data)' : '(waiting for SDK)'}
            </div>
        );
    }

    const { incidents } = data;

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
                    <Calendar size={28} style={{ color: '#3b82f6' }} />
                    <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>Incident Log</h1>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: isDark ? '#9ca3af' : '#6b7280' }}>
                    A structured timeline of recorded workplace incidents
                </p>
            </div>

            {/* List of Incidents */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {incidents.map((inc, idx) => (
                    <div key={idx} style={{
                        padding: '16px',
                        borderRadius: '8px',
                        background: isDark ? '#1a1a1a' : '#f9fafb',
                        border: `1px solid ${isDark ? '#2d2d2d' : '#e5e7eb'}`,
                    }}>
                        {/* Date & Time Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: `1px solid ${isDark ? '#2d2d2d' : '#e5e7eb'}`, paddingBottom: '8px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', color: '#3b82f6' }}>
                                <Calendar size={16} /> {inc.date} {inc.time ? `at ${inc.time}` : ''}
                            </span>
                            <span style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>
                                Incident #{incidents.length - idx}
                            </span>
                        </div>

                        {/* Description */}
                        <div style={{ marginBottom: '12px', fontSize: '15px', lineHeight: '1.6', color: isDark ? '#e5e7eb' : '#374151' }}>
                            {inc.description}
                        </div>

                        {/* Details Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px', color: isDark ? '#9ca3af' : '#6b7280' }}>
                            {inc.location && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MapPin size={14} style={{ color: '#ef4444' }} />
                                    <span><strong>Location:</strong> {inc.location}</span>
                                </div>
                            )}
                            {inc.whoPresent && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <User size={14} style={{ color: '#f59e0b' }} />
                                    <span><strong>Witnesses:</strong> {inc.whoPresent}</span>
                                </div>
                            )}
                            {inc.evidenceSaved && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', gridColumn: 'span 2' }}>
                                    <FileText size={14} style={{ color: '#10b981' }} />
                                    <span><strong>Evidence:</strong> {inc.evidenceSaved}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
