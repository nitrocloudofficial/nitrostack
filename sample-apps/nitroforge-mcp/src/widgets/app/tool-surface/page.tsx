'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

/**
 * tool-surface widget -- shared by plan_tool_surface and forge_server
 * (README-team.md: "Widget tool-surface renders on plan + forge · 2
 * follow-up buttons"). The two tools return different shapes; this
 * component renders whichever one it's given by checking for a
 * distinguishing field, not by trusting a "kind" tag that neither tool
 * actually sends.
 *
 * plan_tool_surface response: { irId, serverName, toolCount, endpointCount, tools: [{name, module, description, widget}] }
 * forge_server response:      { serverId, status, toolCount, toolResults: [{tool, passed, diff}] }
 */

interface PlannedTool {
  name: string;
  module: string;
  description: string;
  widget: string | null;
}

interface PlanOutput {
  irId: string;
  serverName: string;
  toolCount: number;
  endpointCount: number;
  tools: PlannedTool[];
}

interface ToolResult {
  tool: string;
  passed: boolean;
  diff: string | null;
}

interface ForgeOutput {
  serverId: string;
  status: 'green' | 'amber' | 'red';
  toolCount: number;
  toolResults: ToolResult[];
}

const statusColor: Record<ForgeOutput['status'], string> = {
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
};

function Button({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 6,
        border: '1px solid #ccc',
        background: '#fff',
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {children}
    </button>
  );
}

export default function ToolSurfaceWidget() {
  const { isReady, toolOutput, sendFollowUpMessage } = useWidgetSDK();

  if (!isReady) {
    return <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>Loading...</div>;
  }

  const output = (toolOutput ?? {}) as Record<string, unknown>;

  // plan_tool_surface output: has a `tools` array of {name, module, description, widget}
  if (Array.isArray(output.tools)) {
    const plan = output as unknown as PlanOutput;
    return (
      <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{plan.serverName}</div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
          {plan.endpointCount} endpoints clustered into {plan.toolCount} tools
        </div>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, marginBottom: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '2px solid #ddd' }}>Tool</th>
              <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '2px solid #ddd' }}>Module</th>
              <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '2px solid #ddd' }}>Widget</th>
            </tr>
          </thead>
          <tbody>
            {plan.tools.map((t) => (
              <tr key={t.name}>
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #eee' }}>
                  <div style={{ fontWeight: 500 }}>{t.name}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>{t.description}</div>
                </td>
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #eee' }}>{t.module}</td>
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #eee' }}>{t.widget ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => sendFollowUpMessage(`Forge this tool surface (irId ${plan.irId}) into a verified server.`)}>
            Forge this server
          </Button>
          <Button onClick={() => sendFollowUpMessage(`Show me the raw tool surface plan at forge://ir/${plan.irId}`)}>
            Inspect the IR
          </Button>
        </div>
      </div>
    );
  }

  // forge_server output: has a `toolResults` array of {tool, passed, diff}
  if (Array.isArray(output.toolResults)) {
    const forge = output as unknown as ForgeOutput;
    const passedCount = forge.toolResults.filter((r) => r.passed).length;
    return (
      <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: statusColor[forge.status],
            }}
          />
          <span style={{ fontSize: 15, fontWeight: 600, textTransform: 'uppercase' }}>{forge.status}</span>
          <span style={{ fontSize: 13, color: '#666' }}>
            {passedCount}/{forge.toolResults.length} tools passed
          </span>
        </div>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, marginBottom: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '2px solid #ddd' }}>Tool</th>
              <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '2px solid #ddd' }}>Result</th>
            </tr>
          </thead>
          <tbody>
            {forge.toolResults.map((r) => (
              <tr key={r.tool}>
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #eee' }}>{r.tool}</td>
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #eee', color: r.passed ? '#16a34a' : '#dc2626' }}>
                  {r.passed ? 'passed' : `failed${r.diff ? `: ${r.diff}` : ''}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => sendFollowUpMessage(`Show me the verification report at forge://server/${forge.serverId}`)}>
            Inspect the server
          </Button>
          <Button onClick={() => sendFollowUpMessage('Show me the current standings.')}>Try it out</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', color: '#666' }}>
      No tool surface data to display.
    </div>
  );
}
