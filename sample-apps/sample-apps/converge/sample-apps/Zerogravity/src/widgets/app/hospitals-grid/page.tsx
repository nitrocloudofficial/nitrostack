'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Hospital {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  description: string;
}

interface HospitalsData {
  hospitals: Hospital[];
}

export default function HospitalsGrid() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<HospitalsData>();

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

  const hospitals = data.hospitals ?? [];

  if (hospitals.length === 0) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        No hospitals found.
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';

  return (
    <div style={{
      padding: '24px',
      background: isDark ? '#0f0f0f' : '#f9fafb',
      borderRadius: '12px',
    }}>
      <h2 style={{
        margin: '0 0 24px 0',
        fontSize: '24px',
        fontWeight: 'bold',
        color: textColor,
      }}>
        Available Hospitals
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
      }}>
        {hospitals.map((hospital) => (
          <div
            key={hospital.id}
            style={{
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: isDark
                ? '0 4px 6px rgba(0,0,0,0.3)'
                : '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
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
            {/* Image */}
            <div style={{
              width: '100%',
              height: '200px',
              overflow: 'hidden',
              background: isDark ? '#2a2a2a' : '#e5e7eb',
            }}>
              <img
                src={hospital.imageUrl}
                alt={hospital.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>

            {/* Content */}
            <div style={{
              padding: '16px',
            }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 'bold',
                color: textColor,
              }}>
                {hospital.name}
              </h3>

              <p style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                color: mutedColor,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                📍 {hospital.location}
              </p>

              <p style={{
                margin: '0',
                fontSize: '13px',
                color: mutedColor,
                lineHeight: '1.5',
              }}>
                {hospital.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
