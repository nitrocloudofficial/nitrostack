'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface ProjectScaffoldData {
  status: 'success' | 'error';
  projectName: string;
  projectPath: string;
  message: string;
  fileTree?: string[];
  timestamp: string;
}

export default function ProjectScaffoldWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ProjectScaffoldData>();

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
  const successColor = '#10b981';
  const errorColor = '#ef4444';

  const statusColor = data.status === 'success' ? successColor : errorColor;
  const statusIcon = data.status === 'success' ? '✅' : '❌';

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
        <span style={{ fontSize: '24px' }}>{statusIcon}</span>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            color: statusColor,
          }}>
            {data.status === 'success' ? 'Project Scaffolded' : 'Scaffold Failed'}
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

      {/* Message */}
      <div style={{
        padding: '12px',
        background: isDark ? '#111827' : '#f3f4f6',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
        lineHeight: '1.5',
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
          background: isDark ? '#111827' : '#f3f4f6',
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
          background: isDark ? '#111827' : '#f3f4f6',
          borderRadius: '8px',
        }}>
          <div style={{
            fontSize: '12px',
            opacity: 0.7,
            marginBottom: '4px',
          }}>
            Location
          </div>
          <div style={{
            fontSize: '12px',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}>
            {data.projectPath}
          </div>
        </div>
      </div>

      {/* File Tree */}
      {data.fileTree && data.fileTree.length > 0 && (
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
            Generated Files
          </h3>
          <div style={{
            background: isDark ? '#111827' : '#f3f4f6',
            borderRadius: '8px',
            padding: '12px',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.6',
            maxHeight: '300px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {data.fileTree.slice(0, 30).join('\n')}
            {data.fileTree.length > 30 && (
              <div style={{ opacity: 0.7, marginTop: '8px' }}>
                ... and {data.fileTree.length - 30} more files
              </div>
            )}
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
    </div>
  );
}
