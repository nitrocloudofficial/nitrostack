'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

interface ComplianceData {
  factory_id: string;
  period: string;
  report: {
    waste_diverted_tonnes: number;
    co2_saved_tonnes: number;
    revenue_from_waste: number;
    disposal_cost_saved: number;
    total_transactions: number;
    epr_compliance_status: 'compliant' | 'non_compliant';
    generated_at: string;
  };
}

export default function ComplianceDashboard() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();

  if (!isReady) return <div style={{ padding: 24, textAlign: 'center', fontFamily: 'system-ui' }}>Generating report...</div>;

  const data = getToolOutput<ComplianceData>();
  if (!data?.report) {
    return <div style={emptyStyle(theme)}>No compliance data available</div>;
  }

  const { report, period } = data;
  const isDark = theme === 'dark';
  const isCompliant = report.epr_compliance_status === 'compliant';

  return (
    <div style={containerStyle(isDark)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>
          Compliance Report — {period}
        </h3>
        <span style={{
          padding: '6px 16px',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 700,
          background: isCompliant ? '#052e16' : '#451a03',
          color: isCompliant ? '#4ade80' : '#fbbf24',
          border: `1px solid ${isCompliant ? '#166534' : '#78350f'}`,
        }}>
          {isCompliant ? 'EPR COMPLIANT' : 'NON-COMPLIANT'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Waste Diverted" value={`${report.waste_diverted_tonnes} tonnes`} icon="♻" isDark={isDark} />
        <KpiCard label="CO2 Saved" value={`${report.co2_saved_tonnes} tonnes`} icon="🌍" isDark={isDark} />
        <KpiCard label="Revenue Generated" value={`₹${report.revenue_from_waste.toLocaleString()}`} icon="💰" isDark={isDark} highlight />
        <KpiCard label="Disposal Saved" value={`₹${report.disposal_cost_saved.toLocaleString()}`} icon="📉" isDark={isDark} />
      </div>

      <div style={{ padding: 16, borderRadius: 10, background: isDark ? '#111' : '#f9f9f9', border: `1px solid ${isDark ? '#222' : '#eee'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: isDark ? '#999' : '#666' }}>Total Transactions</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>{report.total_transactions}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: isDark ? '#999' : '#666' }}>Report Generated</span>
          <span style={{ color: isDark ? '#ccc' : '#555' }}>{new Date(report.generated_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, isDark, highlight }: {
  label: string;
  value: string;
  icon: string;
  isDark: boolean;
  highlight?: boolean;
}) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 10,
      background: highlight ? (isDark ? '#0d47a1' : '#e3f2fd') : (isDark ? '#1a1a1a' : '#f5f5f5'),
      border: `1px solid ${highlight ? (isDark ? '#1565c0' : '#90caf9') : (isDark ? '#333' : '#ddd')}`,
    }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: highlight ? (isDark ? '#fff' : '#111') : (isDark ? '#fff' : '#111'), marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', color: isDark ? '#999' : '#888', letterSpacing: '0.5px' }}>
        {label}
      </div>
    </div>
  );
}

const containerStyle = (isDark: boolean): React.CSSProperties => ({
  background: isDark ? '#000' : '#fff',
  color: isDark ? '#fff' : '#000',
  padding: 24,
  borderRadius: 12,
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 600,
  border: `1px solid ${isDark ? '#333' : '#ddd'}`,
});

const emptyStyle = (theme: string | null): React.CSSProperties => ({
  padding: 40,
  textAlign: 'center',
  fontFamily: 'system-ui',
  color: theme === 'dark' ? '#999' : '#666',
});
