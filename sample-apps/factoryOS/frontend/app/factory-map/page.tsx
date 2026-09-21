'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Factory, Thermometer, Vibrate, Gauge, Wrench, Clock, Settings, X, AlertTriangle, CheckCircle2, Activity, Package, Truck, Eye, Brain, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Machine {
  id: string;
  name: string;
  status: string;
  health?: string;
  temperature_c?: number;
  vibration_mm_s?: number;
  operating_hours?: number;
  last_serviced?: string;
  sensor_type?: string;
  air_temp_k?: number;
  process_temp_k?: number;
  rotational_speed_rpm?: number;
  torque_nm?: number;
  tool_wear_min?: number;
  sensors?: {
    air_temperature_k?: number;
    process_temperature_k?: number;
    rotational_speed_rpm?: number;
    torque_nm?: number;
    tool_wear_min?: number;
    vibration_mm_s?: number;
    operating_hours?: number;
  };
}

interface ProductionLine {
  id: string;
  name?: string;
  status: string;
  active_job: string;
  output_rate: string | number;
}

interface Prediction {
  machineId?: string;
  machine_id?: string;
  riskLevel?: string;
  risk_level?: string;
  failureProbability?: number;
  failure_probability?: number;
  likelyCause?: string | null;
  likely_cause?: string | null;
  confidencePct?: number;
  modelSource?: string;
}

const DEFAULT_MACHINES: Machine[] = [
  { id: 'M12', name: 'CNC Milling Machine M12', status: 'Operational', health: 'green', temperature_c: 68.0, vibration_mm_s: 0.04, rotational_speed_rpm: 1270, torque_nm: 67.5, tool_wear_min: 208, operating_hours: 1420, last_serviced: '2026-06-15' },
  { id: 'M13', name: 'Laser Cutter M13', status: 'Operational', health: 'green', temperature_c: 65.0, vibration_mm_s: 0.03, rotational_speed_rpm: 1290, torque_nm: 70.5, tool_wear_min: 234, operating_hours: 1180, last_serviced: '2026-05-10' },
  { id: 'M18', name: 'Injection Molder M18', status: 'Operational', health: 'green', temperature_c: 66.0, vibration_mm_s: 0.05, rotational_speed_rpm: 1300, torque_nm: 65.0, tool_wear_min: 180, operating_hours: 1560, last_serviced: '2026-06-01' },
  { id: 'M21', name: 'Stamping Press M21', status: 'Operational', health: 'green', temperature_c: 70.0, vibration_mm_s: 0.04, rotational_speed_rpm: 1200, torque_nm: 60.0, tool_wear_min: 150, operating_hours: 980, last_serviced: '2026-07-01' },
  { id: 'M27', name: 'Conveyor Line M27', status: 'Operational', health: 'green', temperature_c: 67.0, vibration_mm_s: 0.03, rotational_speed_rpm: 1250, torque_nm: 68.0, tool_wear_min: 120, operating_hours: 2100, last_serviced: '2026-06-20' }
];

const DEFAULT_LINES: ProductionLine[] = [
  { id: 'Line1', name: 'Assembly Line 1', status: 'Operational', active_job: 'JOB-8821', output_rate: '120 units/hr' },
  { id: 'Line2', name: 'Assembly Line 2', status: 'Operational', active_job: 'JOB-9104', output_rate: '95 units/hr' }
];

function FactoryMapContent() {
  const searchParams = useSearchParams();
  const initialMachineId = searchParams?.get('machine');

  const [machines, setMachines] = useState<Machine[]>(DEFAULT_MACHINES);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>(DEFAULT_LINES);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  // Fetch machines safely
  const fetchMachines = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/machines`).catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        const list = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : null);
        if (list) {
          setMachines(list);
        }
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  }, []);

  // Fetch production lines safely
  const fetchProductionLines = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/production-lines`).catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        const list = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : null);
        if (list) {
          setProductionLines(list);
        }
      }
    } catch (error) {
      console.error('Error fetching production lines:', error);
    }
  }, []);

  // Fetch failure prediction safely
  const fetchPrediction = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/machines/${id}/predict-failure`).catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        setPrediction(json.data || json);
      } else {
        // Fallback prediction
        setPrediction({
          machineId: id,
          riskLevel: id === 'M12' ? 'critical' : 'normal',
          failureProbability: id === 'M12' ? 0.98 : 0.05,
          likelyCause: id === 'M12' ? 'Bearing Failure / Overstrain' : 'Normal Operating Condition',
          confidencePct: 96
        });
      }
    } catch (error) {
      console.error('Error fetching prediction:', error);
    }
  }, []);

  useEffect(() => {
    fetchMachines();
    fetchProductionLines();

    const interval = setInterval(() => {
      fetchMachines();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchMachines, fetchProductionLines]);

  const initialHandledRef = React.useRef(false);

  // Handle machine selection from URL query param (?machine=M12) ONCE
  useEffect(() => {
    if (initialMachineId && !initialHandledRef.current && machines.length > 0) {
      initialHandledRef.current = true;
      const found = machines.find((m) => m.id === initialMachineId) || (initialMachineId === 'M12' ? DEFAULT_MACHINES[0] : null);
      if (found) {
        setSelectedMachine(found);
        fetchPrediction(found.id);
      }
    }
  }, [initialMachineId, machines, fetchPrediction]);

  const handleMachineClick = (machine: Machine) => {
    setSelectedMachine(machine);
    fetchPrediction(machine.id);
  };

  const closeDrawer = () => {
    setSelectedMachine(null);
    setPrediction(null);
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // Helper to categorize machines by zone
  const getZoneMachines = (ids: string[]) => {
    return machines.filter(m => ids.includes(m.id));
  };

  const assemblyLine1Ids = ['M12', 'M13', 'M27'];
  const assemblyLine2Ids = ['M18', 'M21'];
  const line1Machines = getZoneMachines(assemblyLine1Ids);
  const line2Machines = getZoneMachines(assemblyLine2Ids);

  const getHealthStatus = (m: Machine) => {
    if (m.health === 'red' || m.status === 'Fault' || m.status === 'Critical') return 'Critical';
    if (m.health === 'yellow' || m.status === 'Warning') return 'Warning';
    return 'Healthy';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Healthy': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Critical': return 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusDotClass = (status: string) => {
    switch (status) {
      case 'Healthy': return 'bg-emerald-500 shadow-[0_0_10px_#10B981]';
      case 'Warning': return 'bg-amber-500 shadow-[0_0_10px_#F59E0B]';
      case 'Critical': return 'bg-red-500 shadow-[0_0_15px_#EF4444] animate-ping';
      default: return 'bg-slate-400';
    }
  };

  // Extract sensor values safely from flat or nested object
  const getTempC = (m: Machine) => {
    if (m.temperature_c !== undefined) return m.temperature_c.toFixed(1);
    if (m.sensors?.process_temperature_k !== undefined) return (m.sensors.process_temperature_k - 273.15).toFixed(1);
    return '68.0';
  };

  const getVibration = (m: Machine) => {
    if (m.vibration_mm_s !== undefined) return m.vibration_mm_s.toFixed(2);
    if (m.sensors?.vibration_mm_s !== undefined) return m.sensors.vibration_mm_s.toFixed(2);
    return '0.04';
  };

  const getRPM = (m: Machine) => {
    return m.rotational_speed_rpm ?? m.sensors?.rotational_speed_rpm ?? 1270;
  };

  const getTorque = (m: Machine) => {
    return m.torque_nm ?? m.sensors?.torque_nm ?? 67.5;
  };

  const getToolWear = (m: Machine) => {
    return m.tool_wear_min ?? m.sensors?.tool_wear_min ?? 208;
  };

  const getOpHours = (m: Machine) => {
    return m.operating_hours ?? m.sensors?.operating_hours ?? 1420;
  };

  const riskLevelStr = (prediction?.riskLevel || prediction?.risk_level || 'normal').toUpperCase();
  const probVal = prediction?.failureProbability ?? prediction?.failure_probability ?? 0.05;
  const likelyCauseStr = prediction?.likelyCause || prediction?.likely_cause || 'Normal Operation';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Factory className="w-8 h-8 text-[var(--primary)]" />
            Factory Digital Twin
          </h1>
          <p className="text-[var(--text-secondary)]">Interactive spatial floor plan & real-time telemetry map</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full glass-card">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Digital Twin Active
          </div>
        </div>
      </div>

      {/* Main Factory Floor Map */}
      <div className="glass-card p-6 relative overflow-hidden border border-[var(--border)] min-h-[520px]">
        {/* Floor Blueprint Grid Background */}
        <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

        {/* Zones Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          
          {/* Zone 1: Raw Materials & Warehouse */}
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-hover)]/30 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                Raw Materials & Bay 2
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">Zone A</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">Stock storage & component buffer zone</p>
            <div className="flex items-center justify-center p-6 border border-dashed border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)]">
              Automated Guided Vehicles (AGV) Active
            </div>
          </div>

          {/* Zone 2: Assembly Line 1 */}
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] backdrop-blur-md space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                Assembly Line 1
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium">Main Conveyor</span>
            </div>
            <div className="space-y-3">
              {line1Machines.map((m) => {
                const health = getHealthStatus(m);
                return (
                  <motion.div
                    key={m.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleMachineClick(m)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedMachine?.id === m.id ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--bg-card)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${getStatusDotClass(health)}`} />
                      <div>
                        <div className="font-semibold text-sm text-[var(--text-primary)]">{m.name}</div>
                        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-3 mt-0.5">
                          <span>{getTempC(m)} °C</span>
                          <span>•</span>
                          <span>{getVibration(m)} mm/s</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${getStatusBadgeClass(health)}`}>
                      {m.id}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Zone 3: Assembly Line 2 */}
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] backdrop-blur-md space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                Assembly Line 2
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">High Speed</span>
            </div>
            <div className="space-y-3">
              {line2Machines.map((m) => {
                const health = getHealthStatus(m);
                return (
                  <motion.div
                    key={m.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleMachineClick(m)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedMachine?.id === m.id ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--bg-card)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${getStatusDotClass(health)}`} />
                      <div>
                        <div className="font-semibold text-sm text-[var(--text-primary)]">{m.name}</div>
                        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-3 mt-0.5">
                          <span>{getTempC(m)} °C</span>
                          <span>•</span>
                          <span>{getVibration(m)} mm/s</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${getStatusBadgeClass(health)}`}>
                      {m.id}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Bottom Status Bar for Production Lines */}
        <div className="mt-8 pt-6 border-t border-[var(--border)] grid grid-cols-1 md:grid-cols-2 gap-4">
          {productionLines.map((line) => (
            <div key={line.id} className="p-4 rounded-xl glass-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${line.status.includes('Operational') || line.status.includes('Running') ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                <div>
                  <div className="font-semibold text-sm text-[var(--text-primary)]">{line.name || line.id}</div>
                  <div className="text-xs text-[var(--text-secondary)]">Active Job: <span className="font-medium text-[var(--text-primary)]">{line.active_job}</span></div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[var(--primary)]">{line.output_rate}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">{line.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Machine Side Drawer */}
      <AnimatePresence>
        {selectedMachine && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />

            {/* Slide-in Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass-card rounded-none border-l border-[var(--border)] shadow-2xl flex flex-col overflow-hidden"
              style={{ background: 'var(--bg-card-solid)' }}
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">{selectedMachine.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${getStatusBadgeClass(getHealthStatus(selectedMachine))}`}>
                      {selectedMachine.status || getHealthStatus(selectedMachine)}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedMachine.name}</h2>
                </div>
                <button 
                  onClick={closeDrawer}
                  className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors text-[var(--text-secondary)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                
                {/* Live Telemetry Sensors Grid */}
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Live Telemetry</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-[var(--bg-page)] border border-[var(--border)]">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                        <Thermometer className="w-4 h-4 text-orange-500" />
                        <span>Temperature</span>
                      </div>
                      <div className="text-xl font-bold text-[var(--text-primary)]">
                        {getTempC(selectedMachine)} <span className="text-xs font-normal text-[var(--text-secondary)]">°C</span>
                      </div>
                    </div>
                    
                    <div className="p-3.5 rounded-xl bg-[var(--bg-page)] border border-[var(--border)]">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                        <Vibrate className="w-4 h-4 text-pink-500" />
                        <span>Vibration</span>
                      </div>
                      <div className="text-xl font-bold text-[var(--text-primary)]">
                        {getVibration(selectedMachine)} <span className="text-xs font-normal text-[var(--text-secondary)]">mm/s</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--bg-page)] border border-[var(--border)]">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                        <Gauge className="w-4 h-4 text-blue-500" />
                        <span>RPM</span>
                      </div>
                      <div className="text-xl font-bold text-[var(--text-primary)]">
                        {getRPM(selectedMachine)}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--bg-page)] border border-[var(--border)]">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                        <Settings className="w-4 h-4 text-purple-500" />
                        <span>Torque</span>
                      </div>
                      <div className="text-xl font-bold text-[var(--text-primary)]">
                        {getTorque(selectedMachine)} <span className="text-xs font-normal text-[var(--text-secondary)]">Nm</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--bg-page)] border border-[var(--border)]">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                        <Wrench className="w-4 h-4 text-amber-500" />
                        <span>Tool Wear</span>
                      </div>
                      <div className="text-xl font-bold text-[var(--text-primary)]">
                        {getToolWear(selectedMachine)} <span className="text-xs font-normal text-[var(--text-secondary)]">min</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--bg-page)] border border-[var(--border)]">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                        <Clock className="w-4 h-4 text-teal-500" />
                        <span>Operating Hours</span>
                      </div>
                      <div className="text-xl font-bold text-[var(--text-primary)]">
                        {getOpHours(selectedMachine)} <span className="text-xs font-normal text-[var(--text-secondary)]">h</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Predictive Maintenance Insights */}
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[var(--primary)]" />
                    AI Failure Risk Assessment
                  </h3>

                  <div className={`p-4 rounded-xl border ${
                    riskLevelStr === 'CRITICAL' || riskLevelStr === 'HIGH' ? 'bg-red-500/10 border-red-500/30' : 
                    riskLevelStr === 'ELEVATED' || riskLevelStr === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/30' : 
                    'bg-emerald-500/10 border-emerald-500/30'
                  }`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm text-[var(--text-primary)]">Risk Level: {riskLevelStr}</span>
                      <span className="text-sm font-extrabold text-[var(--primary)]">{(probVal * 100).toFixed(1)}%</span>
                    </div>

                    {/* Risk Progress Bar */}
                    <div className="h-2 w-full bg-[var(--border)] rounded-full overflow-hidden mb-3">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          riskLevelStr === 'CRITICAL' || riskLevelStr === 'HIGH' ? 'bg-red-500' : 
                          riskLevelStr === 'ELEVATED' || riskLevelStr === 'MEDIUM' ? 'bg-amber-500' : 
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(probVal * 100, 100)}%` }}
                      />
                    </div>

                    <p className="text-xs text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">Diagnosis:</span> {likelyCauseStr}
                    </p>
                  </div>
                </div>

                {/* Last Serviced */}
                <div className="p-4 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] flex justify-between items-center text-xs">
                  <span className="text-[var(--text-secondary)]">Last Maintenance Service:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{selectedMachine.last_serviced || '2026-06-15'}</span>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FactoryMapPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--text-primary)]">Loading Factory Map...</div>}>
      <FactoryMapContent />
    </Suspense>
  );
}
