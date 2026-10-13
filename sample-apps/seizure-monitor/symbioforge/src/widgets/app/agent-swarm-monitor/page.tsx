'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';
import { useState, useEffect } from 'react';
import { Play, Square, RotateCcw, ShieldAlert, Cpu, Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ActivityLog {
  id: string;
  timestamp: string;
  agent: 'Clerk' | 'Scout' | 'Profiler' | 'Matchmaker' | 'Inventor' | 'Auditor' | 'Architect' | 'Sentinel' | 'System';
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface SwarmMonitorData {
  success: boolean;
  circularScore: number;
  totalCo2Avoided: number;
  totalLandfillDiverted: number;
  totalWaterSaved: number;
  totalFinancialValue: number;
  factoriesCount: number;
  matchesCount: number;
  productsCount: number;
  blueprintsCount: number;
  logsCount: number;
  activityLogs: ActivityLog[];
}

const AGENTS = [
  { name: 'Clerk', role: 'Compliance & Ingestion', angle: 0, color: '#3b82f6' },
  { name: 'Scout', role: 'Waste Stream Discovery', angle: 45, color: '#06b6d4' },
  { name: 'Profiler', role: 'Material Classification', angle: 90, color: '#8b5cf6' },
  { name: 'Matchmaker', role: 'Symbiosis Matching', angle: 135, color: '#ec4899' },
  { name: 'Inventor', role: 'Product Synthesis', angle: 180, color: '#f59e0b' },
  { name: 'Auditor', role: 'ESG Impact Assessment', angle: 225, color: '#10b981' },
  { name: 'Architect', role: 'Pathway Engineering', angle: 270, color: '#6366f1' },
  { name: 'Sentinel', role: 'Self-Healing & Health', angle: 315, color: '#ef4444' }
];

export default function AgentSwarmMonitor() {
  const theme = useTheme();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const data = getToolOutput<SwarmMonitorData>();
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

  // Simulate active agent pulsing based on logs
  useEffect(() => {
    if (data?.activityLogs && data.activityLogs.length > 0) {
      const latestLog = data.activityLogs[0];
      if (latestLog.agent !== 'System') {
        setActiveAgent(latestLog.agent);
        const timer = setTimeout(() => setActiveAgent(null), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [data?.activityLogs]);

  if (!isReady) {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Initializing SDK...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Loading Swarm Monitor Data...
      </div>
    );
  }

  const logs = data.activityLogs ?? [];
  const circularScore = data.circularScore ?? 0;

  const handleControl = async (action: 'start' | 'stop' | 'reset') => {
    setIsActionPending(true);
    try {
      await callTool('control-swarm', { action });
    } catch (err) {
      console.error('Failed to control swarm:', err);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleTriggerDisruption = async () => {
    setIsActionPending(true);
    try {
      // Trigger disruption on fact_1 (Coimbatore Metal Forging)
      await callTool('trigger-disruption', { factoryId: 'fact_1' });
    } catch (err) {
      console.error('Failed to trigger disruption:', err);
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      borderRadius: '12px',
      maxWidth: '800px',
      margin: '0 auto',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu style={{ color: '#3b82f6' }} /> SymbioForge Agent Swarm Monitor
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Real-time visualization of the 8 autonomous circular manufacturing agents
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleControl('start')}
            disabled={isActionPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '6px',
              opacity: isActionPending ? 0.6 : 1
            }}
          >
            <Play size={14} /> Start
          </button>
          <button
            onClick={() => handleControl('stop')}
            disabled={isActionPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '6px',
              opacity: isActionPending ? 0.6 : 1
            }}
          >
            <Square size={14} /> Stop
          </button>
          <button
            onClick={() => handleControl('reset')}
            disabled={isActionPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              backgroundColor: '#475569',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '6px',
              opacity: isActionPending ? 0.6 : 1
            }}
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Main Visualization Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Circular Swarm Node Graph */}
        <div style={{
          position: 'relative',
          height: '320px',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          border: '1px solid #334155',
          overflow: 'hidden'
        }}>
          {/* Center Hub */}
          <div style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            backgroundColor: '#0f172a',
            border: '3px solid #3b82f6',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
            boxShadow: '0 0 20px rgba(59,130,246,0.4)'
          }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Cluster Score</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{circularScore}%</span>
          </div>

          {/* Agent Nodes */}
          {AGENTS.map((agent) => {
            const rad = (agent.angle * Math.PI) / 180;
            const radius = 110; // distance from center
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            const isActive = activeAgent === agent.name;

            return (
              <div
                key={agent.name}
                style={{
                  position: 'absolute',
                  transform: `translate(${x}px, ${y}px)`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: 5
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#0f172a',
                  border: `2px solid ${agent.color}`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  color: '#fff',
                  boxShadow: isActive ? `0 0 20px ${agent.color}` : 'none',
                  transition: 'all 0.3s ease',
                  transform: isActive ? 'scale(1.15)' : 'scale(1)'
                }}>
                  {agent.name.substring(0, 2)}
                </div>
                <span style={{
                  fontSize: '10px',
                  color: isActive ? '#fff' : '#94a3b8',
                  fontWeight: isActive ? 'bold' : 'normal',
                  marginTop: '4px',
                  backgroundColor: '#0f172a',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid #334155'
                }}>
                  {agent.name}
                </span>
              </div>
            );
          })}

          {/* Connecting Beams (SVG Overlay) */}
          <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
            {activeAgent && AGENTS.map((agent) => {
              if (agent.name === activeAgent) return null;
              const activeObj = AGENTS.find(a => a.name === activeAgent);
              if (!activeObj) return null;

              const radActive = (activeObj.angle * Math.PI) / 180;
              const radTarget = (agent.angle * Math.PI) / 180;
              const radius = 110;

              const x1 = 160 + Math.cos(radActive) * radius;
              const y1 = 160 + Math.sin(radActive) * radius;
              const x2 = 160 + Math.cos(radTarget) * radius;
              const y2 = 160 + Math.sin(radTarget) * radius;

              return (
                <line
                  key={agent.name}
                  x1="50%"
                  y1="50%"
                  x2={`calc(50% + ${Math.cos(radActive) * radius}px)`}
                  y2={`calc(50% + ${Math.sin(radActive) * radius}px)`}
                  stroke={activeObj.color}
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.4"
                />
              );
            })}
          </svg>
        </div>

        {/* Stats & Disruption Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #334155',
            flex: 1
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={16} style={{ color: '#10b981' }} /> Cluster Statistics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Factories</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>{data.factoriesCount ?? 0}</div>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Symbioses</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{data.matchesCount ?? 0}</div>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Products Invented</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>{data.productsCount ?? 0}</div>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Blueprints</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#6366f1' }}>{data.blueprintsCount ?? 0}</div>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#1e293b',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={16} /> Sentinel Disruption Test
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
              Simulate a sudden factory shutdown to trigger Sentinel's self-healing protocols and watch the Matchmaker re-route waste streams.
            </p>
            <button
              onClick={handleTriggerDisruption}
              disabled={isActionPending}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                opacity: isActionPending ? 0.6 : 1
              }}
            >
              <ShieldAlert size={14} /> Trigger Factory Disruption
            </button>
          </div>
        </div>
      </div>

      {/* Live Activity Log */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '8px',
        border: '1px solid #334155',
        padding: '16px'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={16} style={{ color: '#3b82f6' }} /> Live Swarm Activity Log
        </h3>
        <div style={{
          height: '150px',
          overflowY: 'auto',
          backgroundColor: '#0f172a',
          borderRadius: '6px',
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '11px',
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#475569', textAlign: 'center', padding: '20px' }}>No activity logs yet. Start the swarm.</div>
          ) : (
            logs.map((log) => {
              let color = '#94a3b8';
              if (log.type === 'success') color = '#10b981';
              if (log.type === 'warning') color = '#f59e0b';
              if (log.type === 'error') color = '#ef4444';

              const agentColor = AGENTS.find(a => a.name === log.agent)?.color ?? '#94a3b8';

              return (
                <div key={log.id} style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
                  <span style={{ color: '#475569' }}>[{log.timestamp}]</span>
                  <span style={{ color: agentColor, fontWeight: 'bold', minWidth: '70px' }}>{log.agent}:</span>
                  <span style={{ color }}>{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
