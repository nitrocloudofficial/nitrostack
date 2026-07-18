'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface TriageResultData {
  urgency: 'low' | 'medium' | 'high' | 'critical';
  recommendedSpecialtyId: string;
  recommendedSpecialtyName: string;
  notes: string;
}

export default function TriageResultWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<TriageResultData>();

  if (!isReady) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
        fontFamily: 'Inter, system-ui, sans-serif'
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
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        Loading triage result...
      </div>
    );
  }

  const { urgency, recommendedSpecialtyName, notes } = data;
  const isDark = theme === 'dark';
  
  // Color styling based on urgency
  let urgencyColor = '#10B981'; // low - green
  let urgencyBg = 'rgba(16, 185, 129, 0.15)';
  
  if (urgency === 'medium') {
    urgencyColor = '#F59E0B'; // yellow/amber
    urgencyBg = 'rgba(245, 158, 11, 0.15)';
  } else if (urgency === 'high') {
    urgencyColor = '#EF4444'; // red
    urgencyBg = 'rgba(239, 68, 68, 0.15)';
  } else if (urgency === 'critical') {
    urgencyColor = '#7F1D1D'; // dark red
    urgencyBg = 'rgba(127, 29, 29, 0.2)';
  }

  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const mutedTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';

  return (
    <div style={{
      padding: '24px',
      background: isDark ? '#0f0f0f' : '#f9fafb',
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
      border: `1px solid ${borderColor}`,
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '20px',
        fontWeight: 'bold',
        color: textColor
      }}>
        Symptom Analysis Report
      </h3>

      <div style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '20px',
        boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {/* Severity Badge */}
        <div style={{
          display: 'inline-block',
          color: urgencyColor,
          background: urgencyBg,
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.7px',
          marginBottom: '16px',
          border: `1px solid ${urgencyColor}`
        }}>
          🚨 Urgency: {urgency}
        </div>

        {/* Recommended Specialty */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: mutedTextColor, display: 'block', marginBottom: '4px' }}>
            Recommended Specialty
          </span>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#3B82F6' }}>
            🩺 {recommendedSpecialtyName}
          </span>
        </div>

        {/* Notes */}
        <div style={{
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          borderRadius: '8px',
          padding: '14px',
          fontSize: '14px',
          lineHeight: '1.5',
          color: textColor,
          borderLeft: `4px solid ${urgencyColor}`
        }}>
          <strong>Clinical Note:</strong> {notes}
        </div>
      </div>
    </div>
  );
}
