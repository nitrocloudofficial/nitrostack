'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Article {
  title: string;
  source: string;
  link: string;
}

interface MarketNewsData {
  topic: string;
  articles: Article[];
  status: string;
}

export default function MarketNewsWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<MarketNewsData>();

  if (!isReady || !data) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(226, 232, 240, 0.6)', fontFamily: 'system-ui' }}>
        <div style={{ fontSize: '14px' }}>Fetching market news...</div>
      </div>
    );
  }

  if (data.status === 'error') {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgb(239, 68, 68)', fontFamily: 'system-ui', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Error fetching news</div>
        <div style={{ fontSize: '14px', marginTop: '8px' }}>{(data as any).error || 'Unknown error occurred'}</div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 100%)',
      padding: '32px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'rgb(226, 232, 240)',
      borderRadius: '16px',
      border: '1px solid rgba(148, 163, 184, 0.15)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '24px' }}>📰</div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
          {data.topic} News
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {data.articles?.map((article, idx) => (
          <a
            key={idx}
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              background: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(8px)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              textDecoration: 'none',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
              e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.4)';
              e.currentTarget.style.border = '1px solid rgba(148, 163, 184, 0.1)';
            }}
          >
            <div style={{ fontSize: '12px', color: 'rgb(96, 165, 250)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
              {article.source}
            </div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: 'rgb(241, 245, 249)', lineHeight: '1.5' }}>
              {article.title}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
