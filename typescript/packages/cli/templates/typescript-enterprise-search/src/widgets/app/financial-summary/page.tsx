'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface FinancialData {
  year: number;
  revenue: number;
  profit: number;
  margin?: string;
}

export default function FinancialSummaryWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<FinancialData>() || {
    year: 2026,
    revenue: 12000000,
    profit: 3400000,
    margin: '28.3%'
  };

  const revenueM = (data.revenue / 1000000).toFixed(1);
  const profitM = (data.profit / 1000000).toFixed(1);
  const margin = data.margin || `${((data.profit / data.revenue) * 100).toFixed(1)}%`;

  return (
    <div className="widget-container">
      <div className="header">
        <div className="header-title">
          <h2>Fiscal Year {data.year} Executive Summary</h2>
        </div>
        <span className="badge badge-success">Audited & Certified</span>
      </div>

      <div className="grid-cards">
        <div className="kpi-card">
          <div className="kpi-label">Annual Revenue</div>
          <div className="kpi-value">${revenueM}M</div>
          <div className="kpi-sub">▲ +18.4% YoY</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Net Profit</div>
          <div className="kpi-value">${profitM}M</div>
          <div className="kpi-sub">▲ +24.1% YoY</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Operating Margin</div>
          <div className="kpi-value">{margin}</div>
          <div className="kpi-sub" style={{ color: '#60A5FA' }}>Top Quartile</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">EBITDA</div>
          <div className="kpi-value">$4.1M</div>
          <div className="kpi-sub">▲ +15.8% YoY</div>
        </div>
      </div>

      <div className="progress-section">
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '12px' }}>
          Quarterly Revenue Trajectory
        </div>
        <div className="bar-row">
          <span className="bar-label">Q1 Actual</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: '65%' }}></div></div>
          <span className="bar-value">$2.6M</span>
        </div>
        <div className="bar-row">
          <span className="bar-label">Q2 Actual</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: '72%' }}></div></div>
          <span className="bar-value">$2.9M</span>
        </div>
        <div className="bar-row">
          <span className="bar-label">Q3 Actual</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: '80%' }}></div></div>
          <span className="bar-value">$3.1M</span>
        </div>
        <div className="bar-row">
          <span className="bar-label">Q4 Projected</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: '92%', background: 'linear-gradient(90deg, #10B981, #34D399)' }}></div></div>
          <span className="bar-value">$3.4M</span>
        </div>
      </div>

      <div className="action-footer">
        <span>Source: Ledger Reconciliation Engine</span>
        <span>Generated via NitroStack MCP Widget</span>
      </div>
    </div>
  );
}
