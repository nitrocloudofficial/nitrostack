'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface DeploymentData {
  provider: string;
  status: 'queued' | 'running' | 'ready' | 'failed' | 'not_implemented';
  message: string;
  deploymentId?: string;
  url?: string;
}

export default function DeploymentStatus() {
  const theme = useTheme();
  const { getToolOutput, openExternal } = useWidgetSDK();
  const data = getToolOutput<DeploymentData>();

  if (!data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
        fontFamily: 'system-ui, sans-serif'
      }}>
        Loading deployment details...
      </div>
    );
  }

  const isDark = theme === 'dark';
  const getProviderLogo = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'vercel': return '▲';
      case 'netlify': return '◈';
      case 'cloudflare-pages': return '☁️';
      case 'render': return '🟣';
      default: return '🚀';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return '#10b981'; // Green
      case 'running': return '#3b82f6'; // Blue
      case 'failed': return '#ef4444'; // Red
      case 'queued': return '#f59e0b'; // Amber
      default: return '#6b7280'; // Gray
    }
  };

  const statusColor = getStatusColor(data.status);

  return (
    <div style={{
      padding: '24px',
      background: isDark ? '#18181b' : '#ffffff',
      border: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`,
      borderRadius: '16px',
      color: isDark ? '#f4f4f5' : '#18181b',
      maxWidth: '420px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
      transition: 'all 0.3s ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        borderBottom: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`,
        paddingBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '24px',
            color: isDark ? '#ffffff' : '#000000',
          }}>
            {getProviderLogo(data.provider)}
          </span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              {data.provider.toUpperCase()} Deploy
            </h3>
            <span style={{ fontSize: '11px', opacity: 0.6 }}>
              ID: {data.deploymentId || 'N/A'}
            </span>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: `${statusColor}22`,
          color: statusColor,
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'uppercase'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            display: 'inline-block'
          }} />
          {data.status}
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        backgroundColor: isDark ? '#09090b' : '#fafafa',
        border: `1px solid ${isDark ? '#27272a' : '#f4f4f5'}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '13px', lineHeight: '1.5', opacity: 0.9 }}>
          {data.message}
        </div>
      </div>

      {/* URL Link button */}
      {data.url && (
        <button
          onClick={() => openExternal(data.url!)}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: isDark ? '#ffffff' : '#09090b',
            color: isDark ? '#09090b' : '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            marginBottom: '12px',
            transition: 'opacity 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          🌐 View Live Deployment
        </button>
      )}

      {/* Progress Timeline */}
      <div style={{
        marginTop: '20px',
        fontSize: '12px',
        color: isDark ? '#a1a1aa' : '#71717a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: '#10b981' }}>✓</span> <span>Project Configured</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: '#10b981' }}>✓</span> <span>Git Link Created</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: data.status === 'ready' ? '#10b981' : '#3b82f6' }}>
            {data.status === 'ready' ? '✓' : '●'}
          </span>
          <span style={{ fontWeight: data.status !== 'ready' ? 600 : 400 }}>
            {data.status === 'ready' ? 'Deployment Live' : 'Building on Cloud Provider...'}
          </span>
        </div>
      </div>
    </div>
  );
}
