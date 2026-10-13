'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface ComparisonData {
  products: Array<{ name: string; category: string }>;
  dimensions: string[];
  comparison: string;
  winner?: string;
  reason?: string;
  comparisonDetails?: Array<{
    name: string;
    estimatedPrice: string;
    rating: number;
    pros: string[];
    cons: string[];
    bestFor: string;
    score: number;
  }>;
  timestamp: string;
}

export default function ProductComparisonWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ComparisonData>();

  if (!isReady) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: theme === 'dark' ? '#fff' : '#000' }}>
        Initializing...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: theme === 'dark' ? '#999' : '#666' }}>
        No comparison data available. Please compare products first.
      </div>
    );
  }

  const isDark = theme === 'dark';
  const borderColor = isDark ? '#333' : '#e5e7eb';
  const bgColor = isDark ? '#1a1a1a' : '#f3f4f6';
  const cardBg = isDark ? '#262626' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const subTextColor = isDark ? '#a3a3a3' : '#4b5563';
  const accentColor = isDark ? '#3b82f6' : '#2563eb';
  const successColor = isDark ? '#22c55e' : '#16a34a';

  return (
    <div style={{
      padding: '24px',
      background: isDark ? '#0f0f0f' : '#f9fafb',
      borderRadius: '12px',
      color: textColor,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${borderColor}` }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
          📊 Product Comparison
        </h2>
        <p style={{ margin: '0', fontSize: '13px', color: subTextColor }}>
          {data.products?.length || 2} products compared • {new Date(data.timestamp).toLocaleDateString()}
        </p>
      </div>

      {/* Winner Banner */}
      {data.winner && (
        <div style={{
          padding: '16px',
          background: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(22, 163, 74, 0.1)',
          borderLeft: `4px solid ${successColor}`,
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: successColor }}>🏆 Winner: {data.winner}</h3>
          {data.reason && <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>{data.reason}</p>}
        </div>
      )}

      {/* Side-by-Side Comparison Cards */}
      {data.comparisonDetails && data.comparisonDetails.length > 0 ? (
        <div style={{ display: 'flex', gap: '16px', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '24px' }}>
          {data.comparisonDetails.map((item, idx) => (
            <div key={idx} style={{
              flex: '1 1 300px',
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '10px',
              padding: '20px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: accentColor }}>{item.name}</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px' }}>
                <div><span style={{ color: subTextColor }}>Price:</span> <strong>{item.estimatedPrice}</strong></div>
                <div><span style={{ color: subTextColor }}>Rating:</span> <strong>⭐ {item.rating}</strong></div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', color: subTextColor }}>Pros</h4>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: successColor }}>
                  {item.pros?.map((pro, i) => <li key={i} style={{ marginBottom: '4px' }}>{pro}</li>)}
                </ul>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', color: subTextColor }}>Cons</h4>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#ef4444' }}>
                  {item.cons?.map((con, i) => <li key={i} style={{ marginBottom: '4px' }}>{con}</li>)}
                </ul>
              </div>

              <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '12px', marginTop: '16px', fontSize: '14px' }}>
                <span style={{ color: subTextColor }}>Best For:</span> <strong>{item.bestFor}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: '16px', background: bgColor, borderRadius: '8px',
          fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '24px'
        }}>
          {data.comparison}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${borderColor}`,
        fontSize: '12px', color: subTextColor, textAlign: 'right'
      }}>
        Generated on {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
