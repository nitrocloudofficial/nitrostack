'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

export default function UploadedVideosWidget() {
    const { isReady, getToolOutput, callTool } = useWidgetSDK();
    const theme = useTheme();
    const isDark = theme === 'dark';

    const data = getToolOutput<{ videos?: any[] }>();

    if (!data) {
        return <div style={{ padding: 24, color: isDark ? '#fff' : '#111' }}>{isReady ? 'Waiting for uploaded videos...' : 'Connecting...'}</div>;
    }

    return (
        <div style={{ padding: 16 }}>
            <h3>Uploaded Videos</h3>
            <ul>
                {(data.videos || []).map(v => (
                    <li key={v.id}>{v.filename} — {v.status}</li>
                ))}
            </ul>
        </div>
    );
}
