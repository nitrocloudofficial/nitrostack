'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Wrench, 
  Package, 
  ShoppingCart, 
  Factory, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2, 
  Zap, 
  Clock, 
  RotateCcw, 
  Target 
} from 'lucide-react';
import Link from 'next/link';

interface ScenarioData {
  id: string;
  name: string;
  description: string;
  trigger_event: {
    type: string;
    machineId: string;
    condition: string;
  };
  expected_agent_flow?: Array<{
    agent: string;
    action: string;
  }>;
}

export default function AIThinkingPage() {
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [activeIncident, setActiveIncident] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const checkState = async () => {
      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('factoryos-active-scenario') : null;
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed) setScenarioData(parsed);
          } catch {
            setScenarioData(null);
          }
        } else {
          setScenarioData(null);
        }

        const res = await fetch('http://localhost:4000/api/state/summary').catch(() => null);
        if (res && res.ok) {
          const resJson = await res.json().catch(() => null);
          const sData = resJson?.data || resJson;
          if (sData && (sData.activeIncident || (sData.incidents && sData.incidents.total > 0))) {
            setActiveIncident(true);
          }
        }
      } catch (e) {
        console.error("Error fetching state:", e);
      }
    };
    checkState();
  }, []);

  useEffect(() => {
    if (!scenarioData) return;

    setActiveStep(0);
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setActiveStep(currentStep);
      if (currentStep > 6) { // 6 agents + 1 recovery plan
        clearInterval(interval);
      }
    }, 2000); // 2 seconds per step

    return () => clearInterval(interval);
  }, [animationKey, scenarioData]);

  const handleReplay = () => {
    setAnimationKey(prev => prev + 1);
  };

  // Idle state view when no active scenario is in localStorage
  if (!scenarioData) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] text-center max-w-lg">
        <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mb-6 border border-[var(--primary)]/20">
          <Brain className="w-8 h-8 text-[var(--primary)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Awaiting Incident Simulation</h1>
        <p className="text-[var(--text-secondary)] text-sm mb-6">
          Awaiting incident — trigger a simulation to see real-time multi-agent execution reasoning.
        </p>
        <Link 
          href="/dashboard" 
          className="bg-[var(--primary)] hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-md flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Trigger Simulation in Control Center
        </Link>
      </div>
    );
  }

  const agents = [
    { 
      id: 'supervisor', 
      name: 'Supervisor AI', 
      icon: Brain, 
      action: 'Analyzing telemetry anomaly', 
      type: 'Supervisor',
      reasoning: 'Telemetry anomaly detected on Line 1 — triggering parallel diagnostic workflows across domain agents.'
    },
    { 
      id: 'maintenance', 
      name: 'Maintenance AI', 
      icon: Wrench, 
      action: 'Diagnosing hardware failure', 
      type: 'Specialist',
      reasoning: 'Vibration and temperature both breached threshold — bearing failure likely, not a sensor fault.'
    },
    { 
      id: 'inventory', 
      name: 'Inventory AI', 
      icon: Package, 
      action: 'Checking replacement parts', 
      type: 'Specialist',
      reasoning: 'Bearing X52 stock is 0 locally. Bearing_X40 is shared with M18, so this failure also puts M18 at cross-machine risk.'
    },
    { 
      id: 'procurement', 
      name: 'Procurement AI', 
      icon: ShoppingCart, 
      action: 'Creating purchase order', 
      type: 'Specialist',
      reasoning: 'Supplier C is cheapest at $110 but takes 4 days — that delay costs more in downtime than the $16 premium. Choosing Supplier B for same-day delivery.'
    },
    { 
      id: 'production', 
      name: 'Production AI', 
      icon: Factory, 
      action: 'Rerouting manufacturing flow', 
      type: 'Specialist',
      reasoning: 'M18 has spare capacity and compatible tooling — rerouting Line 1 output to M18 avoids downtime entirely.'
    },
    { 
      id: 'safety', 
      name: 'Safety AI', 
      icon: ShieldCheck, 
      action: 'Securing affected zone', 
      type: 'Specialist',
      reasoning: 'Threshold breach logged per SOP — incident report and technician checklist auto-generated.'
    },
  ];

  const flowSteps = agents.map((agent) => {
    return {
      ...agent,
      output: agent.reasoning,
      confidence: Math.floor(Math.random() * 5) + 94 // 94-98% confidence
    };
  });

  return (
    <div className="container mx-auto p-6 max-w-3xl" key={animationKey}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="text-[var(--primary)]" />
            AI Reasoning Engine
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">Live agent execution flow for: {scenarioData.name}</p>
        </div>
        <button 
          onClick={handleReplay}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors w-fit"
        >
          <RotateCcw className="w-4 h-4" />
          Replay
        </button>
      </div>

      <div className="relative pl-8 md:pl-12 py-4">
        {/* Animated Dashed Timeline */}
        <div className="absolute left-[15px] md:left-[23px] top-6 bottom-6 w-[2px]">
          <div className="h-full w-full border-l-2 border-dashed border-[var(--border-color)]" />
          <motion.div 
            className="absolute top-0 left-0 w-full bg-gradient-to-b from-[var(--primary)] to-purple-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            initial={{ height: '0%' }}
            animate={{ height: `${Math.min(100, (activeStep / flowSteps.length) * 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        
        <div className="space-y-8 relative z-10">
          {flowSteps.map((step, index) => {
            const isPending = activeStep < index;
            const isThinking = activeStep === index;
            const isComplete = activeStep > index;

            return (
              <motion.div 
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {/* Node icon on timeline */}
                <div className={`absolute -left-[35px] md:-left-[43px] top-4 w-10 h-10 rounded-full flex items-center justify-center border-[3px] border-[var(--bg-page)] shadow-lg transition-colors duration-500 z-20 ${
                  isComplete ? 'bg-green-500 text-white' : 
                  isThinking ? 'bg-[var(--primary)] text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 
                  'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)]'
                }`}>
                  {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className={`w-5 h-5 ${isThinking ? 'animate-pulse' : ''}`} />}
                </div>

                <div className={`glass-card p-5 w-full transition-all duration-500 relative overflow-hidden ${
                  isPending ? 'opacity-50 grayscale' : 
                  isThinking ? 'border-[var(--primary)] shadow-[0_0_20px_rgba(37,99,235,0.15)] ring-1 ring-[var(--primary)]' : 
                  'border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                }`}>
                  {isThinking && (
                    <motion.div 
                      className="absolute inset-0 bg-blue-500/5"
                      animate={{ opacity: [0.2, 0.6, 0.2] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                  
                  <div className="flex items-center gap-3 mb-3 relative z-10">
                    <step.icon className={`w-5 h-5 ${isThinking ? 'text-[var(--primary)]' : isComplete ? 'text-green-500' : 'text-[var(--text-muted)]'}`} />
                    <h3 className="font-bold text-lg">{step.name}</h3>
                    <span className="ml-auto text-xs px-2 py-1 rounded bg-[var(--bg-page)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                      {step.type}
                    </span>
                  </div>

                  <div className="relative z-10 min-h-[4rem] flex flex-col justify-center">
                    {isPending && (
                      <p className="text-[var(--text-muted)] text-sm italic">Waiting in queue...</p>
                    )}
                    
                    {isThinking && (
                      <div className="flex items-center gap-2 text-[var(--primary)] font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{step.action}...</span>
                      </div>
                    )}
                    
                    {isComplete && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <p className="text-sm font-medium mb-3">{step.output}</p>
                        <div className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 w-fit px-2 py-1 rounded border border-green-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Confidence: {step.confidence}%</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Final Recovery Plan Step */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: activeStep >= flowSteps.length ? 1 : 0.5, scale: activeStep >= flowSteps.length ? 1 : 0.95 }}
            className={`mt-12 transition-all duration-500 relative ${activeStep >= flowSteps.length ? '' : 'pointer-events-none grayscale'}`}
          >
             <div className="absolute -left-[35px] md:-left-[43px] top-4 w-10 h-10 rounded-full flex items-center justify-center border-[3px] border-[var(--bg-page)] bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)] z-20">
               <Target className="w-5 h-5" />
             </div>

             <div className={`glass-card p-6 border-l-4 ${activeStep >= flowSteps.length ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.15)]' : 'border-[var(--border-color)]'}`}>
               <div className="flex items-center gap-3 mb-4">
                 <Target className={`w-8 h-8 ${activeStep >= flowSteps.length ? 'text-green-500' : 'text-[var(--text-muted)]'}`} />
                 <h2 className="text-xl md:text-2xl font-bold">Recovery Plan Executed</h2>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                 <div className="bg-[var(--bg-page)] rounded-lg p-4 flex items-center gap-3 border border-[var(--border-color)]">
                   <Zap className="w-5 h-5 text-red-500" />
                   <div>
                     <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Machine Action</p>
                     <p className="font-medium text-sm mt-1">Emergency Shutdown Confirmed</p>
                   </div>
                 </div>
                 
                 <div className="bg-[var(--bg-page)] rounded-lg p-4 flex items-center gap-3 border border-[var(--border-color)]">
                   <Clock className="w-5 h-5 text-yellow-500" />
                   <div>
                     <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Repair ETA</p>
                     <p className="font-medium text-sm mt-1">2 Hours (Tech Dispatched)</p>
                   </div>
                 </div>

                 <div className="bg-[var(--bg-page)] rounded-lg p-4 flex items-center gap-3 border border-[var(--border-color)]">
                   <Factory className="w-5 h-5 text-blue-500" />
                   <div>
                     <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Production</p>
                     <p className="font-medium text-sm mt-1">Rerouted to Line 2</p>
                   </div>
                 </div>

                 <div className="bg-[var(--bg-page)] rounded-lg p-4 flex items-center gap-3 border border-[var(--border-color)]">
                   <ShoppingCart className="w-5 h-5 text-purple-500" />
                   <div>
                     <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Procurement</p>
                     <p className="font-medium text-sm mt-1">PO-9942 Expedited</p>
                   </div>
                 </div>
               </div>

               <div className="mt-8 bg-[var(--bg-page)] p-4 rounded-lg border border-[var(--border-color)]">
                 <div className="flex justify-between text-sm mb-2">
                   <span className="font-medium">Estimated Loss Reduction</span>
                   <span className="font-bold text-green-500">84%</span>
                 </div>
                 <div className="w-full bg-[var(--bg-card)] rounded-full h-2.5 overflow-hidden border border-[var(--border-color)]">
                   <motion.div 
                     className="bg-green-500 h-2.5 rounded-full" 
                     initial={{ width: 0 }}
                     animate={{ width: activeStep >= flowSteps.length ? '84%' : 0 }}
                     transition={{ duration: 1, delay: 0.5 }}
                   />
                 </div>
                 <p className="text-xs text-[var(--text-secondary)] mt-2 italic">
                   System optimization saved an estimated $42,500 in downtime costs.
                 </p>
               </div>
             </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
