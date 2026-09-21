'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  duration: number;
  attendees: number;
}

interface CalendarSummaryData {
  email: string;
  period: string;
  totalMeetings: number;
  meetings: Meeting[];
  busyHours: number;
  availableSlots: number;
}

export default function MeetingReviewWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<CalendarSummaryData>();

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

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const meetings = data.meetings ?? [];

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      color: textColor,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h1 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 'bold' }}>
        Calendar Summary
      </h1>

      {/* Calendar Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <div style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📅</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>
            {data.totalMeetings ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: mutedColor }}>Total Meetings</div>
        </div>

        <div style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏱️</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>
            {data.busyHours ?? 0}h
          </div>
          <div style={{ fontSize: '12px', color: mutedColor }}>Busy Hours</div>
        </div>

        <div style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>✨</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>
            {data.availableSlots ?? 0}h
          </div>
          <div style={{ fontSize: '12px', color: mutedColor }}>Available</div>
        </div>
      </div>

      {/* Meetings List */}
      <div style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '16px',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>
          Upcoming Meetings
        </h2>

        {meetings && meetings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
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
                <div style={{ fontSize: '20px', marginTop: '2px' }}>📍</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{meeting.title}</div>
                  <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '6px' }}>
                    {formatDate(meeting.startTime)} at {formatTime(meeting.startTime)}
                  </div>
                  <div style={{ fontSize: '12px', color: mutedColor }}>
                    Duration: {meeting.duration} min • Attendees: {meeting.attendees}
                  </div>
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: '#dbeafe',
                    color: '#1e40af',
                  }}
                >
                  {meeting.duration}m
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: mutedColor, padding: '20px' }}>
            No meetings scheduled
          </div>
        )}
      </div>

      {/* Period Info */}
      <div style={{
        fontSize: '12px',
        color: mutedColor,
        textAlign: 'center',
        paddingTop: '16px',
        borderTop: `1px solid ${borderColor}`,
        marginTop: '16px',
      }}>
        Summary for {data.period}
      </div>
    </div>
  );
}
