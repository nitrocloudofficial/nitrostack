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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{value}</div>
    </div>
  );
}

export default function WorkOrder() {
  const { isReady, getToolOutput } = useWidgetSDK();

  if (!isReady) {
    return <div style={{ padding: 24 }}>Creating work order...</div>;
  }

  const data = parseToolOutput(getToolOutput());

  if (!data) {
    return <div style={{ padding: 24 }}>No work order data available.</div>;
  }

  const created = data.success === true;

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 30,
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 50%, #eff6ff 100%)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 620 }}>
        <div
          style={{
            background: created
              ? 'linear-gradient(135deg, #064e3b 0%, #0f766e 55%, #155e75 100%)'
              : 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 55%, #7c2d12 100%)',
            color: 'white',
            borderRadius: 32,
            padding: 34,
            marginBottom: 22,
            boxShadow: '0 26px 70px rgba(15, 23, 42, 0.32)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 44 }}>{created ? '✅' : '⚠️'}</div>
          <h1 style={{ margin: '12px 0 4px', fontSize: 32, fontWeight: 950 }}>
            {created ? 'Work Order Created' : 'Work Order Failed'}
          </h1>
          <p style={{ margin: 0, color: '#d1fae5', fontSize: 16 }}>
            #{data.work_order_id ?? 'N/A'} · {data.machine_id}
          </p>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 24,
            padding: '8px 24px 18px',
            boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)',
          }}
        >
          <Field label="Work Order ID" value={`#${data.work_order_id ?? 'N/A'}`} />
          <Field label="Machine" value={data.machine_id ?? 'N/A'} />
          <Field label="Issue" value={data.issue ?? 'N/A'} />
          <Field label="Assigned Engineer" value={data.assigned_engineer ?? 'N/A'} />
          <Field label="Date Created" value={data.date_created ?? 'N/A'} />
          <Field
            label="Status"
            value={
              <span
                style={{
                  display: 'inline-flex',
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: '#fef3c7',
                  color: '#92400e',
                  fontSize: 13,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                }}
              >
                {data.status ?? 'pending'}
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}