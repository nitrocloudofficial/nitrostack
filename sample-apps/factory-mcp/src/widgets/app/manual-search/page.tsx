'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

function parseToolOutput(raw: any) {
  if (!raw) return null;

  if (raw.content && Array.isArray(raw.content)) {
    const textItem = raw.content.find((item: any) => item.type === 'text');
    if (textItem?.text) {
      try {
        return JSON.parse(textItem.text);
      } catch {
        return { raw_text: textItem.text };
      }
    }
  }

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return { raw_text: raw };
    }
  }

  return raw;
}

function Snippet({ text }: { text: string }) {
  const lines = String(text).split(/\r?\n/);

  return (
    <div
      style={{
        background: '#0f172a',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.18)',
        overflowX: 'auto',
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: 13,
            lineHeight: 1.65,
            color: line.trim().startsWith('---') ? '#7dd3fc' : '#e2e8f0',
            fontWeight: line.trim().startsWith('---') ? 800 : 400,
            whiteSpace: 'pre-wrap',
          }}
        >
          {line || ' '}
        </div>
      ))}
    </div>
  );
}

export default function ManualSearch() {
  const { isReady, getToolOutput } = useWidgetSDK();

  if (!isReady) {
    return <div style={{ padding: 24 }}>Searching manual...</div>;
  }

  const data = parseToolOutput(getToolOutput());

  if (!data) {
    return <div style={{ padding: 24 }}>No manual search data available.</div>;
  }

  if (data.found === false) {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: 30,
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 45%, #fefce8 100%)',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #020617 0%, #1e293b 55%, #0f766e 100%)',
              color: 'white',
              borderRadius: 32,
              padding: 34,
            }}
          >
            <div
              style={{
                fontSize: 13,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#99f6e4',
                fontWeight: 950,
                marginBottom: 12,
              }}
            >
              FactoryLens MCP
            </div>
            <h1 style={{ margin: 0, fontSize: 36, fontWeight: 950 }}>Manual Search</h1>
            <p style={{ margin: '14px 0 0', color: '#cbd5e1' }}>
              {data.message || 'No manual found for this machine.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const results: string[] = Array.isArray(data.results) ? data.results : [];

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 30,
        background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 45%, #fefce8 100%)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #020617 0%, #1e293b 55%, #0f766e 100%)',
            color: 'white',
            borderRadius: 32,
            padding: 34,
            marginBottom: 24,
            boxShadow: '0 26px 70px rgba(15, 23, 42, 0.32)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#99f6e4',
              fontWeight: 950,
              marginBottom: 12,
            }}
          >
            FactoryLens MCP
          </div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 950 }}>Manual Search Results</h1>
          <p style={{ margin: '14px 0 0', color: '#cbd5e1', fontSize: 16 }}>
            Manual: <strong>{data.manual_file}</strong> · {data.matches_count ?? 0} match(es)
          </p>
        </div>

        {results.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 22,
              padding: 22,
            }}
          >
            <p style={{ color: '#64748b', margin: 0 }}>No matching excerpts found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {results.map((snippet, i) => (
              <Snippet key={i} text={snippet} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}