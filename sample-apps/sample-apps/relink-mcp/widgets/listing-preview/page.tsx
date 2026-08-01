'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

interface ListingPreviewData {
  listing: {
    id: string;
    material_type: string;
    grade: string;
    quantity_kg: number;
    seller_quoted_price_per_kg: number;
    negotiable: boolean;
    health_flags: string[];
    usage_classification: string[];
  };
  ai_analysis: {
    material_type: string;
    grade: string;
    confidence: number;
    health_flags: string[];
    usage_classification: string[];
    ai_benchmark_price_per_kg: number | null;
    ai_benchmark_price_range: { min: number; max: number } | null;
  };
}

export default function ListingPreview() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();

  if (!isReady) {
    return <div style={loadingStyle}>Loading...</div>;
  }

  const data = getToolOutput<ListingPreviewData>();

  if (!data?.listing) {
    return <div style={containerStyle(theme)}>No listing data available</div>;
  }

  const { listing, ai_analysis } = data;
  const isDark = theme === 'dark';
  const gradeColor = listing.grade === 'A' ? '#16a34a' : listing.grade === 'B' ? '#2563eb' : listing.grade === 'C' ? '#dc2626' : '#6b7280';

  return (
    <div style={containerStyle(theme)}>
      <div style={headerStyle}>
        <h2 style={titleStyle(isDark)}>{formatMaterialName(listing.material_type)}</h2>
        <span style={{ ...gradeBadgeStyle, backgroundColor: gradeColor }}>
          Grade {listing.grade}
        </span>
      </div>

      <div style={priceRowStyle}>
        <div style={sellerPriceStyle(isDark)}>
          <span style={priceLabelStyle}>Seller's Price</span>
          <span style={priceValueStyle}>₹{listing.seller_quoted_price_per_kg}/kg</span>
        </div>
        {ai_analysis.ai_benchmark_price_per_kg && (
          <div style={benchmarkPriceStyle(isDark)}>
            <span style={priceLabelStyle}>AI Benchmark</span>
            <span style={benchmarkValueStyle(isDark)}>
              ₹{ai_analysis.ai_benchmark_price_per_kg}/kg
              {ai_analysis.ai_benchmark_price_range && (
                <span style={rangeStyle}>(₹{ai_analysis.ai_benchmark_price_range.min}-{ai_analysis.ai_benchmark_price_range.max})</span>
              )}
            </span>
          </div>
        )}
      </div>

      <div style={detailRowStyle}>
        <DetailChip label="Quantity" value={`${listing.quantity_kg} kg`} theme={theme} />
        <DetailChip label="Confidence" value={`${Math.round(ai_analysis.confidence * 100)}%`} theme={theme} />
        {listing.negotiable ? (
          <DetailChip label="Price" value="Negotiable" theme={theme} color="#16a34a" />
        ) : (
          <DetailChip label="Price" value="Firm" theme={theme} color="#dc2626" />
        )}
      </div>

      {listing.usage_classification.length > 0 && (
        <div style={sectionStyle(isDark)}>
          <span style={sectionTitleStyle}>Manufacturing Applications:</span>
          <div style={tagContainerStyle}>
            {listing.usage_classification.map((u) => (
              <span key={u} style={tagStyle(isDark)}>{formatTag(u)}</span>
            ))}
          </div>
        </div>
      )}

      {listing.health_flags.length > 0 && (
        <div style={sectionStyle(isDark)}>
          <span style={sectionTitleStyle}>Health Flags:</span>
          <div style={tagContainerStyle}>
            {listing.health_flags.map((f) => (
              <span key={f} style={flagStyle}>{formatTag(f)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailChip({ label, value, theme, color }: { label: string; value: string; theme: string | null; color?: string }) {
  return (
    <div style={{ padding: '8px 12px', borderRadius: 8, background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5', textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: theme === 'dark' ? '#999' : '#666', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || (theme === 'dark' ? '#fff' : '#000') }}>{value}</div>
    </div>
  );
}

function formatMaterialName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTag(tag: string): string {
  return tag.replace(/_/g, ' ');
}

const containerStyle = (theme: string | null) => ({
  background: theme === 'dark' ? '#000' : '#fff',
  color: theme === 'dark' ? '#fff' : '#000',
  padding: '24px',
  borderRadius: '12px',
  fontFamily: 'system-ui, sans-serif',
  maxWidth: '600px',
  border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
});

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
};

const titleStyle = (isDark: boolean): React.CSSProperties => ({
  margin: 0,
  fontSize: '22px',
  fontWeight: 700,
  color: isDark ? '#fff' : '#111',
});

const gradeBadgeStyle: React.CSSProperties = {
  padding: '4px 14px',
  borderRadius: '20px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 700,
};

const priceRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '24px',
  marginBottom: '20px',
};

const sellerPriceStyle = (isDark: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '16px',
  borderRadius: '10px',
  background: isDark ? '#0d47a1' : '#e3f2fd',
  border: isDark ? '1px solid #1565c0' : '1px solid #90caf9',
});

const benchmarkPriceStyle = (isDark: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '16px',
  borderRadius: '10px',
  background: isDark ? '#1a1a1a' : '#f5f5f5',
  border: `1px solid ${isDark ? '#333' : '#ddd'}`,
});

const priceLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px',
  opacity: 0.7,
};

const priceValueStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 800,
  color: '#fff',
};

const benchmarkValueStyle = (isDark: boolean): React.CSSProperties => ({
  fontSize: '22px',
  fontWeight: 600,
  color: isDark ? '#ccc' : '#555',
});

const rangeStyle: React.CSSProperties = {
  fontSize: '12px',
  marginLeft: '8px',
  opacity: 0.6,
};

const detailRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginBottom: '20px',
};

const sectionStyle = (isDark: boolean): React.CSSProperties => ({
  marginBottom: '16px',
  padding: '12px',
  borderRadius: '8px',
  background: isDark ? '#111' : '#f9f9f9',
});

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  marginBottom: '8px',
  display: 'block',
};

const tagContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
};

const tagStyle = (isDark: boolean): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  background: isDark ? '#1a3a5c' : '#dbeafe',
  color: isDark ? '#93c5fd' : '#1e40af',
});

const flagStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  background: '#451a03',
  color: '#fbbf24',
};

const loadingStyle: React.CSSProperties = {
  padding: '24px',
  textAlign: 'center',
  fontSize: '14px',
};
