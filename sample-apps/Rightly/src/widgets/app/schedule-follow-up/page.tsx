'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { useEffect, useState } from 'react';

export const dynamic = 'force-dynamic';

interface FollowUpData {
  reminderTitle: string;
  reminderDate: string;
  suggestedAction: string;
  googleCalendarUrl: string;
  icsContent: string;
}

export default function ScheduleFollowUpWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput, openExternal } = useWidgetSDK();
  const data = getToolOutput<FollowUpData>();
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (data?.icsContent) {
      const dataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(data.icsContent)}`;
      setDownloadUrl(dataUri);
    }
  }, [data?.icsContent]);

  if (!isReady) {
    return <div style={{ padding: '24px', textAlign: 'center', color: theme === 'dark' ? '#fff' : '#000' }}>Initializing...</div>;
  }

  if (!data) {
    return <div style={{ padding: '24px', textAlign: 'center', color: theme === 'dark' ? '#999' : '#666' }}>No reminder data available.</div>;
  }

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
        <div style={{ fontSize: '32px' }}>📅</div>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600' }}>
            Follow-Up Reminder Scheduled
          </h2>
          <p style={{ margin: '0', fontSize: '14px', color: subTextColor }}>
            {data.reminderDate}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ background: cardBg, padding: '20px', borderRadius: '8px', border: `1px solid ${borderColor}`, marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: accentColor }}>
          {data.reminderTitle}
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: '1.5' }}>
          <strong>Suggested Action:</strong> {data.suggestedAction}
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Google Calendar Link */}
          <button
            onClick={() => openExternal(data.googleCalendarUrl)}
            style={{
              display: 'inline-block',
              background: '#4285F4',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              padding: '10px 16px',
              borderRadius: '6px',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            + Add to Google Calendar
          </button>

          {/* Download ICS Button */}
          {downloadUrl && (
            <button
              onClick={() => openExternal(downloadUrl)}
              style={{
                display: 'inline-block',
                background: isDark ? '#333333' : '#e5e7eb',
                color: textColor,
                border: 'none',
                cursor: 'pointer',
                padding: '10px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              📥 Download .ics File
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        fontSize: '12px',
        color: subTextColor,
        textAlign: 'center'
      }}>
        Make sure to save this event so you don't forget to follow up!
      </div>
    </div>
  );
}
