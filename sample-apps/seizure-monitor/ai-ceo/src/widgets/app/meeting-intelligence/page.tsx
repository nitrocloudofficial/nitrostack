'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface MeetingMember {
  name: string;
  time_spoken_seconds: number;
  lines_spoken: number;
  important_topics: string[];
  summary: string;
  behavior_type: string;
  involvement_score: number;
}

interface MeetingIntelligenceData {
  overall_meeting_summary: string;
  meeting_topics: string[];
  member_analysis: MeetingMember[];
  dominant_speakers: string[];
  silent_speakers: string[];
  generated_at: string;
}

export default function MeetingIntelligenceWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<{ meeting_intelligence: MeetingIntelligenceData }>();

  if (!isReady) return <div style={styles.loading}>Initializing…</div>;
  if (!data) return <div style={styles.loading}>Loading…</div>;

  const meetingData = data.meeting_intelligence;
  if (!meetingData) {
    return <div style={styles.error}>No meeting intelligence data available</div>;
  }

  if (typeof meetingData !== 'object' || !Array.isArray(meetingData.member_analysis)) {
    return <div style={styles.error}>Invalid meeting intelligence data format</div>;
  }

  const members = Array.isArray(meetingData.member_analysis) ? meetingData.member_analysis : [];
  const topics = Array.isArray(meetingData.meeting_topics) ? meetingData.meeting_topics : [];
  const dominantSpeakers = Array.isArray(meetingData.dominant_speakers) ? meetingData.dominant_speakers : [];
  const silentSpeakers = Array.isArray(meetingData.silent_speakers) ? meetingData.silent_speakers : [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Meeting Intelligence</h2>
        <p style={styles.subtitle}>
          Generated: {new Date(meetingData.generated_at).toLocaleDateString()}
        </p>
      </div>

      <div style={styles.summarySection}>
        <h3 style={styles.sectionTitle}>Meeting Summary</h3>
        <p style={styles.summaryText}>{meetingData.overall_meeting_summary}</p>
      </div>

      <div style={styles.topicsSection}>
        <h3 style={styles.sectionTitle}>Topics Discussed</h3>
        <div style={styles.topicsList}>
          {topics.map((topic, idx) => (
            <span key={idx} style={styles.topicTag}>
              {topic}
            </span>
          ))}
        </div>
      </div>

      <div style={styles.speakersSection}>
        <div style={styles.speakerGroup}>
          <h3 style={styles.sectionTitle}>Dominant Speakers</h3>
          <div style={styles.speakerList}>
            {dominantSpeakers.map((speaker, idx) => (
              <div key={idx} style={styles.speakerBadge}>
                🎤 {speaker}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.speakerGroup}>
          <h3 style={styles.sectionTitle}>Silent Speakers</h3>
          <div style={styles.speakerList}>
            {silentSpeakers.map((speaker, idx) => (
              <div key={idx} style={styles.speakerBadge}>
                🤐 {speaker}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.membersList}>
        <h3 style={styles.sectionTitle}>Member Analysis</h3>
        {members.map((member, idx) => (
          <div key={idx} style={styles.memberCard}>
            <div style={styles.memberHeader}>
              <h4 style={styles.memberName}>{member.name}</h4>
              <span style={styles.badge}>{member.behavior_type}</span>
            </div>

            <div style={styles.memberStats}>
              <div style={styles.stat}>
                <span style={styles.statLabel}>Involvement</span>
                <div style={styles.scoreBar}>
                  <div
                    style={{
                      ...styles.scoreBarFill,
                      width: `${Math.min(100, member.involvement_score)}%`,
                      backgroundColor: getScoreColor(member.involvement_score)
                    }}
                  />
                </div>
                <span style={styles.statValue}>{member.involvement_score.toFixed(1)}</span>
              </div>

              <div style={styles.stat}>
                <span style={styles.statLabel}>Time Spoken</span>
                <span style={styles.statValue}>{member.time_spoken_seconds}s</span>
              </div>

              <div style={styles.stat}>
                <span style={styles.statLabel}>Lines Spoken</span>
                <span style={styles.statValue}>{member.lines_spoken}</span>
              </div>
            </div>

            <div style={styles.topicsSection}>
              <span style={styles.topicsLabel}>Topics:</span>
              <div style={styles.topicsList}>
                {(member.important_topics ?? []).map((topic, tidx) => (
                  <span key={tidx} style={styles.smallTopicTag}>
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            <p style={styles.summary}>{member.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f9fafb',
    minHeight: '100vh'
  } as React.CSSProperties,
  loading: {
    padding: '40px',
    textAlign: 'center' as const,
    color: '#6b7280',
    fontSize: '16px'
  } as React.CSSProperties,
  error: {
    padding: '40px',
    textAlign: 'center' as const,
    color: '#ef4444',
    fontSize: '16px'
  } as React.CSSProperties,
  header: {
    marginBottom: '30px'
  } as React.CSSProperties,
  title: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    fontWeight: '700',
    color: '#111827'
  } as React.CSSProperties,
  subtitle: {
    margin: '0',
    fontSize: '14px',
    color: '#6b7280'
  } as React.CSSProperties,
  summarySection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    border: '1px solid #e5e7eb'
  } as React.CSSProperties,
  summaryText: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.6'
  } as React.CSSProperties,
  topicsSection: {
    marginBottom: '20px'
  } as React.CSSProperties,
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827'
  } as React.CSSProperties,
  topicsList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px'
  } as React.CSSProperties,
  topicTag: {
    display: 'inline-block',
    padding: '6px 12px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
  } as React.CSSProperties,
  smallTopicTag: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: '500'
  } as React.CSSProperties,
  topicsLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    marginRight: '8px'
  } as React.CSSProperties,
  speakersSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px'
  } as React.CSSProperties,
  speakerGroup: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e5e7eb'
  } as React.CSSProperties,
  speakerList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  } as React.CSSProperties,
  speakerBadge: {
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827'
  } as React.CSSProperties,
  membersList: {
    marginTop: '20px'
  } as React.CSSProperties,
  memberCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid #e5e7eb'
  } as React.CSSProperties,
  memberHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb'
  } as React.CSSProperties,
  memberName: {
    margin: '0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827'
  } as React.CSSProperties,
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600'
  } as React.CSSProperties,
  memberStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '12px'
  } as React.CSSProperties,
  stat: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  } as React.CSSProperties,
  statLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  } as React.CSSProperties,
  statValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#111827'
  } as React.CSSProperties,
  scoreBar: {
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden'
  } as React.CSSProperties,
  scoreBarFill: {
    height: '100%',
    transition: 'width 0.3s ease',
    borderRadius: '3px'
  } as React.CSSProperties,
  summary: {
    margin: '12px 0 0 0',
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.5'
  } as React.CSSProperties
};
