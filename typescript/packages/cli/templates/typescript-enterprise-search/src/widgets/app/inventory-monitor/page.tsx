'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface InventoryReportData {
  facilityId: string;
  totalSKUs: number;
  totalValueUSD: number;
}

export default function InventoryMonitorWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<InventoryReportData>() || {
    facilityId: 'SFO-Central-Hub-04',
    totalSKUs: 3200,
    totalValueUSD: 8500000,
  };

  const valM = (data.totalValueUSD / 1000000).toFixed(2);

  return (
    <div className="widget-container">
      <div className="header">
        <div className="header-title">
          <h2>Facility Logistics: {data.facilityId}</h2>
        </div>
        <span className="badge badge-info">Live Inventory</span>
      </div>

      <div className="grid-cards">
        <div className="kpi-card">
          <div className="kpi-label">Total Valuation</div>
          <div className="kpi-value">${valM}M</div>
          <div className="kpi-sub">USD Asset Base</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Active Catalog SKUs</div>
          <div className="kpi-value">{data.totalSKUs.toLocaleString()}</div>
          <div className="kpi-sub">▲ 100% Tracked</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Fulfillment Health</div>
          <div className="kpi-value">98.2%</div>
          <div className="kpi-sub" style={{ color: '#10B981' }}>Optimal</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Pending Restocks</div>
          <div className="kpi-value">14</div>
          <div className="kpi-sub" style={{ color: '#F59E0B' }}>In Transit</div>
        </div>
      </div>

      <div className="progress-section">
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '12px' }}>
          Stock Distribution by Health Tier
        </div>
        <div className="bar-row">
          <span className="bar-label">Optimal Stock</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: '89%', background: 'linear-gradient(90deg, #10B981, #34D399)' }}></div>
          </div>
          <span className="bar-value">2,850</span>
        </div>
        <div className="bar-row">
          <span className="bar-label">Low Stock</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: '10%', background: 'linear-gradient(90deg, #F59E0B, #FBBF24)' }}></div>
          </div>
          <span className="bar-value">310</span>
        </div>
        <div className="bar-row">
          <span className="bar-label">Depleted</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: '1.2%', background: '#EF4444' }}></div>
          </div>
          <span className="bar-value">40</span>
        </div>
      </div>

      <div className="action-footer">
        <span>Warehouse Hub: North America Logistics</span>
        <span>Auto-Reorder Engine: Active</span>
      </div>
    </div>
  );
}
