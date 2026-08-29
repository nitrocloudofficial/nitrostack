'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface SubmissionMetrics {
  totalSubmissions: number;
  evaluatedCount: number;
  pendingCount: number;
  averageScore: number;
}

interface TierDistribution {
  Platinum: number;
  Gold: number;
  Silver: number;
  Bronze: number;
  Participant: number;
}

interface JudgeDashboardData {
  judgeId: string;
  judgeName: string;
  metrics: SubmissionMetrics;
  tierDistribution: TierDistribution;
  recentSubmissions: Array<{
    submissionId: string;
    title: string;
    tier: string;
    score: number;
    evaluatedAt: string;
  }>;
  status: string;
}

export default function JudgeDashboardWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();

  const data = getToolOutput<JudgeDashboardData>();

  if (!isReady || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Loading…
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const accentColor = isDark ? '#60a5fa' : '#3b82f6';
  const cardBg = isDark ? '#2d3748' : '#f9fafb';

  const getTierColor = (tier: string): string => {
    switch (tier) {
      case 'Platinum':
        return '#06b6d4';
      case 'Gold':
        return '#f59e0b';
      case 'Silver':
        return '#8b5cf6';
      case 'Bronze':
        return '#d97706';
      default:
        return '#6b7280';
    }
  };

  const getTierIcon = (tier: string): string => {
    switch (tier) {
      case 'Platinum':
        return '💎';
      case 'Gold':
        return '🏆';
      case 'Silver':
        return '⭐';
      case 'Bronze':
        return '🥉';
      default:
        return '📊';
    }
  };

  const metrics = data.metrics ?? {
    totalSubmissions: 0,
    evaluatedCount: 0,
    pendingCount: 0,
    averageScore: 0
  };

  const tierDist = data.tierDistribution ?? {
    Platinum: 0,
    Gold: 0,
    Silver: 0,
    Bronze: 0,
    Participant: 0
  };

  const recentSubs = data.recentSubmissions ?? [];

  const renderMetricCard = (label: string, value: string | number, icon: string) => (
    <div key={label} style={{
      padding: '16px',
      backgroundColor: cardBg,
      borderRadius: '8px',
      border: `1px solid ${borderColor}`,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <div style={{
        fontSize: '12px',
        color: isDark ? '#9ca3af' : '#6b7280',
        marginBottom: '4px'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: accentColor
      }}>
        {value}
      </div>
    </div>
  );

  return (
    <div style={{
      padding: '24px',
      backgroundColor: bgColor,
      borderRadius: '12px',
      border: `1px solid ${borderColor}`,
      color: textColor,
      maxWidth: '800px',
      boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${borderColor}`
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 'bold',
          color: textColor
        }}>
          Judge Dashboard
        </h1>
        <p style={{
          margin: '8px 0 0 0',
          fontSize: '14px',
          color: isDark ? '#9ca3af' : '#6b7280'
        }}>
          {data.judgeName || 'Judge'} • {data.judgeId || 'ID'}
        </p>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {renderMetricCard('Total Submissions', metrics.totalSubmissions, '📋')}
        {renderMetricCard('Evaluated', metrics.evaluatedCount, '✅')}
        {renderMetricCard('Pending', metrics.pendingCount, '⏳')}
        {renderMetricCard('Avg Score', metrics.averageScore.toFixed(1), '📊')}
      </div>

      {/* Tier Distribution */}
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: cardBg,
        borderRadius: '8px',
        border: `1px solid ${borderColor}`
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          color: textColor
        }}>
          Tier Distribution
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '12px'
        }}>
          {Object.entries(tierDist).map(([tier, count]) => (
            <div
              key={tier}
              style={{
                padding: '12px',
                backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                borderRadius: '6px',
                border: `2px solid ${getTierColor(tier)}`,
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                {getTierIcon(tier)}
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: getTierColor(tier),
                marginBottom: '4px'
              }}>
                {tier}
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: textColor
              }}>
                {count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Submissions */}
      {recentSubs && recentSubs.length > 0 && (
        <div style={{
          padding: '16px',
          backgroundColor: cardBg,
          borderRadius: '8px',
          border: `1px solid ${borderColor}`
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: 'bold',
            color: textColor
          }}>
            Recent Evaluations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentSubs.slice(0, 5).map((sub) => (
              <div
                key={sub.submissionId}
                style={{
                  padding: '12px',
                  backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                  borderRadius: '6px',
                  border: `1px solid ${borderColor}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: textColor,
                    marginBottom: '4px'
                  }}>
                    {sub.title}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: isDark ? '#9ca3af' : '#6b7280'
                  }}>
                    {sub.evaluatedAt}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: accentColor,
                    minWidth: '40px',
                    textAlign: 'right'
                  }}>
                    {sub.score.toFixed(1)}
                  </div>
                  <div style={{
                    padding: '4px 8px',
                    backgroundColor: getTierColor(sub.tier),
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    minWidth: '60px',
                    textAlign: 'center'
                  }}>
                    {getTierIcon(sub.tier)} {sub.tier}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Footer */}
      <div style={{
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: `1px solid ${borderColor}`,
        textAlign: 'center',
        fontSize: '12px',
        color: isDark ? '#9ca3af' : '#6b7280'
      }}>
        Status: <span style={{ color: '#10b981', fontWeight: 'bold' }}>Active</span>
      </div>
    </div>
  );
}
