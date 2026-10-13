'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

function parseToolOutput(raw: any) {
  if (!raw) return null;

  if (raw.machine_id && raw.diagnosis) {
    return raw;
  }

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

function getStatusStyle(status: string) {
  if (status === 'critical') {
    return {
      bg: '#fee2e2',
      text: '#991b1b',
      border: '#fecaca',
      dot: '#dc2626'
    };
  }

  if (status === 'warning') {
    return {
      bg: '#fef3c7',
      text: '#92400e',
      border: '#fde68a',
      dot: '#f59e0b'
    };
  }

  return {
    bg: '#dcfce7',
    text: '#166534',
    border: '#bbf7d0',
    dot: '#16a34a'
  };
}

function StatusBadge({ status }: { status: string }) {
  const style = getStatusStyle(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 999,
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        fontWeight: 900,
        textTransform: 'uppercase',
        fontSize: 13
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: style.dot
        }}
      />
      {status}
    </span>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 22,
        padding: 22,
        boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)'
      }}
    >
      <h2
        style={{
          margin: '0 0 16px',
          fontSize: 20,
          fontWeight: 950,
          color: '#0f172a'
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function ListCards({
  items,
  type
}: {
  items: string[];
  type: 'evidence' | 'recommendation';
}) {
  if (!items || items.length === 0) {
    return <p style={{ color: '#64748b', margin: 0 }}>No data available.</p>;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 14
      }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          style={{
            border:
              type === 'evidence'
                ? '1px solid #bfdbfe'
                : '1px solid #bbf7d0',
            background:
              type === 'evidence'
                ? '#eff6ff'
                : '#f0fdf4',
            borderRadius: 18,
            padding: 16
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 900,
              color:
                type === 'evidence'
                  ? '#1d4ed8'
                  : '#15803d',
              marginBottom: 8
            }}
          >
            {type === 'evidence'
              ? `Evidence ${index + 1}`
              : `Action ${index + 1}`}
          </div>

          <div
            style={{
              color: '#334155',
              lineHeight: 1.6,
              fontSize: 14
            }}
          >
            {item}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RootCauseInvestigation() {
  const { isReady, getToolOutput } = useWidgetSDK();

  if (!isReady) {
    return <div style={{ padding: 24 }}>Loading root cause dashboard...</div>;
  }

  const data = parseToolOutput(getToolOutput());

  if (!data) {
    return <div style={{ padding: 24 }}>No root cause data available.</div>;
  }

  const diagnosis = data.diagnosis || {};
  const confidence = Math.round((diagnosis.confidence_score || 0) * 100);

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 30,
        background:
          'linear-gradient(135deg, #f8fafc 0%, #eef2ff 48%, #fff7ed 100%)',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}
    >
      <div style={{ maxWidth: 1150, margin: '0 auto' }}>
        <div
          style={{
            background:
              'linear-gradient(135deg, #020617 0%, #312e81 55%, #7c2d12 100%)',
            color: 'white',
            borderRadius: 32,
            padding: 34,
            marginBottom: 24,
            boxShadow: '0 26px 70px rgba(15, 23, 42, 0.32)'
          }}
        >
          <div
            style={{
              fontSize: 13,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#c4b5fd',
              fontWeight: 950,
              marginBottom: 12
            }}
          >
            FactoryLens MCP Investigation
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 20,
              flexWrap: 'wrap'
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 38,
                  lineHeight: 1.1,
                  fontWeight: 950
                }}
              >
                {data.machine_name || 'Machine'} Failure Diagnosis
              </h1>

              <p
                style={{
                  margin: '14px 0 0',
                  color: '#e2e8f0',
                  fontSize: 16,
                  lineHeight: 1.6
                }}
              >
                Machine ID: <strong>{data.machine_id}</strong> · Location:{' '}
                <strong>{data.location}</strong>
              </p>
            </div>

            <StatusBadge status={data.status || 'unknown'} />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 18,
            marginBottom: 22
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 22,
              padding: 22,
              boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)'
            }}
          >
            <div
              style={{
                color: '#64748b',
                fontSize: 13,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 12
              }}
            >
              Confidence Score
            </div>

            <div
              style={{
                fontSize: 44,
                fontWeight: 950,
                color: confidence >= 85 ? '#16a34a' : '#f59e0b'
              }}
            >
              {confidence}%
            </div>

            <div
              style={{
                marginTop: 14,
                height: 12,
                background: '#e5e7eb',
                borderRadius: 999,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${confidence}%`,
                  height: '100%',
                  background:
                    confidence >= 85
                      ? '#16a34a'
                      : confidence >= 60
                        ? '#f59e0b'
                        : '#dc2626',
                  borderRadius: 999
                }}
              />
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 22,
              padding: 22,
              boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)'
            }}
          >
            <div
              style={{
                color: '#64748b',
                fontSize: 13,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 12
              }}
            >
              Diagnosis Type
            </div>

            <div
              style={{
                fontSize: 26,
                fontWeight: 950,
                color: '#7c2d12'
              }}
            >
              Root Cause Analysis
            </div>

            <p
              style={{
                margin: '10px 0 0',
                color: '#64748b',
                lineHeight: 1.6
              }}
            >
              Evidence synthesized from telemetry, maintenance history, manuals,
              and environmental context.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <Section title="Diagnosed Root Cause">
            <p
              style={{
                margin: 0,
                color: '#334155',
                fontSize: 17,
                lineHeight: 1.8,
                fontWeight: 600
              }}
            >
              {diagnosis.root_cause || 'No root cause returned.'}
            </p>
          </Section>
        </div>

        <div style={{ marginBottom: 22 }}>
          <Section title="Evidence Considered">
            <ListCards items={diagnosis.evidence || []} type="evidence" />
          </Section>
        </div>

        <Section title="Recommended Actions">
          <ListCards
            items={diagnosis.recommendations || []}
            type="recommendation"
          />
        </Section>
      </div>
    </div>
  );
}