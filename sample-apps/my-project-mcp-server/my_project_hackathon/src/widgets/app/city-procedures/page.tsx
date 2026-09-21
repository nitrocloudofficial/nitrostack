'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/**
 * City Procedures Widget
 * Bound to: list_city_procedures
 *
 * Lists every CGHS-rated procedure available for a city, so a hospital
 * or patient can browse benchmark rates before an estimate is entered.
 */

interface CghsRateEntry {
  code: string;
  procedure: string;
  city: string;
  cghsRate: number;
  currency: string;
}

interface CityProceduresData {
  city: string;
  count: number;
  procedures: CghsRateEntry[];
}

function formatCurrency(n: number, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : currency + ' ';
  return symbol + Math.round(n).toLocaleString('en-IN');
}

export default function CityProcedures() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();

  const data = getToolOutput<CityProceduresData>();
  const isDark = theme === 'dark';

  const surface = isDark ? '#1e1e2e' : '#ffffff';
  const surfaceAlt = isDark ? '#2a2a3e' : '#f8fafc';
  const textPrimary = isDark ? '#e2e8f0' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textMuted, fontFamily: 'system-ui' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
        <p style={{ margin: 0 }}>No procedures loaded yet.</p>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>Call <code>list_city_procedures</code> with a city.</p>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      background: surface,
      border: `1px solid ${border}`,
      borderRadius: 16,
      overflow: 'hidden',
      maxWidth: 480,
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #2563eb22, #2563eb08)',
        borderBottom: `1px solid ${border}`,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 24 }}>📋</span>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: textMuted }}>
            CGHS Procedures · {data.city}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: textPrimary }}>
            {data.count} procedure{data.count !== 1 ? 's' : ''} on file
          </p>
        </div>
      </div>

      {data.count === 0 ? (
        <div style={{ padding: '24px 20px', textAlign: 'center', color: textMuted }}>
          <p style={{ margin: 0, fontSize: 13 }}>No CGHS-rated procedures found for {data.city}.</p>
        </div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {data.procedures.map((p, idx) => (
            <div
              key={p.code}
              style={{
                padding: '10px 20px',
                borderBottom: idx < data.procedures.length - 1 ? `1px solid ${border}` : 'none',
                background: idx % 2 === 0 ? 'transparent' : surfaceAlt,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.procedure}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 10, fontFamily: 'monospace', color: textMuted }}>{p.code}</p>
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#2563eb', flexShrink: 0 }}>
                {formatCurrency(p.cghsRate, p.currency)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
