'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Doctor {
  id: string;
  name: string;
  specialtyId: string;
  specialtyName: string;
  hospitalId: string;
  hospitalName: string;
  imageUrl: string;
}

interface DoctorsData {
  doctors: Doctor[];
}

export default function DoctorProfiles() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<DoctorsData>();

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
        Loading...
      </div>
    );
  }

  const doctors = data.doctors ?? [];

  if (doctors.length === 0) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        No doctors found for this specialty.
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const accentColor = '#3B82F6'; // Slate Blue/Cyan accent

  return (
    <div style={{
      padding: '24px',
      background: isDark ? '#0f0f0f' : '#f9fafb',
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <h2 style={{
        margin: '0 0 24px 0',
        fontSize: '24px',
        fontWeight: 'bold',
        color: textColor,
      }}>
        Available Medical Specialists
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px',
      }}>
        {doctors.map((doctor) => (
          <div
            key={doctor.id}
            style={{
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: isDark
                ? '0 4px 6px rgba(0,0,0,0.3)'
                : '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = isDark
                ? '0 12px 16px rgba(0,0,0,0.4)'
                : '0 10px 15px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = isDark
                ? '0 4px 6px rgba(0,0,0,0.3)'
                : '0 1px 3px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Image Container */}
            <div style={{
              width: '100%',
              height: '180px',
              overflow: 'hidden',
              background: isDark ? '#2a2a2a' : '#e5e7eb',
              position: 'relative'
            }}>
              <img
                src={doctor.imageUrl}
                alt={doctor.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                background: accentColor,
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {doctor.specialtyName}
              </div>
            </div>

            {/* Profile Content */}
            <div style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
            }}>
              <h3 style={{
                margin: '0 0 4px 0',
                fontSize: '16px',
                fontWeight: 'bold',
                color: textColor,
              }}>
                {doctor.name}
              </h3>

              <p style={{
                margin: '0 0 12px 0',
                fontSize: '13px',
                color: accentColor,
                fontWeight: '500'
              }}>
                Specialist
              </p>

              <div style={{
                marginTop: 'auto',
                borderTop: `1px solid ${borderColor}`,
                paddingTop: '12px',
                fontSize: '12px',
                color: mutedColor,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                🏥 {doctor.hospitalName}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
