'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface RepairCenter {
  title: string;
  url: string;
  snippet: string;
}

interface RepairData {
  status: string;
  data?: {
    repairCenters: RepairCenter[];
    count: number;
  };
  error?: string;
}

export default function FindRepairCenterWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput, openExternal } = useWidgetSDK();
  const toolData = getToolOutput<RepairData>();

  if (!isReady) {
    return <div style={{ padding: '24px', textAlign: 'center', color: theme === 'dark' ? '#fff' : '#000' }}>Initializing...</div>;
  }

  if (!toolData) {
    return <div style={{ padding: '24px', textAlign: 'center', color: theme === 'dark' ? '#999' : '#666' }}>No data available.</div>;
  }

  if (toolData.status === 'error') {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
        <p>Error: {toolData.error}</p>
      </div>
    );
  }

  const centers = toolData.data?.repairCenters || [];
  
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#f3f4f6';
  const cardBg = isDark ? '#262626' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1f2937';
  const subTextColor = isDark ? '#a3a3a3' : '#4b5563';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const accentColor = isDark ? '#3b82f6' : '#2563eb';

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      borderRadius: '12px',
      color: textColor,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      border: `1px solid ${borderColor}`,
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ fontSize: '32px' }}>🛠️</div>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600' }}>
            Repair Centers Found
          </h2>
          <p style={{ margin: '0', fontSize: '14px', color: subTextColor }}>
            {toolData.data?.count || 0} locations or guides
          </p>
        </div>
      </div>

      {centers.length === 0 ? (
        <p style={{ color: subTextColor }}>No repair centers found for this location.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {centers.map((center, idx) => (
            <div key={idx} style={{ 
              background: cardBg, 
              padding: '16px', 
              borderRadius: '8px', 
              border: `1px solid ${borderColor}` 
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                <button
                  onClick={() => openExternal(center.url)}
                  style={{
                    color: accentColor,
                    background: 'transparent',
                    border: 'none',
                    padding: '0',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '16px',
                    textAlign: 'left',
                    textDecoration: 'none'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {center.title}
                </button>
              </h3>
              <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5', color: subTextColor }}>
                {center.snippet}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#10b981', wordBreak: 'break-all' }}>
                {center.url}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
