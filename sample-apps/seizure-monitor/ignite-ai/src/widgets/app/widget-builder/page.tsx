'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface WidgetBuilderData {
  status: string;
  widgetName: string;
  widgetType: string;
  message: string;
  preview: {
    title: string;
    fields: Array<{
      name: string;
      value: any;
      label: string;
    }>;
    widgetType: string;
  };
  code: string;
  filePath: string;
  dataFields: Array<{
    name: string;
    type: string;
    label: string;
  }>;
  timestamp: string;
}

export default function WidgetBuilder() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();

  const data = getToolOutput<WidgetBuilderData>();

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

  const getWidgetIcon = (type: string) => {
    const icons: Record<string, string> = {
      card: '📇',
      list: '📋',
      chart: '📊',
      form: '📝',
      detail: '📄'
    };
    return icons[type] || '🎨';
  };

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
        <span style={{ fontSize: '32px' }}>🎯</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            {data.preview.title}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.7 }}>
            {getWidgetIcon(data.widgetType)} {data.widgetType.charAt(0).toUpperCase() + data.widgetType.slice(1)} Widget
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

      {/* Live Preview */}
      <div style={{
        marginBottom: '24px',
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: accentColor,
        }}>
          👁️ Live Preview
        </h3>
        <div style={{
          background: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.05)',
          borderRadius: '12px',
          padding: '20px',
          border: `2px dashed ${accentColor}33`,
          minHeight: '150px',
        }}>
          <div style={{
            background: isDark ? '#1a1a1a' : '#ffffff',
            borderRadius: '8px',
            padding: '16px',
            border: `1px solid ${borderColor}`,
          }}>
            <h4 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: 'bold',
              color: accentColor,
            }}>
              {data.preview.title}
            </h4>
            <div style={{
              display: 'grid',
              gap: '12px',
            }}>
              {data.preview.fields.map((field, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${borderColor}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '13px', opacity: 0.8 }}>
                    {field.label}:
                  </span>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: accentColor,
                  }}>
                    {typeof field.value === 'number'
                      ? field.value.toFixed(2)
                      : String(field.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data Fields */}
      <div style={{
        marginBottom: '24px',
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: accentColor,
        }}>
          📊 Data Fields
        </h3>
        <div style={{
          display: 'grid',
          gap: '8px',
        }}>
          {data.dataFields.map((field, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                border: `1px solid #10b98133`,
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#10b981' }}>
                {field.name}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                Type: <code style={{ background: codeBackground, padding: '2px 6px', borderRadius: '4px' }}>
                  {field.type}
                </code>
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                Label: {field.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generated Code */}
      <div style={{
        marginBottom: '20px',
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: accentColor,
        }}>
          💻 Generated Component Code
        </h3>
        <div style={{
          background: codeBackground,
          borderRadius: '8px',
          padding: '16px',
          fontSize: '10px',
          fontFamily: 'monospace',
          maxHeight: '300px',
          overflowY: 'auto',
          border: `1px solid ${borderColor}`,
          lineHeight: '1.4',
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

      {/* Widget Type Badge */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          background: accentColor,
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
        }}>
          {getWidgetIcon(data.widgetType)} {data.widgetType}
        </div>
        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          fontSize: '12px',
        }}>
          {data.dataFields.length} fields
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
