'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface SyncStatusData {
  success: boolean;
  status?: {
    enabled: boolean;
    lastSyncedTimestamp: number | null;
    lastSyncStatus: string;
    lastSyncError: string | null;
    syncIntervalSeconds: number;
  };
  error?: string;
}

export default function SyncStatusWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  
  const data = getToolOutput<SyncStatusData>();

  if (!isReady) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Initializing...
      </div>
    );
  }

  if (!data) {
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
  const bgColor = isDark ? '#1f2937' : '#f3f4f6';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const successColor = '#10b981';
  const errorColor = '#ef4444';
  const warningColor = '#f59e0b';

  if (!data.success) {
    return (
      <div style={{
        padding: '24px',
        background: isDark ? '#1f2937' : '#f3f4f6',
        borderRadius: '12px',
        border: `1px solid ${borderColor}`,
        color: errorColor,
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
          ⚠️ Sync Status Error
        </div>
        <div style={{ fontSize: '14px', opacity: 0.8 }}>
          {data.error || 'Unknown error occurred'}
        </div>
      </div>
    );
  }

  const status = data.status;
  if (!status) {
    return (
      <div style={{
        padding: '24px',
        background: isDark ? '#1f2937' : '#f3f4f6',
        borderRadius: '12px',
        border: `1px solid ${borderColor}`,
        color: textColor,
      }}>
        <div style={{ fontSize: '14px', opacity: 0.7 }}>
          No sync status data available
        </div>
      </div>
    );
  }

  const lastSyncDate = status.lastSyncedTimestamp 
    ? new Date(status.lastSyncedTimestamp).toLocaleString()
    : 'Never';

  const statusColor = status.enabled ? successColor : warningColor;
  const statusText = status.enabled ? 'Active' : 'Paused';

  return (
    <div style={{
      padding: '24px',
      background: isDark
        ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'
        : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
      borderRadius: '12px',
      border: `1px solid ${borderColor}`,
      color: textColor,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🔄</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              Device Sync Status
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
              Real-time synchronization monitoring
            </p>
          </div>
        </div>
        <div style={{
          padding: '8px 16px',
          borderRadius: '8px',
          background: statusColor,
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
        }}>
          {statusText}
        </div>
      </div>

      {/* Status Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '16px',
      }}>
        {/* Sync Interval */}
        <div style={{
          padding: '12px',
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
        }}>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
            Sync Interval
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {status.syncIntervalSeconds}s
          </div>
        </div>

        {/* Last Sync Status */}
        <div style={{
          padding: '12px',
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
        }}>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
            Last Sync Status
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: status.lastSyncStatus === 'success' ? successColor : errorColor,
          }}>
            {status.lastSyncStatus || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Last Synced Timestamp */}
      <div style={{
        padding: '12px',
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        borderRadius: '8px',
        border: `1px solid ${borderColor}`,
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
          Last Synced
        </div>
        <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>
          {lastSyncDate}
        </div>
      </div>

      {/* Error Message (if any) */}
      {status.lastSyncError && (
        <div style={{
          padding: '12px',
          background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderRadius: '8px',
          border: `1px solid ${errorColor}`,
          color: errorColor,
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
            ⚠️ Last Error
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            {status.lastSyncError}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: `1px solid ${borderColor}`,
        fontSize: '11px',
        opacity: 0.6,
        textAlign: 'center',
      }}>
        ✨ DTaaS Device Sync Monitor
      </div>
    </div>
  );
}
