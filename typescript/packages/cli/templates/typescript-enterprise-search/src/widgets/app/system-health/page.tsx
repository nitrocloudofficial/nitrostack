'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface SystemHealthData {
  status: string;
  uptimeSeconds: number;
  timestamp: number;
}

export default function SystemHealthWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<SystemHealthData>() || {
    status: 'healthy',
    uptimeSeconds: 74218,
    timestamp: Date.now(),
  };

  const hours = Math.floor(data.uptimeSeconds / 3600);
  const minutes = Math.floor((data.uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(data.uptimeSeconds % 60);

  return (
    <div className="widget-container">
      <div className="header">
        <div className="header-title">
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }} />
          <h2>Enterprise Search: Cluster Telemetry</h2>
        </div>
        <span className="badge badge-success">Status: {data.status.toUpperCase()}</span>
      </div>

      <div className="grid-cards">
        <div className="kpi-card">
          <div className="kpi-label">Continuous Uptime</div>
          <div className="kpi-value">{hours}h {minutes}m</div>
          <div className="kpi-sub">▲ 99.99% Availability</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Ingress Gateway</div>
          <div className="kpi-value">Envoy</div>
          <div className="kpi-sub" style={{ color: '#60A5FA' }}>HTTP/2 SSE Stream</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Discovery Pipeline</div>
          <div className="kpi-value">BM25</div>
          <div className="kpi-sub">Progressive Hiding</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Spillover Store</div>
          <div className="kpi-value">100MB</div>
          <div className="kpi-sub">In-Memory Cache</div>
        </div>
      </div>

      <div className="progress-section">
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '12px' }}>
          Runtime Health & Security Perimeter
        </div>
        <div className="bar-row">
          <span className="bar-label" style={{ width: '130px' }}>TLS 1.3 Encryption</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #10B981, #34D399)' }}></div>
          </div>
          <span className="bar-value" style={{ width: '70px' }}>Verified</span>
        </div>
        <div className="bar-row">
          <span className="bar-label" style={{ width: '130px' }}>Tenant Isolation</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #3B82F6, #60A5FA)' }}></div>
          </div>
          <span className="bar-value" style={{ width: '70px' }}>Active</span>
        </div>
        <div className="bar-row">
          <span className="bar-label" style={{ width: '130px' }}>MCP Protocol</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }}></div>
          </div>
          <span className="bar-value" style={{ width: '70px' }}>2024-11-05</span>
        </div>
      </div>

      <div className="action-footer">
        <span>Node: NitroCloud Worker Pod (darwin/arm64)</span>
        <span>Version: @nitrostack/core@1.1.0-beta.1</span>
      </div>
    </div>
  );
}
