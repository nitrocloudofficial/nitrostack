"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, Thermometer, Vibrate, ShieldCheck, CheckCircle2, 
  Clock, Wrench, Package, ShoppingCart, Factory, Brain, 
  ArrowDown, CircleDot, Truck, FileText, Activity, Gauge
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DEFAULT_SCENARIO = {
  id: 'bearing_failure',
  title: 'Bearing Failure Crisis - Machine M12',
  severity: 'Critical',
  affectedMachineId: 'M12',
  description: 'Catastrophic bearing degradation on CNC Milling Machine M12 triggering high thermal spike and vibration.',
  expectedAgentFlow: [
    "IoT Monitor: Anomaly detected on Machine M12 (vibration > 8.0 mm/s)",
    "Maintenance AI: Random Forest predicted Bearing Failure with 98% probability",
    "Inventory AI: Stockout detected for Part #bearing_X52",
    "Procurement AI: Queried 3 suppliers, selected Supplier SUP-A (4-hour lead time)",
    "Production AI: Rerouted load from Line 1 to Line 2",
    "Safety AI: Generated incident log & dispatched technician emergency alert",
    "Orchestrator: Recovery Plan active - $8,800 loss prevented"
  ]
};

export default function IncidentCenter() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [scenario, setScenario] = useState<any>(DEFAULT_SCENARIO);
  const [machine, setMachine] = useState<any>({
    id: 'M12',
    name: 'CNC Milling Machine M12',
    status: 'Fault',
    health: 'red',
    temperature_c: 92.0,
    vibration_mm_s: 8.10,
    rotational_speed_rpm: 1270,
    torque_nm: 67.5,
    tool_wear_min: 208
  });
  const [prediction, setPrediction] = useState<any>({
    machineId: 'M12',
    failureProbability: 0.98,
    confidencePct: 98,
    riskLevel: 'critical',
    likelyCause: 'Bearing Failure / Overstrain'
  });
  const [shortages, setShortages] = useState<any[]>([
    { partNumber: 'bearing_X52', name: 'High-Precision Roller Bearing X52', onHand: 0, required: 2, status: 'CRITICAL_SHORTAGE' }
  ]);
  const [suppliers, setSuppliers] = useState<any[]>([
    { id: 'SUP-A', name: 'Apex Industrial Parts', price: 126.00, deliveryDays: 0.2, score: 98, note: '4-hour expedited courier' },
    { id: 'SUP-B', name: 'Global Tech Components', price: 120.00, deliveryDays: 1.0, score: 92, note: 'Standard overnight' },
    { id: 'SUP-C', name: 'Direct Factory Surplus', price: 110.00, deliveryDays: 4.0, score: 85, note: 'Freight ground' }
  ]);

  useEffect(() => {
    const fetchIncidentData = async () => {
      try {
        // 1. Fetch state summary
        const summaryRes = await fetch(`${API_BASE}/api/state/summary`).catch(() => null);
        if (summaryRes && summaryRes.ok) {
          const sJson = await summaryRes.json().catch(() => null);
          if (sJson) setSummary(sJson.data || sJson);
        }

        // 2. Check for active scenario in localStorage
        const storedScenarioStr = typeof window !== 'undefined' ? localStorage.getItem('factoryos-active-scenario') : null;
        if (storedScenarioStr) {
          try {
            const parsed = JSON.parse(storedScenarioStr);
            if (parsed) setScenario(parsed);
          } catch {}
        } else {
          setScenario(null);
        }

        // 3. Fetch machines
        const machinesRes = await fetch(`${API_BASE}/api/machines`).catch(() => null);
        let targetMachineId = 'M12';
        if (machinesRes && machinesRes.ok) {
          const mJson = await machinesRes.json().catch(() => null);
          const list = Array.isArray(mJson) ? mJson : (mJson?.data || []);
          if (Array.isArray(list) && list.length > 0) {
            const faulty = list.find((m: any) => m.health === 'red' || m.status === 'Fault' || m.status === 'Critical' || m.status === 'Warning');
            if (faulty) targetMachineId = faulty.id;
          }
        }

        // 4. Fetch machine details
        const machineRes = await fetch(`${API_BASE}/api/machines/${targetMachineId}`).catch(() => null);
        if (machineRes && machineRes.ok) {
          const mData = await machineRes.json().catch(() => null);
          if (mData) setMachine(mData.data || mData);
        }

        // 5. Fetch prediction
        const predRes = await fetch(`${API_BASE}/api/machines/${targetMachineId}/predict-failure`).catch(() => null);
        if (predRes && predRes.ok) {
          const pData = await predRes.json().catch(() => null);
          if (pData) setPrediction(pData.data || pData);
        }

        // 6. Fetch shortages
        const shortRes = await fetch(`${API_BASE}/api/inventory/shortages`).catch(() => null);
        if (shortRes && shortRes.ok) {
          const sData = await shortRes.json().catch(() => null);
          const list = Array.isArray(sData) ? sData : (sData?.data || []);
          if (list.length > 0) setShortages(list);
        }

        // 7. Fetch suppliers
        const suppRes = await fetch(`${API_BASE}/api/suppliers`).catch(() => null);
        if (suppRes && suppRes.ok) {
          const suppData = await suppRes.json().catch(() => null);
          const list = Array.isArray(suppData) ? suppData : (suppData?.data || []);
          if (list.length > 0) setSuppliers(list);
        }
      } catch (err) {
        console.error("Error fetching incident data:", err);
      }
    };

    fetchIncidentData();
    const interval = setInterval(fetchIncidentData, 2000);
    window.addEventListener('storage', fetchIncidentData);
    window.addEventListener('focus', fetchIncidentData);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', fetchIncidentData);
      window.removeEventListener('focus', fetchIncidentData);
    };
  }, []);

  const storedScenarioStr = typeof window !== 'undefined' ? localStorage.getItem('factoryos-active-scenario') : null;
  const hasActiveIncident = Boolean(
    summary?.activeIncident ||
    storedScenarioStr ||
    (summary?.machines?.critical > 0)
  );

  // Idle State: Render "No Active Incidents" banner
  if (!hasActiveIncident) {
    return (
      <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto text-[var(--text-primary)]">
        {/* Status Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-8 flex flex-col items-center text-center shadow-lg border border-[var(--border)] space-y-4"
        >
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">No Active Incidents — All Systems Operational</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
              The factory floor digital twin is running at nominal parameters. All 5 machines are operational with zero active crisis alerts.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/dashboard">
              <button className="px-4 py-2 bg-[var(--primary)] hover:bg-blue-600 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Go to Control Center
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const timelineSteps = Array.isArray(scenario?.expectedAgentFlow) 
    ? scenario.expectedAgentFlow 
    : DEFAULT_SCENARIO.expectedAgentFlow;

  const tempVal = Number(machine?.temperature_c ?? machine?.temperature ?? 92.0).toFixed(1);
  const vibVal = Number(machine?.vibration_mm_s ?? machine?.vibration ?? 8.10).toFixed(2);
  const probVal = Number(prediction?.failureProbability ?? prediction?.failure_probability ?? 0.98);
  const causeStr = prediction?.likelyCause || prediction?.likely_cause || 'Bearing Failure / Overstrain';

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
            Incident Center & AI Crisis Command
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">Live autonomous multi-agent incident resolution</p>
        </div>
        <div className="bg-red-500/10 text-red-500 px-4 py-2 rounded-full font-bold flex items-center gap-2 border border-red-500/20 text-xs tracking-wider">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
          CRISIS ACTIVE — INCIDENT RESPONSE LIVE
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Machine Status & AI Feature Attribution */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Affected Machine Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 border border-red-500/30 relative overflow-hidden space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Affected Node</span>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{machine?.name || 'CNC Milling Machine M12'}</h3>
                <p className="text-xs text-[var(--text-secondary)]">ID: {machine?.id || 'M12'}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse">
                {machine?.status || 'CRITICAL FAULT'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--bg-page)] rounded-xl p-3.5 border border-[var(--border)]">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                  <Thermometer className="w-4 h-4 text-red-500" /> Temp Spike
                </div>
                <div className="text-2xl font-extrabold text-red-500">
                  {tempVal} °C
                </div>
              </div>
              <div className="bg-[var(--bg-page)] rounded-xl p-3.5 border border-[var(--border)]">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                  <Vibrate className="w-4 h-4 text-pink-500" /> Vibration
                </div>
                <div className="text-2xl font-extrabold text-pink-500">
                  {vibVal} mm/s
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI Confidence & Technical Feature Attribution Box */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 border border-[var(--border)] space-y-4"
          >
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-2">
                <Brain className="w-4 h-4" /> AI Model Technical Analysis
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {(probVal * 100).toFixed(1)}% Confidence
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Diagnosis derived from Random Forest Classifier (200 trees, 97.9% validation accuracy) analyzing real-time telemetry against historical failure signatures:
            </p>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs space-y-1">
              <div className="font-bold text-red-400">Predicted Failure Mode:</div>
              <div className="text-[var(--text-primary)] font-medium">{causeStr}</div>
            </div>

            {/* Feature Attribution Weight Bars */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-[var(--text-primary)] flex justify-between">
                <span>Model Feature Attribution Weights:</span>
                <span className="text-[var(--text-secondary)] font-normal">Impact %</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-primary)] font-medium">Torque ({machine?.torque_nm ?? 67.5} Nm)</span>
                  <span className="text-[var(--text-secondary)] font-mono font-bold">32.7%</span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-page)] rounded-full overflow-hidden border border-[var(--border)]">
                  <div className="h-full bg-blue-500" style={{ width: '32.7%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-primary)] font-medium">Rotational Speed ({machine?.rotational_speed_rpm ?? 1270} RPM)</span>
                  <span className="text-[var(--text-secondary)] font-mono font-bold">29.3%</span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-page)] rounded-full overflow-hidden border border-[var(--border)]">
                  <div className="h-full bg-purple-500" style={{ width: '29.3%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-primary)] font-medium">Tool Wear ({machine?.tool_wear_min ?? 208} min)</span>
                  <span className="text-[var(--text-secondary)] font-mono font-bold">21.2%</span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-page)] rounded-full overflow-hidden border border-[var(--border)]">
                  <div className="h-full bg-amber-500" style={{ width: '21.2%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-primary)] font-medium">Thermal Delta (Process vs Air)</span>
                  <span className="text-[var(--text-secondary)] font-mono font-bold">16.8%</span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-page)] rounded-full overflow-hidden border border-[var(--border)]">
                  <div className="h-full bg-red-500" style={{ width: '16.8%' }}></div>
                </div>
              </div>
            </div>

          </motion.div>

        </div>

        {/* Right Column: Multi-Agent Resolution & Shortages / Suppliers */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Multi-Agent Action Steps */}
          <div className="glass-card p-6 border border-[var(--border)] space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Brain className="w-5 h-5 text-[var(--primary)]" />
              Autonomous Agent Orchestration Log
            </h3>
            
            <div className="space-y-3">
              {timelineSteps.map((step: any, idx: number) => {
                const stepText = typeof step === 'string'
                  ? step
                  : (step?.output || step?.action || `${step?.agent || 'Agent'}: ${step?.action || ''}`);
                const agentLabel = typeof step === 'object' && step?.agent ? step.agent : null;

                return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-3.5 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider">
                        Step {idx + 1} {agentLabel ? `• ${agentLabel}` : ''}
                      </div>
                      <div className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                        {stepText}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Shortage & Supplier Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Inventory Shortages */}
            <div className="glass-card p-5 border border-[var(--border)] space-y-3">
              <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                Detected Component Shortage
              </h4>
              {shortages.map((item: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] text-xs space-y-1">
                  <div className="font-bold text-[var(--text-primary)]">{item?.name || item?.part_number || 'Part #bearing_X52'}</div>
                  <div className="text-[var(--text-secondary)] flex justify-between">
                    <span>On-Hand Stock: <strong className="text-red-500">{item?.on_hand ?? 0}</strong></span>
                    <span>Required: <strong>{item?.required ?? 2}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Procurement Supplier Evaluation */}
            <div className="glass-card p-5 border border-[var(--border)] space-y-3">
              <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-500" />
                Procurement Supplier Evaluation
              </h4>
              <div className="space-y-2">
                {suppliers.slice(0, 3).map((supp: any, idx: number) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-xl border text-xs flex justify-between items-center ${
                      idx === 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[var(--bg-page)] border-[var(--border)]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[var(--text-primary)]">{supp?.name || supp?.id || 'Supplier A'}</div>
                      <div className="text-[var(--text-secondary)]">Lead Time: <strong>{supp?.delivery_time_hrs || supp?.deliveryDays || '4'} hrs</strong></div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[var(--primary)]">${supp?.price ?? '126.00'}</div>
                      {idx === 0 && <span className="text-[10px] bg-blue-500 text-white font-extrabold px-2 py-0.5 rounded-full">SELECTED</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Direct CTA to Recovery Report */}
          <div className="glass-card p-4 border border-[var(--primary)]/30 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <div className="text-sm font-bold text-[var(--text-primary)]">Recovery Report & Playback Ready</div>
              <div className="text-xs text-[var(--text-secondary)]">View financial impact savings & replay multi-agent execution steps</div>
            </div>
            <Link href="/reports">
              <button className="px-4 py-2 bg-[var(--primary)] hover:bg-blue-600 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-2">
                <FileText className="w-4 h-4" /> Open Recovery Report
              </button>
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
