'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

interface PendingAction {
  id: string;
  tool_name: string;
  has_conflict: boolean;
  timestamp: string;
}

interface GovernanceData {
  pending_count: number;
  actions: PendingAction[];
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '11px',
      fontWeight: 700,
      background: color === 'green' ? '#14532d' : color === 'red' ? '#7f1d1d' : color === 'amber' ? '#78350f' : '#1e3a5f',
      color: color === 'green' ? '#86efac' : color === 'red' ? '#fca5a5' : color === 'amber' ? '#fcd34d' : '#93c5fd',
    }}>
      {label}
    </span>
  );
}

function ToolLabel({ name }: { name: string }) {
  const map: Record<string, string> = {
    halt_deployment_pipeline: 'Halt Deployment',
    reallocate_capital: 'Reallocate Budget',
    prioritize_engineering_branch: 'Prioritize Branch',
    isolate_compromised_node: 'Isolate Node',
  };
  return <span>{map[name] ?? name}</span>;
}

export default function GovernanceDashboard() {
  const { getToolOutput, callTool } = useWidgetSDK();
  const theme = useTheme();
  const data = getToolOutput<GovernanceData>();
  const isDark = theme === 'dark';

  const bg   = isDark ? '#020617' : '#ffffff';
  const card = isDark ? '#0f172a' : '#f8fafc';
  const bdr  = isDark ? '#1e293b' : '#e2e8f0';
  const txt  = isDark ? '#f1f5f9' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';

  const handleApprove = async (id: string) => {
    try { await callTool('approve_action', { action_id: id }); } catch {}
  };
  const handleDeny = async (id: string) => {
    try { await callTool('deny_action', { action_id: id }); } catch {}
  };

  const pendingCount = data?.pending_count ?? 0;
  const actions: PendingAction[] = data?.actions ?? [];

  return (
    <div style={{ padding: '16px', background: bg, color: txt, fontFamily: 'system-ui, sans-serif', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>Concord</div>
          <div style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>cross-departmental governance agent</div>
        </div>
        <div style={{
          background: pendingCount > 0 ? '#7f1d1d' : '#14532d',
          color: pendingCount > 0 ? '#fca5a5' : '#86efac',
          borderRadius: '9999px',
          padding: '4px 12px',
          fontSize: '13px',
          fontWeight: 700,
        }}>
          {pendingCount} pending
        </div>
      </div>

      {/* Pending actions */}
      {actions.length === 0 ? (
        <div style={{
          background: card,
          border: `1px solid ${bdr}`,
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          color: muted,
          fontSize: '13px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
          No actions pending approval
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {actions.map(a => (
            <div key={a.id} style={{
              background: card,
              border: `1px solid ${a.has_conflict ? '#78350f' : bdr}`,
              borderLeft: `4px solid ${a.has_conflict ? '#f59e0b' : '#6366f1'}`,
              borderRadius: '12px',
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    <ToolLabel name={a.tool_name} />
                  </div>
                  <div style={{ fontSize: '11px', color: muted, marginTop: '4px', fontFamily: 'monospace' }}>
                    {a.id}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {a.has_conflict && <Badge label="⚠ CONFLICT" color="amber" />}
                  <Badge label="AWAITING" color="blue" />
                </div>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleApprove(a.id)}
                  style={{
                    flex: 1,
                    padding: '7px',
                    background: '#14532d',
                    color: '#86efac',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleDeny(a.id)}
                  style={{
                    flex: 1,
                    padding: '7px',
                    background: '#7f1d1d',
                    color: '#fca5a5',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}
                >
                  ✗ Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer hint */}
      <div style={{ marginTop: '16px', fontSize: '10px', color: muted, textAlign: 'center' }}>
        Powered by Nitrostack · Human-in-the-loop governance
      </div>
    </div>
  );
}
