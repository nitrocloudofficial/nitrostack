'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface RepositoryScoreData {
  repositoryName: string;
  repositoryUrl: string;
  completenessScore: number;
  codeQualityScore: number;
  documentationScore: number;
  testCoverageScore: number;
  averageScore: number;
  tier: string;
  status: string;
}

export default function RepositoryScoreWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();

  const data = getToolOutput<RepositoryScoreData>();

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

  const renderScoreBar = (label: string, score?: number) => {
    const validScore = score ?? 0;
    const percentage = Math.min(100, Math.max(0, validScore));
    const barColor = percentage >= 80 ? '#10b981' : percentage >= 60 ? '#f59e0b' : '#ef4444';

    return (
      <div key={label} style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '6px',
          fontSize: '14px'
        }}>
          <span style={{ color: textColor }}>{label}</span>
          <span style={{ fontWeight: 'bold', color: barColor }}>{validScore.toFixed(1)}</span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: isDark ? '#333333' : '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: barColor,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{
      padding: '24px',
      backgroundColor: bgColor,
      borderRadius: '12px',
      border: `1px solid ${borderColor}`,
      color: textColor,
      maxWidth: '500px',
      boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${borderColor}`
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            color: textColor
          }}>
            Repository Score
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '13px',
            color: isDark ? '#9ca3af' : '#6b7280'
          }}>
            {data.repositoryName}
          </p>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '12px',
          backgroundColor: isDark ? '#2d3748' : '#f3f4f6',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>
            {getTierIcon(data.tier)}
          </div>
          <div style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: getTierColor(data.tier)
          }}>
            {data.tier}
          </div>
        </div>
      </div>

      {/* Average Score */}
      <div style={{
        padding: '16px',
        backgroundColor: isDark ? '#2d3748' : '#f9fafb',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '12px',
          color: isDark ? '#9ca3af' : '#6b7280',
          marginBottom: '8px'
        }}>
          Overall Score
        </div>
        <div style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: accentColor
        }}>
          {data.averageScore?.toFixed(1) ?? '0.0'}
        </div>
        <div style={{
          fontSize: '12px',
          color: isDark ? '#9ca3af' : '#6b7280',
          marginTop: '4px'
        }}>
          out of 100
        </div>
      </div>

      {/* Score Breakdown */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          color: textColor
        }}>
          Score Breakdown
        </h3>
        {renderScoreBar('Completeness', data.completenessScore)}
        {renderScoreBar('Code Quality', data.codeQualityScore)}
        {renderScoreBar('Documentation', data.documentationScore)}
        {renderScoreBar('Test Coverage', data.testCoverageScore)}
      </div>

      {/* Status Badge */}
      <div style={{
        padding: '12px',
        backgroundColor: isDark ? '#2d3748' : '#f3f4f6',
        borderRadius: '8px',
        textAlign: 'center',
        fontSize: '13px'
      }}>
        <span style={{
          display: 'inline-block',
          padding: '4px 12px',
          backgroundColor: data.status === 'evaluated' ? '#10b981' : '#f59e0b',
          color: 'white',
          borderRadius: '6px',
          fontWeight: 'bold'
        }}>
          {data.status === 'evaluated' ? '✓ Evaluated' : '⏳ Pending'}
        </span>
      </div>

      {/* Repository Link */}
      {data.repositoryUrl && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: `1px solid ${borderColor}`,
          textAlign: 'center'
        }}>
          <a
            href={data.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: accentColor,
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            View Repository →
          </a>
        </div>
      )}
    </div>
  );
}
