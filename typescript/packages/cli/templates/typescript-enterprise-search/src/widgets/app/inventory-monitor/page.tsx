'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { widgetBaseStyles } from '../widget-styles';

export const dynamic = 'force-dynamic';

interface InventoryReportData {
  facilityId: string;
  totalSKUs: number;
  totalValueUSD: number;
}

export default function InventoryMonitorWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<InventoryReportData>() || {
    facilityId: 'SFO-Central-Hub-04',
    totalSKUs: 3200,
    totalValueUSD: 8500000,
  };

  const isLight = theme === 'light';
  const valM = (data.totalValueUSD / 1000000).toFixed(2);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: widgetBaseStyles }} />
      <div className={`widget-container ${isLight ? 'light' : 'dark'}`}>
        <div className="header">
          <div className="header-title">
            <div className="header-icon">📦</div>
            <div>
              <h2>Facility Logistics: {data.facilityId}</h2>
              <p>Warehouse Valuation & SKU Distribution Monitor</p>
            </div>
          </div>
          <span className="badge badge-info">
            <span className="pulse-dot info" />
            Live Inventory
          </span>
        </div>

        <div className="grid-cards">
          <div className="kpi-card">
            <div className="kpi-label">Total Valuation</div>
            <div className="kpi-value">${valM}M</div>
            <div className="kpi-sub" style={{ color: '#3B82F6' }}>
              USD Asset Base
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Active SKUs</div>
            <div className="kpi-value">{data.totalSKUs.toLocaleString()}</div>
            <div className="kpi-sub" style={{ color: '#10B981' }}>
              ▲ 100% Tracked
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Fulfillment Health</div>
            <div className="kpi-value">98.2%</div>
            <div className="kpi-sub" style={{ color: '#10B981' }}>
              Optimal Rating
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Pending Restocks</div>
            <div className="kpi-value">14 Orders</div>
            <div className="kpi-sub" style={{ color: '#F59E0B' }}>
              In Transit
            </div>
          </div>
        </div>

        <div className="progress-section">
          <div className="section-title">
            <span>Stock Distribution by Health Tier</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {data.totalSKUs.toLocaleString()} Total Units
            </span>
          </div>

          <div className="bar-row">
            <span className="bar-label">Optimal Stock</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: '89%', background: 'linear-gradient(90deg, #10B981, #34D399)' }}
              />
            </div>
            <span className="bar-value" style={{ color: '#10B981' }}>2,850</span>
          </div>

          <div className="bar-row">
            <span className="bar-label">Low Stock</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: '10%', background: 'linear-gradient(90deg, #F59E0B, #FBBF24)' }}
              />
            </div>
            <span className="bar-value" style={{ color: '#F59E0B' }}>310</span>
          </div>

          <div className="bar-row">
            <span className="bar-label">Depleted</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: '2%', background: '#EF4444' }}
              />
            </div>
            <span className="bar-value" style={{ color: '#EF4444' }}>40</span>
          </div>
        </div>

        <div className="action-footer">
          <span>
            <span>🏢</span>
            Hub: North America Logistics
          </span>
          <span>Auto-Reorder Engine: Active</span>
        </div>
      </div>
    </>
  );
}
