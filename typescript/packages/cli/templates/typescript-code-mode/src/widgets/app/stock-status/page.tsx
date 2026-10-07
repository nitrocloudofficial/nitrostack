'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { widgetBaseStyles } from '../widget-styles';

export const dynamic = 'force-dynamic';

interface StockStatusData {
  sku: string;
  inStock: number;
  reserved: number;
}

export default function StockStatusWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<StockStatusData>() || {
    sku: 'WIDGET-001',
    inStock: 450,
    reserved: 20,
  };

  const isLight = theme === 'light';
  const available = Math.max(data.inStock - data.reserved, 0);
  const reservedPct = data.inStock > 0 ? Math.min(100, Math.round((data.reserved / data.inStock) * 100)) : 0;
  const availablePct = 100 - reservedPct;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: widgetBaseStyles }} />
      <div className={`widget-container ${isLight ? 'light' : 'dark'}`}>
        <div className="header">
          <div className="header-title">
            <div className="header-icon">📦</div>
            <div>
              <h2>Stock {data.sku}</h2>
              <p>Available and reserved units</p>
            </div>
          </div>
          <span className="badge badge-info">
            <span className="pulse-dot info" />
            On hand
          </span>
        </div>

        <div className="grid-cards">
          <div className="kpi-card">
            <div className="kpi-label">In Stock</div>
            <div className="kpi-value">{data.inStock.toLocaleString()}</div>
            <div className="kpi-sub" style={{ color: '#60A5FA' }}>
              Warehouse units
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Reserved</div>
            <div className="kpi-value">{data.reserved.toLocaleString()}</div>
            <div className="kpi-sub" style={{ color: '#F59E0B' }}>
              Allocated
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Available</div>
            <div className="kpi-value">{available.toLocaleString()}</div>
            <div className="kpi-sub" style={{ color: '#10B981' }}>
              Ready to ship
            </div>
          </div>
        </div>

        <div className="progress-section">
          <div className="section-title">
            <span>Allocation</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {data.sku}
            </span>
          </div>
          <div className="bar-row">
            <span className="bar-label">Available</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${availablePct}%`, background: 'linear-gradient(90deg, #10B981, #34D399)' }}
              />
            </div>
            <span className="bar-value" style={{ color: '#10B981' }}>{availablePct}%</span>
          </div>
          <div className="bar-row">
            <span className="bar-label">Reserved</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${reservedPct}%`, background: 'linear-gradient(90deg, #F59E0B, #FBBF24)' }}
              />
            </div>
            <span className="bar-value" style={{ color: '#F59E0B' }}>{reservedPct}%</span>
          </div>
        </div>

        <div className="action-footer">
          <span>
            <span>🏢</span>
            Fulfillment centers
          </span>
          <span>NitroStack Code Mode</span>
        </div>
      </div>
    </>
  );
}
