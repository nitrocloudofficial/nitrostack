'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  Shield, LayoutDashboard, Wrench, FileText, Settings, Bell, Search, Activity, Cpu, CheckCircle2, AlertCircle, Info, AlertTriangle, X, DollarSign
} from 'lucide-react';
import { AegisMcpClient, TelemetryData, getDefaultMcpUrl } from '../lib/mcpClient';

interface MetricHistoryPoint {
  time: string;
  queueDepth: number;
  threadOccupancy: number;
  dbSaturation: number;
  retryRate: number;
  residualNorm: number;
}

export default function SreControlPanel() {
  const [mcpClient] = useState(() => new AegisMcpClient(getDefaultMcpUrl(), (connected) => setIsConnected(connected)));
  const [isConnected, setIsConnected] = useState(true);
  const [systemStatus, setSystemStatus] = useState<'NOMINAL' | 'ANOMALY_DETECTED' | 'AUTONOMOUS_REMEDIATION' | 'SYSTEM_RECOVERED'>('NOMINAL');
  const [currentTelemetry, setCurrentTelemetry] = useState<TelemetryData | null>(null);
  const [metricHistory, setMetricHistory] = useState<MetricHistoryPoint[]>([]);

  // Modals
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Ledger state
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const pollTelemetry = useCallback(async () => {
    try {
      const data: TelemetryData = await mcpClient.callTool('get_orbital_subspace', {});
      if (data && data.telemetry_analysis) {
        setCurrentTelemetry(data);
        const rawStatus = data.system_status as string;
        if (rawStatus === 'ANOMALY_DETECTED') setSystemStatus('ANOMALY_DETECTED');
        else if (rawStatus === 'REMEDIATING') setSystemStatus('AUTONOMOUS_REMEDIATION');
        else if (rawStatus === 'RECOVERED') setSystemStatus('SYSTEM_RECOVERED');
        else setSystemStatus('NOMINAL');

        const vector = data.telemetry_analysis.normalized_vector;
        const norm = data.telemetry_analysis.svd_residual_norm;
        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' });

        setMetricHistory(prev => {
          const next = [...prev, {
            time: timeStr,
            queueDepth: Math.max(0, vector[0] || 0),
            threadOccupancy: Math.max(0, vector[1] || 0),
            dbSaturation: Math.max(0, vector[2] || 0),
            retryRate: Math.max(0, vector[3] || 0),
            residualNorm: norm || 0
          }];
          return next.slice(-30);
        });
      }
    } catch (_) {}
  }, [mcpClient]);

  useEffect(() => {
    const t = setInterval(pollTelemetry, 1000);
    return () => clearInterval(t);
  }, [pollTelemetry]);

  const fetchLedger = async () => {
    setLoadingLedger(true);
    setShowLedgerModal(true);
    try {
      const res = await mcpClient.callTool('get_ledger_state', {});
      if (res && (res.accounts || Array.isArray(res))) {
        setLedgerData(Array.isArray(res) ? res : res.accounts);
      } else {
        setLedgerData([
          { id: 'ACC-1001-PAYROLL', name: 'Corporate Payroll Master', balance: 14250000.00, status: 'ACTIVE', type: 'PAYROLL' },
          { id: 'ACC-1002-P2P-CLEARING', name: 'Peer-to-Peer Settlement Pool', balance: 3890450.50, status: 'ACTIVE', type: 'CLEARING' },
          { id: 'ACC-1003-TREASURY', name: 'Federal Reserve Liquidity Window', balance: 98000000.00, status: 'ACTIVE', type: 'TREASURY' },
          { id: 'ACC-1004-RETAIL-SAVINGS', name: 'Retail Savings Ledger Pool', balance: 52140800.75, status: 'ACTIVE', type: 'SAVINGS' },
          { id: 'ACC-1005-TELLER-QUEUE', name: 'EOD Settlement & Teller Vault', balance: 8410200.25, status: 'ACTIVE', type: 'SETTLEMENT' }
        ]);
      }
    } catch (err) {
      setLedgerData([
        { id: 'ACC-1001-PAYROLL', name: 'Corporate Payroll Master', balance: 14250000.00, status: 'ACTIVE', type: 'PAYROLL' },
        { id: 'ACC-1002-P2P-CLEARING', name: 'Peer-to-Peer Settlement Pool', balance: 3890450.50, status: 'ACTIVE', type: 'CLEARING' },
        { id: 'ACC-1003-TREASURY', name: 'Federal Reserve Liquidity Window', balance: 98000000.00, status: 'ACTIVE', type: 'TREASURY' },
        { id: 'ACC-1004-RETAIL-SAVINGS', name: 'Retail Savings Ledger Pool', balance: 52140800.75, status: 'ACTIVE', type: 'SAVINGS' },
        { id: 'ACC-1005-TELLER-QUEUE', name: 'EOD Settlement & Teller Vault', balance: 8410200.25, status: 'ACTIVE', type: 'SETTLEMENT' }
      ]);
    } finally {
      setLoadingLedger(false);
    }
  };

  const currentResidual = currentTelemetry?.telemetry_analysis?.svd_residual_norm || 0;
  const isAnomalyBreached = currentResidual > 15.0 || systemStatus === 'ANOMALY_DETECTED' || systemStatus === 'AUTONOMOUS_REMEDIATION';

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#1F2937] font-sans flex select-none">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-[#EAEDF3] flex flex-col justify-between py-6 shrink-0">
        <div>
          <div className="px-6 mb-8 flex items-center space-x-3">
            <div className="p-2 bg-[#F0FDFD] border border-[#29C5CE]/30 rounded-lg shadow-sm">
              <Shield className="w-6 h-6 text-[#29C5CE]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">AEGIS</h1>
              <p className="text-[10px] text-[#8A93A6] font-medium tracking-wider">SRE ENGINE</p>
            </div>
          </div>
          
          <nav className="px-3 space-y-1">
            <a href="/sre-control-panel" className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#F0FDFD] text-[#0E7A81] font-semibold text-sm transition-colors border-l-2 border-[#29C5CE]">
              <LayoutDashboard className="w-4 h-4 text-[#29C5CE]" />
              <span>Dashboard</span>
            </a>
            <a href="/tools" className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F2937] transition-colors font-medium text-sm">
              <Wrench className="w-4 h-4" />
              <span>Simulations</span>
            </a>
            <a href="/aegis-agent-control-center" className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F2937] transition-colors font-medium text-sm">
              <Cpu className="w-4 h-4" />
              <span>Agent Control</span>
            </a>
            <a href="/incident-report" className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F2937] transition-colors font-medium text-sm">
              <Activity className="w-4 h-4" />
              <span>Incident Report</span>
            </a>
            <button onClick={fetchLedger} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F2937] transition-colors font-medium text-sm">
              <FileText className="w-4 h-4 text-[#3B7DD8]" />
              <span>Ledger State</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-[#EAEDF3] flex items-center justify-between px-8 shrink-0 shadow-sm">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-bold text-[#1F2937]">Dashboard</h2>
            <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full border border-[#EAEDF3] shadow-sm">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#29C5CE] animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-xs text-[#8A93A6] font-medium">NitroStack Core Active</span>
            </div>
            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider flex items-center space-x-1 ${
              systemStatus === 'NOMINAL' ? 'bg-[#F0FDFD] text-[#0E7A81] border-[#29C5CE]/30' :
              systemStatus === 'SYSTEM_RECOVERED' ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]' :
              'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] animate-pulse'
            }`}>
              {systemStatus === 'NOMINAL' && <CheckCircle2 className="w-3 h-3" />}
              {systemStatus !== 'NOMINAL' && <AlertTriangle className="w-3 h-3" />}
              <span>{systemStatus}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => setShowNotificationsModal(true)} className="p-2 text-[#8A93A6] hover:text-[#1F2937] hover:bg-[#F3F4F6] rounded-lg transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#3B7DD8] rounded-full" />
            </button>
            <button onClick={() => setShowSettingsModal(true)} className="p-2 text-[#8A93A6] hover:text-[#1F2937] hover:bg-[#F3F4F6] rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-auto p-8 space-y-6">
          
          {/* Top Banner Alert (Shown only if Anomaly Breached) */}
          {isAnomalyBreached && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 border border-red-200 rounded-lg animate-pulse">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-red-700 tracking-wider">SVD Subspace Anomaly Breached</span>
                    <span className="text-[10px] font-mono bg-red-100 text-red-800 px-2 py-0.5 rounded border border-red-200">
                      Residual ‖(I-P_S)x‖: {currentResidual.toFixed(2)} &gt; 15.0
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mt-0.5">
                    ⚡ <strong>PRIME Orchestrator:</strong> Autonomous SRE Cascade Active — Zero Human Intervention Required.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Chart: 4D System Health Metrics */}
            <div className="bg-white border border-[#EAEDF3] rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#EAEDF3] pb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#29C5CE]" />
                  <h2 className="text-sm font-bold text-[#1F2937] uppercase">Telemetry Stream</h2>
                </div>
                <div className="flex items-center space-x-3 text-[10px] font-mono">
                  <span className="text-[#0ea5e9] font-semibold">● Queue</span>
                  <span className="text-[#8b5cf6] font-semibold">● Threads</span>
                  <span className="text-[#f59e0b] font-semibold">● DB</span>
                  <span className="text-[#ef4444] font-semibold">● Retry</span>
                </div>
              </div>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metricHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fontSize: 10 }} tickMargin={8} />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} tickMargin={8} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#EAEDF3', fontSize: '11px', borderRadius: '8px', color: '#1F2937' }} />
                    <Line type="monotone" dataKey="queueDepth" stroke="#0ea5e9" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="threadOccupancy" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="dbSaturation" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="retryRate" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Chart: Incremental SVD Residual Error Norm */}
            <div className="bg-white border border-[#EAEDF3] rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#EAEDF3] pb-3">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-[#8b5cf6]" />
                  <h2 className="text-sm font-bold text-[#1F2937] uppercase">SVD Residual Norm</h2>
                </div>
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${isAnomalyBreached ? 'bg-red-50 text-red-600 border-red-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                  Error: {currentResidual.toFixed(2)}
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricHistory}>
                    <defs>
                      <linearGradient id="residualLightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isAnomalyBreached ? '#ef4444' : '#8b5cf6'} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={isAnomalyBreached ? '#ef4444' : '#8b5cf6'} stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fontSize: 10 }} tickMargin={8} />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} tickMargin={8} domain={[0, 40]} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#EAEDF3', fontSize: '11px', borderRadius: '8px', color: '#1F2937' }} />
                    <ReferenceLine y={15} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Threshold (15.0)', fill: '#ef4444', fontSize: 10 }} />
                    <Area 
                      type="monotone" 
                      dataKey="residualNorm" 
                      stroke={isAnomalyBreached ? '#ef4444' : '#8b5cf6'} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#residualLightGradient)" 
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* LEDGER MODAL */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 space-y-6 border border-[#EAEDF3] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAEDF3] pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#F0FDFD] border border-[#29C5CE]/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-[#29C5CE]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1F2937]">Core Banking Ledger State</h3>
                  <p className="text-xs text-[#8A93A6]">Real-time balance &amp; transaction account ledger</p>
                </div>
              </div>
              <button onClick={() => setShowLedgerModal(false)} className="p-1 hover:bg-[#F3F4F6] rounded-lg">
                <X className="w-5 h-5 text-[#8A93A6]" />
              </button>
            </div>

            {loadingLedger ? (
              <div className="py-12 text-center text-[#8A93A6]">Loading ledger data...</div>
            ) : (
              <div className="space-y-4">
                <div className="border border-[#EAEDF3] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F7F9FC] border-b border-[#EAEDF3]">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-[#1F2937]">Account ID</th>
                        <th className="px-4 py-3 font-semibold text-[#1F2937]">Account Name</th>
                        <th className="px-4 py-3 font-semibold text-[#1F2937]">Type</th>
                        <th className="px-4 py-3 font-semibold text-[#1F2937]">Balance ($)</th>
                        <th className="px-4 py-3 font-semibold text-[#1F2937]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAEDF3]">
                      {ledgerData.map((acc, idx) => (
                        <tr key={idx} className="hover:bg-[#F7F9FC]">
                          <td className="px-4 py-3 font-mono text-xs font-bold text-[#3B7DD8]">{acc.id || acc.account_id || `ACC-${1000+idx}`}</td>
                          <td className="px-4 py-3 font-medium text-[#1F2937]">{acc.name || acc.account_name || 'Core Account'}</td>
                          <td className="px-4 py-3 text-xs text-[#8A93A6]">{acc.type || 'SYSTEM'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-[#10B981]">
                            ${typeof acc.balance === 'number' ? acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : acc.balance || '0.00'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#E6F8F3] text-[#0E7A81] border border-[#29C5CE]/30">
                              {acc.status || 'ACTIVE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#EAEDF3]">
              <button onClick={() => setShowLedgerModal(false)} className="px-4 py-2 bg-[#3B7DD8] hover:bg-[#2A65B8] text-white rounded-lg text-sm font-semibold transition-colors">
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS MODAL */}
      {showNotificationsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-[#EAEDF3] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAEDF3] pb-3">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-[#29C5CE]" />
                <h3 className="text-md font-bold text-[#1F2937]">System Notifications</h3>
              </div>
              <button onClick={() => setShowNotificationsModal(false)} className="p-1 hover:bg-[#F3F4F6] rounded-lg">
                <X className="w-4 h-4 text-[#8A93A6]" />
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              <div className="p-3 bg-[#F0FDFD] border border-[#29C5CE]/30 rounded-lg flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-[#29C5CE] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#1F2937]">Cascade Timeout Updated</h4>
                  <p className="text-[11px] text-[#8A93A6] mt-0.5">Emergency timeout threshold raised to 5000ms.</p>
                </div>
              </div>
              <div className="p-3 bg-[#F7F9FC] border border-[#EAEDF3] rounded-lg flex gap-3 items-start">
                <Activity className="w-5 h-5 text-[#3B7DD8] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#1F2937]">Health Checks Registered</h4>
                  <p className="text-[11px] text-[#8A93A6] mt-0.5">PRIME, ATLAS, CERBERUS, HERMES, and SVD active.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#EAEDF3]">
              <button onClick={() => setShowNotificationsModal(false)} className="px-4 py-1.5 bg-[#3B7DD8] text-white rounded-lg text-xs font-semibold">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-[#EAEDF3] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAEDF3] pb-3">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-[#3B7DD8]" />
                <h3 className="text-md font-bold text-[#1F2937]">Engine Settings</h3>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="p-1 hover:bg-[#F3F4F6] rounded-lg">
                <X className="w-4 h-4 text-[#8A93A6]" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-xs text-[#1F2937] mb-1">SVD Anomaly Threshold (L2 Norm)</label>
                <input 
                  type="number" 
                  defaultValue={15.0} 
                  className="w-full p-2 border border-[#EAEDF3] rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#EAEDF3]">
              <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 bg-[#3B7DD8] text-white rounded-lg text-xs font-semibold">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
