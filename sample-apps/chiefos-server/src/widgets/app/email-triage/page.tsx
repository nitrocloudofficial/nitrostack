'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface EmailTriageData {
  emailId: string;
  sender: string;
  subject: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  actionItems: string[];
  requiresApproval: boolean;
  timestamp: string;
}

export default function EmailTriageWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<EmailTriageData>();

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
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const cardBg = isDark ? '#2d2d2d' : '#f9fafb';
  const textColor = isDark ? '#ffffff' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const borderColor = isDark ? '#404040' : '#e5e7eb';

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      work: '💼',
      personal: '👤',
      urgent: '🚨',
      spam: '🚫',
    };
    return icons[category] || '📧';
  };

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      color: textColor,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h1 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 'bold' }}>
        Email Triage Analysis
      </h1>

      {/* Email Header */}
      <div style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>From</div>
            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>{data.sender}</div>
            <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>Subject</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{data.subject}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{getCategoryIcon(data.category)}</div>
            <div style={{ fontSize: '12px', color: mutedColor, textTransform: 'capitalize' }}>
              {data.category}
            </div>
          </div>
        </div>

        {/* Priority Badge */}
        <div style={{
          display: 'inline-block',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          background: getPriorityColor(data.priority),
          color: '#ffffff',
          textTransform: 'uppercase',
        }}>
          {data.priority} Priority
        </div>

        {data.requiresApproval && (
          <div
            style={{
              display: 'inline-block',
              marginLeft: '8px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              background: '#8b5cf6',
              color: '#ffffff',
            }}
          >
            ⚠️ Requires Approval
          </div>
        )}
      </div>

      {/* Action Items */}
      {data.actionItems && data.actionItems.length > 0 && (
        <div style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>
            Action Items
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.actionItems.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  background: isDark ? '#1a1a1a' : '#ffffff',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div style={{ fontSize: '18px', marginTop: '2px' }}>✓</div>
                <div style={{ flex: 1, fontSize: '14px', lineHeight: '1.5' }}>{item}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div style={{
        fontSize: '12px',
        color: mutedColor,
        textAlign: 'center',
        paddingTop: '16px',
        borderTop: `1px solid ${borderColor}`,
      }}>
        Analyzed on {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
