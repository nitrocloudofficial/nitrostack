'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface ProjectScaffoldData {
  status: string;
  projectName: string;
  message: string;
  structure: {
    root: string;
    server: string;
    modules: string;
    widgets: string;
    config: string;
    packageJson: string;
    health: string;
  };
  components: {
    mcp_server: boolean;
    react_widget: boolean;
    nextjs_widget: boolean;
    typescript: boolean;
    zod_validation: boolean;
    nitrostack_core: boolean;
  };
  files: string[];
  totalFiles: number;
  timestamp: string;
}

export default function ProjectScaffold() {
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
        Loading...
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333' : '#e5e7eb';
  const accentColor = '#3B82F6';

  return (
    <div style={{
      padding: '24px',
      background: isDark
        ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
        : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
      borderRadius: '16px',
      color: textColor,
      maxWidth: '600px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: `2px solid ${borderColor}`,
      }}>
        <span style={{ fontSize: '32px' }}>🚀</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            {data.projectName}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.7 }}>
            Project Scaffolded Successfully
          </p>
        </div>
      </div>

      {/* Status Badge */}
      <div style={{
        display: 'inline-block',
        padding: '8px 16px',
        borderRadius: '8px',
        background: '#10b981',
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold',
        marginBottom: '20px',
      }}>
        ✓ {data.status.toUpperCase()}
      </div>

      {/* Message */}
      <p style={{
        fontSize: '14px',
        lineHeight: '1.6',
        marginBottom: '20px',
        opacity: 0.9,
      }}>
        {data.message}
      </p>

      {/* Components Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '24px',
      }}>
        {Object.entries(data.components).map(([key, enabled]) => (
          <div
            key={key}
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: enabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
              border: `1px solid ${enabled ? '#10b981' : '#9ca3af'}`,
              fontSize: '13px',
            }}
          >
            <span style={{ marginRight: '8px' }}>
              {enabled ? '✓' : '○'}
            </span>
            <span style={{ textTransform: 'capitalize' }}>
              {key.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>

      {/* File Structure */}
      <div style={{
        marginBottom: '20px',
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: accentColor,
        }}>
          📁 Project Structure ({data.totalFiles} files)
        </h3>
        <div style={{
          background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
          borderRadius: '8px',
          padding: '12px',
          maxHeight: '200px',
          overflowY: 'auto',
          fontSize: '12px',
          fontFamily: 'monospace',
          lineHeight: '1.6',
        }}>
          {data.files.map((file, idx) => (
            <div key={idx} style={{ opacity: 0.8 }}>
              {file}
            </div>
          ))}
        </div>
      </div>

      {/* Directory Structure */}
      <div style={{
        background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}>
        <h3 style={{
          fontSize: '13px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: accentColor,
        }}>
          📂 Key Directories
        </h3>
        <div style={{ lineHeight: '1.8', opacity: 0.8 }}>
          <div>📦 {data.structure.root}</div>
          <div style={{ marginLeft: '16px' }}>
            <div>📄 {data.structure.packageJson}</div>
            <div>⚙️ {data.structure.config}</div>
            <div>📁 {data.structure.modules}</div>
            <div style={{ marginLeft: '16px' }}>
              <div>🔧 ignite/</div>
              <div>🧮 calculator/</div>
            </div>
            <div>🎨 {data.structure.widgets}</div>
            <div style={{ marginLeft: '16px' }}>
              <div>📊 project-scaffold/</div>
              <div>✏️ tool-editor/</div>
              <div>🎯 widget-builder/</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: `1px solid ${borderColor}`,
        fontSize: '11px',
        opacity: 0.6,
        textAlign: 'center',
      }}>
        Created at {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
