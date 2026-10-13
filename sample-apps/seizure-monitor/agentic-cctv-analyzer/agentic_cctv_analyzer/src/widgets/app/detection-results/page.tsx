'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

export default function DetectionResultsWidget() {
    const { isReady, getToolOutput, callTool } = useWidgetSDK();
    const theme = useTheme();
    const isDark = theme === 'dark';

    const data = getToolOutput<{ events?: any[] }>();

    if (!data) {
        return <div style={{ padding: 24, color: isDark ? '#fff' : '#111' }}>{isReady ? 'Waiting for detection results...' : 'Connecting...'}</div>;
    }

    return (
        <div style={{ padding: 16 }}>
            <h3>Detection Results</h3>
            <ol>
                {(data.events || []).map(e => (
                    <li key={e.id}>{e.timestamp}s — {e.label} ({Math.round(e.confidence * 100)}%)</li>
                ))}
            </ol>
        </div>
    );
}
