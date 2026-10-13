'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface ToolEditorData {
  status: string;
  toolName: string;
  description: string;
  definition: {
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, any>;
      required: string[];
    };
    outputSchema: {
      type: string;
      properties: Record<string, any>;
    };
  };
  code: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  filePath: string;
  timestamp: string;
}

export default function ToolEditor() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();

  const data = getToolOutput<ToolEditorData>();

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
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333' : '#e5e7eb';
  const accentColor = '#3B82F6';
  const codeBackground = isDark ? '#0f172a' : '#f8fafc';

  return (
    <div style={{
      padding: '24px',
      background: isDark
        ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
        : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
      borderRadius: '16px',
      color: textColor,
      maxWidth: '700px',
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
        <span style={{ fontSize: '32px' }}>✏️</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            {data.toolName}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.7 }}>
            Tool Definition
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

      {/* Description */}
      <p style={{
        fontSize: '14px',
        lineHeight: '1.6',
        marginBottom: '20px',
        opacity: 0.9,
      }}>
        {data.description}
      </p>

      {/* Parameters Section */}
      <div style={{
        marginBottom: '24px',
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: accentColor,
        }}>
          📋 Parameters
        </h3>
        <div style={{
          display: 'grid',
          gap: '8px',
        }}>
          {data.parameters.map((param, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                border: `1px solid ${accentColor}33`,
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: 'bold', color: accentColor }}>
                {param.name}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                Type: <code style={{ background: codeBackground, padding: '2px 6px', borderRadius: '4px' }}>
                  {param.type}
                </code>
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                {param.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input/Output Schema */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {/* Input Schema */}
        <div>
          <h3 style={{
            fontSize: '13px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: accentColor,
          }}>
            📥 Input Schema
          </h3>
          <div style={{
            background: codeBackground,
            borderRadius: '8px',
            padding: '12px',
            fontSize: '11px',
            fontFamily: 'monospace',
            maxHeight: '150px',
            overflowY: 'auto',
            border: `1px solid ${borderColor}`,
          }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(data.definition.inputSchema, null, 2)}
            </pre>
          </div>
        </div>

        {/* Output Schema */}
        <div>
          <h3 style={{
            fontSize: '13px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: accentColor,
          }}>
            📤 Output Schema
          </h3>
          <div style={{
            background: codeBackground,
            borderRadius: '8px',
            padding: '12px',
            fontSize: '11px',
            fontFamily: 'monospace',
            maxHeight: '150px',
            overflowY: 'auto',
            border: `1px solid ${borderColor}`,
          }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(data.definition.outputSchema, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Code Section */}
      <div style={{
        marginBottom: '20px',
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: accentColor,
        }}>
          💻 Generated Code
        </h3>
        <div style={{
          background: codeBackground,
          borderRadius: '8px',
          padding: '16px',
          fontSize: '11px',
          fontFamily: 'monospace',
          maxHeight: '250px',
          overflowY: 'auto',
          border: `1px solid ${borderColor}`,
          lineHeight: '1.5',
        }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#e2e8f0' }}>
            {data.code}
          </pre>
        </div>
      </div>

      {/* File Path */}
      <div style={{
        background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        fontFamily: 'monospace',
        marginBottom: '20px',
        border: `1px solid ${borderColor}`,
      }}>
        <div style={{ opacity: 0.7, marginBottom: '4px' }}>File Path:</div>
        <div style={{ color: accentColor, fontWeight: 'bold' }}>
          {data.filePath}
        </div>
      </div>

      {/* Footer */}
      <div style={{
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
