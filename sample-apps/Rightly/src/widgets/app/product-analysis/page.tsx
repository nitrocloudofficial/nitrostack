'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface ProductAnalysisData {
  productName: string;
  productSummary: string;
  overallRecommendation: string;
  strengths: string[];
  weaknesses: string[];
  commonComplaints: string[];
  reviewAuthenticity: string;
  darkPatternFindings: string[];
  repairability: string;
  warrantyInformation: string;
  valueForMoney: string;
  buyLink: string;
  rating: number;
  reviewsCount: number;
}

export default function ProductAnalysisWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ProductAnalysisData>();

  if (!isReady) {
    return <div style={{ padding: '24px', textAlign: 'center', color: theme === 'dark' ? '#fff' : '#000' }}>Initializing...</div>;
  }

  if (!data) {
    return <div style={{ padding: '24px', textAlign: 'center', color: theme === 'dark' ? '#999' : '#666' }}>No analysis data available.</div>;
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#e5e5e5' : '#1f2937';
  const headerColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const accentColor = isDark ? '#3b82f6' : '#2563eb';
  const successColor = isDark ? '#22c55e' : '#16a34a';
  const warningColor = isDark ? '#f59e0b' : '#d97706';
  const dangerColor = isDark ? '#ef4444' : '#dc2626';

  return (
    <div style={{ padding: '24px', background: bgColor, color: textColor, borderRadius: '12px', border: `1px solid ${borderColor}`, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${borderColor}`, paddingBottom: '16px', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: headerColor }}>{data.productName}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px' }}>
          <span style={{ background: accentColor, color: '#fff', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>⭐ {data.rating}</span>
          <span style={{ opacity: 0.8 }}>({data.reviewsCount} reviews)</span>
        </div>
        <p style={{ margin: '12px 0 0 0', fontSize: '15px', lineHeight: '1.5' }}>{data.productSummary}</p>
      </div>

      {/* Grid for key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', background: isDark ? '#262626' : '#f3f4f6', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: headerColor, fontSize: '14px' }}>🔍 Review Authenticity</h4>
          <p style={{ margin: '0', fontSize: '13px' }}>{data.reviewAuthenticity}</p>
        </div>
        <div style={{ padding: '16px', background: isDark ? '#262626' : '#f3f4f6', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: headerColor, fontSize: '14px' }}>🛠️ Repairability</h4>
          <p style={{ margin: '0', fontSize: '13px' }}>{data.repairability}</p>
        </div>
        <div style={{ padding: '16px', background: isDark ? '#262626' : '#f3f4f6', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: headerColor, fontSize: '14px' }}>🛡️ Warranty</h4>
          <p style={{ margin: '0', fontSize: '13px' }}>{data.warrantyInformation}</p>
        </div>
        <div style={{ padding: '16px', background: isDark ? '#262626' : '#f3f4f6', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: headerColor, fontSize: '14px' }}>💰 Value for Money</h4>
          <p style={{ margin: '0', fontSize: '13px' }}>{data.valueForMoney}</p>
        </div>
      </div>

      {/* Dark Patterns Warning */}
      {data.darkPatternFindings && data.darkPatternFindings.length > 0 && (
        <div style={{ padding: '16px', borderLeft: `4px solid ${warningColor}`, background: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(217, 119, 6, 0.1)', borderRadius: '8px', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: warningColor, fontSize: '15px' }}>⚠️ Dark Pattern Findings</h4>
          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
            {data.darkPatternFindings.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}

      {/* Pros & Cons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div>
          <h4 style={{ margin: '0 0 12px 0', color: successColor, fontSize: '15px' }}>✅ Strengths</h4>
          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
            {data.strengths?.map((item, i) => <li key={i} style={{ marginBottom: '6px' }}>{item}</li>)}
          </ul>
        </div>
        <div>
          <h4 style={{ margin: '0 0 12px 0', color: dangerColor, fontSize: '15px' }}>❌ Weaknesses</h4>
          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
            {data.weaknesses?.map((item, i) => <li key={i} style={{ marginBottom: '6px' }}>{item}</li>)}
          </ul>
        </div>
      </div>

      {/* Common Complaints */}
      {data.commonComplaints && data.commonComplaints.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: headerColor, fontSize: '15px' }}>🗣️ Common User Complaints</h4>
          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: dangerColor }}>
            {data.commonComplaints.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}

      {/* Footer / Buy Link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${borderColor}`, paddingTop: '20px' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Recommendation: <span style={{ color: data.overallRecommendation?.toLowerCase() === 'avoid' ? dangerColor : successColor }}>{data.overallRecommendation}</span></div>
        <a href={data.buyLink} target="_blank" rel="noreferrer" style={{ background: accentColor, color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px' }}>
          View Product
        </a>
      </div>

    </div>
  );
}
