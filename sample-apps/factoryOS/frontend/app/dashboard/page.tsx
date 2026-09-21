'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Cpu, Package, AlertTriangle, Thermometer, Gauge, 
  BrainCircuit, Wrench, BoxIcon, ShoppingCart, Factory as FactoryIcon, 
  ShieldCheck, RotateCcw, Zap, RefreshCw, XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const API_BASE = 'http://localhost:4000';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

import { Suspense } from 'react';

const DEFAULT_SUMMARY = {
  activeIncident: null,
  machines: {
    total: 5,
    healthy: 5,
    warning: 0,
    critical: 0,
    list: [
      { id: 'M12', name: 'CNC Milling Machine M12', status: 'Operational', health: 'green', temperature_c: 68.0, vibration_mm_s: 0.04, sensor_type: 'L', air_temp_k: 300.5, process_temp_k: 311.2, rotational_speed_rpm: 1270, torque_nm: 67.5, tool_wear_min: 208 },
      { id: 'M13', name: 'Laser Cutter M13', status: 'Operational', health: 'green', temperature_c: 65.0, vibration_mm_s: 0.03, sensor_type: 'M', air_temp_k: 302.8, process_temp_k: 312.3, rotational_speed_rpm: 1290, torque_nm: 70.5, tool_wear_min: 234 },
      { id: 'M18', name: 'Injection Molder M18', status: 'Operational', health: 'green', temperature_c: 66.0, vibration_mm_s: 0.05, sensor_type: 'H', air_temp_k: 298.5, process_temp_k: 309.8, rotational_speed_rpm: 1300, torque_nm: 65.0, tool_wear_min: 180 },
      { id: 'M21', name: 'Stamping Press M21', status: 'Operational', health: 'green', temperature_c: 70.0, vibration_mm_s: 0.04, sensor_type: 'L', air_temp_k: 303.0, process_temp_k: 314.5, rotational_speed_rpm: 1200, torque_nm: 60.0, tool_wear_min: 150 },
      { id: 'M27', name: 'Conveyor Line M27', status: 'Operational', health: 'green', temperature_c: 67.0, vibration_mm_s: 0.03, sensor_type: 'M', air_temp_k: 301.2, process_temp_k: 311.5, rotational_speed_rpm: 1250, torque_nm: 68.0, tool_wear_min: 120 }
    ]
  },
  production: {
    totalLines: 2,
    operational: 2,
    lines: [
      { id: 'Line1', status: 'Operational', active_job: 'JOB-8821', output_rate: '120 units/hr' },
      { id: 'Line2', status: 'Operational', active_job: 'JOB-9104', output_rate: '95 units/hr' }
    ]
  },
  inventory: { totalItems: 4, shortages: 2, items: [], shortageItems: [] },
  incidents: { total: 0, list: [] },
  purchaseOrders: { total: 0, list: [] }
};

const DEFAULT_SCENARIOS = [
  { id: 'bearing_failure', label: 'Bearing Failure — M12', triggerButton: 'Simulate Bearing Failure', description: 'M12 temperature & vibration spike due to damaged bearing. Spare part out of stock.' },
  { id: 'overheating', label: 'Overheating — M21', triggerButton: 'Simulate Overheating', description: 'M21 temperature climbs steadily with normal vibration. Coolant fluid top-up required.' },
  { id: 'inventory_stockout', label: 'Inventory Stockout — M18/M27', triggerButton: 'Simulate Stockout', description: 'M27 early bearing wear. Part bearing_X40 out of stock.' },
  { id: 'supplier_delay', label: 'Supplier Delay — M13', triggerButton: 'Simulate Supplier Delay', description: 'M13 bearing failure. Primary supplier delayed.' },
  { id: 'safety_breach', label: 'Safety Breach — Line1', triggerButton: 'Simulate Safety Breach', description: 'M12 and M27 simultaneous vibration spike.' }
];

function DashboardContent() {
  const [data, setData] = useState<any>(DEFAULT_SUMMARY);
  const [scenarios, setScenarios] = useState<any[]>(DEFAULT_SCENARIOS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const searchParams = useSearchParams();

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, scenariosRes] = await Promise.all([
        fetch(`${API_BASE}/api/state/summary`).catch(() => null),
        fetch(`${API_BASE}/api/scenarios`).catch(() => null)
      ]);

      if (summaryRes && summaryRes.ok) {
        const summaryData = await summaryRes.json();
        if (summaryData.success && summaryData.data) {
          setData(summaryData.data);
        }
      }

      if (scenariosRes && scenariosRes.ok) {
        const scenariosData = await scenariosRes.json();
        if (scenariosData.success && scenariosData.data) {
          setScenarios(scenariosData.data);
        }
      }
    } catch (err: any) {
      console.error('API poll info:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const isDemo = searchParams?.get('demo');
    if (isDemo === 'true') {
      triggerScenario('bearing_failure');
    }
  }, [searchParams]);

  const triggerScenario = async (scenarioId: string) => {
    setSimulating(true);
    try {
      const res = await fetch(`${API_BASE}/api/simulate/${scenarioId}`, { method: 'POST' }).catch(() => null);
      if (res && res.ok) {
        const simRes = await res.json();
        if (typeof window !== 'undefined') {
          localStorage.setItem('factoryos-active-scenario', JSON.stringify(simRes));
        }
      } else {
        // Fallback local simulation state
        const fallbackSim = {
          scenarioId,
          label: 'Bearing Failure — M12',
          description: 'M12 temperature and vibration spike due to damaged bearing.',
          expectedAgentFlow: [
            { agent: 'Maintenance', action: 'predict_failure', output: 'Bearing failure pattern detected on M12 (98% confidence)' },
            { agent: 'Maintenance', action: 'estimate_repair', output: '38 minutes repair, requires bearing_X52' },
            { agent: 'Maintenance', action: 'shutdown_machine', output: 'M12 shut down safely' },
            { agent: 'Inventory', action: 'check_inventory', output: 'bearing_X52 stock = 0' },
            { agent: 'Procurement', action: 'list_suppliers', output: 'Garcia-James (4hr ETA, $126)' },
            { agent: 'Production', action: 'reroute_production', output: 'Rerouted Line1 job to Line2' },
            { agent: 'Safety', action: 'generate_safety_report', output: 'OSHA incident report INC-2001 logged' }
          ],
          recoverySummary: {
            machine_shutdown: 'M12',
            repair_eta_minutes: 38,
            production_moved_to: 'Line2',
            part_ordered: 'bearing_X52',
            supplier_chosen: 'Garcia-James',
            supplier_eta_hours: 4,
            estimated_loss_reduction_pct: 82
          }
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('factoryos-active-scenario', JSON.stringify(fallbackSim));
        }
        setData((prev: any) => ({
          ...prev,
          activeIncident: 'INC-2001',
          machines: {
            ...prev.machines,
            critical: 1,
            healthy: 4,
            list: prev.machines.list.map((m: any) => m.id === 'M12' ? { ...m, health: 'red', status: 'Fault', temperature_c: 92, vibration_mm_s: 8.1 } : m)
          },
          incidents: {
            total: 1,
            list: [{ incident_id: 'INC-2001', severity: 'CRITICAL', description: 'M12 Bearing Failure - High Heat & Vibration', reported_at: new Date().toISOString() }]
          }
        }));
      }
      await fetchData();
    } catch (err) {
      console.error('Failed to trigger scenario:', err);
    } finally {
      setSimulating(false);
    }
  };

  const resetFactory = async () => {
    setSimulating(true);
    try {
      await fetch(`${API_BASE}/api/simulate/reset`, { method: 'POST' }).catch(() => null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('factoryos-active-scenario');
      }
      setData(DEFAULT_SUMMARY);
      await fetchData();
    } catch (err) {
      console.error('Failed to reset factory:', err);
    } finally {
      setSimulating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Connection Error</h2>
        <p className="text-[var(--text-secondary)]">{error}</p>
        <button 
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const machineList: any[] = Array.isArray(data?.machines)
    ? data.machines
    : (Array.isArray(data?.machines?.list) ? data.machines.list : []);

  const linesList: any[] = Array.isArray(data?.production?.lines)
    ? data.production.lines
    : (Array.isArray(data?.production_lines) ? data.production_lines : []);

  const incidentsList: any[] = Array.isArray(data?.incidents?.list)
    ? data.incidents.list
    : (Array.isArray(data?.incidents) ? data.incidents : []);

  const activeIncident = data?.activeIncident;

  const healthyMachines = data?.machines?.healthy ?? machineList.filter((m: any) => m.health === 'green' || m.status === 'Operational').length;
  const totalMachines = data?.machines?.total ?? machineList.length;

  let activeOrders = linesList.filter((l: any) => l.status === 'Operational' || l.status === 'Running' || (l.active_job && l.active_job !== 'None')).length;
  const efficiency = activeIncident ? 78.4 : 98.7;
  const totalIncidents = incidentsList.length;
  const activeIncidents = activeIncident ? 1 : 0;

  const aiAgents = [
    { name: 'Supervisor', icon: BrainCircuit, id: 'supervisor' },
    { name: 'Maintenance', icon: Wrench, id: 'maintenance' },
    { name: 'Inventory', icon: BoxIcon, id: 'inventory' },
    { name: 'Procurement', icon: ShoppingCart, id: 'procurement' },
    { name: 'Production', icon: FactoryIcon, id: 'production' },
    { name: 'Safety', icon: ShieldCheck, id: 'safety' }
  ];

  const chartData = machineList.map((m: any) => ({
    name: m.id || m.name,
    temperature: m.temperature_c ?? 65,
    status: m.health === 'red' ? 'fault' : (m.health === 'yellow' ? 'warning' : 'operational')
  }));

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'operational': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'fault': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Factory Command Center</h1>
          <p className="text-[var(--text-secondary)]">Live overview of factory operations</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-[var(--text-secondary)]">Simulate Crisis:</span>
          {scenarios.map((s: any) => (
            <button
              key={s.id}
              onClick={() => triggerScenario(s.id)}
              disabled={simulating}
              className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              {s.label || s.triggerButton || s.name || s.id}
            </button>
          ))}
          <button
            onClick={resetFactory}
            disabled={simulating}
            className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-hover)] transition-all text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 ml-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Factory
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-secondary)] mb-1">Production Efficiency</p>
            <h3 className="text-3xl font-bold text-[var(--text-primary)]">{efficiency}%</h3>
            <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
              <span>↑ 2.4%</span> vs target
            </p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-secondary)] mb-1">Machines Online</p>
            <h3 className="text-3xl font-bold text-[var(--text-primary)]">{healthyMachines}/{totalMachines}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {totalMachines - healthyMachines > 0 ? `${totalMachines - healthyMachines} Attention Required` : 'All Operational'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-secondary)] mb-1">Active Jobs</p>
            <h3 className="text-3xl font-bold text-[var(--text-primary)]">{activeOrders}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Lines 1 & 2 Active</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-secondary)] mb-1">Incidents</p>
            <h3 className="text-3xl font-bold text-[var(--text-primary)]">{totalIncidents}</h3>
            <p className={`text-xs mt-1 ${activeIncidents > 0 ? 'text-red-500 font-bold' : 'text-emerald-500'}`}>
              {activeIncidents > 0 ? `${activeIncident || '1 Active Crisis'}` : 'All Systems Clear'}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${activeIncidents > 0 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Machine Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {machineList.map((machine: any) => (
              <Link href={`/factory-map?machine=${machine.id}`} key={machine.id}>
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="glass-card p-5 border border-[var(--border)] hover:border-[var(--primary)] transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-3 h-3 rounded-full ${
                          machine.health === 'green' || machine.status === 'Operational' ? 'bg-emerald-500' :
                          machine.health === 'yellow' || machine.status === 'Warning' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        {(machine.health === 'red' || machine.status === 'Fault') && (
                          <div className="absolute -inset-1 rounded-full bg-red-500 animate-ping opacity-75" />
                        )}
                      </div>
                      <h3 className="font-semibold text-[var(--text-primary)]">{machine.name}</h3>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      machine.health === 'green' || machine.status === 'Operational' ? 'bg-emerald-500/10 text-emerald-500' :
                      machine.health === 'yellow' || machine.status === 'Warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {machine.status || (machine.health === 'red' ? 'Fault' : 'Operational')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[var(--bg-page)] p-2 rounded-lg">
                      <Thermometer className="w-4 h-4 text-[var(--text-secondary)] mx-auto mb-1" />
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {(machine.temperature_c ?? machine.sensors?.temperature ?? 68.0).toFixed(1)}°C
                      </div>
                    </div>
                    <div className="bg-[var(--bg-page)] p-2 rounded-lg">
                      <Activity className="w-4 h-4 text-[var(--text-secondary)] mx-auto mb-1" />
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {(machine.vibration_mm_s ?? machine.sensors?.vibration ?? 0.04).toFixed(2)} mm/s
                      </div>
                    </div>
                    <div className="bg-[var(--bg-page)] p-2 rounded-lg">
                      <Gauge className="w-4 h-4 text-[var(--text-secondary)] mx-auto mb-1" />
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {machine.rotational_speed_rpm ?? machine.sensors?.rpm ?? 1270}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>

          <div className="glass-card p-6 rounded-xl mt-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Machine Temperatures</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '0.5rem' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="temperature" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry: { name: string; temperature: number; status: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">AI Agents</h2>
            <div className="grid grid-cols-2 gap-3">
              {aiAgents.map((agent) => {
                const isActive = activeIncident && agent.name === 'Supervisor'; // simplistic logic for now
                const isWorking = activeIncident !== null;
                const active = isWorking;
                
                return (
                  <motion.div 
                    key={agent.id}
                    layout
                    className={`p-3 rounded-lg flex flex-col items-center justify-center gap-2 text-center transition-colors border ${
                      active ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[var(--bg-page)] border-[var(--border-color)]'
                    }`}
                  >
                    <agent.icon className={`w-6 h-6 ${active ? 'text-blue-500' : 'text-[var(--text-secondary)]'}`} />
                    <span className="text-sm font-medium text-[var(--text-primary)]">{agent.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      active ? 'bg-blue-500/20 text-blue-400' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                    }`}>
                      {active ? 'Active' : 'Idle'}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Recent Alerts</h2>
            <div className="space-y-3">
              {incidentsList.length > 0 ? (
                incidentsList.slice(0, 5).map((alert: any) => (
                  <div key={alert.id || Math.random()} className="p-3 bg-[var(--bg-page)] rounded-lg border border-[var(--border-color)]">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        alert.severity === 'high' ? 'bg-red-500/10 text-red-500' :
                        alert.severity === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {alert.severity?.toUpperCase() || 'INFO'}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        {alert.time || new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)]">{alert.description || alert.message || 'Alert recorded'}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active alerts</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
