'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

export default function VideoPlayerWidget() {
    const { isReady, getToolOutput } = useWidgetSDK();
    const theme = useTheme();
    const isDark = theme === 'dark';

    const data = getToolOutput<{ url?: string }>();

    if (!data) {
        return <div style={{ padding: 24, color: isDark ? '#fff' : '#111' }}>{isReady ? 'Waiting for video...' : 'Connecting...'}</div>;
    }

    return (
        <div style={{ padding: 16 }}>
            <h3>Video Player</h3>
            {data.url ? (
                <video controls style={{ width: '100%', borderRadius: 8 }} src={data.url} />
            ) : (
                <div>No video available</div>
            )}
        </div>
    );
}
