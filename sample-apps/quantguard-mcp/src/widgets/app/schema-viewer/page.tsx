'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Column {
  name: string;
  type: string;
  notnull: number;
  dflt_value?: any;
  pk: number;
}

interface Table {
  name: string;
  columns: Column[];
  indexes?: string[];
}

interface SchemaViewerData {
  status: 'success' | 'error';
  projectName?: string;
  tables: Table[];
  message: string;
  timestamp: string;
}

export default function SchemaViewerWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<SchemaViewerData>();

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
  const successColor = '#10b981';
  const errorColor = '#ef4444';

  const statusColor = data.status === 'success' ? successColor : errorColor;
  const statusIcon = data.status === 'success' ? '✅' : '❌';

  const getColumnTypeColor = (type: string) => {
    if (type.includes('TEXT')) return '#8b5cf6';
    if (type.includes('INTEGER')) return '#3b82f6';
    if (type.includes('REAL')) return '#f59e0b';
    if (type.includes('DATETIME')) return '#ec4899';
    return '#6b7280';
  };

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
            Database Schema
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '14px',
            opacity: 0.7,
          }}>
            {data.projectName || 'quantguard-mcp'} — {data.tables.length} tables
          </p>
        </div>
      </div>

      {/* Message */}
      <div style={{
        padding: '12px',
        background: headerBg,
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
        lineHeight: '1.5',
      }}>
        {data.message}
      </div>

      {/* Tables */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {data.tables.map((table: Table) => (
          <div
            key={table.name}
            style={{
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {/* Table Header */}
            <div style={{
              background: headerBg,
              padding: '12px',
              borderBottom: `1px solid ${borderColor}`,
              fontWeight: 'bold',
              fontSize: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>📊 {table.name}</span>
              <span style={{
                fontSize: '12px',
                opacity: 0.7,
                fontWeight: 'normal',
              }}>
                {table.columns.length} columns
              </span>
            </div>

            {/* Columns */}
            <div style={{
              padding: '12px',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
                marginBottom: '12px',
              }}>
                {table.columns.map((col: Column) => (
                  <div
                    key={col.name}
                    style={{
                      padding: '8px',
                      background: headerBg,
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{
                      fontWeight: 'bold',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      {col.pk ? '🔑' : '📝'} {col.name}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      opacity: 0.7,
                      fontFamily: 'monospace',
                    }}>
                      <span style={{
                        color: getColumnTypeColor(col.type),
                        fontWeight: 'bold',
                      }}>
                        {col.type}
                      </span>
                    </div>
                    {col.notnull && (
                      <div style={{
                        fontSize: '10px',
                        opacity: 0.6,
                        marginTop: '4px',
                      }}>
                        NOT NULL
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Indexes */}
              {table.indexes && table.indexes.length > 0 && (
                <div style={{
                  paddingTop: '12px',
                  borderTop: `1px solid ${borderColor}`,
                  fontSize: '12px',
                }}>
                  <div style={{
                    fontWeight: 'bold',
                    marginBottom: '6px',
                    opacity: 0.8,
                  }}>
                    📑 Indexes ({table.indexes.length})
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}>
                    {table.indexes.map((idx: string) => (
                      <span
                        key={idx}
                        style={{
                          padding: '4px 8px',
                          background: headerBg,
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {idx}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

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
