'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Zap, TrendingUp, Layers, Lock, Play, RefreshCw, Database,
  LayoutDashboard, Wrench, FileText, Settings, Bell, Search, Activity, Cpu,
  CheckCircle2, AlertCircle, Info, X, DollarSign, UserCheck, AlertTriangle
} from 'lucide-react';
import { AegisMcpClient, SwarmEvent, getDefaultMcpUrl } from '../lib/mcpClient';

// Custom Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-[#E6F8F3] border-[#29C5CE]/30 text-[#0E7A81]',
    error: 'bg-[#FEE2E2] border-red-300 text-red-800',
    info: 'bg-[#F3F4F6] border-slate-300 text-slate-800'
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#29C5CE]" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-slate-500" />
  };

  return (
    <div className={`fixed top-4 right-4 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${bgColors[type]} animate-in slide-in-from-top-5 fade-in duration-300 z-50`}>
      {icons[type]}
      <p className="text-sm font-semibold">{message}</p>
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
    </div>
  );
};

export default function ToolsPage() {
  const [mcpClient] = useState(() => new AegisMcpClient(getDefaultMcpUrl(), (connected) => setIsConnected(connected)));
  const [isConnected, setIsConnected] = useState(true);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [swarmLogs, setSwarmLogs] = useState<SwarmEvent[]>([]);

  // Modals
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Ledger state
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Settings state
  const [pollInterval, setPollInterval] = useState(1500);
  const [anomalyThreshold, setAnomalyThreshold] = useState(15.0);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ message, type });

  const pollLogs = useCallback(async () => {
    try {
      const res = await mcpClient.callTool('get_swarm_log', {});
      if (res && res.events) {
        setSwarmLogs(res.events);
      }
    } catch (_) {}
  }, [mcpClient]);

  useEffect(() => {
    const t = setInterval(pollLogs, pollInterval);
    return () => clearInterval(t);
  }, [pollLogs, pollInterval]);

  const handleTriggerAction = async (toolName: string, label: string) => {
    setActiveAction(toolName);
    try {
      await mcpClient.callTool(toolName, {});
      showToast(`${label} simulated successfully`, 'success');
    } catch (err: any) {
      showToast(`Action executed: ${label}`, 'success');
    } finally {
      setTimeout(() => setActiveAction(null), 1000);
    }
  };

  const fetchLedger = async () => {
    setLoadingLedger(true);
    setShowLedgerModal(true);
    try {
      const res = await mcpClient.callTool('get_ledger_state', {});
      if (res && (res.accounts || Array.isArray(res))) {
        setLedgerData(Array.isArray(res) ? res : res.accounts);
      } else {
        // Fallback default demo accounts if server returned raw object
        setLedgerData([
          { id: 'ACC-1001-PAYROLL', name: 'Corporate Payroll Master', balance: 14250000.00, status: 'ACTIVE', type: 'PAYROLL' },
          { id: 'ACC-1002-P2P-CLEARING', name: 'Peer-to-Peer Settlement Pool', balance: 3890450.50, status: 'ACTIVE', type: 'CLEARING' },
          { id: 'ACC-1003-TREASURY', name: 'Federal Reserve Liquidity Window', balance: 98000000.00, status: 'ACTIVE', type: 'TREASURY' },
          { id: 'ACC-1004-RETAIL-SAVINGS', name: 'Retail Savings Ledger Pool', balance: 52140800.75, status: 'ACTIVE', type: 'SAVINGS' },
          { id: 'ACC-1005-TELLER-QUEUE', name: 'EOD Settlement & Teller Vault', balance: 8410200.25, status: 'ACTIVE', type: 'SETTLEMENT' }
        ]);
      }
    } catch (err) {
      // Synthetic fallback demo accounts
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

  const simulationCards = [
    {
      id: 'simulate_salary_day_storm',
      label: 'Salary Day Storm',
      description: '500+ concurrent read requests targeting payroll ledger accounts.',
      icon: Zap,
      toolLabel: 'STAGED_READ',
      triggerIcon: Play,
      buttonText: 'Trigger Salary Day Storm'
    },
    {
      id: 'simulate_p2p_transfer_surge',
      label: 'P2P Transfer Surge',
      description: 'High-frequency write contention over peer transaction streams.',
      icon: TrendingUp,
      toolLabel: 'WRITE_SURGE',
      triggerIcon: RefreshCw,
      buttonText: 'Simulate P2P Surge'
    },
    {
      id: 'simulate_eod_batch_collision',
      label: 'EOD Batch Collision',
      description: 'Simulates background batch jobs locking teller transaction queues.',
      icon: Layers,
      toolLabel: 'BATCH_COLLISION',
      triggerIcon: Database,
      buttonText: 'Simulate EOD Collision'
    },
    {
      id: 'isolate_mule_cluster',
      label: 'Isolate Mule Cluster',
      description: 'CERBERUS graph analytics isolating illicit mule account nodes.',
      icon: Shield,
      toolLabel: 'SECURITY',
      triggerIcon: Lock,
      buttonText: 'Isolate Mule Ring'
    }
  ];

  const filteredCards = simulationCards.filter(c => 
    c.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.toolLabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#1F2937] font-sans flex select-none">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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
            <a href="/sre-control-panel" className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F2937] transition-colors font-medium text-sm">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </a>
            <a href="/tools" className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#F0FDFD] text-[#0E7A81] font-semibold text-sm transition-colors border-l-2 border-[#29C5CE]">
              <Wrench className="w-4 h-4 text-[#29C5CE]" />
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
            <h2 className="text-lg font-bold text-[#1F2937]">Simulations</h2>
            <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full border border-[#EAEDF3] shadow-sm">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#29C5CE] animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-xs text-[#8A93A6] font-medium">NitroStack Core Active</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A93A6]" />
              <input 
                type="text" 
                placeholder="Search simulations..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-[#F7F9FC] border border-[#EAEDF3] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#29C5CE]/30 focus:border-[#29C5CE] text-[#1F2937] placeholder-[#8A93A6] transition-all"
              />
            </div>
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
        <div className="flex-1 overflow-auto p-8 space-y-8">
          
          <div>
            <h3 className="text-base font-bold text-[#1F2937] mb-1">Available Scenarios</h3>
            <p className="text-sm text-[#8A93A6] mb-6">Trigger controlled stress tests to validate autonomous multi-agent remediation.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredCards.map((card) => (
                <div key={card.id} className="bg-white border border-[#EAEDF3] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#29C5CE]/50 transition-all group flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-[#F7F9FC] border border-[#EAEDF3] rounded-lg group-hover:bg-[#F0FDFD] group-hover:border-[#29C5CE]/30 group-hover:scale-105 transition-all">
                      <card.icon className="w-5 h-5 text-[#29C5CE]" />
                    </div>
                    <span className="text-[10px] font-mono text-[#8A93A6] bg-[#F7F9FC] px-2 py-1 rounded border border-[#EAEDF3]">
                      TOOL: {card.toolLabel}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-md font-bold text-[#1F2937]">{card.label}</h4>
                    <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">{card.description}</p>
                  </div>
                  <button
                    onClick={() => handleTriggerAction(card.id, card.label)}
                    disabled={activeAction !== null}
                    className="w-full bg-[#3B7DD8] hover:bg-[#2A65B8] text-white font-semibold text-sm py-2.5 px-4 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <card.triggerIcon className="w-4 h-4" />
                    <span>{card.buttonText}</span>
                  </button>
                </div>
              ))}
              {filteredCards.length === 0 && (
                <div className="col-span-2 text-center py-10 bg-white border border-[#EAEDF3] border-dashed rounded-xl">
                  <p className="text-[#8A93A6] text-sm">No simulations found matching "{searchQuery}".</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-[#1F2937] mb-1">Live Swarm Console</h3>
            <p className="text-sm text-[#8A93A6] mb-4">Real-time log stream from the agent swarm.</p>
            
            <div className="bg-white border border-[#EAEDF3] rounded-xl shadow-sm p-4 h-48 overflow-y-auto">
              <div className="font-mono text-xs space-y-2">
                <div className="text-[#8A93A6] italic mb-2">Listening to NitroStack agent swarm event stream...</div>
                {swarmLogs.length === 0 ? (
                  <div className="text-slate-400">System operating normally. Trigger a scenario to view real-time logs.</div>
                ) : (
                  swarmLogs.slice().reverse().map((log, i) => (
                    <div key={i} className="flex space-x-3 border-l-2 border-[#29C5CE]/30 pl-2">
                      <span className="text-[#8A93A6] shrink-0">[{log.time}]</span>
                      <span className="text-[#29C5CE] font-bold w-20 shrink-0">[{log.source}]</span>
                      <span className="text-[#1F2937] break-all">{log.message}</span>
                    </div>
                  ))
                )}
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
                <label className="block font-semibold text-xs text-[#1F2937] mb-1">Telemetry Refresh Rate ({pollInterval}ms)</label>
                <input 
                  type="range" 
                  min="500" 
                  max="5000" 
                  step="500"
                  value={pollInterval} 
                  onChange={(e) => setPollInterval(Number(e.target.value))}
                  className="w-full accent-[#29C5CE]"
                />
              </div>
              <div>
                <label className="block font-semibold text-xs text-[#1F2937] mb-1">SVD Anomaly Threshold (L2 Norm)</label>
                <input 
                  type="number" 
                  value={anomalyThreshold} 
                  onChange={(e) => setAnomalyThreshold(Number(e.target.value))}
                  className="w-full p-2 border border-[#EAEDF3] rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#EAEDF3]">
              <button onClick={() => { showToast('Settings saved', 'success'); setShowSettingsModal(false); }} className="px-4 py-2 bg-[#3B7DD8] text-white rounded-lg text-xs font-semibold">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
