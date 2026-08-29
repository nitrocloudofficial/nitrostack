'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

interface RiskFlag {
  ruleId: string;
  severity: 'low' | 'medium' | 'high';
  evidence: string;
}

interface ApprovalData {
  approvalId: string;
  draftId: string;
  total: number;
  flags: RiskFlag[];
  status: 'pending' | 'approved' | 'rejected';
}

function formatPaise(paise: number): string {
  const rupees = Math.floor(paise / 100);
  return '\u20b9' + rupees.toLocaleString('en-IN');
}

export default function ApprovalCard() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const theme = useTheme();
  const dark = theme === 'dark';

  if (!isReady) return <div style={{ padding: 16 }}>Loading...</div>;

  const data = getToolOutput<ApprovalData>();
  if (!data) return <div style={{ padding: 16 }}>No approval data</div>;

  // Handle wrapper object: data might be { invoiceIds: [...], total: ..., flags: ..., approvalId: ... }
  const invoiceIds = data.invoiceIds ?? [];
  const approvalId = data.approvalId ?? data.draftId ?? 'unknown';
  const total = data.total ?? 0;
  const flags = data.flags ?? [];
  const status = data.status ?? 'pending';

  if (!invoiceIds.length && total === 0) return <div style={{ padding: 16 }}>No approval data</div>;

  return (
    <div style={{
      background: dark ? '#0f0f0f' : '#ffffff',
      color: dark ? '#f5f5f5' : '#111111',
      border: '1px solid ' + (dark ? '#2a2a2a' : '#e3e3e3'),
      borderRadius: 12,
      padding: 20,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: 480,
    }}>
      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 6 }}>
        Payment approval required
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 16 }}>
        {formatPaise(total)}
      </div>
      {flags.map(function(f, i) {
        return (
          <div key={i} style={{
            background: dark ? '#2a1f0a' : '#fff8e6',
            borderLeft: '3px solid ' + (f.severity === 'high' ? '#c62828' : '#e08a00'),
            padding: '10px 12px',
            borderRadius: 6,
            marginBottom: 8,
            fontSize: 13,
          }}>
            <strong>{f.ruleId}</strong> — {f.evidence}
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button onClick={function() { callTool('execute_payment', { approval_id: approvalId, decision: 'approve' }); }} style={{
          background: '#0a7c3e', color: '#fff', border: 'none',
          padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
        }}>Approve</button>
        <button onClick={function() { callTool('execute_payment', { approval_id: approvalId, decision: 'reject' }); }} style={{
          background: 'transparent',
          color: dark ? '#f5f5f5' : '#111',
          border: '1px solid ' + (dark ? '#3a3a3a' : '#d0d0d0'),
          padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
        }}>Reject</button>
      </div>
    </div>
  );
}
