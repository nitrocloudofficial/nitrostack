'use client';

import { useWidgetSDK } from '@nitrostack/widgets';
import type { ReactNode } from 'react';

function parseToolOutput(raw: any) {
  if (!raw) return null;

  if (raw.status && raw.stats) {
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

function Card({
  title,
  value,
  subtitle,
  color = '#2563eb'
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 20,
        padding: 20,
        boxShadow: '0 14px 32px rgba(15, 23, 42, 0.08)'
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 10
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 34,
          fontWeight: 950,
          color
        }}
      >
        {value}
      </div>

      {subtitle && (
        <div
          style={{
            marginTop: 8,
            color: '#64748b',
            fontSize: 14,
            lineHeight: 1.5
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

function MetricBar({
  label,
  value,
  limit,
  unit,
  color
}: {
  label: string;
  value: number;
  limit: number;
  unit: string;
  color: string;
}) {
  const percentage = Math.min((value / limit) * 100, 140);

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 18,
        padding: 18,
        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 10
        }}
      >
        <div style={{ fontWeight: 850, color: '#0f172a' }}>{label}</div>
        <div style={{ fontWeight: 900, color }}>
          {value} {unit}
        </div>
      </div>

      <div
        style={{
          height: 12,
          background: '#e5e7eb',
          borderRadius: 999,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${Math.min(percentage, 100)}%`,
            height: '100%',
            background: color,
            borderRadius: 999
          }}
        />
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: '#64748b'
        }}
      >
        Safety limit: {limit} {unit}
      </div>
    </div>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: ReactNode;
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

function StatusBadge({ status }: { status: string }) {
  const isWarning = status === 'warning';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 999,
        background: isWarning ? '#fef3c7' : '#dcfce7',
        color: isWarning ? '#92400e' : '#166534',
        border: `1px solid ${isWarning ? '#fde68a' : '#bbf7d0'}`,
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
          background: isWarning ? '#f59e0b' : '#16a34a'
        }}
      />
      {status}
    </span>
  );
}

export default function SensorAnomalyDashboard() {
  const { isReady, getToolOutput } = useWidgetSDK();

  if (!isReady) {
    return <div style={{ padding: 24 }}>Loading sensor dashboard...</div>;
  }

  const data = parseToolOutput(getToolOutput());

  if (!data) {
    return <div style={{ padding: 24 }}>No sensor analysis data available.</div>;
  }

  const stats = data.stats || {};
  const averages = stats.averages || {};
  const maximums = stats.maximums || {};
  const anomalies = data.anomalies || [];

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 30,
        background:
          'linear-gradient(135deg, #f8fafc 0%, #eff6ff 45%, #fefce8 100%)',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}
    >
      <div style={{ maxWidth: 1150, margin: '0 auto' }}>
        <div
          style={{
            background:
              'linear-gradient(135deg, #020617 0%, #1e293b 55%, #0f766e 100%)',
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
              color: '#99f6e4',
              fontWeight: 950,
              marginBottom: 12
            }}
          >
            FactoryLens MCP
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
              alignItems: 'center'
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
                Sensor Anomaly Dashboard
              </h1>

              <p
                style={{
                  margin: '14px 0 0',
                  color: '#cbd5e1',
                  fontSize: 16,
                  lineHeight: 1.6
                }}
              >
                CSV telemetry analysis for temperature, vibration, current, and voltage.
              </p>
            </div>

            <StatusBadge status={data.status || 'unknown'} />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 18,
            marginBottom: 22
          }}
        >
          <Card
            title="Total Records"
            value={stats.total_records ?? 0}
            subtitle="Sensor readings analyzed"
            color="#2563eb"
          />
          <Card
            title="Anomalies"
            value={data.anomalies_count ?? 0}
            subtitle="Readings above safe thresholds"
            color="#dc2626"
          />
          <Card
            title="Max Temperature"
            value={`${maximums.temperature ?? 0}°C`}
            subtitle="Limit: 65°C"
            color={(maximums.temperature ?? 0) > 65 ? '#dc2626' : '#16a34a'}
          />
          <Card
            title="Max Vibration"
            value={`${maximums.vibration ?? 0} mm/s`}
            subtitle="Limit: 2.5 mm/s"
            color={(maximums.vibration ?? 0) > 2.5 ? '#dc2626' : '#16a34a'}
          />
        </div>

        <div style={{ marginBottom: 22 }}>
          <Section title="Average Operating Metrics">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 16
              }}
            >
              <MetricBar
                label="Avg Temperature"
                value={averages.temperature ?? 0}
                limit={65}
                unit="°C"
                color={(averages.temperature ?? 0) > 65 ? '#dc2626' : '#f97316'}
              />
              <MetricBar
                label="Avg Vibration"
                value={averages.vibration ?? 0}
                limit={2.5}
                unit="mm/s"
                color={(averages.vibration ?? 0) > 2.5 ? '#dc2626' : '#7c3aed'}
              />
              <MetricBar
                label="Avg Current"
                value={averages.current ?? 0}
                limit={5.5}
                unit="A"
                color={(averages.current ?? 0) > 5.5 ? '#dc2626' : '#0891b2'}
              />
            </div>
          </Section>
        </div>

        <Section title="Detected Anomaly Events">
          {anomalies.length === 0 ? (
            <p style={{ color: '#64748b', margin: 0 }}>
              No anomalies detected in the uploaded sensor file.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
                gap: 16
              }}
            >
              {anomalies.map((item: any, index: number) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid #fecaca',
                    background: '#fff7ed',
                    borderRadius: 18,
                    padding: 18
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: '#9a3412',
                      fontWeight: 900,
                      marginBottom: 8
                    }}
                  >
                    {item.timestamp}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 10,
                      marginBottom: 12
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Temp</div>
                      <strong>{item.temperature}°C</strong>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Vib</div>
                      <strong>{item.vibration}</strong>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Current</div>
                      <strong>{item.current}A</strong>
                    </div>
                  </div>

                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 20,
                      color: '#7f1d1d',
                      lineHeight: 1.7
                    }}
                  >
                    {(item.issues || []).map((issue: string, i: number) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}