'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

interface BOMItemData {
  material_type: string;
  estimated_quantity_kg: number;
  grade_preference?: string;
  max_price_per_kg?: number;
  alternatives: string[];
  notes?: string;
  market_benchmark?: {
    price_per_kg: number;
    range: { min: number; max: number };
    virgin_price_per_kg: number;
  } | null;
}

interface BOMData {
  product: string;
  bom: BOMItemData[];
  total_items: number;
  next_step: string;
}

export default function BOMVisualizer() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();

  if (!isReady) return <div style={loadingStyle}>Generating procurement BOM...</div>;

  const data = getToolOutput<BOMData>();
  if (!data?.bom?.length) {
    return <div style={emptyStyle(theme)}>No BOM data available</div>;
  }

  const isDark = theme === 'dark';
  const gradeColors: Record<string, string> = { A: '#16a34a', B: '#2563eb', C: '#dc2626' };

  return (
    <div style={containerStyle(isDark)}>
      {/* Header */}
      <div style={headerStyle(isDark)}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: isDark ? '#93c5fd' : '#1e40af', marginBottom: 4 }}>
            AI-Generated Procurement BOM
          </div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: isDark ? '#fff' : '#111' }}>
            {formatName(data.product)}
          </h3>
        </div>
        <div style={itemCountBadge(isDark)}>
          {data.total_items} material{data.total_items !== 1 ? 's' : ''}
        </div>
      </div>

      {/* BOM Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.bom.map((item, i) => (
          <div key={i} style={itemCardStyle(isDark)}>
            {/* Material header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={indexBadge(isDark)}>{i + 1}</span>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>
                    {formatName(item.material_type)}
                  </h4>
                </div>
                {item.notes && (
                  <div style={{ fontSize: 12, color: isDark ? '#888' : '#666', marginLeft: 30, lineHeight: 1.4 }}>
                    {item.notes}
                  </div>
                )}
              </div>
              {item.grade_preference && (
                <span style={{
                  ...gradeBadge,
                  backgroundColor: gradeColors[item.grade_preference] || '#6b7280',
                }}>
                  Grade {item.grade_preference}
                </span>
              )}
            </div>

            {/* Metrics row */}
            <div style={metricsRow}>
              <MetricCell label="Quantity" value={`${item.estimated_quantity_kg} kg`} isDark={isDark} />
              {item.market_benchmark ? (
                <>
                  <MetricCell
                    label="Market Price"
                    value={`₹${item.market_benchmark.price_per_kg}/kg`}
                    isDark={isDark}
                    highlight
                  />
                  <MetricCell
                    label="Price Range"
                    value={`₹${item.market_benchmark.range.min}–${item.market_benchmark.range.max}`}
                    isDark={isDark}
                  />
                  <MetricCell
                    label="vs Virgin"
                    value={`₹${item.market_benchmark.virgin_price_per_kg}/kg`}
                    isDark={isDark}
                    dimmed
                  />
                </>
              ) : (
                <MetricCell label="Market Price" value="N/A" isDark={isDark} />
              )}
            </div>

            {/* Alternatives */}
            {item.alternatives.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: 11, color: isDark ? '#888' : '#888', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Substitutes:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {item.alternatives.map((alt) => (
                    <span key={alt} style={altBadge(isDark)}>{formatName(alt)}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Estimated line cost */}
            {item.market_benchmark && (
              <div style={lineCostStyle(isDark)}>
                Est. line cost: ₹{Math.round(item.estimated_quantity_kg * item.market_benchmark.price_per_kg).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={footerStyle(isDark)}>
        <div style={{ fontSize: 12, color: isDark ? '#93c5fd' : '#1e40af' }}>
          💡 {data.next_step}
        </div>
        {data.bom.some((b) => b.market_benchmark) && (
          <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#4ade80' : '#16a34a', marginTop: 8 }}>
            Est. Total BOM Cost: ₹{calculateTotalCost(data.bom).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helper Components ---

function MetricCell({ label, value, isDark, highlight, dimmed }: {
  label: string; value: string; isDark: boolean; highlight?: boolean; dimmed?: boolean;
}) {
  return (
    <div style={{
      padding: '8px 10px',
      borderRadius: 6,
      background: highlight ? (isDark ? '#0d47a1' : '#e3f2fd') : (isDark ? '#1a1a1a' : '#f0f0f0'),
      textAlign: 'center',
      flex: 1,
      minWidth: 80,
    }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', color: isDark ? '#888' : '#888', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: dimmed
          ? (isDark ? '#666' : '#999')
          : highlight
            ? (isDark ? '#93c5fd' : '#1e40af')
            : (isDark ? '#fff' : '#111'),
        textDecoration: dimmed ? 'line-through' : undefined,
      }}>
        {value}
      </div>
    </div>
  );
}

// --- Utilities ---

function formatName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function calculateTotalCost(bom: BOMItemData[]): number {
  return bom.reduce((sum, item) => {
    if (item.market_benchmark) {
      return sum + item.estimated_quantity_kg * item.market_benchmark.price_per_kg;
    }
    return sum;
  }, 0);
}

// --- Styles ---

const loadingStyle: React.CSSProperties = {
  padding: 32, textAlign: 'center', fontSize: 14, fontFamily: 'system-ui',
};

const emptyStyle = (theme: string | null): React.CSSProperties => ({
  padding: 40, textAlign: 'center', fontFamily: 'system-ui',
  color: theme === 'dark' ? '#999' : '#666', fontSize: 14,
});

const containerStyle = (isDark: boolean): React.CSSProperties => ({
  background: isDark ? '#000' : '#fff',
  color: isDark ? '#fff' : '#000',
  padding: 24, borderRadius: 12,
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 720,
  border: `1px solid ${isDark ? '#333' : '#ddd'}`,
});

const headerStyle = (isDark: boolean): React.CSSProperties => ({
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  marginBottom: 20, paddingBottom: 16,
  borderBottom: `1px solid ${isDark ? '#222' : '#eee'}`,
});

const itemCountBadge = (isDark: boolean): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
  background: isDark ? '#1a1a1a' : '#f0f0f0',
  color: isDark ? '#fff' : '#111',
});

const itemCardStyle = (isDark: boolean): React.CSSProperties => ({
  padding: 16, borderRadius: 10,
  background: isDark ? '#0a0a0a' : '#fafafa',
  border: `1px solid ${isDark ? '#1a1a1a' : '#eee'}`,
});

const indexBadge = (isDark: boolean): React.CSSProperties => ({
  width: 22, height: 22, borderRadius: '50%',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11, fontWeight: 700,
  background: isDark ? '#222' : '#e5e5e5',
  color: isDark ? '#999' : '#666',
});

const gradeBadge: React.CSSProperties = {
  padding: '3px 10px', borderRadius: 12, color: '#fff',
  fontSize: 11, fontWeight: 700,
};

const metricsRow: React.CSSProperties = {
  display: 'flex', gap: 8, flexWrap: 'wrap',
};

const altBadge = (isDark: boolean): React.CSSProperties => ({
  padding: '3px 8px', borderRadius: 4, fontSize: 11,
  background: isDark ? '#1a2a1a' : '#ecfdf5',
  color: isDark ? '#4ade80' : '#16a34a',
  fontWeight: 500,
});

const lineCostStyle = (isDark: boolean): React.CSSProperties => ({
  marginTop: 10, paddingTop: 8,
  borderTop: `1px dashed ${isDark ? '#222' : '#ddd'}`,
  fontSize: 12, color: isDark ? '#999' : '#666',
  textAlign: 'right',
});

const footerStyle = (isDark: boolean): React.CSSProperties => ({
  marginTop: 20, paddingTop: 16,
  borderTop: `1px solid ${isDark ? '#222' : '#eee'}`,
});
