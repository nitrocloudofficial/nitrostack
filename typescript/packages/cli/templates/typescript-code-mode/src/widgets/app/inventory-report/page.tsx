'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { widgetBaseStyles } from '../widget-styles';

export const dynamic = 'force-dynamic';

interface InventoryReportData {
  facilityId: string;
  totalSKUs: number;
  totalValueUSD: number;
}

export default function InventoryReportWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<InventoryReportData>() || {
    facilityId: 'FAC-CENTRAL',
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
            <div className="header-icon">🏭</div>
            <div>
              <h2>Facility {data.facilityId}</h2>
              <p>Inventory valuation and catalog size</p>
            </div>
          </div>
          <span className="badge badge-info">
            <span className="pulse-dot info" />
            Live inventory
          </span>
        </div>

        <div className="grid-cards">
          <div className="kpi-card">
            <div className="kpi-label">Total Valuation</div>
            <div className="kpi-value">${valM}M</div>
            <div className="kpi-sub" style={{ color: '#3B82F6' }}>
              USD asset base
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Active SKUs</div>
            <div className="kpi-value">{data.totalSKUs.toLocaleString()}</div>
            <div className="kpi-sub" style={{ color: '#10B981' }}>
              Catalog tracked
            </div>
          </div>
        </div>

        <div className="action-footer">
          <span>
            <span>🏢</span>
            Warehouse valuation
          </span>
          <span>NitroStack Code Mode</span>
        </div>
      </div>
    </>
  );
}
