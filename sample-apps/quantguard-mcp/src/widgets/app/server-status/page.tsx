'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface ServerStatusData {
  status: 'success' | 'error' | 'starting';
  projectName: string;
  projectPath: string;
  message: string;
  bootLogs?: string[];
  timestamp: string;
}

export default function ServerStatusWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ServerStatusData>();

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
  const bgColor = isDark ? '#1f2937' : '#f9fafb';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const headerBg = isDark ? '#111827' : '#f3f4f6';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'starting':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'starting':
        return '⏳';
      default:
        return '❓';
    }
  };

  const statusColor = getStatusColor(data.status);
  const statusIcon = getStatusIcon(data.status);

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      borderRadius: '12px',
      border: `1px solid ${borderColor}`,
      color: textColor,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <span style={{
          fontSize: '32px',
          animation: data.status === 'starting' ? 'pulse 1s infinite' : 'none',
        }}>
          {statusIcon}
        </span>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            color: statusColor,
          }}>
            {data.status === 'success' && 'Server Running'}
            {data.status === 'error' && 'Server Error'}
            {data.status === 'starting' && 'Server Starting'}
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '14px',
            opacity: 0.7,
          }}>
            {data.projectName}
          </p>
        </div>
      </div>

      {/* Status Message */}
      <div style={{
        padding: '12px',
        background: headerBg,
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
        lineHeight: '1.5',
        borderLeft: `4px solid ${statusColor}`,
      }}>
        {data.message}
      </div>

      {/* Project Details */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <div style={{
          padding: '12px',
          background: headerBg,
          borderRadius: '8px',
        }}>
          <div style={{
            fontSize: '12px',
            opacity: 0.7,
            marginBottom: '4px',
          }}>
            Project Name
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
          }}>
            {data.projectName}
          </div>
        </div>
        <div style={{
          padding: '12px',
          background: headerBg,
          borderRadius: '8px',
        }}>
          <div style={{
            fontSize: '12px',
            opacity: 0.7,
            marginBottom: '4px',
          }}>
            Status
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: statusColor,
            textTransform: 'uppercase',
          }}>
            {data.status}
          </div>
        </div>
      </div>

      {/* Boot Logs */}
      {data.bootLogs && data.bootLogs.length > 0 && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: `1px solid ${borderColor}`,
        }}>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: 'bold',
          }}>
            📋 Boot Logs
          </h3>
          <div style={{
            background: isDark ? '#0f172a' : '#f8fafc',
            borderRadius: '8px',
            padding: '12px',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.6',
            maxHeight: '300px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            border: `1px solid ${borderColor}`,
          }}>
            {data.bootLogs.map((log: string, idx: number) => (
              <div key={idx} style={{
                color: log.includes('[ERROR]') ? '#ef4444' : 'inherit',
                opacity: log.includes('[ERROR]') ? 1 : 0.8,
              }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Check Status */}
      {data.status === 'success' && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '8px',
          border: `1px solid ${statusColor}`,
          fontSize: '13px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}>
            <span>✅</span>
            <span style={{ fontWeight: 'bold' }}>Health Check Available</span>
          </div>
          <div style={{
            fontSize: '12px',
            opacity: 0.8,
            lineHeight: '1.5',
          }}>
            The <code style={{
              background: headerBg,
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: 'monospace',
            }}>health-check</code> tool is ready to use. Try calling it to verify the server is responding.
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div style={{
        marginTop: '16px',
        fontSize: '12px',
        opacity: 0.6,
        textAlign: 'right',
      }}>
        {new Date(data.timestamp).toLocaleString()}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
