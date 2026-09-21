'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface LabReport {
  id: string;
  testName: string;
  date: string;
  result: number;
  unit: string;
  normalRange: {
    min: number;
    max: number;
  };
  isAbnormal: boolean;
  notes?: string;
}

interface LabReportData {
  reports: LabReport[];
  count: number;
}

export default function LabReports() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();

  const data = getToolOutput<LabReportData>();

  if (!isReady) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Initializing...</div>;
  }

  if (!data) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading lab reports...</div>;
  }

  const reports = data.reports ?? [];

  if (reports.length === 0) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#999' : '#666',
      }}>
        🧪 No lab reports available
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const borderColor = isDark ? '#333' : '#e5e7eb';
  const textColor = isDark ? '#ffffff' : '#000000';
  const mutedColor = isDark ? '#999' : '#666';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (isAbnormal: boolean) => {
    if (isAbnormal) {
      return {
        label: 'Abnormal',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        icon: '⚠️'
      };
    }
    return {
      label: 'Normal',
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      icon: '✅'
    };
  };

  const isInRange = (value: number, min: number, max: number) => {
    return value >= min && value <= max;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '600px',
    }}>
      <div style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: textColor,
        marginBottom: '8px',
      }}>
        🧪 Lab Reports ({reports.length})
      </div>

      {reports.map((report) => {
        const status = getStatusBadge(report.isAbnormal);
        const inRange = isInRange(report.result, report.normalRange.min, report.normalRange.max);

        return (
          <div
            key={report.id}
            style={{
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              padding: '16px',
              boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px',
            }}>
              <div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: textColor,
                }}>
                  {report.testName}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: mutedColor,
                  margin: '4px 0 0 0',
                }}>
                  📅 {formatDate(report.date)}
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: status.bgColor,
                color: status.color,
                fontSize: '12px',
                fontWeight: '600',
              }}>
                <span>{status.icon}</span>
                <span>{status.label}</span>
              </div>
            </div>

            <div style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginBottom: '8px',
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: inRange ? '#10b981' : '#ef4444',
                  fontFamily: 'monospace',
                }}>
                  {report.result}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: mutedColor,
                }}>
                  {report.unit}
                </div>
              </div>

              <div style={{
                fontSize: '12px',
                color: mutedColor,
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span>Normal Range:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>
                  {report.normalRange.min} - {report.normalRange.max} {report.unit}
                </span>
              </div>
            </div>

            {report.notes && (
              <div style={{
                fontSize: '12px',
                color: mutedColor,
                fontStyle: 'italic',
                paddingTop: '8px',
                borderTop: `1px solid ${borderColor}`,
              }}>
                💬 {report.notes}
              </div>
            )}

            <div style={{
              fontSize: '11px',
              color: mutedColor,
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: `1px solid ${borderColor}`,
              fontStyle: 'italic',
            }}>
              ℹ️ Consult your doctor for interpretation of these results.
            </div>
          </div>
        );
      })}
    </div>
  );
}
