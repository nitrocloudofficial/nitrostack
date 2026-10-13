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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 22,
        padding: 22,
        boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)',
      }}
    >
      <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 950, color: '#0f172a' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function LogCard({ entry, index }: { entry: any; index: number }) {
  return (
    <div
      style={{
        position: 'relative',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 18,
        padding: '18px 20px',
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
        marginLeft: 14,
        marginBottom: 14,
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: -31,
          top: 24,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: index === 0 ? '#dc2626' : '#2563eb',
          border: '3px solid #ffffff',
          boxShadow: '0 0 0 2px #e5e7eb',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 16 }}>{entry.date}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#64748b' }}>
          Engineer: {entry.engineer}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6 }}>
        <div style={{ color: '#991b1b', fontWeight: 800 }}>
          ⚠ Issue: <span style={{ fontWeight: 600, color: '#334155' }}>{entry.issue}</span>
        </div>
        <div style={{ color: '#166534', fontWeight: 800, marginTop: 6 }}>
          ✔ Repair: <span style={{ fontWeight: 600, color: '#334155' }}>{entry.repair}</span>
        </div>
      </div>
    </div>
  );
}

export default function MaintenanceHistory() {
  const { isReady, getToolOutput } = useWidgetSDK();

  if (!isReady) {
    return <div style={{ padding: 24 }}>Loading maintenance history...</div>;
  }

  const data = parseToolOutput(getToolOutput());

  if (!data) {
    return <div style={{ padding: 24 }}>No maintenance data available.</div>;
  }

  const machineId = data.machine_id || 'Machine';
  const history: any[] = Array.isArray(data.history) ? data.history : [];

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 30,
        background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 45%, #fefce8 100%)',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
          <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.1, fontWeight: 950 }}>
            Maintenance History
          </h1>
          <p style={{ margin: '14px 0 0', color: '#cbd5e1', fontSize: 16 }}>
            Recorded repairs &amp; service logs for{' '}
            <strong>{machineId}</strong> ({history.length} entries)
          </p>
        </div>

        {history.length === 0 ? (
          <Section title="Logs">
            <p style={{ color: '#64748b', margin: 0 }}>No maintenance records found for this machine.</p>
          </Section>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 18 }}>
            <div
              style={{
                position: 'absolute',
                left: 6,
                top: 8,
                bottom: 20,
                width: 2,
                background: '#e2e8f0',
              }}
            />
            {history.map((entry: any, index: number) => (
              <LogCard key={entry?.id ?? index} entry={entry} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}