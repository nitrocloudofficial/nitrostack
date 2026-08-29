'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface GitScores {
  work_importance: number;
  pr_involvement: number;
  comment_quality: number;
  activity: number;
  collaboration_health: number;
  git_score: number;
}

interface GitMember {
  name: string;
  git_scores: GitScores;
  git_behavior: string;
}

interface GitIntelligenceData {
  generated_at: string;
  members: GitMember[];
}

export default function GitIntelligenceWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<{ git_intelligence: GitIntelligenceData }>();

  if (!isReady) return <div style={styles.loading}>Initializing…</div>;
  if (!data) return <div style={styles.loading}>Loading…</div>;

  const gitData = data.git_intelligence;
  if (!gitData) {
    return <div style={styles.error}>No Git intelligence data available</div>;
  }

  if (typeof gitData !== 'object' || !Array.isArray(gitData.members)) {
    return <div style={styles.error}>Invalid Git intelligence data format</div>;
  }

  const members = gitData.members ?? [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Git Intelligence</h2>
        <p style={styles.subtitle}>
          Generated: {new Date(gitData.generated_at).toLocaleDateString()}
        </p>
      </div>

      <div style={styles.membersList}>
        {members.map((member, idx) => (
          <div key={idx} style={styles.memberCard}>
            <div style={styles.memberHeader}>
              <h3 style={styles.memberName}>{member.name}</h3>
              <span style={styles.badge}>{member.git_behavior}</span>
            </div>

            <div style={styles.scoreGrid}>
              <div style={styles.scoreItem}>
                <div style={styles.scoreHeader}>
                  <span style={styles.scoreLabel}>Git Score</span>
                  <span style={styles.scoreValue}>{member.git_scores.git_score.toFixed(1)}</span>
                </div>
                <div style={styles.scoreBar}>
                  <div
                    style={{
                      ...styles.scoreBarFill,
                      width: `${Math.min(100, member.git_scores.git_score)}%`,
                      backgroundColor: getScoreColor(member.git_scores.git_score)
                    }}
                  />
                </div>
              </div>

              <div style={styles.scoreItem}>
                <div style={styles.scoreHeader}>
                  <span style={styles.scoreLabel}>Work Importance</span>
                  <span style={styles.scoreValue}>{member.git_scores.work_importance.toFixed(1)}</span>
                </div>
                <div style={styles.scoreBar}>
                  <div
                    style={{
                      ...styles.scoreBarFill,
                      width: `${Math.min(100, member.git_scores.work_importance)}%`,
                      backgroundColor: '#8b5cf6'
                    }}
                  />
                </div>
              </div>

              <div style={styles.scoreItem}>
                <div style={styles.scoreHeader}>
                  <span style={styles.scoreLabel}>PR Involvement</span>
                  <span style={styles.scoreValue}>{member.git_scores.pr_involvement.toFixed(1)}</span>
                </div>
                <div style={styles.scoreBar}>
                  <div
                    style={{
                      ...styles.scoreBarFill,
                      width: `${Math.min(100, member.git_scores.pr_involvement)}%`,
                      backgroundColor: '#ec4899'
                    }}
                  />
                </div>
              </div>

              <div style={styles.scoreItem}>
                <div style={styles.scoreHeader}>
                  <span style={styles.scoreLabel}>Comment Quality</span>
                  <span style={styles.scoreValue}>{member.git_scores.comment_quality.toFixed(1)}</span>
                </div>
                <div style={styles.scoreBar}>
                  <div
                    style={{
                      ...styles.scoreBarFill,
                      width: `${Math.min(100, member.git_scores.comment_quality)}%`,
                      backgroundColor: '#f59e0b'
                    }}
                  />
                </div>
              </div>

              <div style={styles.scoreItem}>
                <div style={styles.scoreHeader}>
                  <span style={styles.scoreLabel}>Activity</span>
                  <span style={styles.scoreValue}>{member.git_scores.activity.toFixed(1)}</span>
                </div>
                <div style={styles.scoreBar}>
                  <div
                    style={{
                      ...styles.scoreBarFill,
                      width: `${Math.min(100, member.git_scores.activity)}%`,
                      backgroundColor: '#3b82f6'
                    }}
                  />
                </div>
              </div>

              <div style={styles.scoreItem}>
                <div style={styles.scoreHeader}>
                  <span style={styles.scoreLabel}>Collaboration Health</span>
                  <span style={styles.scoreValue}>{member.git_scores.collaboration_health.toFixed(1)}</span>
                </div>
                <div style={styles.scoreBar}>
                  <div
                    style={{
                      ...styles.scoreBarFill,
                      width: `${Math.min(100, member.git_scores.collaboration_health)}%`,
                      backgroundColor: '#10b981'
                    }}
                  />
                </div>
              </div>
            </div>
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
  membersList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
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
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb'
  } as React.CSSProperties,
  memberName: {
    margin: '0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827'
  } as React.CSSProperties,
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
  } as React.CSSProperties,
  scoreGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px'
  } as React.CSSProperties,
  scoreItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px'
  } as React.CSSProperties,
  scoreHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
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
  scoreValue: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#111827'
  } as React.CSSProperties
};
