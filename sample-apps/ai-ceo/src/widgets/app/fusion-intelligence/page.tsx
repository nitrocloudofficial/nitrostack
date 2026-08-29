'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface FusionMember {
  name: string;
  merged_score: number;
  final_behavior: string;
  git_score: number;
  meeting_score: number;
}

interface FusionIntelligenceData {
  generated_at: string;
  members: FusionMember[];
}

export default function FusionIntelligenceWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<{ fusion_intelligence: FusionIntelligenceData }>();

  if (!isReady) return <div style={styles.loading}>Initializing…</div>;
  if (!data) return <div style={styles.loading}>Loading…</div>;

  const fusionData = data.fusion_intelligence;
  if (!fusionData) {
    return <div style={styles.error}>No fusion intelligence data available</div>;
  }

  if (typeof fusionData !== 'object' || !Array.isArray(fusionData.members)) {
    return <div style={styles.error}>Invalid fusion intelligence data format</div>;
  }

  const members = fusionData.members ?? [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Fusion Intelligence</h2>
        <p style={styles.subtitle}>
          Generated: {new Date(fusionData.generated_at).toLocaleDateString()}
        </p>
      </div>

      <div style={styles.membersList}>
        {members.map((member, idx) => (
          <div key={idx} style={styles.memberCard}>
            <div style={styles.memberHeader}>
              <div>
                <h3 style={styles.memberName}>{member.name}</h3>
                <p style={styles.behavior}>{member.final_behavior}</p>
              </div>
              <div style={styles.mergedScoreBadge}>
                <div style={styles.mergedScoreValue}>{member.merged_score.toFixed(1)}</div>
                <div style={styles.mergedScoreLabel}>Merged</div>
              </div>
            </div>

            <div style={styles.scoreComparison}>
              <div style={styles.scoreColumn}>
                <div style={styles.scoreLabel}>Git Score</div>
                <div style={styles.scoreBar}>
                  <div
                    style={{
                      ...styles.scoreBarFill,
                      width: `${Math.min(100, member.git_score)}%`,
                      backgroundColor: '#3b82f6'
                    }}
                  />
                </div>
                <div style={styles.scoreValueSmall}>{member.git_score.toFixed(1)}</div>
              </div>

              <div style={styles.scoreColumn}>
                <div style={styles.scoreLabel}>Meeting Score</div>
                <div style={styles.scoreBar}>
                  <div
                    style={{
                      ...styles.scoreBarFill,
                      width: `${Math.min(100, member.meeting_score)}%`,
                      backgroundColor: '#10b981'
                    }}
                  />
                </div>
                <div style={styles.scoreValueSmall}>{member.meeting_score.toFixed(1)}</div>
              </div>
            </div>

            <div style={styles.insights}>
              <div style={styles.insightItem}>
                <span style={styles.insightLabel}>Strength:</span>
                <span style={styles.insightValue}>
                  {member.git_score > member.meeting_score ? 'Code-focused' : 'Communication-focused'}
                </span>
              </div>
              <div style={styles.insightItem}>
                <span style={styles.insightLabel}>Gap:</span>
                <span style={styles.insightValue}>
                  {Math.abs(member.git_score - member.meeting_score).toFixed(1)} points
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
  membersList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: '20px'
  } as React.CSSProperties,
  memberCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb'
  } as React.CSSProperties,
  memberHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb'
  } as React.CSSProperties,
  memberName: {
    margin: '0 0 4px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827'
  } as React.CSSProperties,
  behavior: {
    margin: '0',
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  } as React.CSSProperties,
  mergedScoreBadge: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    width: '70px',
    height: '70px',
    borderRadius: '8px',
    backgroundColor: '#f0f9ff',
    border: '2px solid #0ea5e9'
  } as React.CSSProperties,
  mergedScoreValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0ea5e9'
  } as React.CSSProperties,
  mergedScoreLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#0284c7',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  } as React.CSSProperties,
  scoreComparison: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px'
  } as React.CSSProperties,
  scoreColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px'
  } as React.CSSProperties,
  scoreLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  } as React.CSSProperties,
  scoreBar: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  } as React.CSSProperties,
  scoreBarFill: {
    height: '100%',
    transition: 'width 0.3s ease',
    borderRadius: '4px'
  } as React.CSSProperties,
  scoreValueSmall: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#111827'
  } as React.CSSProperties,
  insights: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  } as React.CSSProperties,
  insightItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px'
  } as React.CSSProperties,
  insightLabel: {
    fontWeight: '600',
    color: '#6b7280'
  } as React.CSSProperties,
  insightValue: {
    fontWeight: '500',
    color: '#111827'
  } as React.CSSProperties
};
