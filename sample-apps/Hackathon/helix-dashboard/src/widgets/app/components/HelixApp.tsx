'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWidgetSDK, useWidgetState } from '@nitrostack/widgets';
import axios from 'axios';
import {
  INITIAL_DEPARTMENTS,
  INITIAL_STREAM_SIGNALS,
  INITIAL_BASELINES,
  INITIAL_INTERVENTIONS,
  DepartmentDrift,
  TelemetrySignal,
  StrategicBaseline,
  InterventionLog,
} from '../data/mockData';
import { Sidebar } from './Sidebar';
import { MetricCard } from './MetricCard';
import { HeatmapMatrix } from './HeatmapMatrix';
import { DepartmentDrawer } from './DepartmentDrawer';
import { TelemetryStream } from './TelemetryStream';
import { GenomeStudio } from './GenomeStudio';
import { InterventionHub } from './InterventionHub';
import { ChatBotUI } from './ChatBotUI';
import { GenomeSpace3D } from './GenomeSpace3D';

type ViewType = 'dashboard' | 'stream' | 'genome' | 'interventions';

interface HelixAppState extends Record<string, any> {
  currentView: ViewType;
  selectedDeptId: string | null;
  isStreaming: boolean;
}

export default function HelixApp({ initialView = 'dashboard' }: { initialView?: ViewType }) {
  const { getToolOutput } = useWidgetSDK();
  const [widgetState, setWidgetState] = useWidgetState<HelixAppState>(() => ({
    currentView: initialView,
    selectedDeptId: null,
    isStreaming: true,
  }));

  const currentView = widgetState?.currentView || initialView;
  const isStreamingActive = widgetState?.isStreaming !== false;

  // Local Reactive State Initialized with Mock Data
  const [departments, setDepartments] = useState<DepartmentDrift[]>(INITIAL_DEPARTMENTS);
  const [signals, setSignals] = useState<TelemetrySignal[]>(INITIAL_STREAM_SIGNALS);
  const [baselines, setBaselines] = useState<StrategicBaseline[]>(INITIAL_BASELINES);
  const [interventions, setInterventions] = useState<InterventionLog[]>(INITIAL_INTERVENTIONS);
  const [inspectedDept, setInspectedDept] = useState<DepartmentDrift | null>(null);

  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);

  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);
  const [ingestRate, setIngestRate] = useState(1412);

  useEffect(() => {
    const interval = setInterval(() => {
      setIngestRate((prev) => {
        const delta = Math.floor(Math.random() * 40 - 20); // fluctuate between -20 and +20
        const newVal = prev + delta;
        return Math.max(1390, Math.min(1445, newVal));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (toast && toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => prev ? { ...prev, visible: false } : null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
  };

  // Sync tool output if passed from MCP tool
  const toolData = getToolOutput<any>();
  useEffect(() => {
    if (toolData?.departments) {
      setDepartments(toolData.departments);
    }
    if (toolData?.telemetries) {
      setSignals(toolData.telemetries);
    }
  }, [toolData]);

  // Live Stream Simulation Interval
  useEffect(() => {
    if (!isStreamingActive) return;

    const interval = setInterval(() => {
      // Periodic live signal injection and drift check against backend
      handleSimulateSignal();

      // Subtle pulse on alignment charts to reflect live ingestion
      setDepartments((prevDepts) =>
        prevDepts.map((dept) => {
          const delta = (Math.random() * 0.02 - 0.01);
          const newDrift = Math.max(0.05, Math.min(0.95, dept.driftScore + delta));
          const roundedDrift = Math.round(newDrift * 100) / 100;
          const status = roundedDrift > 0.6 ? 'severe' : roundedDrift > 0.3 ? 'moderate' : 'aligned';

          const newHistory = [...dept.trendHistory.slice(1), roundedDrift];
          return {
            ...dept,
            driftScore: roundedDrift,
            status,
            trendHistory: newHistory,
          };
        })
      );
    }, 8000);

    return () => clearInterval(interval);
  }, [isStreamingActive]);

  // View Switcher Handler
  const handleNavigate = (view: ViewType) => {
    setWidgetState({ ...widgetState, currentView: view });
  };

  // Inspect Department Drawer Trigger
  const handleInspectDepartment = (dept: DepartmentDrift) => {
    setInspectedDept(dept);
    setWidgetState({ ...widgetState, selectedDeptId: dept.id });
  };

  // Inject New Signal Simulator with Live Backend Evaluation
  const handleSimulateSignal = async () => {
    const randomDepts: Array<TelemetrySignal['department']> = ['Engineering', 'Product', 'Sales', 'Legal', 'Marketing'];
    const randomSources: Array<TelemetrySignal['source']> = ['Slack', 'Teams', 'Jira', 'Confluence'];
    const randomSeverities: Array<TelemetrySignal['severity']> = ['High', 'Med', 'Low'];

    const chosenDept = randomDepts[Math.floor(Math.random() * randomDepts.length)];
    const chosenSource = randomSources[Math.floor(Math.random() * randomSources.length)];
    const chosenSev = randomSeverities[Math.floor(Math.random() * randomSeverities.length)];

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const newSignal: TelemetrySignal = {
      id: `sig-${Date.now().toString().slice(-4)}`,
      timestamp: timeStr,
      source: chosenSource,
      department: chosenDept,
      severity: chosenSev,
      payloadPreview: `${chosenSource} event in ${chosenDept}: Potential strategic variance flagged by policy engine...`,
      fullRawMessage: `${chosenSource} Live Telemetry Signal: "Automated scanner detected high variance transmission in ${chosenDept} module."`,
      matchedBaselineId: 'base-sec-01',
      matchedBaselineTitle: 'Mandatory SOC2 & Pre-Release SecOps Gateways',
      driftScore: chosenSev === 'High' ? 0.85 : chosenSev === 'Med' ? 0.45 : 0.18,
      llmReasoning: `Automated real-time cognitive scan detected departure from standard baseline parameters in ${chosenDept}.`,
      sender: `agent.${chosenDept.toLowerCase()}@helix.internal`,
      channelOrTicket: `${chosenSource} #${chosenDept.toLowerCase()}-telemetry`,
      rawJson: {
        timestamp: now.toISOString(),
        department: chosenDept,
        source: chosenSource,
        severity: chosenSev,
        variance_flag: true,
      },
    };

    // Provide immediate visual feedback in the stream
    setSignals((prev) => [newSignal, ...prev]);

    try {
      const res = await axios.post('http://localhost:8000/drift/analyze', {
        department: chosenDept,
        signals: [newSignal.fullRawMessage]
      }, { timeout: 180000 });

      const scoreVal = res.data?.cognitive_drift_score !== undefined ? res.data.cognitive_drift_score : res.data?.drift_score;
      if (res.data && scoreVal !== undefined) {
        const realScore = Number(scoreVal);
        const realStatus: DepartmentDrift['status'] = realScore > 0.6 ? 'severe' : realScore > 0.3 ? 'moderate' : 'aligned';
        const realReasoning = res.data.summary || (res.data.root_causes && res.data.root_causes.join('; ')) || newSignal.llmReasoning;

        // Update the signal with real backend Qwen diagnosis
        setSignals((prev) => prev.map(s => s.id === newSignal.id ? {
          ...s,
          driftScore: realScore,
          llmReasoning: `[LIVE QWEN ENGINE]: ${realReasoning}`,
          severity: realScore > 0.6 ? 'High' : realScore > 0.3 ? 'Med' : 'Low'
        } : s));

        // Dynamically update the department drift in the matrix and heatmap
        setDepartments((prevDepts) => prevDepts.map(d => {
          if (d.name.toLowerCase().includes(chosenDept.toLowerCase()) || d.code.toLowerCase() === chosenDept.toLowerCase().slice(0, 3)) {
            const newHistory = [...d.trendHistory.slice(1), Math.round(realScore * 100) / 100];
            return {
              ...d,
              driftScore: Math.round(realScore * 100) / 100,
              status: realStatus,
              trendHistory: newHistory
            };
          }
          return d;
        }));
      }
    } catch (err) {
      console.warn('Live backend telemetry evaluation fallback:', err);
    }
  };

  // Trigger Nudge Action
  const handleTriggerNudge = (targetUnit: string, nudgeMsg: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const newLog: InterventionLog = {
      id: `nudge-${Date.now().toString().slice(-4)}`,
      timestamp: timeStr,
      targetUnit,
      recipient: `${targetUnit.toLowerCase().replace(/[^a-z]/g, '')}@helix.internal`,
      baselineCode: 'SEC-01',
      baselineTitle: 'Mandatory SOC2 & Pre-Release SecOps Gateways',
      channel: 'Slack Nudge Bot',
      status: 'Delivered',
      nudgeMessage: nudgeMsg || '[ALERT] Automated HELIX Guardian Nudge: Behavioral drift variance detected.',
      resolutionTime: 'Pending',
      driftDelta: -0.15,
    };

    setInterventions((prev) => [newLog, ...prev]);
  };

  // Add Strategic Baseline
  const handleAddBaseline = (newBase: Omit<StrategicBaseline, 'id' | 'createdDate'>) => {
    const baseObj: StrategicBaseline = {
      ...newBase,
      id: `base-${Date.now().toString().slice(-4)}`,
      createdDate: new Date().toISOString().split('T')[0],
    };
    setBaselines((prev) => [baseObj, ...prev]);
  };

  // Executive Top Metrics Calculation
  const severeAlertsCount = departments.filter((d) => d.status === 'severe').length;
  const avgDrift = (departments.reduce((acc, d) => acc + d.driftScore, 0) / departments.length).toFixed(2);
  const highestRiskDept = [...departments].sort((a, b) => b.driftScore - a.driftScore)[0];
  const avgCohesion = (departments.reduce((acc, d) => acc + d.cohesionIndex, 0) / departments.length).toFixed(1);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-obsidian)', color: 'var(--text-primary)', overflow: 'hidden', position: 'relative' }}>
      
      {/* Background Animated Elements */}
      <div className="cyber-grid" />
      
      {/* Horizontal Data Lines */}
      <div className="data-line-x" style={{ top: '15%', animationDelay: '0s', animationDuration: '6s', opacity: 0.2 }}></div>
      <div className="data-line-x" style={{ top: '35%', animationDelay: '1.5s', animationDuration: '4s', opacity: 0.3 }}></div>
      <div className="data-line-x" style={{ top: '65%', animationDelay: '3s', animationDuration: '8s', opacity: 0.15 }}></div>
      <div className="data-line-x" style={{ top: '85%', animationDelay: '0.5s', animationDuration: '5s', opacity: 0.4 }}></div>

      {/* Vertical Data Lines */}
      <div className="data-line-y" style={{ left: '10%', animationDelay: '0s', animationDuration: '7s', opacity: 0.2 }}></div>
      <div className="data-line-y" style={{ left: '40%', animationDelay: '2.5s', animationDuration: '5s', opacity: 0.3 }}></div>
      <div className="data-line-y" style={{ left: '75%', animationDelay: '1s', animationDuration: '9s', opacity: 0.15 }}></div>
      <div className="data-line-y" style={{ left: '90%', animationDelay: '4s', animationDuration: '6s', opacity: 0.4 }}></div>

      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        activeAlertsCount={severeAlertsCount}
        isStreaming={isStreamingActive}
        onToggleStreaming={() => setWidgetState({ ...widgetState, isStreaming: !isStreamingActive })}
        onSimulateEvent={handleSimulateSignal}
        onToggleChat={() => setShowChatDrawer(!showChatDrawer)}
      />

      {/* Helix AI Chatbot Left Drawer */}
      <AnimatePresence>
        {showChatDrawer && (
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              top: 0,
              left: '260px', /* Right after the sidebar */
              bottom: 0,
              width: '400px',
              backgroundColor: 'rgba(5, 5, 5, 0.95)',
              borderRight: '1px solid rgba(37, 99, 235, 0.3)',
              boxShadow: '20px 0 50px rgba(0,0,0,0.5)',
              zIndex: 35,
              backdropFilter: 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 className="glow-text" style={{ margin: 0, color: '#FFF', fontSize: '16px' }}>Helix AI Inspector</h3>
              <button onClick={() => setShowChatDrawer(false)} style={{ background: 'none', border: 'none', color: '#A1A1AA', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ChatBotUI />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        {/* Top Header Bar */}
        <motion.header 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            padding: '16px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            backgroundColor: 'rgba(5, 5, 5, 0.6)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 30,
            boxShadow: '0 4px 30px rgba(0, 229, 255, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#A1A1AA', letterSpacing: '0.5px' }}>WORKSPACE:</span>
            <span className="glow-text" style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>Global Enterprise Genome</span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10B981',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}>
              Sync Active
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#A1A1AA', fontWeight: 500 }}>
              <span className="live-pulse" style={{ backgroundColor: '#00E5FF' }} />
              <span>Ingest: <strong className="glow-text" style={{ color: '#FFFFFF' }}>{ingestRate.toLocaleString()} events/min</strong></span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSimulateSignal}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'linear-gradient(45deg, rgba(0, 229, 255, 0.2), rgba(255, 102, 51, 0.1))',
                border: '1px solid rgba(0, 229, 255, 0.5)',
                color: '#38BDF8',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Inject Signal
            </motion.button>
          </div>
        </motion.header>

        {/* View Router Render Area */}
        <main style={{ flex: 1, padding: '28px', overflowY: 'auto', position: 'relative' }}>
          <AnimatePresence mode="wait">
            {currentView === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(10px)' }}
                transition={{ duration: 0.4 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}
              >
                {/* Executive Header Title */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h1 className="glow-text" style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                    Executive Drift Heatmap
                  </h1>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#A1A1AA', fontWeight: 500 }}>
                    Real-time cognitive drift monitoring across enterprise business units
                  </p>
                </motion.div>

                {/* Top Row Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <MetricCard
                    title="Organizational Cohesion"
                    value={`${avgCohesion}%`}
                    subtitle="Weighted cross-departmental alignment score"
                    gaugeValue={parseFloat(avgCohesion)}
                    statusColor="emerald"
                    trendBadge={{ text: '↑ +2.1%', isPositive: true }}
                    delay={0.3}
                  />

                  <MetricCard
                    title="Active Drift Alerts"
                    value={`${departments.reduce((acc, d) => acc + d.activeAlertsCount, 0)} Alerts`}
                    subtitle={`${severeAlertsCount} critical severe drift flags`}
                    statusColor="rose"
                    sparklineData={departments.map(d => d.activeAlertsCount)}
                    trendBadge={{ text: `${severeAlertsCount} Critical`, isPositive: false }}
                    delay={0.4}
                    onClick={() => setShowAlertsModal(true)}
                  />

                  <MetricCard
                    title="Highest Risk Unit"
                    value={highestRiskDept?.name || 'N/A'}
                    subtitle={`Current Drift Score: ${highestRiskDept?.driftScore.toFixed(2)}`}
                    statusColor="rose"
                    sparklineData={highestRiskDept?.trendHistory || []}
                    trendBadge={{ text: 'High Risk', isPositive: false }}
                    delay={0.5}
                    onClick={() => setShowRiskModal(true)}
                  />

                  <MetricCard
                    title="24h Intervention Success"
                    value="91.2%"
                    subtitle="41 of 45 automated nudges actioned"
                    statusColor="indigo"
                    sparklineData={[60, 65, 75, 80, 85, 88, 91.2]}
                    trendBadge={{ text: 'Optimal', isPositive: true }}
                    delay={0.6}
                  />
                </div>

                {/* Main Section: Heatmap & 3D Genome Space */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '28px', alignItems: 'stretch' }}
                >
                  {/* Heatmap Matrix column */}
                  <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '520px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <h3 className="glow-text" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>
                        Behavioral Drift Matrix
                      </h3>
                      <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px' }}>
                        Click tile to inspect trajectory
                      </span>
                    </div>

                    <HeatmapMatrix
                      departments={departments}
                      onInspectDepartment={handleInspectDepartment}
                    />
                  </div>

                  {/* Right Column: 3D Genome */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', height: '100%' }}>
                    
                    {/* 3D Genome Space */}
                    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '520px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 className="glow-text" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>
                          Interactive Genome Space
                        </h3>
                      </div>
                      <GenomeSpace3D departments={departments} />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {currentView === 'stream' && (
              <motion.div key="stream" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <TelemetryStream
                  signals={signals}
                  isStreaming={isStreamingActive}
                  onToggleStreaming={() => setWidgetState({ ...widgetState, isStreaming: !isStreamingActive })}
                  onSimulateSignal={handleSimulateSignal}
                  onTriggerNudge={handleTriggerNudge}
                  onShowToast={showToast}
                />
              </motion.div>
            )}

            {currentView === 'genome' && (
              <motion.div key="genome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <GenomeStudio
                  baselines={baselines}
                  onAddBaseline={handleAddBaseline}
                />
              </motion.div>
            )}

            {currentView === 'interventions' && (
              <motion.div key="interventions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <InterventionHub
                  interventions={interventions}
                  onDispatchNudge={handleTriggerNudge}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Department Inspector Slide-Over Drawer */}
      <DepartmentDrawer
        department={inspectedDept}
        onClose={() => {
          setInspectedDept(null);
          setWidgetState({ ...widgetState, selectedDeptId: null });
        }}
        telemetries={signals}
        onTriggerNudge={handleTriggerNudge}
        baselines={baselines}
        onShowToast={showToast}
      />

      {/* Alerts Modal */}
      <AnimatePresence>
        {showAlertsModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(2, 5, 18, 0.8)', backdropFilter: 'blur(10px)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div className="glass-card" style={{ width: '600px', maxHeight: '80vh', overflowY: 'auto', padding: '24px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 0 40px rgba(239, 68, 68, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="glow-text" style={{ margin: 0, color: '#FFF', fontSize: '20px' }}>Active Drift Alerts (14)</h3>
                <button onClick={() => setShowAlertsModal(false)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '20px' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {signals.slice(0, 14).map((sig, i) => (
                  <div key={sig.id} style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: sig.severity === 'High' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
                    border: sig.severity === 'High' ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                  }}>
                    <strong style={{ color: sig.severity === 'High' ? '#F87171' : '#FFF' }}>{sig.timestamp} - {sig.department}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#A1A1AA' }}>{sig.payloadPreview}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Engineering Risk Modal */}
      <AnimatePresence>
        {showRiskModal && highestRiskDept && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(2, 5, 18, 0.8)', backdropFilter: 'blur(10px)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div className="glass-card" style={{ width: '500px', padding: '24px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 0 40px rgba(239, 68, 68, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="glow-text" style={{ margin: 0, color: '#FFF', fontSize: '20px' }}>{highestRiskDept.name} Risk Profile</h3>
                <button onClick={() => setShowRiskModal(false)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '20px' }}>✕</button>
              </div>
              <p style={{ color: '#E5E7EB', fontSize: '14px', lineHeight: '1.6' }}>
                <strong>Top Drift Reason:</strong> {highestRiskDept.topDriftTopic}<br/><br/>
                <strong>Latest Assessment:</strong> {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </p>
              <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px', color: '#A1A1AA', fontSize: '12px', textTransform: 'uppercase' }}>7-Day Historical Drift Values</h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '120px' }}>
                  {highestRiskDept.trendHistory.map((val, i) => (
                    <div key={i} style={{ flex: 1, backgroundColor: 'rgba(239,68,68,0.5)', height: `${val * 100}%`, borderRadius: '4px 4px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#FFF' }}>{val.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && toast.visible && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            style={{
              position: 'fixed',
              top: '24px',
              left: '50%',
              backgroundColor: 'rgba(15, 15, 15, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 229, 255, 0.5)',
              borderRadius: '12px',
              padding: '14px 28px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 229, 255, 0.4)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00E5FF', boxShadow: '0 0 15px #00E5FF' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.5px' }}>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
