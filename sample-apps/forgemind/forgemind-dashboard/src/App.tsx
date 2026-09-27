import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CommandCenter } from './components/CommandCenter';
import { AIInvestigation } from './components/AIInvestigation';
import { WorkOrders } from './components/WorkOrders';
import { DemoLab } from './components/DemoLab';

import type { Machine, AnomalyFinding, FaultScenario, WorkOrder } from './types';
import { INITIAL_MACHINES, DEMO_SCENARIOS } from './data/mockData';
import { apiService } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'command' | 'investigation' | 'workorders' | 'demolab'>('command');


  // Application Data States
  const [machines, setMachines] = useState<Machine[]>(INITIAL_MACHINES);
  const [selectedMachine, setSelectedMachine] = useState<Machine>(INITIAL_MACHINES[0]);

  const [anomalies, setAnomalies] = useState<AnomalyFinding[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([DEMO_SCENARIOS[0].generatedWorkOrder]);

  // Current Active AI Scenario & Verification Chain
  const [currentScenario, setCurrentScenario] = useState<FaultScenario>(DEMO_SCENARIOS[0]);
  const [isInvestigating, setIsInvestigating] = useState<boolean>(false);

  // Gateway Connection States
  const [isBackendLive, setIsBackendLive] = useState<boolean>(true);
  const [backendUrl, setBackendUrl] = useState<string>(
    import.meta.env.VITE_API_URL || 'https://nitro-1-wpyf.onrender.com'
  );
  const [wsUrl, setWsUrl] = useState<string>(
    import.meta.env.VITE_WS_URL || 'wss://nitro-1-wpyf.onrender.com/ws'
  );

  // Live Log Stream
  const [logStream, setLogStream] = useState<string[]>([
    'System initialized. NitroStack MCP SDK Gateway ready.',
    'ForgeMind 45s correlation window engine started.',
    'MongoDB persistent connection established.',
    'Qdrant FastEmbed vector index loaded (3 SOP documents indexed).',
  ]);

  const [demoScenarios, setDemoScenarios] = useState<FaultScenario[]>(DEMO_SCENARIOS);

  useEffect(() => {
    if (isBackendLive) {
      (apiService as any).baseUrl = backendUrl;
      (apiService as any).wsUrl = wsUrl;

      // Establish live WebSocket connection to stream live agent logs
      apiService.connectWebSocket(
        (data: any) => {
          if (data && data.type === 'log') {
            addLog(data.message);
          } else if (typeof data === 'string') {
            addLog(data);
          }
        },
        (err) => {
          console.error('WebSocket Error:', err);
        }
      );

      // 1. Fetch Sandy's Live Machines
      apiService.fetchMachines().then((backendMachines) => {
        if (backendMachines && backendMachines.length > 0) {
          setMachines(backendMachines);
          setSelectedMachine(backendMachines[0]);
        }
      });

      // 2. Fetch Sandy's PLC Scenarios
      apiService.getScenarios().then((rawScenarios) => {
        const realScenarios = rawScenarios.map((s: any) => ({
          id: s.eventId,
          title: `[PLC] ${s.alarmDescription}`,
          description: `REAL PLC EVENT: ${s.operatorNote}`,
          machineId: s.equipmentId,
          severity: (s.severity === "HIGH" ? "CRITICAL" : "WARNING") as "CRITICAL" | "WARNING",
          simulatedMetrics: {
            vibration: s.telemetry?.vibration_mm_s_rms || s.telemetry?.vibration || 0,
            temperature: s.telemetry?.temperature_celsius || s.telemetry?.temperature || 0,
            powerConsumption: s.telemetry?.power_consumption || s.telemetry?.powerConsumption || 15.0
          },
          verificationSteps: DEMO_SCENARIOS[0].verificationSteps,
          sop: DEMO_SCENARIOS[0].sop,
          generatedWorkOrder: DEMO_SCENARIOS[0].generatedWorkOrder,
          rawPlcEvent: s
        }));
        // Append real backend scenarios to the mock ones
        setDemoScenarios([...DEMO_SCENARIOS, ...realScenarios]);
      });

      return () => {
        apiService.disconnectWebSocket();
      };
    }
  }, [isBackendLive, backendUrl, wsUrl]);

  // Append to log stream helper
  const addLog = (msg: string) => {
    setLogStream((prev) => [...prev.slice(-30), msg]);
  };

  // Scenario Injection Handler (The Core Demo Action!)
  const handleTriggerScenario = async (scenarioId: string) => {
    const scenario = demoScenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;

    setCurrentScenario(scenario);
    setIsInvestigating(true);

    addLog(`🚨 FAULT INJECTED: ${scenario.title}`);
    addLog(`⚡ ForgeMind 45s Window Filter triggered on machine: ${scenario.machineId}`);

    // Update target machine telemetry and status in state
    setMachines((prev) =>
      prev.map((m) => {
        if (m.id === scenario.machineId) {
          const updated = {
            ...m,
            status: scenario.severity,
            healthScore: scenario.severity === 'CRITICAL' ? 42 : 68,
            telemetry: {
              ...m.telemetry,
              ...scenario.simulatedMetrics,
            },
          };
          setSelectedMachine(updated);
          return updated;
        }
        return m;
      })
    );

    // Push new finding event
    const newFinding: AnomalyFinding = {
      id: `ANOM-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      machineId: scenario.machineId,
      machineName: scenario.sop.machineType,
      sensor: 'Vibration & Thermal Triangulation',
      value: `${scenario.simulatedMetrics.vibration} mm/s`,
      threshold: '4.5 mm/s',
      severity: scenario.severity,
      correlationWindow: `45s Window #${Math.floor(1000 + Math.random() * 9000)}`,
      message: `Critical threshold breach detected on ${scenario.machineId}: Vibration ${scenario.simulatedMetrics.vibration} mm/s, Temp ${scenario.simulatedMetrics.temperature}°C`,
    };

    setAnomalies((prev) => [newFinding, ...prev]);

    if (isBackendLive) {
      addLog(`[Live Mode] Routing fault to ForgeMind API Server...`);
      try {
        // Ensure the API uses the configured backend URL
        (apiService as any).baseUrl = backendUrl;

        let response;
        if ((scenario as any).rawPlcEvent) {
          response = await apiService.simulatePlcEvent((scenario as any).rawPlcEvent);
        } else {
          response = await apiService.injectFault({
            machineId: scenario.machineId,
            sensor: "Vibration",
            value: scenario.simulatedMetrics.vibration,
            scenarioId: scenario.id
          });
        }

        if (response.success && response.result) {
          const aiVerdict = response.result;
          addLog(`[Live Mode] AI Verdict Received: ${aiVerdict.recommended_action}`);

          const realWorkOrder = {
            ...scenario.generatedWorkOrder,
            id: `WO-AI-${Math.floor(Math.random() * 10000)}`,
            issueSummary: aiVerdict.insight || scenario.generatedWorkOrder.issueSummary,
            rootCause: aiVerdict.thought_process || scenario.generatedWorkOrder.rootCause,
            confidenceScore: aiVerdict.confidence || scenario.generatedWorkOrder.confidenceScore,
          };

          setCurrentScenario((s) => ({ ...s!, generatedWorkOrder: realWorkOrder }));

          setWorkOrders((prev) => {
            if (prev.some((w) => w.id === realWorkOrder.id)) return prev;
            return [realWorkOrder, ...prev];
          });
        } else {
          addLog(`[Live Mode Error] ${response.error}`);
        }
      } catch (err: any) {
        addLog(`[Live Mode Error] ${err.message}`);
      }
      setIsInvestigating(false);
      setActiveTab('investigation');
    } else {
      // Simulate NitroStack MCP `@Tool` call chain execution for offline mock mode
      setTimeout(() => {
        addLog(`[NitroStack MCP] @Tool get_machine_history("${scenario.machineId}") called`);
      }, 400);

      setTimeout(() => {
        addLog(`[NitroStack MCP] @Tool retrieve_sop("${scenario.machineId}") -> Qdrant top-k score: ${scenario.sop.relevanceScore}`);
      }, 900);

      setTimeout(() => {
        addLog(`[NitroStack MCP] @Tool check_inventory("${scenario.sop.requiredParts[0].split(' ')[0]}")`);
      }, 1400);

      setTimeout(() => {
        addLog(`[NitroStack MCP] @Tool create_work_order("${scenario.machineId}", "${scenario.generatedWorkOrder.issueSummary}") -> Created ${scenario.generatedWorkOrder.id}`);
        addLog(`[NitroStack MCP] @Tool estimate_production_impact("${scenario.machineId}", ${scenario.generatedWorkOrder.estimatedImpact.downtimeMinutes})`);

        // Add to work orders list if not existing
        setWorkOrders((prev) => {
          if (prev.some((w) => w.id === scenario.generatedWorkOrder.id)) return prev;
          return [scenario.generatedWorkOrder, ...prev];
        });

        setIsInvestigating(false);
        setActiveTab('investigation'); // Seamlessly navigate judge to AI Investigation panel
      }, 2000);
    }
  };

  // Custom Fault Injection Handler
  const handleCustomInject = async (machineId: string, sensor: string, value: number) => {
    addLog(`⚠️ CUSTOM FAULT INJECTED: ${machineId} sensor ${sensor} = ${value}`);

    setMachines((prev) =>
      prev.map((m) => {
        if (m.id === machineId) {
          const updated = {
            ...m,
            status: 'WARNING' as const,
            telemetry: {
              ...m.telemetry,
              [sensor]: value,
            },
          };
          if (selectedMachine.id === machineId) setSelectedMachine(updated);
          return updated;
        }
        return m;
      })
    );

    const customFinding: AnomalyFinding = {
      id: `ANOM-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      machineId,
      machineName: machines.find((m) => m.id === machineId)?.name || machineId,
      sensor,
      value: `${value}`,
      threshold: 'Custom Baseline',
      severity: 'WARNING',
      correlationWindow: `45s Window #${Math.floor(1000 + Math.random() * 9000)}`,
      message: `Custom metric anomaly injected on ${machineId}: ${sensor} breached to ${value}`,
    };

    setAnomalies((prev) => [customFinding, ...prev]);
    setActiveTab('command');

    if (isBackendLive) {
      addLog(`[Live Mode] Routing custom fault to ForgeMind API Server...`);
      try {
        (apiService as any).baseUrl = backendUrl;
        const response = await apiService.injectFault({ machineId, sensor, value });
        if (response.success && response.result) {
          addLog(`[Live Mode] AI Verdict: ${response.result.recommended_action}`);
        } else {
          addLog(`[Live Mode Error] ${response.error}`);
        }
      } catch (err: any) {
        addLog(`[Live Mode Error] ${err.message}`);
      }
    }
  };

  // Update Work Order Status
  const handleUpdateWorkOrderStatus = (woId: string, newStatus: WorkOrder['status']) => {
    setWorkOrders((prev) =>
      prev.map((w) => (w.id === woId ? { ...w, status: newStatus } : w))
    );
    addLog(`📋 Work Order ${woId} status updated to ${newStatus}`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isBackendLive={isBackendLive}
        setIsBackendLive={setIsBackendLive}
        activeScenarioTitle={currentScenario?.title}
        onQuickSimulate={handleTriggerScenario}
      />

      {/* Main View Area */}
      <main style={{ flex: 1 }}>
        {activeTab === 'command' && (
          <CommandCenter
            machines={machines}
            selectedMachine={selectedMachine}
            setSelectedMachine={setSelectedMachine}
            anomalies={anomalies}
            onTriggerInvestigation={(machineId) => {
              const matchedScen = demoScenarios.find((s) => s.machineId === machineId) || demoScenarios[0];
              handleTriggerScenario(matchedScen.id);
            }}
          />
        )}

        {activeTab === 'investigation' && (
          <AIInvestigation
            activeScenarioTitle={currentScenario?.title}
            verificationSteps={currentScenario?.verificationSteps || demoScenarios[0].verificationSteps}
            sop={currentScenario?.sop || demoScenarios[0].sop}
            workOrder={currentScenario?.generatedWorkOrder || demoScenarios[0].generatedWorkOrder}
            isInvestigating={isInvestigating}
            onReRunInvestigation={() => handleTriggerScenario(currentScenario.id)}
            onOpenWorkOrderTab={() => setActiveTab('workorders')}
          />
        )}

        {activeTab === 'workorders' && (
          <WorkOrders
            workOrders={workOrders}
            activeWorkOrder={currentScenario?.generatedWorkOrder}
            onUpdateStatus={handleUpdateWorkOrderStatus}
          />
        )}

        {activeTab === 'demolab' && (
          <DemoLab
            scenarios={demoScenarios}
            machines={machines}
            onTriggerScenario={handleTriggerScenario}
            onCustomInject={handleCustomInject}
            isBackendLive={isBackendLive}
            setIsBackendLive={setIsBackendLive}
            backendUrl={backendUrl}
            setBackendUrl={setBackendUrl}
            wsUrl={wsUrl}
            setWsUrl={setWsUrl}
            logStream={logStream}
          />
        )}
      </main>

    </div>
  );
};

export default App;
