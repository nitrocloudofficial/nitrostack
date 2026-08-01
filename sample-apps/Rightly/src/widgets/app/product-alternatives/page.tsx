'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface ProductAlternativesData {
  productName: string;
  category: string;
  alternatives: Array<{
    name: string;
    estimatedPrice: string;
    advantages: string[];
    disadvantages: string[];
    valueScore: number;
    summary: string;
    url?: string;
  }>;
}

export default function ProductAlternativesWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ProductAlternativesData>();

  if (!isReady) {
    return <div style={{ padding: '24px', textAlign: 'center', color: theme === 'dark' ? '#fff' : '#000' }}>Initializing...</div>;
  }

  if (!data || !data.alternatives) {
    return <div style={{ padding: '24px', textAlign: 'center', color: theme === 'dark' ? '#999' : '#666' }}>No alternative data available.</div>;
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0f0f0f' : '#f9fafb';
  const cardBg = isDark ? '#262626' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const subTextColor = isDark ? '#a3a3a3' : '#4b5563';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const accentColor = isDark ? '#3b82f6' : '#2563eb';
  const successColor = isDark ? '#22c55e' : '#16a34a';

  return (
    <div style={{ padding: '24px', background: bgColor, color: textColor, borderRadius: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${borderColor}`, paddingBottom: '16px', marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
          🔄 Alternatives for {data.productName}
        </h2>
        <p style={{ margin: '0', fontSize: '13px', color: subTextColor }}>
          Category: {data.category} • {data.alternatives.length} alternatives found
        </p>
      </div>

      {data.alternatives.length === 0 ? (
        <div style={{ padding: '20px', background: cardBg, borderRadius: '8px', textAlign: 'center' }}>
          No better alternatives found in this category.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {data.alternatives.map((alt, idx) => (
            <div key={idx} style={{ padding: '20px', background: cardBg, borderRadius: '10px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ margin: '0', fontSize: '18px', color: accentColor }}>
                  {alt.url ? <a href={alt.url} target="_blank" rel="noreferrer" style={{ color: accentColor, textDecoration: 'none' }}>{alt.name} 🔗</a> : alt.name}
                </h3>
                <span style={{ background: '#22c55e', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>Score: {alt.valueScore}/10</span>
              </div>
              
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>{alt.estimatedPrice}</div>
              
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: '1.5' }}>{alt.summary}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: successColor, textTransform: 'uppercase' }}>Advantages</h4>
                  <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '13px' }}>
                    {alt.advantages?.map((adv, i) => <li key={i} style={{ marginBottom: '4px' }}>{adv}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#ef4444', textTransform: 'uppercase' }}>Disadvantages</h4>
                  <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '13px' }}>
                    {alt.disadvantages?.map((dis, i) => <li key={i} style={{ marginBottom: '4px' }}>{dis}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
