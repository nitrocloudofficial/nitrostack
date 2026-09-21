'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  imageUrl: string;
}

interface ResearchData {
  topic: string;
  count: number;
  papers: Paper[];
}

export default function ResearchPapersWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ResearchData>();

  if (!isReady) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Initializing...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Loading...
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';

  const papers = data.papers ?? [];

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      color: textColor,
      borderRadius: '12px',
      maxWidth: '800px',
    }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>
          📚 Research Papers
        </h2>
        <p style={{ margin: 0, color: mutedColor, fontSize: '14px' }}>
          Topic: <strong>{data.topic ?? 'Unknown'}</strong> • {papers.length} papers found
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        {papers.length > 0 ? (
          papers.map((paper) => (
            <div
              key={paper.id}
              style={{
                border: `1px solid ${borderColor}`,
                borderRadius: '12px',
                overflow: 'hidden',
                background: isDark ? '#2a2a2a' : '#f9fafb',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = isDark
                  ? '0 8px 16px rgba(0,0,0,0.4)'
                  : '0 8px 16px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isDark
                  ? '0 2px 8px rgba(0,0,0,0.3)'
                  : '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              {/* Paper Image */}
              <div style={{
                width: '100%',
                height: '160px',
                background: '#e5e7eb',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {paper.imageUrl ? (
                  <img
                    src={paper.imageUrl}
                    alt={paper.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div style={{
                    fontSize: '48px',
                    color: '#9ca3af',
                  }}>
                    📄
                  </div>
                )}
              </div>

              {/* Paper Content */}
              <div style={{ padding: '16px' }}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  lineHeight: '1.4',
                  color: textColor,
                }}>
                  {paper.title ?? 'Untitled'}
                </h3>

                <p style={{
                  margin: '0 0 12px 0',
                  fontSize: '12px',
                  color: mutedColor,
                }}>
                  {(paper.authors ?? []).length > 0
                    ? (paper.authors ?? []).slice(0, 2).join(', ') +
                      ((paper.authors ?? []).length > 2 ? ` +${(paper.authors ?? []).length - 2}` : '')
                    : 'Unknown authors'}
                </p>

                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  color: mutedColor,
                  lineHeight: '1.5',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {paper.abstract ?? 'No abstract available'}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div style={{
            gridColumn: '1 / -1',
            padding: '40px 20px',
            textAlign: 'center',
            color: mutedColor,
          }}>
            <p style={{ fontSize: '16px', margin: 0 }}>No papers found for this topic.</p>
          </div>
        )}
      </div>
    </div>
  );
}
