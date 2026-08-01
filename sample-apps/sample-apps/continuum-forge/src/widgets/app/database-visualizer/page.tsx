'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface DatabaseVisualizerData {
  query: string;
  columns: string[];
  rows: any[];
}

export default function DatabaseVisualizer() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<DatabaseVisualizerData>();

  if (!data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Executing Query...
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#121215' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const headerBg = isDark ? '#18181b' : '#e2e8f0';
  const borderColor = isDark ? '#27272a' : '#cbd5e0';

  return (
    <div style={{
      padding: '20px',
      background: bgColor,
      color: textColor,
      borderRadius: '10px',
      border: `1px solid ${borderColor}`,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#3b82f6', fontWeight: 600 }}>
          Database Query Result
        </h3>
        <div style={{
          background: isDark ? '#18181b' : '#edf2f7',
          padding: '10px 14px',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: isDark ? '#a0aec0' : '#4a5568',
          borderLeft: '3px solid #3b82f6'
        }}>
          {data.query}
        </div>
      </div>

      <div style={{
        overflowX: 'auto',
        borderRadius: '6px',
        border: `1px solid ${borderColor}`,
        maxHeight: '350px',
        overflowY: 'auto'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px'
        }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              {data.columns.map((col, i) => (
                <th key={i} style={{
                  background: headerBg,
                  padding: '10px 14px',
                  textAlign: 'left',
                  fontWeight: 600,
                  borderBottom: `2px solid ${borderColor}`,
                  color: isDark ? '#e2e8f0' : '#2d3748'
                }}>
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={data.columns.length} style={{ padding: '20px', textAlign: 'center', color: isDark ? '#a0aec0' : '#718096' }}>
                  No rows returned
                </td>
              </tr>
            ) : (
              data.rows.map((row, i) => (
                <tr key={i} style={{
                  borderBottom: `1px solid ${borderColor}`,
                  background: isDark 
                    ? (i % 2 === 0 ? '#121215' : '#18181b') 
                    : (i % 2 === 0 ? '#ffffff' : '#f7fafc')
                }}>
                  {data.columns.map((col, j) => (
                    <td key={j} style={{
                      padding: '8px 14px',
                      whiteSpace: 'nowrap',
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {String(row[col])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{
        marginTop: '10px',
        fontSize: '11px',
        textAlign: 'right',
        color: isDark ? '#a0aec0' : '#718096'
      }}>
        Showing {data.rows.length} rows
      </div>
    </div>
  );
}
