'use client';

import React, { useState, useEffect } from 'react';

interface Machine {
  machineId: string;
  health: number;
  temperature: number;
  vibration: number;
  pressure: number;
  rpm: number;
  motorCurrent?: number;
}

export default function App({ data }: any) {
  const [isDarkMode, setIsDarkMode] = useState(false); // Default: Minimal Warm Light Theme (Claude inspired)
  const [isThinking, setIsThinking] = useState(true);

  const initialMachines: Machine[] = [
    { machineId: 'M1', health: 98, temperature: 62.1, vibration: 1.8, pressure: 6.1, rpm: 1500, motorCurrent: 12.1 },
    { machineId: 'M2', health: 97, temperature: 63.1, vibration: 1.9, pressure: 6.2, rpm: 1500, motorCurrent: 12.3 },
    { machineId: 'M3', health: 98, temperature: 61.8, vibration: 1.7, pressure: 6.1, rpm: 1500, motorCurrent: 12.0 },
    { machineId: 'M4', health: 25, temperature: 95.7, vibration: 6.15, pressure: 6.4, rpm: 1385, motorCurrent: 17.25 },
    { machineId: 'M5', health: 92, temperature: 64.2, vibration: 2.1, pressure: 6.3, rpm: 1500, motorCurrent: 12.5 },
    { machineId: 'M6', health: 95, temperature: 62.5, vibration: 1.9, pressure: 6.2, rpm: 1500, motorCurrent: 12.2 },
    { machineId: 'M7', health: 63, temperature: 83.4, vibration: 3.6, pressure: 6.3, rpm: 1441, motorCurrent: 14.8 },
    { machineId: 'M8', health: 96, temperature: 61.5, vibration: 1.8, pressure: 6.1, rpm: 1500, motorCurrent: 12.1 },
  ];

  const [machines, setMachines] = useState<Machine[]>(
    data?.machines && data.machines.length > 0 ? data.machines : initialMachines
  );
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Quick Thinking Loader Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsThinking(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Live 10-Second Sensor Fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setMachines((prev) =>
        prev.map((m) => {
          const tempJitter = +(Math.random() * 0.6 - 0.3).toFixed(1);
          const vibJitter = +(Math.random() * 0.1 - 0.05).toFixed(2);
          const rpmJitter = Math.floor(Math.random() * 8 - 4);

          return {
            ...m,
            temperature: +(Math.max(50, m.temperature + tempJitter)).toFixed(1),
            vibration: +(Math.max(0.5, m.vibration + vibJitter)).toFixed(2),
            rpm: Math.max(1000, m.rpm + rpmJitter)
          };
        })
      );
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const totalMachines = machines.length;
  const healthyCount = machines.filter((m) => m.health >= 80).length;
  const warningCount = machines.filter((m) => m.health >= 60 && m.health < 80).length;
  const criticalCount = machines.filter((m) => m.health < 60).length;
  const avgHealthScore = Math.round(
    machines.reduce((acc, m) => acc + m.health, 0) / (totalMachines || 1)
  );

  // Dynamic Colors for Light vs Dark Theme
  const themeStyles = isDarkMode ? {
    bg: 'radial-gradient(circle at 50% 0%, #2e1065 0%, #0f172a 60%, #020617 100%)',
    cardBg: 'rgba(30, 41, 59, 0.55)',
    cardHoverBg: 'rgba(30, 41, 59, 0.85)',
    border: 'rgba(168, 85, 247, 0.3)',
    textMain: '#f8fafc',
    textMuted: '#94a3b8',
    summaryBg: 'rgba(30, 41, 59, 0.6)',
    sensorBg: 'rgba(15, 23, 42, 0.7)'
  } : {
    bg: '#faf9f5', // Warm Claude Off-White
    cardBg: '#ffffff',
    cardHoverBg: '#ffffff',
    border: '#e2e8f0',
    textMain: '#0f172a',
    textMuted: '#64748b',
    summaryBg: '#ffffff',
    sensorBg: '#f1f5f9'
  };

  const getStatusTheme = (health: number) => {
    if (health >= 80) return {
      border: '#10b981',
      text: isDarkMode ? '#34d399' : '#059669',
      badgeBg: isDarkMode ? '#064e3b' : '#dcfce7',
      badgeText: isDarkMode ? '#6ee7b7' : '#15803d',
      label: 'OPTIMAL'
    };
    if (health >= 60) return {
      border: '#f59e0b',
      text: isDarkMode ? '#fbbf24' : '#d97706',
      badgeBg: isDarkMode ? '#78350f' : '#fef3c7',
      badgeText: isDarkMode ? '#fcd34d' : '#b45309',
      label: 'DEGRADED'
    };
    return {
      border: '#ef4444',
      text: isDarkMode ? '#f87171' : '#dc2626',
      badgeBg: isDarkMode ? '#7f1d1d' : '#fee2e2',
      badgeText: isDarkMode ? '#fca5a5' : '#b91c1c',
      label: 'CRITICAL FAILURE'
    };
  };

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      background: themeStyles.bg,
      color: themeStyles.textMain,
      padding: '26px',
      borderRadius: '24px',
      border: `1px solid ${themeStyles.border}`,
      boxShadow: isDarkMode ? '0 25px 60px rgba(0,0,0,0.8)' : '0 10px 30px rgba(15,23,42,0.06)',
      maxWidth: '920px',
      margin: '0 auto',
      transition: 'background 0.3s ease, color 0.3s ease'
    }}>
      {isThinking ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #cbd5e1', borderTopColor: '#d97706', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: '13px', fontWeight: '700', color: themeStyles.textMuted }}>
            ✴ COMPUTING FACTORY TELEMETRY...
          </div>
        </div>
      ) : (
        <>
          {/* Header & Theme Toggle Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', marginBottom: '24px', borderBottom: `1px solid ${themeStyles.border}` }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>✴</span>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', letterSpacing: '-0.02em', color: themeStyles.textMain }}>
                  ForgeMind AI // Digital Twin Ops
                </h2>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: themeStyles.textMuted }}>
                Real-Time Industrial Telemetry & Autonomous Predictive Maintenance
              </p>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff',
                border: `1px solid ${themeStyles.border}`,
                color: themeStyles.textMain,
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease'
              }}
            >
              {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>

          {/* Metric Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '26px' }}>
            <div style={{ background: themeStyles.summaryBg, padding: '16px', borderRadius: '16px', border: `1px solid ${themeStyles.border}`, textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '11px', color: themeStyles.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Fleet Size</div>
              <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '4px' }}>{totalMachines}</div>
            </div>
            <div style={{ background: themeStyles.summaryBg, padding: '16px', borderRadius: '16px', border: '1px solid #10b981', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>Optimal</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#059669', marginTop: '4px' }}>{healthyCount}</div>
            </div>
            <div style={{ background: themeStyles.summaryBg, padding: '16px', borderRadius: '16px', border: '1px solid #f59e0b', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '700', textTransform: 'uppercase' }}>Warning</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>{warningCount}</div>
            </div>
            <div style={{ background: themeStyles.summaryBg, padding: '16px', borderRadius: '16px', border: '1px solid #ef4444', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700', textTransform: 'uppercase' }}>Critical</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>{criticalCount}</div>
            </div>
            <div style={{ background: themeStyles.summaryBg, padding: '16px', borderRadius: '16px', border: '1px solid #6366f1', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#4f46e5', fontWeight: '700', textTransform: 'uppercase' }}>Avg Score</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#4f46e5', marginTop: '4px' }}>{avgHealthScore}%</div>
            </div>
          </div>

          {/* Machine Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {machines.map((m) => {
              const theme = getStatusTheme(m.health);
              const isCritical = m.health < 60;
              const isHovered = hoveredCard === m.machineId;

              return (
                <div
                  key={m.machineId}
                  onMouseEnter={() => setHoveredCard(m.machineId)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    background: isHovered ? themeStyles.cardHoverBg : themeStyles.cardBg,
                    borderRadius: '18px',
                    padding: '18px',
                    border: `1px solid ${theme.border}`,
                    boxShadow: isHovered ? '0 10px 25px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.04)',
                    transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '17px' }}>Machine {m.machineId}</div>
                      <div style={{ fontSize: '11px', color: themeStyles.textMuted }}>ID: UNIT-{m.machineId}00</div>
                    </div>
                    <span style={{ background: theme.badgeBg, color: theme.badgeText, padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '800' }}>
                      {theme.label}
                    </span>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: themeStyles.textMuted }}>Health Index</span>
                      <span style={{ fontWeight: '800', color: theme.text }}>{m.health}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: isDarkMode ? '#1e293b' : '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${m.health}%`, height: '100%', background: theme.border, borderRadius: '4px' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: themeStyles.sensorBg, padding: '10px', borderRadius: '12px', fontSize: '12px' }}>
                    <div><span style={{ color: themeStyles.textMuted, fontSize: '10px', display: 'block' }}>TEMP</span><strong>{m.temperature}°C {m.temperature > 90 && '⚠️'}</strong></div>
                    <div><span style={{ color: themeStyles.textMuted, fontSize: '10px', display: 'block' }}>VIBRATION</span><strong>{m.vibration} mm/s {m.vibration > 5 && '🚨'}</strong></div>
                    <div><span style={{ color: themeStyles.textMuted, fontSize: '10px', display: 'block' }}>PRESSURE</span><strong>{m.pressure} bar</strong></div>
                    <div><span style={{ color: themeStyles.textMuted, fontSize: '10px', display: 'block' }}>RPM</span><strong>{m.rpm}</strong></div>
                  </div>

                  {isCritical && (
                    <div style={{ marginTop: '12px', background: isDarkMode ? 'rgba(239,68,68,0.2)' : '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', padding: '8px', fontSize: '11px', color: '#b91c1c', fontWeight: '700', textAlign: 'center' }}>
                      🚨 CRITICAL: BEARING ANOMALY
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}