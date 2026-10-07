'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { widgetBaseStyles } from '../widget-styles';

export const dynamic = 'force-dynamic';

interface SystemStatusData {
  status: string;
  uptimeSeconds: number;
  timestamp: number;
}

export default function SystemStatusWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<SystemStatusData>() || {
    status: 'healthy',
    uptimeSeconds: 14520,
    timestamp: Date.now(),
  };

  const isLight = theme === 'light';
  const hours = Math.floor(data.uptimeSeconds / 3600);
  const minutes = Math.floor((data.uptimeSeconds % 3600) / 60);
  const isHealthy = data.status.toLowerCase() === 'healthy';
  const checkedAt = new Date(data.timestamp).toISOString();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: widgetBaseStyles }} />
      <div className={`widget-container ${isLight ? 'light' : 'dark'}`}>
        <div className="header">
          <div className="header-title">
            <div className="header-icon">⚡</div>
            <div>
              <h2>Code Mode Runtime</h2>
              <p>Sandbox health and process uptime</p>
            </div>
          </div>
          <span className={`badge ${isHealthy ? 'badge-success' : 'badge-purple'}`}>
            <span className={`pulse-dot ${isHealthy ? 'success' : 'info'}`} />
            {data.status.toUpperCase()}
          </span>
        </div>

        <div className="grid-cards">
          <div className="kpi-card">
            <div className="kpi-label">Uptime</div>
            <div className="kpi-value">{hours}h {minutes}m</div>
            <div className="kpi-sub" style={{ color: '#10B981' }}>
              Process clock
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Sandbox</div>
            <div className="kpi-value">QuickJS</div>
            <div className="kpi-sub" style={{ color: '#A78BFA' }}>
              WebAssembly
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Checked</div>
            <div className="kpi-value" style={{ fontSize: '0.95rem' }}>{checkedAt.slice(11, 19)}</div>
            <div className="kpi-sub" style={{ color: '#60A5FA' }}>
              UTC heartbeat
            </div>
          </div>
        </div>

        <div className="action-footer">
          <span>
            <span>🛡️</span>
            Worker pool
          </span>
          <span>NitroStack Code Mode</span>
        </div>
      </div>
    </>
  );
}
