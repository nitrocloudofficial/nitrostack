'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface CctvEvent {
    id: string;
    timestamp: number;
    label: string;
    confidence: number;
    severity: string;
}

interface WidgetData {
    success: boolean;
    count: number;
    data: CctvEvent[];
}

export default function CctvEventsWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();

    if (!data) {
        return (
            <div style={{ padding: '24px', color: isDark ? '#fff' : '#111' }}>
                {isReady ? 'Waiting for CCTV event data...' : 'Connecting to the host...'}
            </div>
        );
    }

    return (
        <div style={{ padding: '16px', background: isDark ? '#111827' : '#f9fafb', color: isDark ? '#f9fafb' : '#111827', minHeight: '320px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>CCTV Event Feed</h3>
            <p style={{ margin: '0 0 12px', fontSize: '12px', opacity: 0.8 }}>
                {data.count} matching event{data.count === 1 ? '' : 's'} found.
            </p>
            <div style={{ display: 'grid', gap: '8px' }}>
                {data.data.map((event) => (
                    <div key={event.id} style={{ border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`, borderRadius: '8px', padding: '10px', background: isDark ? '#1f2937' : '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                            <strong>{event.label}</strong>
                            <span style={{ fontSize: '12px', color: event.severity === 'high' ? '#f87171' : '#60a5fa' }}>
                                {event.severity.toUpperCase()}
                            </span>
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '12px', opacity: 0.8 }}>
                            Timestamp: {event.timestamp}s • Confidence: {(event.confidence * 100).toFixed(0)}%
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
