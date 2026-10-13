'use client';

import React, { useState, useEffect } from 'react';
import { AegisMcpClient } from '../lib/mcpClient';

const MCP_CLOUD_URL = 'https://agentic-6a6551d9-hashwins-org-0dcc4106.app.nitrocloud.ai/mcp';

// Light theme color palette
const colors = {
  background: '#F7F9FC',
  cardBg: '#FFFFFF',
  border: '#EAEDF3',
  text: '#1F2937',
  textSecondary: '#8A93A6',
  accent: '#29C5CE',
  primary: '#3B7DD8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export default function IncidentReportPage() {
  const [shieldStatus, setShieldStatus] = useState<any>(null);
  const [mcpClient, setMcpClient] = useState<AegisMcpClient | null>(null);

  useEffect(() => {
    const client = new AegisMcpClient(MCP_CLOUD_URL);
    setMcpClient(client);

    // Fetch shield status
    client.callTool('get_orbital_subspace').then((data: any) => {
      setShieldStatus(data);
    }).catch((err: any) => {
      console.error('Failed to load shield status:', err);
    });
  }, []);

  const handleSimulate = async (type: string) => {
    if (!mcpClient) return;
    try {
      if (type === 'SALARY') await mcpClient.callTool('simulate_salary_day_storm');
      if (type === 'P2P') await mcpClient.callTool('simulate_p2p_transfer_surge');
      if (type === 'EOD') await mcpClient.callTool('simulate_eod_batch_collision');
      alert(`Simulation ${type} triggered successfully`);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to trigger simulation: ${err?.message || err}`);
    }
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: colors.background, color: colors.text }}>
      {/* Header */}
      <header className="px-8 py-6 border-b flex justify-between items-center" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
        <div>
          <h1 className="text-2xl font-bold">Incident Response &amp; Stress Test Report</h1>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>Incident: INC-20260726-001 | SVD Analytics &amp; Ledger Impact</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm" style={{ borderColor: colors.border, backgroundColor: colors.background }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shieldStatus?.system_status === 'NOMINAL' ? colors.success : colors.warning }} />
            <span className="font-medium">{shieldStatus?.system_status || 'LOADING'}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-5 rounded-xl border shadow-sm" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
            <h3 className="text-sm font-medium" style={{ color: colors.textSecondary }}>Emergency Shield</h3>
            <p className="text-2xl font-bold mt-2" style={{ color: colors.success }}>ACTIVE</p>
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>Single-Flight &amp; Qos Shunting</p>
          </div>
          <div className="p-5 rounded-xl border shadow-sm" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
            <h3 className="text-sm font-medium" style={{ color: colors.textSecondary }}>Root Cause</h3>
            <p className="text-xl font-bold mt-2 truncate">Cascade Timeout</p>
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>Anomaly persisted &gt; 5 seconds</p>
          </div>
          <div className="p-5 rounded-xl border shadow-sm" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
            <h3 className="text-sm font-medium" style={{ color: colors.textSecondary }}>Ledger Impact</h3>
            <p className="text-2xl font-bold mt-2" style={{ color: colors.warning }}>MEDIUM</p>
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>SVD Residual Norm Spikes</p>
          </div>
          <div className="p-5 rounded-xl border shadow-sm" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
            <h3 className="text-sm font-medium" style={{ color: colors.textSecondary }}>Stress Tests</h3>
            <p className="text-2xl font-bold mt-2">3 Scenarios</p>
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>Ready for validation</p>
          </div>
        </div>

        {/* 5 Recommendations */}
        <div className="rounded-xl border shadow-sm p-6" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span style={{ color: colors.primary }}>🛡️</span> Core Recommendations
          </h2>
          <div className="space-y-4">
            {[
              { id: 1, title: 'Increase Cascade Timeout', desc: 'Updated EMERGENCY_FALLBACK_MS to 5000ms to allow multi-agent orchestration without premature failsafes.' },
              { id: 2, title: 'Fix System Recovery Reset', desc: 'Resolved REMEDIATING state lock by auto-resetting systemStatus to NOMINAL when anomalies subside.' },
              { id: 3, title: 'Register Health Checks', desc: 'Deployed Atlas, Cerberus, Hermes, Prime, and SVD health checks into the main module registry.' },
              { id: 4, title: 'Populate Widget Examples', desc: 'Added configuration schemas and example data to the MCP widget manifest for better discoverability.' },
              { id: 5, title: 'Expose Secondary Resources', desc: 'Registered /aegis-resilience-widget and /sre-control-panel in the MCP Resource Catalog.' },
            ].map(rec => (
              <div key={rec.id} className="flex gap-4 items-start p-3 rounded-lg" style={{ backgroundColor: colors.background }}>
                <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0" style={{ backgroundColor: colors.primary }}>
                  {rec.id}
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{rec.title}</h4>
                  <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>{rec.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Scenario Stress Test Results / Controls */}
        <div className="rounded-xl border shadow-sm p-6" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Multi-Scenario Stress Testing</h2>
            <div className="flex gap-2">
              <button onClick={() => handleSimulate('SALARY')} className="px-4 py-2 text-sm font-medium rounded-lg transition-colors text-white" style={{ backgroundColor: colors.primary }}>
                Simulate Salary Storm
              </button>
              <button onClick={() => handleSimulate('P2P')} className="px-4 py-2 text-sm font-medium rounded-lg transition-colors text-white" style={{ backgroundColor: colors.primary }}>
                Simulate P2P Surge
              </button>
              <button onClick={() => handleSimulate('EOD')} className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border" style={{ borderColor: colors.primary, color: colors.primary, backgroundColor: 'transparent' }}>
                Simulate EOD Batch
              </button>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: colors.border }}>
            <table className="w-full text-left text-sm">
              <thead style={{ backgroundColor: colors.background }}>
                <tr>
                  <th className="px-4 py-3 font-medium">Scenario</th>
                  <th className="px-4 py-3 font-medium">Impact Area</th>
                  <th className="px-4 py-3 font-medium">Mitigation</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.border }}>
                <tr>
                  <td className="px-4 py-3 font-medium">Salary Day Storm</td>
                  <td className="px-4 py-3" style={{ color: colors.textSecondary }}>High read/write concurrency</td>
                  <td className="px-4 py-3">QoS Shunting &amp; Throttling</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Validated</span></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">P2P Transfer Surge</td>
                  <td className="px-4 py-3" style={{ color: colors.textSecondary }}>Network layer saturation</td>
                  <td className="px-4 py-3">Single-Flight &amp; Cache</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Validated</span></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">EOD Batch Collision</td>
                  <td className="px-4 py-3" style={{ color: colors.textSecondary }}>Ledger write locks</td>
                  <td className="px-4 py-3">Idempotency &amp; Backoff</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
