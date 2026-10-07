'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { widgetBaseStyles } from '../widget-styles';

export const dynamic = 'force-dynamic';

interface FinancialData {
  year: number;
  revenue: number;
  profit: number;
  margin?: string;
}

export default function FinancialSummaryWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<FinancialData>() || {
    year: 2026,
    revenue: 12000000,
    profit: 3400000,
    margin: '28.3%'
  };

  const isLight = theme === 'light';
  const revenueM = (data.revenue / 1000000).toFixed(1);
  const profitM = (data.profit / 1000000).toFixed(1);
  const margin = data.margin || `${((data.profit / data.revenue) * 100).toFixed(1)}%`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: widgetBaseStyles }} />
      <div className={`widget-container ${isLight ? 'light' : 'dark'}`}>
        <div className="header">
          <div className="header-title">
            <div className="header-icon">📊</div>
            <div>
              <h2>Fiscal Year {data.year} Executive Summary</h2>
              <p>Audited Balance Sheet & Financial Trajectory</p>
            </div>
          </div>
          <span className="badge badge-success">
            <span className="pulse-dot success" />
            Audited & Certified
          </span>
        </div>

        <div className="grid-cards">
          <div className="kpi-card">
            <div className="kpi-label">Annual Revenue</div>
            <div className="kpi-value">${revenueM}M</div>
            <div className="kpi-sub" style={{ color: '#10B981' }}>
              ▲ +18.4% YoY
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Net Profit</div>
            <div className="kpi-value">${profitM}M</div>
            <div className="kpi-sub" style={{ color: '#10B981' }}>
              ▲ +24.1% YoY
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Operating Margin</div>
            <div className="kpi-value">{margin}</div>
            <div className="kpi-sub" style={{ color: '#60A5FA' }}>
              Top Quartile
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">EBITDA</div>
            <div className="kpi-value">$4.1M</div>
            <div className="kpi-sub" style={{ color: '#A78BFA' }}>
              ▲ +15.8% YoY
            </div>
          </div>
        </div>

        <div className="progress-section">
          <div className="section-title">
            <span>Quarterly Revenue Trajectory</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>USD Millions</span>
          </div>
          <div className="bar-row">
            <span className="bar-label">Q1 Actual</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: '65%' }} />
            </div>
            <span className="bar-value">$2.6M</span>
          </div>
          <div className="bar-row">
            <span className="bar-label">Q2 Actual</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: '72%' }} />
            </div>
            <span className="bar-value">$2.9M</span>
          </div>
          <div className="bar-row">
            <span className="bar-label">Q3 Actual</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: '80%' }} />
            </div>
            <span className="bar-value">$3.1M</span>
          </div>
          <div className="bar-row">
            <span className="bar-label">Q4 Projected</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: '92%', background: 'linear-gradient(90deg, #10B981, #34D399)' }} />
            </div>
            <span className="bar-value" style={{ color: '#10B981' }}>$3.4M</span>
          </div>
        </div>

        <div className="action-footer">
          <span>
            <span>🔒</span>
            Ledger Reconciliation Engine
          </span>
          <span>NitroStack MCP Widget</span>
        </div>
      </div>
    </>
  );
}
