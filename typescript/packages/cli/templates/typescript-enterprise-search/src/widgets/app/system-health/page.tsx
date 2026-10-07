'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { widgetBaseStyles } from '../widget-styles';

export const dynamic = 'force-dynamic';

interface SystemHealthData {
  status: string;
  uptimeSeconds: number;
  timestamp: number;
}

export default function SystemHealthWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<SystemHealthData>() || {
    status: 'healthy',
    uptimeSeconds: 74218,
    timestamp: Date.now(),
  };

  const isLight = theme === 'light';
  const hours = Math.floor(data.uptimeSeconds / 3600);
  const minutes = Math.floor((data.uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(data.uptimeSeconds % 60);

  const isHealthy = data.status.toLowerCase() === 'healthy';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: widgetBaseStyles }} />
      <div className={`widget-container ${isLight ? 'light' : 'dark'}`}>
        <div className="header">
          <div className="header-title">
            <div className="header-icon">⚡</div>
            <div>
              <h2>Enterprise Search: Cluster Telemetry</h2>
              <p>Real-Time Ingress & BM25 Discovery Pipeline</p>
            </div>
          </div>
          <span className={`badge ${isHealthy ? 'badge-success' : 'badge-purple'}`}>
            <span className={`pulse-dot ${isHealthy ? 'success' : 'info'}`} />
            {data.status.toUpperCase()}
          </span>
        </div>

        <div className="grid-cards">
          <div className="kpi-card">
            <div className="kpi-label">Continuous Uptime</div>
            <div className="kpi-value">{hours}h {minutes}m</div>
            <div className="kpi-sub" style={{ color: '#10B981' }}>
              ▲ 99.99% Availability
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Ingress Transport</div>
            <div className="kpi-value">Streamable</div>
            <div className="kpi-sub" style={{ color: '#60A5FA' }}>
              HTTP/2 + SSE Stream
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Discovery Pipeline</div>
            <div className="kpi-value">BM25 Engine</div>
            <div className="kpi-sub" style={{ color: '#A78BFA' }}>
              Progressive Index
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Spillover Store</div>
            <div className="kpi-value">100MB</div>
            <div className="kpi-sub" style={{ color: '#3B82F6' }}>
              Active Cache
            </div>
          </div>
        </div>

        <div className="progress-section">
          <div className="section-title">
            <span>Runtime Health & Security Perimeter</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>All Systems Nominal</span>
          </div>

          <div className="bar-row">
            <span className="bar-label" style={{ minWidth: '130px' }}>TLS 1.3 Encryption</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: '100%', background: 'linear-gradient(90deg, #10B981, #34D399)' }}
              />
            </div>
            <span className="bar-value" style={{ color: '#10B981', minWidth: '60px' }}>Verified</span>
          </div>

          <div className="bar-row">
            <span className="bar-label" style={{ minWidth: '130px' }}>Tenant Isolation</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: '100%', background: 'linear-gradient(90deg, #3B82F6, #60A5FA)' }}
              />
            </div>
            <span className="bar-value" style={{ color: '#60A5FA', minWidth: '60px' }}>Secured</span>
          </div>

          <div className="bar-row">
            <span className="bar-label" style={{ minWidth: '130px' }}>Protocol Era</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: '100%', background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }}
              />
            </div>
            <span className="bar-value" style={{ color: '#A78BFA', minWidth: '60px' }}>2026-07-28</span>
          </div>
        </div>

        <div className="action-footer">
          <span>
            <span>🛡️</span>
            Node: NitroCloud Worker Pod
          </span>
          <span>Core: @nitrostack/core@1.1.0-beta.5</span>
        </div>
      </div>
    </>
  );
}
