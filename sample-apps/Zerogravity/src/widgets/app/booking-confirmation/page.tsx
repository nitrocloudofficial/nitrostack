'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface BookingData {
  id: string;
  patientId: string;
  doctorName: string;
  hospitalName: string;
  specialtyName: string;
  dateTime: string;
  status: string;
  notes?: string;
}

export default function BookingConfirmationWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<BookingData>();

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
        Loading confirmation...
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const mutedTextColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const accentColor = '#10B981'; // Green for success / checkmark

  // Formatted date string
  const dateObj = new Date(data.dateTime);
  const formattedDate = dateObj.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={{
      padding: '24px',
      background: isDark ? '#0f0f0f' : '#f9fafb',
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
      border: `1px solid ${borderColor}`,
      maxWidth: '480px',
      margin: '0 auto'
    }}>
      <div style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'center',
        boxShadow: isDark ? '0 10px 15px rgba(0,0,0,0.4)' : '0 4px 6px rgba(0,0,0,0.05)',
      }}>
        {/* Success Icon */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.15)',
          color: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          margin: '0 auto 16px auto',
        }}>
          ✓
        </div>

        <h3 style={{
          margin: '0 0 4px 0',
          fontSize: '20px',
          fontWeight: 'bold',
          color: textColor
        }}>
          Booking Confirmed
        </h3>
        <p style={{
          margin: '0 0 20px 0',
          fontSize: '13px',
          color: mutedTextColor
        }}>
          Appointment Reference: <code style={{ color: '#3B82F6', fontWeight: 'bold' }}>{data.id}</code>
        </p>

        {/* Details Card */}
        <div style={{
          textAlign: 'left',
          borderTop: `1px dashed ${borderColor}`,
          borderBottom: `1px dashed ${borderColor}`,
          padding: '16px 0',
          marginBottom: '20px'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: mutedTextColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Specialist
            </span>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: textColor }}>
              {data.doctorName} ({data.specialtyName})
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: mutedTextColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Facility
            </span>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: textColor }}>
              🏥 {data.hospitalName}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: mutedTextColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Date & Time
            </span>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: textColor }}>
              📅 {formattedDate} at {formattedTime}
            </div>
          </div>

          {data.notes && (
            <div>
              <span style={{ fontSize: '11px', color: mutedTextColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Reason / Notes
              </span>
              <div style={{ fontSize: '13px', color: mutedTextColor, fontStyle: 'italic', marginTop: '2px' }}>
                "{data.notes}"
              </div>
            </div>
          )}
        </div>

        <div style={{
          fontSize: '11px',
          color: mutedTextColor,
        }}>
          Please arrive 15 minutes before your scheduled appointment time.
        </div>
      </div>
    </div>
  );
}
