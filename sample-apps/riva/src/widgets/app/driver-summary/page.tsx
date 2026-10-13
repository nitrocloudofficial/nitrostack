'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface DriverProfitabilitySummaryData {
  totalEarnings: number;
  expenses: {
    fuelCost: number;
    estimatedPlatformCommission: number;
    total: number;
  };
  netProfit: number;
  estimatedHoursWorked: number;
  hoursWorkedIsEstimated: boolean;
  averageEarningPerHour: number;
  averageEarningPerTrip: number;
  averageEarningPerKm: number;
  recommendations: string[];
}

export default function DriverSummary() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<DriverProfitabilitySummaryData>();
  const isDark = theme === 'dark';

  const bg = isDark ? '#111318' : '#f7f8fa';
  const cardBg = isDark ? '#1c1f26' : '#ffffff';
  const textColor = isDark ? '#f2f3f5' : '#15181e';
  const mutedColor = isDark ? 'rgba(242,243,245,0.62)' : 'rgba(21,24,30,0.6)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textColor, background: bg }}>
        Crunching your numbers…
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        background: bg,
        borderRadius: 18,
        maxWidth: 440,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: textColor,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Earnings summary</div>

      {/* Net profit hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #5b8def 0%, #3f6fd6 100%)',
          borderRadius: 16,
          padding: 18,
          color: 'white',
          marginBottom: 14,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, letterSpacing: 0.5 }}>NET PROFIT</div>
        <div style={{ fontSize: 32, fontWeight: 800, marginTop: 2 }}>₹{data.netProfit}</div>
        <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6 }}>
          from ₹{data.totalEarnings} earned, ₹{data.expenses.total} in expenses
        </div>
      </div>

      {/* Expense breakdown */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 14,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: mutedColor }}>Total earnings</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>₹{data.totalEarnings}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: mutedColor }}>− Fuel cost</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>−₹{data.expenses.fuelCost}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: mutedColor }}>− Est. platform commission</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>−₹{data.expenses.estimatedPlatformCommission}</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 8,
            borderTop: `1px solid ${borderColor}`,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700 }}>Net profit</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: data.netProfit >= 0 ? '#22c55e' : '#ef4444' }}>
            ₹{data.netProfit}
          </span>
        </div>
      </div>

      {/* Rate stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: mutedColor }}>₹/hour</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>₹{data.averageEarningPerHour}</div>
        </div>
        <div style={{ flex: 1, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: mutedColor }}>₹/trip</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>₹{data.averageEarningPerTrip}</div>
        </div>
        <div style={{ flex: 1, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: mutedColor }}>₹/km</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>₹{data.averageEarningPerKm}</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: mutedColor, marginBottom: 12 }}>
        Based on {data.estimatedHoursWorked} hours {data.hoursWorkedIsEstimated ? '(estimated from distance driven)' : '(as reported)'}.
      </div>

      {/* Recommendations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.recommendations.map((rec, i) => (
          <div
            key={i}
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 12,
              color: mutedColor,
              lineHeight: 1.5,
            }}
          >
            💡 {rec}
          </div>
        ))}
      </div>
    </div>
  );
}
