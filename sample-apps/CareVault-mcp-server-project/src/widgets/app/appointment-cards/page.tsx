'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: string;
}

interface AppointmentData {
  appointments: Appointment[];
  count: number;
}

export default function AppointmentCards() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();

  const data = getToolOutput<AppointmentData>();

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
        Loading appointments...
      </div>
    );
  }

  const appointments = data.appointments ?? [];

  if (appointments.length === 0) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#999' : '#666',
        background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
        borderRadius: '8px',
      }}>
        <p style={{ margin: 0, fontSize: '16px' }}>📅 No upcoming appointments</p>
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
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '500px',
    }}>
      <div style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: textColor,
        marginBottom: '8px',
      }}>
        📋 Upcoming Appointments ({appointments.length})
      </div>

      {appointments.map((apt) => (
        <div
          key={apt.id}
          style={{
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            padding: '16px',
            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.boxShadow = isDark
              ? '0 4px 12px rgba(0,0,0,0.4)'
              : '0 4px 12px rgba(0,0,0,0.15)';
            el.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.boxShadow = isDark
              ? '0 2px 8px rgba(0,0,0,0.3)'
              : '0 2px 8px rgba(0,0,0,0.1)';
            el.style.transform = 'translateY(0)';
          }}
        >
          {/* Doctor Info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px',
              flexShrink: 0,
            }}>
              👨‍⚕️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: textColor,
                margin: 0,
              }}>
                {apt.doctorName}
              </div>
              <div style={{
                fontSize: '13px',
                color: mutedColor,
                margin: '2px 0 0 0',
              }}>
                {apt.specialty}
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '12px',
            paddingBottom: '12px',
            borderBottom: `1px solid ${borderColor}`,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '12px',
                color: mutedColor,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}>
                📅 Date
              </div>
              <div style={{
                fontSize: '15px',
                fontWeight: '600',
                color: textColor,
              }}>
                {formatDate(apt.date)}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '12px',
                color: mutedColor,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}>
                🕐 Time
              </div>
              <div style={{
                fontSize: '15px',
                fontWeight: '600',
                color: textColor,
              }}>
                {apt.time}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget;
              btn.style.opacity = '0.9';
              btn.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget;
              btn.style.opacity = '1';
              btn.style.transform = 'scale(1)';
            }}
          >
            📞 Reschedule
          </button>
        </div>
      ))}
    </div>
  );
}
