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

// Lightweight, safe Markdown -> React renderer (no dangerouslySetInnerHTML)
function renderInline(text: string): React.ReactNode[] {
  const parts = String(text).split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
  );
}

function renderMarkdown(md: string): React.ReactNode {
  const lines = String(md).split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length) {
      const items = list;
      blocks.push(
        <ul
          key={`ul-${blocks.length}`}
          style={{ margin: '8px 0', paddingLeft: 22, color: '#334155', lineHeight: 1.7 }}
        >
          {items.map((li, idx) => (
            <li key={idx}>{renderInline(li)}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  lines.forEach((line, i) => {
    const t = line.trim();
    if (t === '---') {
      flushList();
      blocks.push(
        <hr key={i} style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '18px 0' }} />
      );
      return;
    }
    if (t.startsWith('## ')) {
      flushList();
      blocks.push(
        <h2 key={i} style={{ fontSize: 20, fontWeight: 950, color: '#0f172a', margin: '18px 0 8px' }}>
          {renderInline(t.slice(3))}
        </h2>
      );
      return;
    }
    if (t.startsWith('# ')) {
      flushList();
      blocks.push(
        <h1 key={i} style={{ fontSize: 26, fontWeight: 950, color: '#0f172a', margin: '8px 0 12px' }}>
          {renderInline(t.slice(2))}
        </h1>
      );
      return;
    }
    if (t.startsWith('- ')) {
      list.push(t.slice(2));
      return;
    }
    if (t === '') {
      flushList();
      return;
    }
    flushList();
    blocks.push(
      <p key={i} style={{ margin: '8px 0', lineHeight: 1.75, color: '#334155', fontSize: 15 }}>
        {renderInline(t)}
      </p>
    );
  });

  flushList();
  return <>{blocks}</>;
}

export default function InvestigationReport() {
  const { isReady, getToolOutput } = useWidgetSDK();

  if (!isReady) {
    return <div style={{ padding: 24 }}>Compiling investigation report...</div>;
  }

  const data = parseToolOutput(getToolOutput());

  if (!data) {
    return <div style={{ padding: 24 }}>No report data available.</div>;
  }

  const report: string = data.report ?? '';
  const filename: string = data.filename ?? 'report.md';

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 30,
        background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 45%, #fefce8 100%)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
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
            FactoryLens MCP Investigation
          </div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 950 }}>Failure Investigation Report</h1>
          <p style={{ margin: '14px 0 0', color: '#cbd5e1', fontSize: 15 }}>📄 {filename}</p>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 24,
            padding: '28px 32px',
            boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)',
          }}
        >
          {report ? (
            renderMarkdown(report)
          ) : (
            <p style={{ color: '#64748b', margin: 0 }}>Report content is empty.</p>
          )}
        </div>
      </div>
    </div>
  );
}