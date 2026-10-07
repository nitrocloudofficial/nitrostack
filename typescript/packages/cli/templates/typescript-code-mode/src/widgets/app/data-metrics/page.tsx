'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { widgetBaseStyles } from '../widget-styles';

export const dynamic = 'force-dynamic';

interface DataMetrics {
  sum: number;
  avg: number;
  count: number;
}

export default function DataMetricsWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<DataMetrics>() || {
    sum: 2480,
    avg: 310,
    count: 8,
  };

  const isLight = theme === 'light';
  const format = (value: number) =>
    Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: widgetBaseStyles }} />
      <div className={`widget-container ${isLight ? 'light' : 'dark'}`}>
        <div className="header">
          <div className="header-title">
            <div className="header-icon">📈</div>
            <div>
              <h2>Aggregate Metrics</h2>
              <p>Sum, average, and sample count</p>
            </div>
          </div>
          <span className="badge badge-info">
            <span className="pulse-dot info" />
            Computed
          </span>
        </div>

        <div className="grid-cards">
          <div className="kpi-card">
            <div className="kpi-label">Sum</div>
            <div className="kpi-value">{format(data.sum)}</div>
            <div className="kpi-sub" style={{ color: '#60A5FA' }}>
              Total
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Average</div>
            <div className="kpi-value">{format(data.avg)}</div>
            <div className="kpi-sub" style={{ color: '#10B981' }}>
              Mean
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Count</div>
            <div className="kpi-value">{format(data.count)}</div>
            <div className="kpi-sub" style={{ color: '#A78BFA' }}>
              Values
            </div>
          </div>
        </div>

        <div className="action-footer">
          <span>
            <span>∑</span>
            Statistical aggregation
          </span>
          <span>NitroStack Code Mode</span>
        </div>
      </div>
    </>
  );
}
