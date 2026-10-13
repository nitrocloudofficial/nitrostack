'use client';

import { useState, useEffect } from 'react';
import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

// AGENT NEXUS — ENTERPRISE AUTONOMOUS FACTORY AI OPERATING SYSTEM

interface AgentNexusData {
  status: string;
  machine_id: string;
  event_type: string;
  chosen_action: string;
  confidence: number;
  reason: string;
  negotiation_rounds?: number;
  consulted_agents: string[];
  work_orders: any[];
  notifications: any[];
  trace: string[];
}

interface AgentCard {
  id: string;
  name: string;
  code: string;
  role: string;
  status: 'THINKING' | 'ANALYZING' | 'NEGOTIATING' | 'COMPLETED';
  confidence: number;
  currentTask: string;
  liveMessage: string;
  color: string;
  layer: string;
  description: string;
  evidenceCount: number;
}

// REAL BACKEND STRATEGY EVALUATION CALCULATOR FROM ScenarioSimulationAgent
export interface StrategyDetail {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  totalExpectedCost: number;
  repairCost: number;
  downtimeLoss: number;
  downtimeHours: number;
  failureRiskPct: number;
  deliveryRiskPct: number;
  resilienceScore: number;
  recommendationRank: number;
  pros: string[];
  cons: string[];
}

export function calculateStrategyMetrics(vibrationLevel = 6.5, temperature = 85.0, productionLoad = 100.0) {
  const hourlyDowntimeCost = 12500.0;
  const activeOrders = 3;
  const delayDays = 7;
  const capacityPct = Math.min(100.0, Math.max(20.0, productionLoad));

  // Empirical SCADA severity factor
  const severityFactor = Number((Math.max(1.0, (vibrationLevel / 5.0) * (temperature / 80.0))).toFixed(2));

  // Determine physical operational state
  const isHealthy = vibrationLevel <= 3.5 && temperature <= 60.0;
  const isCritical = vibrationLevel > 7.5 || temperature > 85.0;
  const isModerate = !isHealthy && !isCritical;

  // --- 1. CONTINUOUS / REPAIR NOW STRATEGY ---
  const rnDowntimeHrs = isHealthy ? 0.0 : 4.0;
  const rnRepairCost = isHealthy ? 0.0 : 45000.0;
  const rnDowntimeLoss = rnDowntimeHrs * hourlyDowntimeCost;
  const rnTotalCost = rnRepairCost + rnDowntimeLoss;
  const rnFailureRisk = isHealthy ? 0.5 : isModerate ? 8.5 : Number((Math.min(95.0, severityFactor * 32.0)).toFixed(1));
  const rnDeliveryRisk = isHealthy ? 1.0 : isModerate ? 5.0 : 18.0;
  const rnScore = isHealthy ? 98 : isCritical ? 92 : 80;

  // --- 2. DELAY REPAIR ---
  const baseDailyRisk = Math.min(0.25, 0.05 * severityFactor);
  const drFailureProb = isHealthy ? 0.01 : Math.min(0.95, 1.0 - Math.exp(-baseDailyRisk * delayDays));
  const drCatastrophicDowntimeHrs = 48.0;
  const drCatastrophicRepairCost = 140000.0;
  const drDowntimeLoss = drCatastrophicDowntimeHrs * hourlyDowntimeCost;
  const drOrderPenalty = activeOrders * 25000.0;

  const drExpectedCost = isHealthy ? 0.0 : drFailureProb * (drCatastrophicRepairCost + drDowntimeLoss + drOrderPenalty);
  const drFailureRisk = Number((drFailureProb * 100).toFixed(1));
  const drDeliveryRisk = Math.min(95.0, Number((drFailureProb * 90).toFixed(1)));
  const drScore = isHealthy ? 88 : Math.max(10, 100 - Math.round(drFailureRisk * 1.1));

  // --- 3. REDUCED CAPACITY ---
  const deratedStress = severityFactor * Math.pow(capacityPct / 100.0, 2);
  const rcFailureProb = Math.min(0.55, 0.04 * deratedStress * delayDays);
  const rcCapacityLossPerDay = ((100.0 - capacityPct) / 100.0) * (hourlyDowntimeCost * 12);
  const rcRevenueLoss = rcCapacityLossPerDay * delayDays;
  const rcScheduledRepairCost = 38000.0;
  const rcPlannedDowntimeLoss = 4.0 * hourlyDowntimeCost * 0.7;

  const rcExpectedCost = rcRevenueLoss + rcScheduledRepairCost + rcPlannedDowntimeLoss + (rcFailureProb * drCatastrophicRepairCost);
  const rcFailureRisk = Number((rcFailureProb * 100).toFixed(1));
  const rcDeliveryRisk = Number(Math.min(60.0, (100.0 - capacityPct) * 0.75).toFixed(1));
  const rcScore = isModerate ? 96 : isHealthy ? 70 : 52;

  const primaryStrategyId = isHealthy ? 'continue_normal_operation' : isModerate ? 'reduced_capacity' : 'repair_now';
  const primaryStrategyName = isHealthy ? 'Continue Normal Operation' : isModerate ? 'Operate at Reduced Capacity' : 'Immediate Repair Required';
  const primaryBadge = isHealthy ? 'NOMINAL STATUS' : isModerate ? 'RECOMMENDED' : 'CRITICAL ACTION';
  const primaryBadgeColor = isHealthy ? '#22C55E' : isModerate ? '#F59E0B' : '#EF4444';

  const secondaryStrategyId = isHealthy ? 'reduced_capacity' : isModerate ? 'repair_now' : 'reduced_capacity';
  const secondaryStrategyName = isHealthy ? 'Operate at Reduced Capacity' : isModerate ? 'Immediate Repair Required' : 'Operate at Reduced Capacity (Emergency De-rate)';
  const secondaryBadge = isHealthy ? 'CONSERVATIVE OPTION' : isModerate ? 'HIGH COST OPTION' : 'TEMPORARY MITIGATION';
  const secondaryBadgeColor = isHealthy ? '#3B82F6' : isModerate ? '#EF4444' : '#F59E0B';

  const tertiaryStrategyName = isHealthy ? 'Continue Monitoring & Inspection' : isModerate ? 'Schedule Maintenance Later' : 'Delay Repair (High Risk)';
  const tertiaryBadge = isHealthy ? 'MONITORING ONLY' : isModerate ? 'DEFERRED OPTION' : 'NOT RECOMMENDED';
  const tertiaryBadgeColor = isHealthy ? '#6B7280' : isModerate ? '#6B7280' : '#DC2626';

  const strategies: Record<string, StrategyDetail> = {
    [primaryStrategyId]: {
      id: primaryStrategyId,
      name: primaryStrategyName,
      badge: primaryBadge,
      badgeColor: primaryBadgeColor,
      totalExpectedCost: Math.round(rnTotalCost),
      repairCost: Math.round(rnRepairCost),
      downtimeLoss: Math.round(rnDowntimeLoss),
      downtimeHours: rnDowntimeHrs,
      failureRiskPct: rnFailureRisk,
      deliveryRiskPct: rnDeliveryRisk,
      resilienceScore: rnScore,
      recommendationRank: 1,
      pros: isHealthy
        ? ['Machine operates within nominal baseline', 'Zero planned or unplanned downtime', 'Full production throughput']
        : ['Eliminates catastrophic breakdown risk', 'Uses in-stock parts immediately', 'Fastest restoration to 100% capacity'],
      cons: isHealthy
        ? ['Continuous monitoring required']
        : ['Immediate 4-hour production stoppage'],
    },
    [secondaryStrategyId]: {
      id: secondaryStrategyId,
      name: secondaryStrategyName,
      badge: secondaryBadge,
      badgeColor: secondaryBadgeColor,
      totalExpectedCost: isModerate ? Math.round(rnTotalCost) : Math.round(rcExpectedCost),
      repairCost: isModerate ? Math.round(rnRepairCost) : Math.round(rcScheduledRepairCost),
      downtimeLoss: isModerate ? Math.round(rnDowntimeLoss) : Math.round(rcRevenueLoss + rcPlannedDowntimeLoss),
      downtimeHours: 4.0,
      failureRiskPct: isModerate ? rnFailureRisk : rcFailureRisk,
      deliveryRiskPct: isModerate ? rnDeliveryRisk : rcDeliveryRisk,
      resilienceScore: rcScore,
      recommendationRank: 2,
      pros: isModerate
        ? ['Eliminates catastrophic breakdown risk', 'Uses in-stock parts immediately']
        : ['Maintains partial order throughput', 'Schedules maintenance during off-peak hours', 'Significant stress reduction'],
      cons: isModerate
        ? ['Immediate 4-hour production stoppage']
        : ['Accumulates daily capacity revenue loss', 'Requires active order rerouting'],
    },
    delay_repair: {
      id: 'delay_repair',
      name: tertiaryStrategyName,
      badge: tertiaryBadge,
      badgeColor: tertiaryBadgeColor,
      totalExpectedCost: Math.round(drExpectedCost),
      repairCost: Math.round(drCatastrophicRepairCost * drFailureProb),
      downtimeLoss: Math.round(drDowntimeLoss * drFailureProb),
      downtimeHours: Number((drCatastrophicDowntimeHrs * drFailureProb).toFixed(1)),
      failureRiskPct: drFailureRisk,
      deliveryRiskPct: drDeliveryRisk,
      resilienceScore: drScore,
      recommendationRank: 3,
      pros: ['Zero immediate downtime today'],
      cons: ['Exponentially escalating failure risk', 'Potential 48h catastrophic outage', 'Severe financial penalty'],
    },
  };

  const bestId = primaryStrategyId;

  return {
    bestStrategyId: bestId,
    strategies,
    costSavingsVsDelay: Math.max(0, Math.round(drExpectedCost - strategies[bestId].totalExpectedCost)),
    severityFactor,
  };
}

const COLLABORATION_TIMELINE = [
  { step: 1, name: 'Planner Agent', code: 'PLN-01', action: 'Sub-Goal Decomposition', status: 'COMPLETE', time: '00:01s' },
  { step: 2, name: 'Production Agent', code: 'PRD-05', action: 'Schedule & SLA Rerouting', status: 'COMPLETE', time: '00:04s' },
  { step: 3, name: 'Vision AI Agent', code: 'VIS-08', action: '4K Thermal Optical Scan', status: 'COMPLETE', time: '00:08s' },
  { step: 4, name: 'Quality Agent', code: 'QLT-03', action: 'Surface Defect Profiling', status: 'COMPLETE', time: '00:12s' },
  { step: 5, name: 'Knowledge Agent', code: 'KNW-07', action: 'RAG Incident Lookup (INC-2024-089)', status: 'COMPLETE', time: '00:15s' },
  { step: 6, name: 'Supervisor Agent', code: 'SUP-10', action: 'Safety SOP & Final Consensus', status: 'CONVERGED', time: '00:18s' },
];

const NEXUS_AGENTS_BASE: Omit<AgentCard, 'liveMessage' | 'currentTask' | 'status' | 'confidence'>[] = [
  { id: 'planner', name: 'Planner Agent', code: 'PLN-01', role: 'Meta-Orchestration & Goal Decomposition', color: '#22D3EE', layer: 'ORCHESTRATION', description: 'Decomposes complex SCADA telemetry events into prioritized sub-goals and dispatches tasks to specialized sub-agents.', evidenceCount: 14 },
  { id: 'maintenance', name: 'Maintenance Agent', code: 'MNT-02', role: 'Machine Health & Wear Analytics', color: '#EF4444', layer: 'EVIDENCE', description: 'Calculates overall machine health scores, spindle bearing wear percentages, and computes empirical failure probabilities.', evidenceCount: 28 },
  { id: 'quality', name: 'Quality Agent', code: 'QLT-03', role: 'Vision Inspection & Defect Detection', color: '#6366F1', layer: 'EVIDENCE', description: 'Monitors 4K optical sensor cameras for micro-cracks, surface pitting, and part dimensional tolerance drift.', evidenceCount: 42 },
  { id: 'inventory', name: 'Inventory Agent', code: 'INV-04', role: 'Warehouse Bin Tracking & Parts Reservation', color: '#22C55E', layer: 'LOGISTICS', description: 'Queries warehouse ERP database to verify stock levels, part numbers, and bin locations for replacement components.', evidenceCount: 18 },
  { id: 'production', name: 'Production Agent', code: 'PRD-05', role: 'SLA Schedule & Assembly Line Rerouting', color: '#22D3EE', layer: 'LOGISTICS', description: 'Evaluates assembly line capacity, delivery SLA commitments, and calculates if a 4-hour stop can be absorbed.', evidenceCount: 31 },
  { id: 'optimization', name: 'Optimization Agent', code: 'OPT-06', role: 'Energy & Spindle Speed Tuning', color: '#6366F1', layer: 'OPTIMIZATION', description: 'Tunes machine motor power consumption, feed rates, and RPM targets for maximum energy efficiency.', evidenceCount: 22 },
  { id: 'knowledge', name: 'Knowledge RAG Agent', code: 'KNW-07', role: 'TF-IDF RAG Precedent Search', color: '#F59E0B', layer: 'KNOWLEDGE', description: 'Executes TF-IDF vector similarity search across 28,000+ historical plant incident logs to retrieve precedent cases.', evidenceCount: 89 },
  { id: 'vision', name: 'Vision AI Agent', code: 'VIS-08', role: 'Sub-Millimeter Optical Defect Profiler', color: '#6366F1', layer: 'VISION', description: 'Processes high-speed thermal vision feeds to locate micro-scale friction heat points before total failure.', evidenceCount: 56 },
  { id: 'rootcause', name: 'Root Cause Agent', code: 'RTC-09', role: 'Devil\'s Advocate Adversarial Audit', color: '#EF4444', layer: 'REFLECTION', description: 'Acts as an aggressive adversary to challenge early unproven proposals, high risk scores, or missing evidence attachments.', evidenceCount: 37 },
  { id: 'supervisor', name: 'Supervisor Agent', code: 'SUP-10', role: 'Plant Manager Final Convergence', color: '#22C55E', layer: 'GOVERNANCE', description: 'Synthesizes sub-agent proposals, verifies SOP compliance, and issues the binding final operational decision.', evidenceCount: 102 },
];

export default function DecisionTwinResult() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'factory' | 'agents' | 'quality' | 'maintenance' | 'inventory' | 'knowledge' | 'trace'>('dashboard');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('maintenance');
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'AGENT NEXUS AI', text: 'Welcome to Agent Nexus OS. All 10 autonomous factory agents are online and monitoring Bay B Line 2.', time: '06:10' }
  ]);
  const [userQuery, setUserQuery] = useState<string>('');

  // 🕒 LIVE SYSTEM CLOCK
  const [clockTime, setClockTime] = useState<string>('06:10:46');

  // SAFE SDK HOOK EXTRACTION
  let getToolOutputSafe: any = null;
  try {
    const sdk = useWidgetSDK();
    getToolOutputSafe = sdk?.getToolOutput;
  } catch (e) {
    // Gracefully handle standalone Next dev preview
  }

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // 🎛️ DYNAMIC SCADA TELEMETRY SIMULATOR INPUTS
  const [simMachineId, setSimMachineId] = useState<string>('M-004');
  const [simVibration, setSimVibration] = useState<number>(14.2);
  const [simTemp, setSimTemp] = useState<number>(108.5);
  const [simPressure, setSimPressure] = useState<number>(3.8);
  const [simProdLoad, setSimProdLoad] = useState<number>(100.0);
  const [simEventType, setSimEventType] = useState<'sensor_anomaly' | 'maintenance_alert' | 'quality_deviation' | 'nominal_monitoring'>('sensor_anomaly');

  // 🚀 SEQUENTIAL REASONING ORCHESTRATION EXPERIENCE STATE
  const [isOrchestrating, setIsOrchestrating] = useState<boolean>(false);
  const [orchestrationStep, setOrchestrationStep] = useState<number>(0);
  const [showConsensusModal, setShowConsensusModal] = useState<boolean>(false);

  // Knowledge RAG Search State
  const [ragSearchQuery, setRagSearchQuery] = useState<string>('Spindle bearing thermal runaway M-004');

  const rawData = getToolOutputSafe ? getToolOutputSafe<AgentNexusData>() : null;

  // COMPUTE REAL BACKEND STRATEGY COMPARISON METRICS FROM ScenarioSimulationAgent
  const simResults = calculateStrategyMetrics(simVibration, simTemp, simProdLoad);

  // 4 SPECIFIED PRESET SCENARIO BUTTONS
  const applyPreset = (preset: 'nominal' | 'bearing_wear' | 'thermal_runaway' | 'hydraulic_failure') => {
    if (preset === 'nominal') {
      setSimMachineId('M-001');
      setSimVibration(1.2);
      setSimTemp(48.2);
      setSimPressure(1.2);
      setSimProdLoad(94.0);
      setSimEventType('nominal_monitoring');
    } else if (preset === 'bearing_wear') {
      setSimMachineId('M-003');
      setSimVibration(6.8);
      setSimTemp(86.5);
      setSimPressure(2.1);
      setSimProdLoad(85.0);
      setSimEventType('maintenance_alert');
    } else if (preset === 'thermal_runaway') {
      setSimMachineId('M-004');
      setSimVibration(14.2);
      setSimTemp(108.5);
      setSimPressure(3.8);
      setSimProdLoad(100.0);
      setSimEventType('sensor_anomaly');
    } else if (preset === 'hydraulic_failure') {
      setSimMachineId('M-002');
      setSimVibration(4.1);
      setSimTemp(72.0);
      setSimPressure(4.5);
      setSimProdLoad(60.0);
      setSimEventType('quality_deviation');
    }
  };

  const isAlarm = simVibration > 7.5 || simTemp > 80 || simPressure > 3.5;
  const isWarning = !isAlarm && (simVibration > 3.5 || simTemp > 70 || simPressure > 2.5);
  const statusColor = isAlarm ? '#EF4444' : isWarning ? '#F59E0B' : '#22C55E';
  const convergedAction = simResults.bestStrategyId.toUpperCase();

  // LAUNCH LIVE SEQUENTIAL REASONING ORCHESTRATION ON RUN SIMULATION
  const handleRunSimulation = () => {
    setIsOrchestrating(true);
    setOrchestrationStep(1);
    setShowConsensusModal(false);
    setActiveTab('dashboard');

    let current = 1;
    const interval = setInterval(() => {
      current += 1;
      setOrchestrationStep(current);
      if (current >= 10) {
        clearInterval(interval);
        setTimeout(() => {
          setIsOrchestrating(false);
          setShowConsensusModal(true);
        }, 800);
      }
    }, 400);
  };

  // DYNAMICALLY GENERATED AGENT LIVE MESSAGES
  const nexusAgents: AgentCard[] = NEXUS_AGENTS_BASE.map((agent, index) => {
    const isAgentActive = !isOrchestrating || (index + 1 <= orchestrationStep);
    const isThinking = isOrchestrating && (index + 1 === orchestrationStep);

    let currentTask = '';
    let liveMessage = '';
    let status: AgentCard['status'] = isThinking ? 'THINKING' : isAgentActive ? 'COMPLETED' : 'ANALYZING';
    let confidence = isAgentActive ? (agent.id === 'supervisor' ? 96 : agent.id === 'maintenance' ? 92 : 94) : 80;

    if (isThinking) {
      currentTask = `Executing real-time inference for ${simMachineId}...`;
      liveMessage = `Analyzing SCADA telemetry stream (${simVibration}mm/s, ${simTemp}°C, ${simPressure}bar)...`;
    } else if (isAgentActive) {
      if (agent.id === 'planner') {
        currentTask = `Decomposed 6 execution sub-goals for ${simMachineId}`;
        liveMessage = `Processed ${simEventType} on Machine ${simMachineId}. Dispatched parallel goals.`;
      } else if (agent.id === 'maintenance') {
        currentTask = `Health Score assessment for ${simMachineId}`;
        liveMessage = isAlarm ? `CRITICAL ALARM: ${simVibration}mm/s vibration & ${simTemp}°C thermal runaway on ${simMachineId}.` : `Health score nominal (${Math.round(100 - simVibration * 5)}%).`;
      } else if (agent.id === 'quality') {
        currentTask = 'Analyzing optical surface roughness stream';
        liveMessage = `Optical surface roughness tolerance within limit (0.018μm).`;
      } else if (agent.id === 'inventory') {
        currentTask = 'Warehouse Bin stock verification';
        liveMessage = isAlarm ? `Reserved PART-BRG-409 at Warehouse B - Bin 14-C for ${simMachineId}.` : 'Parts in stock (14 units available).';
      } else if (agent.id === 'production') {
        currentTask = 'Assembly Line capacity rerouting';
        liveMessage = isAlarm ? '4-hour repair window absorbed without customer SLA delivery slip.' : 'Line 2 assembly capacity running at 94%.';
      } else if (agent.id === 'optimization') {
        currentTask = 'Power consumption tuning';
        liveMessage = 'Optimized motor power draw by 14.2% (420 kWh).';
      } else if (agent.id === 'knowledge') {
        currentTask = 'Searching 28,000+ incident logs';
        liveMessage = `Retrieved RAG precedent INC-2024-089 for ${simMachineId} (similarity = 0.406).`;
      } else if (agent.id === 'vision') {
        currentTask = '4K thermal imaging feed processing';
        liveMessage = isAlarm ? `Heatmap hotspot confirmed at Spindle Bearing Assembly #4 on ${simMachineId}.` : 'Thermal vision feed clear.';
      } else if (agent.id === 'rootcause') {
        currentTask = 'Devil\'s Advocate Round 1 challenge';
        liveMessage = isAlarm ? `Challenged initial repair proposal; verified telemetry proof in Round 2.` : 'Passed safety audit with 0 challenges.';
      } else {
        currentTask = 'Final consensus synthesis';
        liveMessage = `Converged on '${convergedAction}' with 0 Safety SOP Vetoes.`;
      }
    } else {
      currentTask = 'Waiting in agent dispatch queue...';
      liveMessage = 'Standby for orchestrator dispatch signal.';
    }

    return { ...agent, currentTask, liveMessage, status, confidence };
  });

  const selectedAgent = nexusAgents.find(a => a.id === selectedAgentId) || nexusAgents[1];

  const handleSendChat = () => {
    if (!userQuery.trim()) return;
    const newMsg = { sender: 'OPERATOR', text: userQuery, time: new Date().toLocaleTimeString().slice(0, 5) };
    setChatMessages(prev => [...prev, newMsg]);
    setUserQuery('');

    setTimeout(() => {
      let reply = `Agent Nexus OS Analysis for Machine ${simMachineId}: Event Type '${simEventType}' with Vibration ${simVibration} mm/s, Bearing Temp ${simTemp}°C, Pressure ${simPressure} bar, and Load ${simProdLoad}%. Strategy '${simResults.strategies[simResults.bestStrategyId].name}' recommended. Cost Savings vs Delay: $${simResults.costSavingsVsDelay.toLocaleString()}.`;
      setChatMessages(prev => [...prev, { sender: 'AGENT NEXUS AI', text: reply, time: new Date().toLocaleTimeString().slice(0, 5) }]);
    }, 600);
  };

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#070B14',
      color: '#E8EAF0',
      minHeight: '100vh',
      display: 'flex',
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 25px 80px rgba(0, 0, 0, 0.95), 0 0 40px rgba(34, 211, 238, 0.15)',
    }}>
      
      {/* CSS STYLES & CYBER-INDUSTRIAL ANIMATIONS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=JetBrains+Mono:wght@500;700;800&display=swap');

        .nexus-font-headline { fontFamily: 'Space Grotesk', -apple-system, sans-serif; }
        .nexus-font-mono { fontFamily: 'JetBrains Mono', ui-monospace, Consolas, monospace; font-variant-numeric: tabular-nums; }
        
        .nexus-card {
          background: #101826;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          backdrop-filter: blur(12px);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nexus-card:hover {
          border-color: rgba(34, 211, 238, 0.35);
          box-shadow: 0 8px 30px rgba(34, 211, 238, 0.12);
        }

        @keyframes pulseGlowRed {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
          70% { box-shadow: 0 0 0 14px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        @keyframes scanBeam {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 0.4; }
          100% { top: 0%; opacity: 0.8; }
        }

        @keyframes agentThinkingPulse {
          0% { border-color: rgba(34, 211, 238, 0.4); box-shadow: 0 0 10px rgba(34, 211, 238, 0.3); }
          50% { border-color: rgba(34, 211, 238, 1); box-shadow: 0 0 25px rgba(34, 211, 238, 0.7); }
          100% { border-color: rgba(34, 211, 238, 0.4); box-shadow: 0 0 10px rgba(34, 211, 238, 0.3); }
        }
      `}</style>

      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <aside style={{
        width: 255,
        background: '#0B111E',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 16px',
        flexShrink: 0,
      }}>
        {/* LOGO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30, paddingLeft: 4 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #22D3EE 0%, #6366F1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(34, 211, 238, 0.5)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#070B14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="nexus-font-headline" style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC', letterSpacing: -0.3 }}>
              AGENT NEXUS
            </div>
            <div className="nexus-font-mono" style={{ fontSize: 10, color: '#22D3EE', letterSpacing: 1.2, fontWeight: 700 }}>
              FACTORY OS v2.4
            </div>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'factory', label: 'Factory Twin Map', icon: '🏭' },
            { id: 'agents', label: 'Multi-Agent Center', icon: '🤖', badge: '10' },
            { id: 'quality', label: 'Quality Control', icon: '👁️' },
            { id: 'maintenance', label: 'Predictive Maint.', icon: '⚡' },
            { id: 'inventory', label: 'Inventory Bin', icon: '📦' },
            { id: 'knowledge', label: 'Knowledge RAG', icon: '🧠' },
            { id: 'trace', label: 'System Trace Log', icon: '📜' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 8,
                background: activeTab === item.id ? 'linear-gradient(90deg, rgba(34, 211, 238, 0.15) 0%, rgba(99, 102, 241, 0.08) 100%)' : 'transparent',
                border: '1px solid',
                borderColor: activeTab === item.id ? 'rgba(34, 211, 238, 0.35)' : 'transparent',
                color: activeTab === item.id ? '#22D3EE' : '#94A3B8',
                fontSize: 14,
                fontWeight: activeTab === item.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="nexus-font-mono" style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'rgba(34, 211, 238, 0.2)',
                  color: '#22D3EE',
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* FOOTER METRICS */}
        <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>SYSTEM TELEMETRY</div>
          <div className="nexus-font-mono" style={{ fontSize: 11, color: '#22C55E', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px #22C55E' }} />
            UPTIME: 99.98% (14ms)
          </div>
          <div className="nexus-font-mono" style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 4 }}>
            MODEL: NITROSTACK DUAL MCP
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        
        {/* 2. TOP STATUS CONTROL ROOM BAR */}
        <header style={{
          height: 65,
          background: '#0B111E',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* LIVE SYSTEM CLOCK */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="nexus-font-mono" style={{ fontSize: 11, color: '#64748B' }}>UTC TIME:</span>
              <span className="nexus-font-mono" style={{ fontSize: 13, fontWeight: 800, color: '#22D3EE', background: '#101826', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(34, 211, 238, 0.3)' }}>
                {clockTime}
              </span>
            </div>

            {/* FACTORY STATUS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="nexus-font-mono" style={{ fontSize: 11, color: '#64748B', letterSpacing: 1 }}>STATUS:</span>
              <span className="nexus-font-mono" style={{ fontSize: 12, fontWeight: 800, color: statusColor, padding: '4px 10px', borderRadius: 4, background: isAlarm ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)', border: `1px solid ${statusColor}`, animation: isAlarm ? 'pulseGlowRed 2s infinite' : 'none' }}>
                {isAlarm ? '🔴 CRITICAL ANOMALY DETECTED' : isWarning ? '⚠️ WARNING LEVEL ELEVATED' : '🟢 ALL LINES NOMINAL'}
              </span>
            </div>

            {/* SENSORS & AGENTS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="nexus-font-mono" style={{ fontSize: 11, color: '#64748B' }}>SENSORS:</span>
              <span className="nexus-font-mono" style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>48 CONNECTED</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="nexus-font-mono" style={{ fontSize: 11, color: '#64748B' }}>AGENTS:</span>
              <span className="nexus-font-mono" style={{ fontSize: 12, fontWeight: 800, color: '#22C55E' }}>10/10 REASONING</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                border: '1px solid rgba(34, 211, 238, 0.4)',
                color: '#22D3EE',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              className="nexus-font-mono"
            >
              💬 DOCKED AI ASSISTANT
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #22D3EE 0%, #6366F1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#070B14' }}>
                AN
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>Agent Nexus</div>
                <div className="nexus-font-mono" style={{ fontSize: 10, color: '#22D3EE', fontWeight: 700 }}>SYSTEM OPERATOR</div>
              </div>
            </div>
          </div>
        </header>

        {/* 3. LANDING DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div style={{ padding: 24, overflowY: 'auto' }}>
            
            {/* HERO COMMAND CENTER BANNER */}
            <div className="nexus-card" style={{
              padding: 24,
              background: 'linear-gradient(135deg, rgba(16, 24, 38, 0.95) 0%, rgba(34, 211, 238, 0.1) 50%, rgba(99, 102, 241, 0.12) 100%)',
              border: '1px solid rgba(34, 211, 238, 0.4)',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="nexus-font-mono" style={{ fontSize: 10.5, fontWeight: 800, color: '#22D3EE', letterSpacing: 1.5, marginBottom: 6 }}>
                    AUTONOMOUS MANUFACTURING DECISION TWIN AI OPERATING SYSTEM
                  </div>
                  <h1 className="nexus-font-headline" style={{ fontSize: 26, fontWeight: 800, color: '#F8FAFC', margin: '0 0 8px', letterSpacing: -0.5 }}>
                    Enterprise Decision Twin AI Command Center
                  </h1>
                  <p style={{ margin: 0, fontSize: 13.5, color: '#94A3B8', maxWidth: 760, lineHeight: 1.5 }}>
                    Coordinate 10 autonomous AI agents in real time across predictive telemetry, failure risk scoring, financial downtime modeling, warehouse inventory, and SOP safety interlocks.
                  </p>
                </div>
                
                <div className="nexus-card" style={{ padding: '10px 16px', background: '#0B111E', border: '1px solid #22C55E', textAlign: 'right' }}>
                  <div className="nexus-font-mono" style={{ fontSize: 9.5, color: '#64748B' }}>LIVE AI REASONING STREAM</div>
                  <div className="nexus-font-mono" style={{ fontSize: 12, fontWeight: 800, color: '#22C55E', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 10px #22C55E' }} />
                    10 AGENTS ACTIVE
                  </div>
                </div>
              </div>
            </div>

            {/* ⚡ PRIMARY LIVE TELEMETRY SIMULATOR — IMMEDIATELY BELOW HERO SECTION */}
            <div className="nexus-card" style={{ padding: 20, border: '2px solid #22D3EE', background: '#0B111E', boxShadow: '0 0 30px rgba(34, 211, 238, 0.25)', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="nexus-font-mono" style={{ fontSize: 12, fontWeight: 800, color: '#22D3EE', letterSpacing: 1 }}>
                    ⚡ PRIMARY LIVE TELEMETRY SIMULATOR (DEMO CONTROL CENTER)
                  </span>
                  <span className="nexus-font-mono" style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(34, 211, 238, 0.2)', color: '#22D3EE', fontWeight: 800 }}>
                    ABOVE THE FOLD
                  </span>
                </div>

                {/* 4 SPECIFIED PRESET BUTTONS */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => applyPreset('nominal')} className="nexus-font-mono" style={{ padding: '6px 12px', fontSize: 11, fontWeight: 800, background: 'rgba(34, 197, 94, 0.2)', color: '#22C55E', border: '1px solid #22C55E', borderRadius: 6, cursor: 'pointer' }}>
                    🟢 Nominal
                  </button>
                  <button onClick={() => applyPreset('bearing_wear')} className="nexus-font-mono" style={{ padding: '6px 12px', fontSize: 11, fontWeight: 800, background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', border: '1px solid #F59E0B', borderRadius: 6, cursor: 'pointer' }}>
                    ⚠️ Bearing Wear
                  </button>
                  <button onClick={() => applyPreset('thermal_runaway')} className="nexus-font-mono" style={{ padding: '6px 12px', fontSize: 11, fontWeight: 800, background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', border: '1px solid #EF4444', borderRadius: 6, cursor: 'pointer' }}>
                    🚨 Thermal Runaway
                  </button>
                  <button onClick={() => applyPreset('hydraulic_failure')} className="nexus-font-mono" style={{ padding: '6px 12px', fontSize: 11, fontWeight: 800, background: 'rgba(99, 102, 241, 0.2)', color: '#6366F1', border: '1px solid #6366F1', borderRadius: 6, cursor: 'pointer' }}>
                    ⚡ Hydraulic Failure
                  </button>
                </div>
              </div>

              {/* 6 SPECIFIED TELEMETRY INPUTS + RUN SIMULATION BUTTON */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr 1fr 1fr 1fr 1.4fr', gap: 10, alignItems: 'center' }}>
                <div>
                  <label className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 4 }}>MACHINE ID:</label>
                  <input type="text" value={simMachineId} onChange={(e) => setSimMachineId(e.target.value)} className="nexus-font-mono" style={{ width: '100%', background: '#101826', border: '1px solid #22D3EE', color: '#22D3EE', padding: '8px 10px', borderRadius: 6, fontSize: 12.5, fontWeight: 800 }} />
                </div>

                <div>
                  <label className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 4 }}>EVENT TYPE:</label>
                  <select value={simEventType} onChange={(e) => setSimEventType(e.target.value as any)} className="nexus-font-mono" style={{ width: '100%', background: '#101826', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#F8FAFC', padding: '8px 6px', borderRadius: 6, fontSize: 11 }}>
                    <option value="sensor_anomaly">sensor_anomaly</option>
                    <option value="maintenance_alert">maintenance_alert</option>
                    <option value="quality_deviation">quality_deviation</option>
                    <option value="nominal_monitoring">nominal_monitoring</option>
                  </select>
                </div>

                <div>
                  <label className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 4 }}>TEMP (°C):</label>
                  <input type="number" step="0.5" value={simTemp} onChange={(e) => setSimTemp(parseFloat(e.target.value) || 0)} className="nexus-font-mono" style={{ width: '100%', background: '#101826', border: '1px solid rgba(255, 255, 255, 0.15)', color: simTemp > 80 ? '#EF4444' : simTemp > 70 ? '#F59E0B' : '#22C55E', padding: '8px 10px', borderRadius: 6, fontSize: 12.5, fontWeight: 800 }} />
                </div>

                <div>
                  <label className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 4 }}>VIBRATION (mm/s):</label>
                  <input type="number" step="0.1" value={simVibration} onChange={(e) => setSimVibration(parseFloat(e.target.value) || 0)} className="nexus-font-mono" style={{ width: '100%', background: '#101826', border: '1px solid rgba(255, 255, 255, 0.15)', color: simVibration > 7.5 ? '#EF4444' : simVibration > 3.5 ? '#F59E0B' : '#22C55E', padding: '8px 10px', borderRadius: 6, fontSize: 12.5, fontWeight: 800 }} />
                </div>

                <div>
                  <label className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 4 }}>PRESSURE (bar):</label>
                  <input type="number" step="0.1" value={simPressure} onChange={(e) => setSimPressure(parseFloat(e.target.value) || 0)} className="nexus-font-mono" style={{ width: '100%', background: '#101826', border: '1px solid rgba(255, 255, 255, 0.15)', color: simPressure > 3.5 ? '#EF4444' : '#F8FAFC', padding: '8px 10px', borderRadius: 6, fontSize: 12.5, fontWeight: 800 }} />
                </div>

                <div>
                  <label className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 4 }}>PROD LOAD (%):</label>
                  <input type="number" step="5" value={simProdLoad} onChange={(e) => setSimProdLoad(parseFloat(e.target.value) || 0)} className="nexus-font-mono" style={{ width: '100%', background: '#101826', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#22D3EE', padding: '8px 10px', borderRadius: 6, fontSize: 12.5, fontWeight: 800 }} />
                </div>

                <button
                  onClick={handleRunSimulation}
                  className="nexus-font-mono"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #22D3EE 0%, #0284C7 100%)',
                    border: 'none',
                    color: '#070B14',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(34, 211, 238, 0.5)',
                  }}
                >
                  ⚡ RUN SIMULATION
                </button>
              </div>
            </div>

            {/* LIVE KPI WIDGET CARDS WITH SPARKLINE CHARTS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: "TODAY'S PRODUCTION", val: '14,280', unit: 'UNITS', trend: '+4.2%', color: '#22D3EE', spark: [12, 14, 13, 16, 18, 20] },
                { label: 'MACHINE HEALTH', val: `${Math.max(10, Math.round(100 - (simVibration * 5 + simTemp * 0.4)))}%`, unit: simMachineId, trend: isAlarm ? 'CRITICAL' : 'NOMINAL', color: statusColor, spark: [95, 88, 72, 54, 42, Math.max(10, Math.round(100 - (simVibration * 5 + simTemp * 0.4)))] },
                { label: 'ACTIVE ALERTS', val: isAlarm ? '1' : '0', unit: isAlarm ? 'CRITICAL' : 'OK', trend: simMachineId, color: statusColor, spark: [0, 0, 0, 1, 1, isAlarm ? 1 : 0] },
                { label: 'DEFECT RATE', val: '0.42%', unit: 'SCRAP', trend: '-0.12%', color: '#22C55E', spark: [0.8, 0.6, 0.5, 0.45, 0.42, 0.42] },
                { label: 'ENERGY DRAW', val: '420', unit: 'kWh', trend: 'OPT', color: '#6366F1', spark: [380, 410, 430, 425, 418, 420] },
                { label: 'OEE SCORE', val: '88.4%', unit: 'OVERALL', trend: '+2.1%', color: '#22D3EE', spark: [84, 85, 86, 87.5, 88, 88.4] },
              ].map((kpi, idx) => (
                <div key={idx} className="nexus-card" style={{ padding: 16 }}>
                  <div className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B', letterSpacing: 0.5 }}>{kpi.label}</div>
                  <div className="nexus-font-mono" style={{ fontSize: 24, fontWeight: 800, color: kpi.color, marginTop: 4 }}>{kpi.val}</div>
                  
                  {/* MINI SVG SPARKLINE */}
                  <svg viewBox="0 0 100 20" style={{ width: '100%', height: 18, margin: '6px 0 4px' }}>
                    <path d={`M ${kpi.spark.map((v, i) => `${i * 20} ${20 - (v / Math.max(...kpi.spark)) * 16}`).join(' L ')}`} fill="none" stroke={kpi.color} strokeWidth="2" />
                  </svg>

                  <div className="nexus-font-mono" style={{ fontSize: 10, color: '#94A3B8', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{kpi.unit}</span>
                    <span style={{ color: kpi.color }}>{kpi.trend}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 🎯 REAL BACKEND SCENARIO SIMULATION AGENT STRATEGY DECISION COMPARISON COMPONENT */}
            <div className="nexus-card" style={{ padding: 24, marginBottom: 24, border: '1px solid rgba(34, 211, 238, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <div className="nexus-font-mono" style={{ fontSize: 11, fontWeight: 800, color: '#22D3EE', letterSpacing: 1 }}>
                    REAL BACKEND DECISION MATRIX · SCENARIO SIMULATION AGENT
                  </div>
                  <div className="nexus-font-headline" style={{ fontSize: 20, fontWeight: 800, color: '#F8FAFC', marginTop: 2 }}>
                    3-Strategy Quantitative Operational Trade-Off Analysis
                  </div>
                </div>
                <div className="nexus-font-mono" style={{ fontSize: 12, fontWeight: 800, color: '#22C55E', padding: '6px 14px', borderRadius: 6, background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22C55E' }}>
                  SAVINGS VS DELAY: +${simResults.costSavingsVsDelay.toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {Object.values(simResults.strategies).map((strat) => {
                  const isBest = strat.id === simResults.bestStrategyId;
                  return (
                    <div
                      key={strat.id}
                      style={{
                        padding: 18,
                        background: isBest ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(16, 24, 38, 0.9) 100%)' : '#0B111E',
                        border: '1px solid',
                        borderColor: isBest ? '#22C55E' : 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span className="nexus-font-mono" style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', background: strat.badgeColor, color: strat.badgeColor === '#22C55E' ? '#070B14' : '#F8FAFC', borderRadius: 4 }}>
                          {strat.badge}
                        </span>
                        <span className="nexus-font-mono" style={{ fontSize: 11, fontWeight: 800, color: strat.badgeColor }}>
                          RESILIENCE: {strat.resilienceScore}/100
                        </span>
                      </div>

                      <div className="nexus-font-headline" style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC', marginBottom: 12, height: 42 }}>
                        {strat.name}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 10, background: '#101826', borderRadius: 6, marginBottom: 12 }}>
                        <div>
                          <div className="nexus-font-mono" style={{ fontSize: 9.5, color: '#64748B' }}>TOTAL COST:</div>
                          <div className="nexus-font-mono" style={{ fontSize: 15, fontWeight: 800, color: strat.badgeColor }}>${strat.totalExpectedCost.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="nexus-font-mono" style={{ fontSize: 9.5, color: '#64748B' }}>FAILURE RISK:</div>
                          <div className="nexus-font-mono" style={{ fontSize: 15, fontWeight: 800, color: strat.failureRiskPct > 30 ? '#EF4444' : strat.failureRiskPct > 10 ? '#F59E0B' : '#22C55E' }}>{strat.failureRiskPct}%</div>
                        </div>
                      </div>

                      <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>
                        <strong style={{ color: '#22C55E' }}>PROS:</strong> {strat.pros.join(', ')}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        <strong style={{ color: '#EF4444' }}>CONS:</strong> {strat.cons.join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AGENT COLLABORATION WORKFLOW TIMELINE */}
            <div className="nexus-card" style={{ padding: 22, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <div className="nexus-font-mono" style={{ fontSize: 11, fontWeight: 800, color: '#22D3EE', letterSpacing: 1 }}>
                    AGENT COLLABORATION WORKFLOW TIMELINE
                  </div>
                  <div className="nexus-font-headline" style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', marginTop: 2 }}>
                    Sequential Autonomous Decision Consensus
                  </div>
                </div>
                <span className="nexus-font-mono" style={{ fontSize: 11, color: '#22C55E', padding: '4px 10px', borderRadius: 4, background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22C55E' }}>
                  CONVERGED IN 00:18s
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                {COLLABORATION_TIMELINE.map((item) => (
                  <div key={item.step} style={{ padding: 14, background: '#0B111E', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 8, textAlign: 'center' }}>
                    <div className="nexus-font-mono" style={{ width: 26, height: 26, borderRadius: '50%', background: '#22D3EE', color: '#070B14', fontSize: 12, fontWeight: 800, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.step}
                    </div>
                    <div className="nexus-font-mono" style={{ fontSize: 11, fontWeight: 800, color: '#F8FAFC' }}>{item.code}</div>
                    <div className="nexus-font-mono" style={{ fontSize: 9.5, color: '#22D3EE', marginTop: 3 }}>{item.action}</div>
                    <div className="nexus-font-mono" style={{ fontSize: 9, color: '#64748B', marginTop: 4 }}>{item.time}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* 4. MULTI-AGENT CENTER VIEW */}
        {activeTab === 'agents' && (
          <div style={{ padding: 24, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div className="nexus-font-mono" style={{ fontSize: 11, fontWeight: 800, color: '#22D3EE', letterSpacing: 1 }}>
                  HERO FEATURE · AUTONOMOUS AGENT ORCHESTRATION ENGINE
                </div>
                <h2 className="nexus-font-headline" style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', margin: '4px 0 0' }}>
                  Multi-Agent Center (10 Active Factory AI Agents)
                </h2>
              </div>

              <button
                onClick={handleRunSimulation}
                className="nexus-font-mono"
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #22D3EE 0%, #0284C7 100%)',
                  border: 'none',
                  color: '#070B14',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(34, 211, 238, 0.4)',
                }}
              >
                {isOrchestrating ? `🔄 REASONING... STEP ${orchestrationStep}/10` : '⚡ RUN REASONING ORCHESTRATION'}
              </button>
            </div>

            {/* 10 AGENT FUTURISTIC CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
              {nexusAgents.map((agent, index) => {
                const isSelected = selectedAgentId === agent.id;
                const isThinking = agent.status === 'THINKING';

                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className="nexus-card"
                    style={{
                      padding: 16,
                      cursor: 'pointer',
                      borderColor: isThinking ? '#22D3EE' : isSelected ? '#22D3EE' : 'rgba(255, 255, 255, 0.08)',
                      boxShadow: isThinking ? '0 0 25px rgba(34, 211, 238, 0.5)' : isSelected ? '0 0 24px rgba(34, 211, 238, 0.25)' : 'none',
                      animation: isThinking ? 'agentThinkingPulse 1s infinite' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span className="nexus-font-mono" style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', background: agent.color, color: '#070B14', borderRadius: 4 }}>
                        {agent.code}
                      </span>
                      <span className="nexus-font-mono" style={{ fontSize: 10, color: isThinking ? '#22D3EE' : '#22C55E', fontWeight: 700 }}>
                        {isThinking ? 'THINKING...' : `${agent.confidence}% CONF`}
                      </span>
                    </div>

                    <div className="nexus-font-headline" style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC', marginBottom: 6 }}>
                      {agent.name}
                    </div>

                    <div className="nexus-font-mono" style={{ fontSize: 9.5, color: '#64748B', marginBottom: 10, height: 28, overflow: 'hidden' }}>
                      {agent.role}
                    </div>

                    <div style={{ padding: 8, background: '#0B111E', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div className="nexus-font-mono" style={{ fontSize: 9, color: '#22D3EE', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                        <span>LIVE MESSAGE:</span>
                        <span>{agent.evidenceCount} EVIDENCE</span>
                      </div>
                      <div className="nexus-font-body" style={{ fontSize: 11, color: '#94A3B8', marginTop: 3, lineHeight: 1.35, height: 38, overflow: 'hidden' }}>
                        {agent.liveMessage}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DETAILED AGENT INSPECTOR */}
            <div className="nexus-card" style={{ padding: 24, border: '1px solid #22D3EE' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="nexus-font-mono" style={{ fontSize: 12, fontWeight: 800, padding: '6px 12px', background: selectedAgent.color, color: '#070B14', borderRadius: 4 }}>
                    {selectedAgent.code}
                  </span>
                  <h3 className="nexus-font-headline" style={{ fontSize: 20, fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                    {selectedAgent.name}
                  </h3>
                  <span className="nexus-font-mono" style={{ fontSize: 11, color: '#64748B', padding: '4px 10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    LAYER: {selectedAgent.layer}
                  </span>
                </div>
                <span className="nexus-font-mono" style={{ fontSize: 12, color: '#22C55E', fontWeight: 800 }}>
                  EVIDENCE ATTACHMENTS: {selectedAgent.evidenceCount} ITEMS
                </span>
              </div>

              <p style={{ margin: '0 0 18px', fontSize: 14.5, color: '#94A3B8', lineHeight: 1.5 }}>
                {selectedAgent.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, background: '#0B111E', padding: 18, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div>
                  <div className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>CURRENT TASK EXECUTING</div>
                  <div className="nexus-font-mono" style={{ fontSize: 12.5, color: '#F8FAFC', fontWeight: 700 }}>{selectedAgent.currentTask}</div>
                </div>
                <div>
                  <div className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>LIVE MESSAGE STREAM</div>
                  <div className="nexus-font-mono" style={{ fontSize: 12.5, color: '#22D3EE', fontWeight: 700 }}>{selectedAgent.liveMessage}</div>
                </div>
                <div>
                  <div className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>OPERATIONAL STATUS</div>
                  <div className="nexus-font-mono" style={{ fontSize: 12.5, color: '#22C55E', fontWeight: 800 }}>{selectedAgent.status}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. FACTORY TWIN MAP VIEW */}
        {activeTab === 'factory' && (
          <div style={{ padding: 24, overflowY: 'auto' }}>
            <div className="nexus-font-mono" style={{ fontSize: 11, fontWeight: 800, color: '#22D3EE', letterSpacing: 1, marginBottom: 4 }}>
              FACTORY TWIN INTERACTIVE MAP (BAY B - LINE 2)
            </div>
            <h2 className="nexus-font-headline" style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', margin: '0 0 18px' }}>
              Real-time Machine Status & Sensor Connectivity
            </h2>

            <div className="nexus-card" style={{ padding: 24, marginBottom: 20 }}>
              <svg viewBox="0 0 800 300" style={{ width: '100%', height: 'auto', background: '#070B14', borderRadius: 8 }}>
                <rect width="800" height="300" fill="#070B14" />
                <line x1="200" y1="90" x2="250" y2="90" stroke="#22D3EE" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="550" y1="90" x2="600" y2="90" stroke="#22D3EE" strokeWidth="2" strokeDasharray="4 4" />

                <rect x="250" y="40" width="300" height="150" fill={isAlarm ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'} stroke={statusColor} strokeWidth="2" rx="8" />
                <text x="270" y="70" fill={statusColor} fontSize="14" fontWeight="bold" fontFamily="monospace">CNC MILLING CENTER #{simMachineId}</text>
                <circle cx="340" cy="120" r="25" fill={isAlarm ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'} stroke={statusColor} strokeWidth="2" style={{ animation: isAlarm ? 'pulseGlowRed 1.5s infinite' : 'none' }} />
                <circle cx="340" cy="120" r="10" fill={statusColor} />
                <text x="380" y="115" fill="#F8FAFC" fontSize="13" fontWeight="bold" fontFamily="monospace">Vibration: {simVibration} mm/s</text>
                <text x="380" y="135" fill={statusColor} fontSize="12" fontFamily="monospace">Bearing Temp: {simTemp}°C ({isAlarm ? 'ALARM' : 'OK'})</text>

                <rect x="40" y="40" width="160" height="100" fill="#101826" stroke="#22C55E" strokeWidth="1.5" rx="6" />
                <text x="55" y="65" fill="#22C55E" fontSize="12" fontWeight="bold" fontFamily="monospace">PRESS #1 (M-001)</text>
                <text x="55" y="85" fill="#94A3B8" fontSize="10.5" fontFamily="monospace">Status: Running (94%)</text>

                <rect x="600" y="40" width="160" height="100" fill="#101826" stroke="#22D3EE" strokeWidth="1.5" rx="6" />
                <text x="615" y="65" fill="#22D3EE" fontSize="12" fontWeight="bold" fontFamily="monospace">WH B BIN 14-C</text>
                <text x="615" y="85" fill="#94A3B8" fontSize="10.5" fontFamily="monospace">PART-BRG-409 (Reserved)</text>
              </svg>
            </div>
          </div>
        )}

        {/* 6. QUALITY CONTROL TAB */}
        {activeTab === 'quality' && (
          <div style={{ padding: 24, overflowY: 'auto' }}>
            <div className="nexus-font-mono" style={{ fontSize: 11, fontWeight: 800, color: '#22D3EE', letterSpacing: 1, marginBottom: 4 }}>
              VISION AI QUALITY CONTROL & OPTICAL SCANNER
            </div>
            <h2 className="nexus-font-headline" style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', margin: '0 0 18px' }}>
              Sub-Millimeter Optical Surface Inspection
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18, marginBottom: 20 }}>
              <div className="nexus-card" style={{ padding: 20 }}>
                <div className="nexus-font-mono" style={{ fontSize: 12, fontWeight: 800, color: '#6366F1', marginBottom: 12 }}>
                  📷 LIVE 4K OPTICAL CAMERA STREAM (LINE 2 SCANNER)
                </div>
                <div style={{ height: 240, background: '#050811', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', width: '100%', height: 3, background: 'linear-gradient(90deg, transparent 0%, #6366F1 50%, transparent 100%)', boxShadow: '0 0 15px #6366F1', animation: 'scanBeam 3s infinite linear' }} />
                  
                  <div style={{ width: 150, height: 150, borderRadius: '50%', border: '2px strokeDasharray 4 4 #6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: isAlarm ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)', border: `2px solid ${statusColor}`, animation: isAlarm ? 'pulseGlowRed 1.5s infinite' : 'none' }} />
                  </div>
                  <div className="nexus-font-mono" style={{ fontSize: 11, color: statusColor, marginTop: 12, fontWeight: 800 }}>
                    {isAlarm ? 'HOTSPOT DETECTED: SPINDLE BEARING SURFACE WEAR (0.042mm DRIFT)' : 'OPTICAL SCAN CLEAR: 0 SURFACE DEFECTS DETECTED'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateRows: 'repeat(3, 1fr)', gap: 12 }}>
                <div className="nexus-card" style={{ padding: 16 }}>
                  <div className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B' }}>OPTICAL DEFECT CONFIDENCE</div>
                  <div className="nexus-font-mono" style={{ fontSize: 24, fontWeight: 800, color: '#6366F1', marginTop: 2 }}>95.4%</div>
                  <div className="nexus-font-mono" style={{ fontSize: 10, color: '#22C55E' }}>0 REJECTS IN LAST 500 UNITS</div>
                </div>

                <div className="nexus-card" style={{ padding: 16 }}>
                  <div className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B' }}>SURFACE ROUGHNESS (Ra)</div>
                  <div className="nexus-font-mono" style={{ fontSize: 24, fontWeight: 800, color: '#22D3EE', marginTop: 2 }}>0.018 μm</div>
                  <div className="nexus-font-mono" style={{ fontSize: 10, color: '#22C55E' }}>WITHIN TOLERANCE (LIMIT 0.025 μm)</div>
                </div>

                <div className="nexus-card" style={{ padding: 16 }}>
                  <div className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B' }}>TOTAL INSPECTED TODAY</div>
                  <div className="nexus-font-mono" style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', marginTop: 2 }}>14,280</div>
                  <div className="nexus-font-mono" style={{ fontSize: 10, color: '#22C55E' }}>99.58% PASS RATE</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. PREDICTIVE MAINTENANCE TAB */}
        {activeTab === 'maintenance' && (
          <div style={{ padding: 24, overflowY: 'auto' }}>
            <div className="nexus-font-mono" style={{ fontSize: 11, fontWeight: 800, color: '#22D3EE', letterSpacing: 1, marginBottom: 4 }}>
              PREDICTIVE MAINTENANCE & REMAINING USEFUL LIFE (RUL)
            </div>
            <h2 className="nexus-font-headline" style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', margin: '0 0 18px' }}>
              Machine Health & Bearing Fatigue Telemetry
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
              {[
                { id: simMachineId, name: `CNC Mill #${simMachineId}`, health: Math.max(10, Math.round(100 - (simVibration * 5 + simTemp * 0.4))), vib: `${simVibration} mm/s`, temp: `${simTemp}°C`, rul: isAlarm ? '14 Hours' : '850 Hours', status: isAlarm ? 'CRITICAL' : 'NOMINAL', color: statusColor },
                { id: 'M-003', name: 'Lathe #3', health: 52, vib: '6.8 mm/s', temp: '86.5°C', rul: '48 Hours', status: 'WARNING', color: '#F59E0B' },
                { id: 'M-002', name: 'Robotic Arm #2', health: 68, vib: '4.1 mm/s', temp: '72.0°C', rul: '120 Hours', status: 'DEGRADED', color: '#F59E0B' },
                { id: 'M-001', name: 'Stamping Press #1', health: 94, vib: '1.2 mm/s', temp: '48.2°C', rul: '1,450 Hours', status: 'NOMINAL', color: '#22C55E' },
              ].map((m) => (
                <div key={m.id} className="nexus-card" style={{ padding: 18, border: `1px solid ${m.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="nexus-font-mono" style={{ fontSize: 11, fontWeight: 800, color: m.color }}>{m.id}</span>
                    <span className="nexus-font-mono" style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: m.color, color: '#070B14', fontWeight: 800 }}>{m.status}</span>
                  </div>
                  <div className="nexus-font-headline" style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC' }}>{m.name}</div>
                  
                  <div style={{ margin: '12px 0', padding: 10, background: '#0B111E', borderRadius: 6 }}>
                    <div className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B' }}>REMAINING USEFUL LIFE (RUL):</div>
                    <div className="nexus-font-mono" style={{ fontSize: 16, fontWeight: 800, color: m.color, marginTop: 2 }}>{m.rul}</div>
                  </div>

                  <div className="nexus-font-mono" style={{ fontSize: 10.5, color: '#94A3B8' }}>Vib: {m.vib} | Temp: {m.temp}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. INVENTORY BIN TAB */}
        {activeTab === 'inventory' && (
          <div style={{ padding: 24, overflowY: 'auto' }}>
            <div className="nexus-font-mono" style={{ fontSize: 11, fontWeight: 800, color: '#22D3EE', letterSpacing: 1, marginBottom: 4 }}>
              WAREHOUSE INVENTORY & REPLACEMENT PARTS
            </div>
            <h2 className="nexus-font-headline" style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', margin: '0 0 18px' }}>
              Spare Parts Stock & Bin Locations
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { part: 'PART-BRG-409', name: 'Class P4 Spindle Bearing Set', bin: 'Warehouse B - Bin 14-C', stock: 2, status: `RESERVED FOR ${simMachineId}`, color: '#22D3EE' },
                { part: 'PART-SEAL-201', name: 'High-Temp Hydraulic Seals', bin: 'Warehouse A - Bin 08-A', stock: 14, status: 'AVAILABLE', color: '#22C55E' },
                { part: 'PART-PLC-900', name: 'Siemens S7-1500 PLC Board', bin: 'Warehouse B - Bin 02-F', stock: 1, status: 'LOW STOCK WARNING', color: '#F59E0B' },
              ].map((p, idx) => (
                <div key={idx} className="nexus-card" style={{ padding: 18 }}>
                  <div className="nexus-font-mono" style={{ fontSize: 11, fontWeight: 800, color: p.color }}>{p.part}</div>
                  <div className="nexus-font-headline" style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC', margin: '6px 0 10px' }}>{p.name}</div>
                  <div className="nexus-font-mono" style={{ fontSize: 11, color: '#94A3B8' }}><strong>Location:</strong> {p.bin}</div>
                  <div className="nexus-font-mono" style={{ fontSize: 11, color: '#22C55E', marginTop: 4 }}><strong>In Stock:</strong> {p.stock} Units</div>
                  <div className="nexus-font-mono" style={{ fontSize: 10, padding: '4px 8px', background: '#0B111E', color: p.color, borderRadius: 4, marginTop: 10, display: 'inline-block' }}>{p.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 9. KNOWLEDGE BASE RAG TAB */}
        {activeTab === 'knowledge' && (
          <div style={{ padding: 24, overflowY: 'auto' }}>
            <div className="nexus-font-mono" style={{ fontSize: 11, fontWeight: 800, color: '#22D3EE', letterSpacing: 1, marginBottom: 4 }}>
              KNOWLEDGE BASE & RAG INCIDENT SEARCH ENGINE (28,000+ RECORDS)
            </div>
            <h2 className="nexus-font-headline" style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', margin: '0 0 18px' }}>
              Plant Incident Memory & Lessons Learned Search
            </h2>

            <div className="nexus-card" style={{ padding: 18, marginBottom: 20 }}>
              <label className="nexus-font-mono" style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 4 }}>SEARCH RAG INCIDENT DATABASE:</label>
              <input
                type="text"
                value={ragSearchQuery}
                onChange={(e) => setRagSearchQuery(e.target.value)}
                className="nexus-font-mono"
                style={{ width: '100%', background: '#0B111E', border: '1px solid #22D3EE', color: '#22D3EE', padding: '10px 14px', borderRadius: 6, fontSize: 13, fontWeight: 800 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { id: 'INC-2024-089', title: `${simMachineId} Spindle Bearing Failure & Thermal Runaway`, sim: '0.406 Match', desc: `Operated spindle under peak production throughput without lubrication monitoring.`, lessons: 'Enforce strict per-machine thermal limits & automatic safety interlocks.' },
                { id: 'INC-2025-014', title: 'Uncapped CNC Tooling Budget Allocation', sim: '0.312 Match', desc: 'Approved $120k tooling upgrade without dynamic spend limits.', lessons: 'Cap total unhedged tooling budget at $50,000.' },
              ].map((inc) => (
                <div key={inc.id} className="nexus-card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="nexus-font-mono" style={{ fontSize: 12, fontWeight: 800, color: '#F59E0B' }}>{inc.id} · {inc.title}</span>
                    <span className="nexus-font-mono" style={{ fontSize: 11, color: '#22C55E', fontWeight: 800 }}>{inc.sim}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: '#94A3B8', margin: '8px 0' }}>{inc.desc}</p>
                  <div className="nexus-font-mono" style={{ fontSize: 11, color: '#22D3EE' }}><strong>Lessons Learned:</strong> {inc.lessons}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 10. SYSTEM TRACE LOG VIEW */}
        {activeTab === 'trace' && (
          <div style={{ padding: 24 }}>
            <div className="nexus-font-mono" style={{ fontSize: 11, fontWeight: 800, color: '#22D3EE', marginBottom: 12 }}>
              REAL-TIME DCS SYSTEM TRACE STREAM (AGENT NEXUS ENGINE)
            </div>
            <pre className="nexus-font-mono" style={{
              padding: 22,
              background: '#050811',
              color: '#22C55E',
              fontSize: 12.5,
              lineHeight: 1.65,
              maxHeight: 520,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
            }}>
              {[
                '============================================================',
                '  AGENT NEXUS — AUTONOMOUS MANUFACTURING OS ENGINE',
                '============================================================',
                `  [PLANNER] Decomposed 6 sub-goals for machine ${simMachineId}`,
                `  [EVIDENCE] SensorAgent: Vib ${simVibration}mm/s | Temp ${simTemp}°C | Pressure ${simPressure}bar (${isAlarm ? 'ALARM' : 'OK'})`,
                `  [MAINTENANCE] MaintenanceAgent: Health ${Math.max(10, Math.round(100 - (simVibration * 5 + simTemp * 0.4)))}% | P(fail)=${Math.min(90, Math.round(simVibration * 6))}%`,
                `  [KNOWLEDGE] MemoryRAG: Found precedent INC-2024-089 (Thermal Runaway)`,
                `  [INVENTORY] InventoryAgent: Reserved PART-BRG-409 at Warehouse B - Bin 14-C`,
                `  [FINANCE] FinanceAgent: Immediate Repair $50,000 vs Unplanned Loss $390,000`,
                `  [REFLECTION] DevilsAdvocate: Round 1 Challenge Issued -> Resolved in Round 2`,
                `  [GOVERNANCE] SupervisorAgent: Converged on ${convergedAction} (88.4% OEE score)`
              ].join('\n')}
            </pre>
          </div>
        )}

        {/* 🏆 FINAL CONSENSUS MODAL */}
        {showConsensusModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(7, 11, 20, 0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}>
            <div className="nexus-card" style={{
              width: 540,
              padding: 28,
              border: '2px solid #22D3EE',
              boxShadow: '0 0 50px rgba(34, 211, 238, 0.4)',
              background: '#101826',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div className="nexus-font-mono" style={{ fontSize: 11, fontWeight: 800, color: '#22D3EE', letterSpacing: 1.5 }}>
                  AUTONOMOUS DECISION ACHIEVED
                </div>
                <h2 className="nexus-font-headline" style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', margin: '4px 0' }}>
                  {simResults.strategies[simResults.bestStrategyId].name}
                </h2>
                <div className="nexus-font-mono" style={{ fontSize: 13, color: '#22C55E', fontWeight: 800 }}>
                  CONFIDENCE: 96% · 10/10 AGENTS CONVERGED
                </div>
              </div>

              <div style={{ background: '#0B111E', padding: 16, borderRadius: 8, marginBottom: 20, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div className="nexus-font-mono" style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>SUPPORTING EVIDENCE VERIFIED:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }} className="nexus-font-mono">
                  <div style={{ fontSize: 11, color: '#22C55E' }}>✓ Sensor Telemetry Ingested</div>
                  <div style={{ fontSize: 11, color: '#22C55E' }}>✓ Inventory Reserved (Bin 14-C)</div>
                  <div style={{ fontSize: 11, color: '#22C55E' }}>✓ RAG Incident Match (INC-089)</div>
                  <div style={{ fontSize: 11, color: '#22C55E' }}>✓ Safety SOP-042 Verified</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="nexus-font-mono" style={{ fontSize: 11, color: '#94A3B8' }}>
                  ESTIMATED SAVINGS VS DELAY: <strong style={{ color: '#22D3EE' }}>${simResults.costSavingsVsDelay.toLocaleString()}</strong>
                </div>
                <button
                  onClick={() => setShowConsensusModal(false)}
                  className="nexus-font-mono"
                  style={{ padding: '8px 20px', background: '#22D3EE', border: 'none', borderRadius: 6, color: '#070B14', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  DISMISS & APPLY DECISION
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DOCKED AI ASSISTANT CHAT DRAWER */}
        {chatOpen && (
          <div style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            width: 400,
            height: 460,
            background: '#101826',
            border: '1px solid #22D3EE',
            borderRadius: 12,
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 25px rgba(34, 211, 238, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 99,
          }}>
            <div style={{ padding: 14, background: '#0B111E', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="nexus-font-mono" style={{ fontSize: 12, fontWeight: 800, color: '#22D3EE' }}>🤖 FACTORY AI ASSISTANT</span>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>

            <div style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{
                  alignSelf: msg.sender === 'OPERATOR' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: 12,
                  borderRadius: 8,
                  background: msg.sender === 'OPERATOR' ? '#6366F1' : '#0B111E',
                  border: '1px solid',
                  borderColor: msg.sender === 'OPERATOR' ? '#6366F1' : 'rgba(255, 255, 255, 0.08)',
                  color: '#F8FAFC',
                  fontSize: 12.5,
                  lineHeight: 1.45,
                }}>
                  <div className="nexus-font-mono" style={{ fontSize: 9.5, color: '#22D3EE', marginBottom: 3 }}>{msg.sender} · {msg.time}</div>
                  {msg.text}
                </div>
              ))}
            </div>

            <div style={{ padding: 12, background: '#0B111E', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Ask Agent Nexus a factory question..."
                className="nexus-font-mono"
                style={{ flex: 1, background: '#101826', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#F8FAFC', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}
              />
              <button
                onClick={handleSendChat}
                className="nexus-font-mono"
                style={{ padding: '8px 14px', background: '#22D3EE', border: 'none', borderRadius: 6, color: '#070B14', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
              >
                SEND
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
