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
  };

  const isLight = theme === 'light';
  const revenueM = (data.revenue / 1000000).toFixed(1);
  const profitM = (data.profit / 1000000).toFixed(1);
  const margin = data.margin || `${data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) : '0.0'}%`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: widgetBaseStyles }} />
      <div className={`widget-container ${isLight ? 'light' : 'dark'}`}>
        <div className="header">
          <div className="header-title">
            <div className="header-icon">📊</div>
            <div>
              <h2>Fiscal Year {data.year} Executive Summary</h2>
              <p>Balance Sheet & Quarterly Earnings</p>
            </div>
          </div>
          <span className="badge badge-success">
            <span className="pulse-dot success" />
            Audited
          </span>
        </div>

        <div className="grid-cards">
          <div className="kpi-card">
            <div className="kpi-label">Annual Revenue</div>
            <div className="kpi-value">${revenueM}M</div>
            <div className="kpi-sub" style={{ color: '#10B981' }}>
              Reported
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Net Profit</div>
            <div className="kpi-value">${profitM}M</div>
            <div className="kpi-sub" style={{ color: '#10B981' }}>
              After tax
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Operating Margin</div>
            <div className="kpi-value">{margin}</div>
            <div className="kpi-sub" style={{ color: '#60A5FA' }}>
              Profit / revenue
            </div>
          </div>
        </div>

        <div className="action-footer">
          <span>
            <span>🔒</span>
            Ledger Reconciliation
          </span>
          <span>NitroStack Code Mode</span>
        </div>
      </div>
    </>
  );
}
