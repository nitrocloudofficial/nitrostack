'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface DashboardStats {
    totalVideos: number;
    totalAnalyses: number;
    totalEvents: number;
    totalPeople: number;
    totalVehicles: number;
    totalAnimals: number;
    totalObjects: number;
    totalClips: number;
    totalSummaries: number;
    recentVideos: {
        videoId: string;
        filename: string;
        analyzedAt: string;
        eventCount: number;
    }[];
    recentEvents: {
        id: string;
        videoId: string;
        timestamp: number;
        objectClass: string;
        label?: string;
        confidence: number;
    }[];
    recentClips: {
        clipId: string;
        videoId: string;
        eventId: string;
        clipTitle: string;
        generatedAt: string;
    }[];
    objectDistribution: {
        objectClass: string;
        count: number;
    }[];
}

function StatCard({ label, value, isDark }: { label: string; value: number; isDark: boolean }) {
    return (
        <div
            style={{
                border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
                borderRadius: '8px',
                padding: '12px',
                background: isDark ? '#1f2937' : '#fff',
            }}
        >
            <div style={{ fontSize: '12px', opacity: 0.75 }}>{label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px' }}>{value}</div>
        </div>
    );
}

export default function AnalyticsDashboardWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<DashboardStats>();

    if (!data) {
        return (
            <div style={{ padding: '24px', color: isDark ? '#fff' : '#111' }}>
                {isReady ? 'Waiting for dashboard data...' : 'Connecting to the host...'}
            </div>
        );
    }

    const stats = [
        { label: 'Videos', value: data.totalVideos },
        { label: 'Analyses', value: data.totalAnalyses },
        { label: 'Events', value: data.totalEvents },
        { label: 'People', value: data.totalPeople },
        { label: 'Vehicles', value: data.totalVehicles },
        { label: 'Animals', value: data.totalAnimals },
        { label: 'Objects', value: data.totalObjects },
        { label: 'Clips', value: data.totalClips },
        { label: 'Summaries', value: data.totalSummaries },
    ];

    return (
        <div
            style={{
                padding: '16px',
                background: isDark ? '#111827' : '#f9fafb',
                color: isDark ? '#f9fafb' : '#111827',
                minHeight: '320px',
            }}
        >
            <h3 style={{ margin: '0 0 12px', fontSize: '18px' }}>Analytics Dashboard</h3>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                    gap: '8px',
                    marginBottom: '16px',
                }}
            >
                {stats.map((stat) => (
                    <StatCard key={stat.label} label={stat.label} value={stat.value} isDark={isDark} />
                ))}
            </div>

            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <section>
                    <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>Object Distribution</h4>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px' }}>
                        {data.objectDistribution.length === 0 && <li>No detections yet</li>}
                        {data.objectDistribution.map((item) => (
                            <li key={item.objectClass}>
                                {item.objectClass}: {item.count}
                            </li>
                        ))}
                    </ul>
                </section>

                <section>
                    <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>Recent Videos</h4>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px' }}>
                        {data.recentVideos.length === 0 && <li>No analyzed videos</li>}
                        {data.recentVideos.map((video) => (
                            <li key={video.videoId}>
                                {video.filename} ({video.eventCount} events)
                            </li>
                        ))}
                    </ul>
                </section>

                <section>
                    <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>Recent Events</h4>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px' }}>
                        {data.recentEvents.length === 0 && <li>No events recorded</li>}
                        {data.recentEvents.map((event) => (
                            <li key={event.id}>
                                {event.objectClass} @ {event.timestamp}s ({Math.round(event.confidence * 100)}%)
                            </li>
                        ))}
                    </ul>
                </section>

                <section>
                    <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>Recent Clips</h4>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px' }}>
                        {data.recentClips.length === 0 && <li>No clips generated</li>}
                        {data.recentClips.map((clip) => (
                            <li key={clip.clipId}>{clip.clipTitle}</li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
}
