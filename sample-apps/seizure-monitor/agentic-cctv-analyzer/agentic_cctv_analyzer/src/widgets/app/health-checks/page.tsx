'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

export default function HealthChecksWidget() {
    const { isReady, getToolOutput } = useWidgetSDK();
    const theme = useTheme();
    const isDark = theme === 'dark';

    const data = getToolOutput<{ status?: string }>();

    if (!data) {
        return <div style={{ padding: 24, color: isDark ? '#fff' : '#111' }}>{isReady ? 'Waiting for health status...' : 'Connecting...'}</div>;
    }

    return (
        <div style={{ padding: 16 }}>
            <h3>Health Checks</h3>
            <div>Status: {data.status || 'unknown'}</div>
        </div>
    );
}
