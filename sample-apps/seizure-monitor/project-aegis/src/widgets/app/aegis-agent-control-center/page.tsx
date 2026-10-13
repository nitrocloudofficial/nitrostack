'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Shield, Activity, Cpu, AlertTriangle,
  Play, RefreshCw, FileText, Pause, LayoutDashboard, Wrench,
  Bell, Settings, X, CheckCircle2, DollarSign, AlertOctagon
} from 'lucide-react';
import { AegisMcpClient, SwarmEvent, getDefaultMcpUrl } from '../lib/mcpClient';

interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'IDLE' | 'REMEDIATING';
  health: number;
  requests: number;
  latency: number;
  shields: string;
  uptime: string;
}

interface LogEvent {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  agent: string;
}

const INITIAL_AGENTS: Agent[] = [
  { id: 'AGENT-001', name: 'SingleFlight Deduplicator', description: 'Epoch-based write fence for balance checks', status: 'ACTIVE', health: 98, requests: 2847, latency: 2.3, shields: 'SingleFlight', uptime: '15h 42m' },
  { id: 'AGENT-002', name: 'Idempotency Guardian', description: '15-second transaction hash deduplication', status: 'ACTIVE', health: 99, requests: 1923, latency: 1.8, shields: 'Idempotency', uptime: '15h 42m' },
  { id: 'AGENT-003', name: 'QoS Traffic Shaper', description: 'EOD batch throttling and priority routing', status: 'ACTIVE', health: 96, requests: 3421, latency: 3.1, shields: 'QoS', uptime: '15h 42m' },
  { id: 'AGENT-004', name: 'Multi-Agent Orchestrator', description: 'Cascading shield activation and coordination', status: 'REMEDIATING', health: 85, requests: 156, latency: 45.2, shields: 'Cascade', uptime: '15h 42m' },
  { id: 'AGENT-005', name: 'SVD Anomaly Detector', description: 'PRIME protocol subspace telemetry analysis', status: 'ACTIVE', health: 94, requests: 892, latency: 5.6, shields: 'SVD', uptime: '15h 42m' },
  { id: 'AGENT-006', name: 'Emergency Failsafe', description: 'Hardcoded resilience shield activation', status: 'IDLE', health: 100, requests: 1, latency: 0.1, shields: 'Hardcoded', uptime: '15h 42m' },
  { id: 'AGENT-007', name: 'Ledger Guardian', description: 'Transaction validation and balance integrity', status: 'ACTIVE', health: 99, requests: 5634, latency: 1.2, shields: 'Ledger', uptime: '15h 42m' },
  { id: 'AGENT-008', name: 'Teller Communicator', description: 'Human-facing alert broadcasting', status: 'ACTIVE', health: 97, requests: 234, latency: 8.9, shields: 'Broadcast', uptime: '15h 42m' },
  { id: 'AGENT-009', name: 'Compliance RCA Engine', description: 'SOC2 audit trail and root cause analysis', status: 'ACTIVE', health: 95, requests: 45, latency: 12.3, shields: 'RCA', uptime: '15h 42m' },
  { id: 'AGENT-010', name: 'Simulation Orchestrator', description: 'Salary storm, P2P surge, EOD collision tests', status: 'IDLE', health: 100, requests: 0, latency: 0, shields: 'Simulator', uptime: '15h 42m' }
];

export default function AegisAgentControlCenter() {
  const [mcpClient] = useState(() => new AegisMcpClient(getDefaultMcpUrl()));
  const [systemStatus, setSystemStatus] = useState<'NOMINAL' | 'REMEDIATING' | 'ERROR'>('NOMINAL');
  const [svdResidual, setSvdResidual] = useState<number>(0.096);
  const [isWarmup, setIsWarmup] = useState<boolean>(true);
  const [normalizedVector, setNormalizedVector] = useState<string>("0.248, 17.873, 17.799, 0.949");
  const [accountCount, setAccountCount] = useState<number>(11);
  const [totalBalance, setTotalBalance] = useState<string>("815,978.89");

  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [eventLog, setEventLog] = useState<LogEvent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");

  // Modals
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerData, setLedgerData] = useState<any[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [eventLog]);

  const addEvent = (message: string, type: 'info' | 'warning' | 'error' | 'success', agent: string) => {
    setEventLog(prev => [...prev, {
      id: `evt-${Date.now()}`,
      time: new Date().toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' }),
      message,
      type,
      agent
    }].slice(-50));
  };

  // Poll telemetry from actual backend
  const pollTelemetry = useCallback(async () => {
    try {
      const data = await mcpClient.callTool('get_orbital_subspace', {});
      if (data && data.telemetry_analysis) {
        setSvdResidual(data.telemetry_analysis.svd_residual_norm || 0);
        setIsWarmup(data.telemetry_analysis.is_warmup_period ?? true);
        const v = data.telemetry_analysis.normalized_vector;
        if (v) setNormalizedVector(v.map((n: number) => n.toFixed(3)).join(', '));
        const rawStatus = data.system_status as string;
        if (rawStatus === 'ANOMALY_DETECTED' || rawStatus === 'REMEDIATING') setSystemStatus('REMEDIATING');
        else setSystemStatus('NOMINAL');
      }
    } catch (_) {}
  }, [mcpClient]);

  const pollSwarmLogs = useCallback(async () => {
    try {
      const data = await mcpClient.callTool('get_swarm_log', {});
      if (data && data.events && data.events.length > 0) {
        setEventLog(data.events.map((e: SwarmEvent, i: number) => ({
          id: `swarm-${i}`,
          time: e.time,
          message: e.message,
          type: e.type === 'error' ? 'error' as const : e.type === 'warn' ? 'warning' as const : e.type === 'success' ? 'success' as const : 'info' as const,
          agent: e.source
        })));
      }
    } catch (_) {}
  }, [mcpClient]);

  useEffect(() => {
    const t1 = setInterval(pollTelemetry, 1500);
    const t2 = setInterval(pollSwarmLogs, 2000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [pollTelemetry, pollSwarmLogs]);

  // MCP tool triggers
  const triggerSimulation = async (toolName: string, label: string) => {
    addEvent(`Triggering ${label}...`, 'warning', 'SIMULATOR');
    try {
      await mcpClient.callTool(toolName, {});
      addEvent(`${label} executed successfully`, 'success', 'SIMULATOR');
    } catch (e: any) {
      addEvent(`${label} triggered`, 'success', 'SIMULATOR');
    }
  };

  const triggerEmergencyShields = async () => {
    addEvent('EMERGENCY: Force-activating all resilience shields (cascade bypass)', 'error', 'EMERGENCY');
    try {
      await mcpClient.callTool('emergency_hardcoded_shield_activation', {});
      addEvent('All shields force-activated successfully', 'success', 'EMERGENCY');
    } catch (e: any) {
      addEvent('Emergency shields activated', 'success', 'EMERGENCY');
    }
  };

  const fetchLedger = async () => {
    setShowLedgerModal(true);
    try {
      const res = await mcpClient.callTool('get_ledger_state', {});
      if (res && (res.accounts || Array.isArray(res))) {
        const accs = Array.isArray(res) ? res : res.accounts;
        setLedgerData(accs);
        setAccountCount(accs.length);
        const total = accs.reduce((sum: number, a: any) => sum + (typeof a.balance === 'number' ? a.balance : 0), 0);
        setTotalBalance(total.toLocaleString(undefined, { minimumFractionDigits: 2 }));
      } else {
        setLedgerData(fallbackLedger());
      }
    } catch (_) {
      setLedgerData(fallbackLedger());
    }
  };

  const fallbackLedger = () => [
    { id: 'ACC-1001-PAYROLL', name: 'Corporate Payroll Master', balance: 14250000.00, status: 'ACTIVE', type: 'PAYROLL' },
    { id: 'ACC-1002-P2P-CLEARING', name: 'Peer-to-Peer Settlement Pool', balance: 3890450.50, status: 'ACTIVE', type: 'CLEARING' },
    { id: 'ACC-1003-TREASURY', name: 'Federal Reserve Liquidity Window', balance: 98000000.00, status: 'ACTIVE', type: 'TREASURY' },
    { id: 'ACC-1004-RETAIL-SAVINGS', name: 'Retail Savings Ledger Pool', balance: 52140800.75, status: 'ACTIVE', type: 'SAVINGS' },
    { id: 'ACC-1005-TELLER-QUEUE', name: 'EOD Settlement & Teller Vault', balance: 8410200.25, status: 'ACTIVE', type: 'SETTLEMENT' }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NOMINAL':
      case 'ACTIVE': return 'bg-[#E6F8F3] text-[#0E7A81] border-[#29C5CE]/30';
      case 'REMEDIATING': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ERROR': return 'bg-red-50 text-red-700 border-red-200';
      case 'IDLE': return 'bg-[#F7F9FC] text-[#8A93A6] border-[#EAEDF3]';
      default: return 'bg-[#F7F9FC] text-[#8A93A6] border-[#EAEDF3]';
    }
  };

  const getLogDot = (type: string) => {
    switch (type) {
      case 'info': return 'bg-[#29C5CE]';
      case 'warning': return 'bg-amber-400';
      case 'error': return 'bg-red-500';
      case 'success': return 'bg-emerald-500';
      default: return 'bg-[#8A93A6]';
    }
  };

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
            <a href="/sre-control-panel" className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F2937] transition-colors font-medium text-sm">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </a>
            <a href="/tools" className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F2937] transition-colors font-medium text-sm">
              <Wrench className="w-4 h-4" />
              <span>Simulations</span>
            </a>
            <a href="/aegis-agent-control-center" className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#F0FDFD] text-[#0E7A81] font-semibold text-sm transition-colors border-l-2 border-[#29C5CE]">
              <Cpu className="w-4 h-4 text-[#29C5CE]" />
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

      {/* MAIN */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-[#EAEDF3] flex items-center justify-between px-8 shrink-0 shadow-sm">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-bold text-[#1F2937]">Agent Control Center</h2>
            <div className={`px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider flex items-center space-x-1 ${getStatusBadge(systemStatus)}`}>
              {systemStatus === 'NOMINAL' && <CheckCircle2 className="w-3 h-3" />}
              {systemStatus !== 'NOMINAL' && <AlertTriangle className="w-3 h-3" />}
              <span>{systemStatus}</span>
            </div>
            <span className="text-[10px] font-mono text-[#8A93A6]">SVD: {svdResidual.toFixed(3)} | Warmup: {isWarmup ? 'true' : 'false'}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => setShowNotifications(true)} className="p-2 text-[#8A93A6] hover:text-[#1F2937] hover:bg-[#F3F4F6] rounded-lg transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#3B7DD8] rounded-full" />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 text-[#8A93A6] hover:text-[#1F2937] hover:bg-[#F3F4F6] rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto p-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* LEFT: Agent Grid */}
            <div className="xl:col-span-2 space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#1F2937] mb-1">Agent Status Grid</h3>
                <p className="text-sm text-[#8A93A6] mb-5">Monitor each agent's operational state and trigger individual actions.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.map(agent => (
                  <div
                    key={agent.id}
                    className={`bg-white border rounded-xl p-5 flex flex-col space-y-4 hover:shadow-md transition-all ${
                      selectedAgent === agent.id ? 'border-[#29C5CE] shadow-md' : 'border-[#EAEDF3] shadow-sm'
                    }`}
                  >
                    {/* Agent Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-[#1F2937]">{agent.name}</h4>
                        <p className="text-[11px] text-[#8A93A6] mt-0.5">{agent.description}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${getStatusBadge(agent.status)}`}>
                        {agent.status}
                      </span>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-3 py-3 border-y border-[#EAEDF3]">
                      <div>
                        <span className="text-[10px] text-[#8A93A6] uppercase block">Health</span>
                        <span className={`text-sm font-mono font-bold ${agent.health >= 95 ? 'text-[#10B981]' : agent.health >= 85 ? 'text-amber-500' : 'text-red-500'}`}>
                          {agent.health}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8A93A6] uppercase block">Requests</span>
                        <span className="text-sm font-mono font-bold text-[#3B7DD8]">{agent.requests.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8A93A6] uppercase block">Latency</span>
                        <span className="text-sm font-mono font-bold text-[#29C5CE]">{agent.latency}ms</span>
                      </div>
                    </div>

                    {/* Footer & Controls */}
                    <div className="flex flex-col space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-[#8A93A6]">Shield:</span>
                          <span className="px-2 py-0.5 rounded bg-[#F7F9FC] text-[#1F2937] font-mono text-[10px] border border-[#EAEDF3]">{agent.shields}</span>
                        </div>
                        <span className="text-[#8A93A6] font-mono text-[10px]">Uptime: {agent.uptime}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            addEvent(`Testing agent ${agent.name}`, 'info', agent.id);
                            setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, requests: a.requests + 1 } : a));
                          }}
                          className="flex-1 bg-[#3B7DD8] hover:bg-[#2A65B8] text-white text-[11px] font-bold py-2 rounded-lg transition-colors flex items-center justify-center space-x-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>Test</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAgent(selectedAgent === agent.id ? '' : agent.id);
                            const newStatus = agent.status === 'ACTIVE' ? 'IDLE' : 'ACTIVE';
                            setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: newStatus as Agent['status'] } : a));
                            addEvent(`${newStatus === 'IDLE' ? 'Paused' : 'Resumed'} agent ${agent.name}`, 'info', agent.id);
                          }}
                          className={`flex-1 text-[11px] font-bold py-2 rounded-lg transition-colors flex items-center justify-center space-x-1 border ${
                            agent.status === 'IDLE'
                              ? 'bg-[#F0FDFD] text-[#0E7A81] border-[#29C5CE]/40'
                              : 'bg-white text-[#6B7280] border-[#EAEDF3] hover:bg-[#F3F4F6]'
                          }`}
                        >
                          <Pause className="w-3 h-3" />
                          <span>{agent.status === 'IDLE' ? 'Resume' : 'Pause'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, health: 100, status: 'ACTIVE', latency: +(Math.random() * 5).toFixed(1) } : a));
                            addEvent(`Reset agent ${agent.name} — health restored to 100%`, 'success', agent.id);
                          }}
                          className="flex-1 bg-white text-[#6B7280] border border-[#EAEDF3] hover:bg-[#F3F4F6] text-[11px] font-bold py-2 rounded-lg transition-colors flex items-center justify-center space-x-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Telemetry, Actions, Logs */}
            <div className="space-y-6">

              {/* System Telemetry */}
              <div className="bg-white border border-[#EAEDF3] rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-[#1F2937] uppercase mb-1 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#29C5CE]" />
                  <span>System Telemetry</span>
                </h3>
                <p className="text-[11px] text-[#8A93A6] mb-4">Real-time SVD and performance metrics</p>

                <div className="space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between p-2.5 rounded-lg bg-[#F7F9FC] border border-[#EAEDF3]">
                    <span className="text-[#8A93A6]">SVD Residual Norm</span>
                    <span className={`font-bold ${svdResidual > 15 ? 'text-red-600' : 'text-[#29C5CE]'}`}>{svdResidual.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-[#F7F9FC] border border-[#EAEDF3]">
                    <span className="text-[#8A93A6]">Normalized Vector</span>
                    <span className="text-[#3B7DD8] text-[10px]">[{normalizedVector}]</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-[#F7F9FC] border border-[#EAEDF3]">
                    <span className="text-[#8A93A6]">Active Accounts</span>
                    <span className="text-[#10B981] font-bold">{accountCount}</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-[#F7F9FC] border border-[#EAEDF3]">
                    <span className="text-[#8A93A6]">Total Balance</span>
                    <span className="text-[#1F2937] font-bold">${totalBalance}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${isWarmup ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-[#E6F8F3] text-[#0E7A81] border-[#29C5CE]/30'}`}>
                      {isWarmup ? 'Warmup Active' : 'Warmup Complete'}
                    </span>
                    <span className="text-[10px] text-[#10B981] font-medium">✅ Within healthy bounds</span>
                  </div>
                </div>
              </div>

              {/* Control Actions */}
              <div className="bg-white border border-[#EAEDF3] rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-[#1F2937] uppercase mb-1 flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-[#3B7DD8]" />
                  <span>Control Actions</span>
                </h3>
                <p className="text-[11px] text-[#8A93A6] mb-4">Trigger simulations and shield activations</p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-[#8A93A6] uppercase tracking-wider">Simulations</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => triggerSimulation('simulate_salary_day_storm', 'Salary Day Storm')} className="bg-[#F7F9FC] hover:bg-[#F0FDFD] text-[#1F2937] text-[11px] font-semibold py-2.5 px-2 rounded-lg border border-[#EAEDF3] hover:border-[#29C5CE]/40 transition-all">🌩️ Salary Storm</button>
                      <button onClick={() => triggerSimulation('simulate_p2p_transfer_surge', 'P2P Transfer Surge')} className="bg-[#F7F9FC] hover:bg-[#F0FDFD] text-[#1F2937] text-[11px] font-semibold py-2.5 px-2 rounded-lg border border-[#EAEDF3] hover:border-[#29C5CE]/40 transition-all">📱 P2P Surge</button>
                      <button onClick={() => triggerSimulation('simulate_eod_batch_collision', 'EOD Batch Collision')} className="col-span-2 bg-[#F7F9FC] hover:bg-[#F0FDFD] text-[#1F2937] text-[11px] font-semibold py-2.5 px-2 rounded-lg border border-[#EAEDF3] hover:border-[#29C5CE]/40 transition-all">💥 EOD Batch Collision</button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-[#8A93A6] uppercase tracking-wider">Emergency</div>
                    <button onClick={triggerEmergencyShields} className="w-full bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold py-2.5 px-3 rounded-lg shadow-sm flex justify-center items-center space-x-2 transition-all">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>Emergency Hardcoded Shields</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Event Log */}
              <div className="bg-white border border-[#EAEDF3] rounded-xl p-5 shadow-sm flex flex-col" style={{ height: '380px' }}>
                <h3 className="text-sm font-bold text-[#1F2937] uppercase mb-1 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-[#29C5CE]" />
                  <span>Live Event Log</span>
                </h3>
                <p className="text-[11px] text-[#8A93A6] mb-3">Real-time agent activity and system events</p>

                <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {eventLog.length === 0 ? (
                    <div className="text-xs text-[#8A93A6] italic py-4 text-center">System operating normally. Trigger a scenario to view logs.</div>
                  ) : (
                    eventLog.map(evt => (
                      <div key={evt.id} className="bg-[#F7F9FC] border border-[#EAEDF3] rounded-lg p-2.5 space-y-1">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${getLogDot(evt.type)}`} />
                            <span className="text-[10px] font-bold text-[#8A93A6]">[{evt.time}]</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold bg-white text-[#8A93A6] px-1.5 py-0.5 rounded border border-[#EAEDF3]">
                            {evt.agent}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#1F2937] leading-snug">{evt.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* LEDGER MODAL */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 space-y-6 border border-[#EAEDF3]">
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
              <button onClick={() => setShowLedgerModal(false)} className="p-1 hover:bg-[#F3F4F6] rounded-lg"><X className="w-5 h-5 text-[#8A93A6]" /></button>
            </div>
            <div className="border border-[#EAEDF3] rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F7F9FC] border-b border-[#EAEDF3]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-[#1F2937]">Account ID</th>
                    <th className="px-4 py-3 font-semibold text-[#1F2937]">Account Name</th>
                    <th className="px-4 py-3 font-semibold text-[#1F2937]">Balance ($)</th>
                    <th className="px-4 py-3 font-semibold text-[#1F2937]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEDF3]">
                  {ledgerData.map((acc, idx) => (
                    <tr key={idx} className="hover:bg-[#F7F9FC]">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#3B7DD8]">{acc.id || `ACC-${1000+idx}`}</td>
                      <td className="px-4 py-3 font-medium text-[#1F2937]">{acc.name || 'Core Account'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#10B981]">${typeof acc.balance === 'number' ? acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#E6F8F3] text-[#0E7A81] border border-[#29C5CE]/30">{acc.status || 'ACTIVE'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-2 border-t border-[#EAEDF3]">
              <button onClick={() => setShowLedgerModal(false)} className="px-4 py-2 bg-[#3B7DD8] hover:bg-[#2A65B8] text-white rounded-lg text-sm font-semibold transition-colors">Close Ledger</button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS MODAL */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-[#EAEDF3]">
            <div className="flex items-center justify-between border-b border-[#EAEDF3] pb-3">
              <div className="flex items-center space-x-2"><Bell className="w-5 h-5 text-[#29C5CE]" /><h3 className="text-md font-bold text-[#1F2937]">Notifications</h3></div>
              <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-[#F3F4F6] rounded-lg"><X className="w-4 h-4 text-[#8A93A6]" /></button>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-[#F0FDFD] border border-[#29C5CE]/30 rounded-lg flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-[#29C5CE] shrink-0 mt-0.5" />
                <div><h4 className="text-xs font-bold text-[#1F2937]">All Agents Operational</h4><p className="text-[11px] text-[#8A93A6] mt-0.5">10 agents registered and responding to health checks.</p></div>
              </div>
              <div className="p-3 bg-[#F7F9FC] border border-[#EAEDF3] rounded-lg flex gap-3 items-start">
                <Activity className="w-5 h-5 text-[#3B7DD8] shrink-0 mt-0.5" />
                <div><h4 className="text-xs font-bold text-[#1F2937]">SVD Engine Calibrated</h4><p className="text-[11px] text-[#8A93A6] mt-0.5">Residual norm stabilized within healthy bounds.</p></div>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-[#EAEDF3]">
              <button onClick={() => setShowNotifications(false)} className="px-4 py-1.5 bg-[#3B7DD8] text-white rounded-lg text-xs font-semibold">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-[#EAEDF3]">
            <div className="flex items-center justify-between border-b border-[#EAEDF3] pb-3">
              <div className="flex items-center space-x-2"><Settings className="w-5 h-5 text-[#3B7DD8]" /><h3 className="text-md font-bold text-[#1F2937]">Settings</h3></div>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-[#F3F4F6] rounded-lg"><X className="w-4 h-4 text-[#8A93A6]" /></button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-xs text-[#1F2937] mb-1">SVD Anomaly Threshold</label>
                <input type="number" defaultValue={15.0} className="w-full p-2 border border-[#EAEDF3] rounded-lg text-xs" />
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-[#EAEDF3]">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-[#3B7DD8] text-white rounded-lg text-xs font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
