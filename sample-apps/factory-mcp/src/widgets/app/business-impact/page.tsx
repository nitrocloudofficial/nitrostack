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

function getRiskStyle(level: string) {
  switch ((level || '').toLowerCase()) {
    case 'critical':
      return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', dot: '#dc2626' };
    case 'high':
      return { bg: '#fef3c7', text: '#92400e', border: '#fde68a', dot: '#f59e0b' };
    default:
      return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', dot: '#16a34a' };
  }
}

function Metric({
  label,
  value,
  sub,
  color = '#0f172a',
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 20,
        padding: 20,
        boxShadow: '0 14px 32px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 950, color }}>{value}</div>
      {sub && <div style={{ marginTop: 8, color: '#64748b', fontSize: 14 }}>{sub}</div>}
    </div>
  );
}

export default function BusinessImpact() {
  const { isReady, getToolOutput } = useWidgetSDK();

  if (!isReady) {
    return <div style={{ padding: 24 }}>Calculating business impact...</div>;
  }

  const data = parseToolOutput(getToolOutput());

  if (!data) {
    return <div style={{ padding: 24 }}>No business impact data available.</div>;
  }

  const downtime = data.estimated_downtime_hours ?? data.downtime_hours ?? 0;
  const loss = Number(data.estimated_production_loss_inr ?? data.production_loss_inr ?? 0);
  const risk = data.risk_level ?? 'medium';
  const priority = data.production_priority ?? 'n/a';
  const product = data.product ?? 'N/A';
  const qty = data.quantity_pending ?? 'N/A';

  const riskStyle = getRiskStyle(risk);

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 30,
        background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 48%, #fff7ed 100%)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #020617 0%, #312e81 55%, #7c2d12 100%)',
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
              color: '#c4b5fd',
              fontWeight: 950,
              marginBottom: 12,
            }}
          >
            FactoryLens MCP
          </div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 950 }}>Business Impact Assessment</h1>
          <p style={{ margin: '14px 0 0', color: '#e2e8f0', fontSize: 16 }}>
            Machine <strong>{data.machine_id}</strong> · {product}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 18 }}>
          <Metric label="Est. Downtime" value={`${downtime} h`} sub="Repair window" />
          <Metric
            label="Est. Production Loss"
            value={`₹${loss.toLocaleString('en-IN')}`}
            sub="Revenue at risk"
            color="#dc2626"
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 18,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 20,
              padding: 20,
              boxShadow: '0 14px 32px rgba(15, 23, 42, 0.08)',
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 12,
              }}
            >
              Risk Level
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 999,
                background: riskStyle.bg,
                color: riskStyle.text,
                border: `1px solid ${riskStyle.border}`,
                fontWeight: 900,
                textTransform: 'uppercase',
                fontSize: 14,
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: riskStyle.dot }} />
              {risk}
            </span>
          </div>

          <Metric label="Production Priority" value={String(priority).toUpperCase()} sub="Queue priority" />
          <Metric label="Pending Batch" value={`${qty}`} sub="Units queued" />
        </div>

        {data.message && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 18,
              padding: 16,
              color: '#92400e',
              fontSize: 14,
            }}
          >
            ⚠ {data.message}
          </div>
        )}
      </div>
    </div>
  );
}