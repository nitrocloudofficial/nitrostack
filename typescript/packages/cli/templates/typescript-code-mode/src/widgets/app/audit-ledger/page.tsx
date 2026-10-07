'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { widgetBaseStyles } from '../widget-styles';

export const dynamic = 'force-dynamic';

interface AuditLedgerData {
  account: string;
  reconciled: boolean;
  discrepancies: number;
}

export default function AuditLedgerWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<AuditLedgerData>() || {
    account: 'GL-1040',
    reconciled: true,
    discrepancies: 0,
  };

  const isLight = theme === 'light';
  const clean = data.reconciled && data.discrepancies === 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: widgetBaseStyles }} />
      <div className={`widget-container ${isLight ? 'light' : 'dark'}`}>
        <div className="header">
          <div className="header-title">
            <div className="header-icon">📒</div>
            <div>
              <h2>Ledger {data.account}</h2>
              <p>General ledger reconciliation</p>
            </div>
          </div>
          <span className={`badge ${clean ? 'badge-success' : 'badge-purple'}`}>
            <span className={`pulse-dot ${clean ? 'success' : 'info'}`} />
            {clean ? 'Reconciled' : 'Review'}
          </span>
        </div>

        <div className="grid-cards">
          <div className="kpi-card">
            <div className="kpi-label">Account</div>
            <div className="kpi-value">{data.account}</div>
            <div className="kpi-sub" style={{ color: '#60A5FA' }}>
              General ledger
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Discrepancies</div>
            <div className="kpi-value">{data.discrepancies}</div>
            <div className="kpi-sub" style={{ color: clean ? '#10B981' : '#F59E0B' }}>
              {clean ? 'None found' : 'Needs review'}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Status</div>
            <div className="kpi-value">{data.reconciled ? 'Yes' : 'No'}</div>
            <div className="kpi-sub" style={{ color: data.reconciled ? '#10B981' : '#EF4444' }}>
              {data.reconciled ? 'Books match' : 'Open items'}
            </div>
          </div>
        </div>

        <div className="action-footer">
          <span>
            <span>🔒</span>
            Transaction log check
          </span>
          <span>NitroStack Code Mode</span>
        </div>
      </div>
    </>
  );
}
