'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

export default function EventTimelineWidget() {
    const { isReady, getToolOutput } = useWidgetSDK();
    const theme = useTheme();
    const isDark = theme === 'dark';

    const data = getToolOutput<{ events?: any[] }>();

    if (!data) {
        return <div style={{ padding: 24, color: isDark ? '#fff' : '#111' }}>{isReady ? 'Waiting for timeline...' : 'Connecting...'}</div>;
    }

    return (
        <div style={{ padding: 16 }}>
            <h3>Event Timeline</h3>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
                {(data.events || []).map(e => (
                    <div key={e.id} style={{ minWidth: 160, padding: 8, border: '1px solid #ddd', borderRadius: 8 }}>
                        <div style={{ fontWeight: 600 }}>{e.label}</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{e.timestamp}s</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
