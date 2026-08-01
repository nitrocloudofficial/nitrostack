'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

interface SearchResult {
  id: string;
  factory_name: string;
  material_type: string;
  grade: string;
  quantity_kg: number;
  seller_quoted_price_per_kg: number;
  ai_benchmark_price_per_kg?: number;
  negotiable: boolean;
  trust_score: number;
  health_flags: string[];
  status: string;
}

interface SearchResultsData {
  results: SearchResult[];
  total: number;
}

export default function SearchResultsGrid() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();

  if (!isReady) return <div style={{ padding: 24, textAlign: 'center', fontFamily: 'system-ui' }}>Loading results...</div>;

  const data = getToolOutput<SearchResultsData>();
  if (!data?.results?.length) {
    return <div style={emptyStyle(theme)}>No matching listings found</div>;
  }

  const isDark = theme === 'dark';
  const gradeColors: Record<string, string> = { A: '#16a34a', B: '#2563eb', C: '#dc2626', U: '#6b7280' };

  return (
    <div style={containerStyle(isDark)}>
      <div style={{ marginBottom: 16, fontSize: 14, opacity: 0.7 }}>{data.total} listing{data.total !== 1 ? 's' : ''} found</div>
      <div style={gridStyle}>
        {data.results.map((r) => (
          <div key={r.id} style={cardStyle(isDark)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>
                {r.material_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </h3>
              <span style={{ ...gradeBadgeStyle, backgroundColor: gradeColors[r.grade] || '#6b7280' }}>{r.grade}</span>
            </div>
            <div style={{ fontSize: 13, color: isDark ? '#999' : '#666', marginBottom: 12 }}>
              {r.factory_name}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <StatBadge label={`${r.quantity_kg}kg`} />
              <StatBadge label={`₹${r.seller_quoted_price_per_kg}/kg`} highlight />
              {r.negotiable && <StatBadge label="Negotiable" green />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: r.trust_score >= 80 ? '#16a34a' : r.trust_score >= 60 ? '#f59e0b' : '#dc2626' }} />
                <span style={{ fontSize: 12, color: isDark ? '#999' : '#666' }}>Trust: {r.trust_score}</span>
              </div>
              {r.health_flags.length > 0 && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#451a03', color: '#fbbf24' }}>
                  {r.health_flags.length} flag{r.health_flags.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBadge({ label, highlight, green }: { label: string; highlight?: boolean; green?: boolean }) {
  const bg = green ? '#052e16' : highlight ? '#0d47a1' : '#1a1a1a';
  const fg = green ? '#4ade80' : highlight ? '#93c5fd' : '#999';
  return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 12, background: bg, color: fg, fontWeight: 600 }}>{label}</span>;
}

const containerStyle = (isDark: boolean): React.CSSProperties => ({
  background: isDark ? '#000' : '#fff',
  color: isDark ? '#fff' : '#000',
  padding: 24,
  borderRadius: 12,
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 900,
  border: `1px solid ${isDark ? '#333' : '#ddd'}`,
});

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: 16,
};

const cardStyle = (isDark: boolean): React.CSSProperties => ({
  padding: 16,
  borderRadius: 10,
  background: isDark ? '#111' : '#f9f9f9',
  border: `1px solid ${isDark ? '#222' : '#eee'}`,
});

const gradeBadgeStyle: React.CSSProperties = {
  padding: '2px 10px',
  borderRadius: 12,
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
};

const emptyStyle = (theme: string | null): React.CSSProperties => ({
  padding: 40,
  textAlign: 'center',
  fontFamily: 'system-ui',
  color: theme === 'dark' ? '#999' : '#666',
  fontSize: 14,
});
