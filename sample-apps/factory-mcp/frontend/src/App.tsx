import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Upload, 
  TrendingUp, 
  Wrench, 
  Cpu, 
  Download, 
  Send, 
  RefreshCw, 
  HelpCircle, 
  ShieldAlert, 
  ChevronRight, 
  Briefcase,
  Play,
  FileCode,
  Check
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Interfaces
interface Machine {
  machine_id: string;
  machine_name: string;
  location: string;
  status: 'healthy' | 'warning' | 'critical';
}

interface MaintenanceLog {
  id?: number;
  machine_id: string;
  date: string;
  issue: string;
  repair: string;
  engineer: string;
}

interface ProductionSchedule {
  machine_id: string;
  product: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high';
  machine_name?: string;
  status?: string;
}

interface Anomaly {
  timestamp: string;
  temperature: number;
  vibration: number;
  current: number;
  voltage: number;
  issues: string[];
}

export default function App() {
  // Tabs: 'dashboard' | 'analysis' | 'investigation' | 'report' | 'chat'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'investigation' | 'report' | 'chat'>('dashboard');
  
  // Data States
  const [machines, setMachines] = useState<Machine[]>([
    { machine_id: 'MCH-001', machine_name: 'CNC Milling Machine', location: 'Assembly Bay A', status: 'healthy' },
    { machine_id: 'MCH-002', machine_name: 'Robotic Welder', location: 'Welding Cell B', status: 'warning' },
    { machine_id: 'MCH-003', machine_name: 'Injection Molder', location: 'Plastics Bay C', status: 'healthy' },
    { machine_id: 'MCH-004', machine_name: 'Conveyor System', location: 'Packaging Line 1', status: 'critical' },
    { machine_id: 'MCH-005', machine_name: 'Hydraulic Press', location: 'Heavy Press Bay D', status: 'healthy' }
  ]);

  const [selectedMachine, setSelectedMachine] = useState<string>('MCH-004');
  const [filesUploaded, setFilesUploaded] = useState<{ sensor: boolean; manual: boolean; history: boolean }>({
    sensor: false,
    manual: false,
    history: false
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  
  // Anomaly data loaded from sensor CSV
  const [sensorStats, setSensorStats] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceLog[]>([]);
  const [manualExcerpt, setManualExcerpt] = useState<string>('');
  
  // Diagnosis states
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [businessImpact, setBusinessImpact] = useState<any>(null);
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [workOrderCreated, setWorkOrderCreated] = useState(false);
  const [assignedEngineer, setAssignedEngineer] = useState('Alex Mercer');
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high' | 'emergency'>('emergency');
  
  // Chat States (NitroChat)
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Hello! I am your FactoryLens AI Assistant. How can I help you investigate machine telemetry and maintenance history today?' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Weather data
  const [weatherData, setWeatherData] = useState<any>({
    temp: 34,
    humidity: 87,
    description: 'Scattered Showers'
  });

  // Chart Data
  const telemetryData = {
    labels: ['09:00', '09:10', '09:20', '09:30', '09:40', '09:50', '10:00', '10:10', '10:20', '10:30', '10:40', '10:50'],
    datasets: [
      {
        label: 'Temperature (°C)',
        data: [42.5, 45.2, 48.0, 51.1, 54.8, 58.2, 61.5, 63.9, 66.1, 68.4, 70.8, 72.5],
        borderColor: '#aa3bff',
        backgroundColor: 'rgba(170, 59, 255, 0.08)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'Vibration (mm/s)',
        data: [1.2, 1.3, 1.5, 1.8, 2.1, 2.4, 2.5, 2.8, 3.2, 3.5, 3.7, 3.9],
        borderColor: '#06b6d4',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        yAxisID: 'y1'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#9ca3af'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#9ca3af'
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#9ca3af'
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: '#f3f4f6'
        }
      }
    }
  };

  // Trigger simulated files uploads
  const simulateUpload = (type: 'sensor' | 'manual' | 'history') => {
    setFilesUploaded(prev => ({ ...prev, [type]: true }));
  };

  const triggerMockAnalysis = () => {
    if (!filesUploaded.sensor || !filesUploaded.manual) {
      alert('Please upload both the Sensor CSV and Machine Manual PDF to begin investigation.');
      return;
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisDone(true);
      
      // Load MCH-004 Anomaly Specs
      setSensorStats({
        total_records: 12,
        averages: { temperature: 58.6, vibration: 2.5, current: 5.3 },
        maximums: { temperature: 72.5, vibration: 3.9, current: 6.5 }
      });

      setAnomalies([
        { timestamp: '10:20', temperature: 66.1, vibration: 3.2, current: 6.0, voltage: 229.6, issues: ['Overheating: 66.1°C exceeds limit of 65°C', 'High Vibration: 3.2 mm/s exceeds limit of 2.5 mm/s'] },
        { timestamp: '10:30', temperature: 68.4, vibration: 3.5, current: 6.1, voltage: 230.2, issues: ['Overheating: 68.4°C exceeds limit of 65°C', 'High Vibration: 3.5 mm/s exceeds limit of 2.5 mm/s'] },
        { timestamp: '10:40', temperature: 70.8, vibration: 3.7, current: 6.3, voltage: 229.8, issues: ['Overheating: 70.8°C exceeds limit of 65°C', 'High Vibration: 3.7 mm/s exceeds limit of 2.5 mm/s', 'Overcurrent: 6.3A exceeds limit of 5.5A'] },
        { timestamp: '10:50', temperature: 72.5, vibration: 3.9, current: 6.5, voltage: 230.0, issues: ['Overheating: 72.5°C exceeds limit of 65°C', 'High Vibration: 3.9 mm/s exceeds limit of 2.5 mm/s', 'Overcurrent: 6.5A exceeds limit of 5.5A'] }
      ]);

      setMaintenanceHistory([
        { machine_id: 'MCH-004', date: '2026-07-16', issue: 'Motor overheating alert', repair: 'Inspected cooling fan, cleaned dust accumulation. Temp still high.', engineer: 'Alex Mercer' },
        { machine_id: 'MCH-004', date: '2026-07-10', issue: 'Conveyor belt slip', repair: 'Tensioned belt and replaced drive pulley wheel', engineer: 'Alex Mercer' }
      ]);

      setManualExcerpt(`TROUBLESHOOTING GUIDE: CODE E101: Motor Overheating. Cause: High ambient temperature, fan clog, or drive belt slippage. Action: Clean cooling fan, check drive pulley tension, check lubrication. CODE E102: Belt Slippage. Cause: Drive pulley wear or low tension. Action: Tension belt, inspect drive pulley.`);
      
      // Perform diagnosis synthesis
      setDiagnosisResult({
        root_cause: 'Drive Belt Slippage causing severe friction in the drive motor. The high load due to slippage is drawing excessive current, causing motor coil overheating, which is further exacerbated by the high ambient humidity levels.',
        confidence_score: 0.92,
        evidence: [
          'Sensor data shows temperature rising to 72.5°C, exceeding safety limit of 65.0°C.',
          'Vibration levels climbed to 3.9 mm/s, well above the 2.5 mm/s limit.',
          'Current draw spiked to 6.5A, exceeding the normal max limit of 5.5A.',
          'Maintenance log from 2026-07-16 indicates motor overheating and belt slip inspection.',
          `External high humidity (${weatherData.humidity}%) combined with indoor humidity is known to reduce drive pulley traction, aggravating slippage.`
        ],
        recommendations: [
          'Immediate emergency shutdown of Conveyor System MCH-004.',
          'Inspect and replace the slipping drive belt.',
          'Clean and check the drive motor cooling fan for dust/blockages.',
          'Apply tensioner adjustments and verify drive pulley alignment.'
        ]
      });

      setBusinessImpact({
        product: 'Product Box Packing',
        quantity_pending: 1500,
        production_priority: 'high',
        estimated_downtime_hours: 3,
        estimated_production_loss_inr: 36000,
        risk_level: 'critical'
      });

      // Switch to analysis tab
      setActiveTab('analysis');
    }, 2000);
  };

  const handleCreateWorkOrder = () => {
    setWorkOrder({
      work_order_id: 1047,
      machine_id: 'MCH-004',
      issue: 'Critical drive belt slippage causing motor overheating and high vibration.',
      assigned_engineer: assignedEngineer,
      date_created: new Date().toISOString().split('T')[0],
      status: 'pending'
    });
    setWorkOrderCreated(true);
    
    // Update MCH-004 status to critical
    setMachines(prev => prev.map(m => m.machine_id === 'MCH-004' ? { ...m, status: 'critical' } : m));
  };

  // Handle chat messaging (NitroChat client)
  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userMsg = userInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setUserInput('');
    setChatLoading(true);

    setTimeout(() => {
      let botResponse = "I can retrieve details from the database or manuals. Please make sure to complete the sensor telemetry analysis first so I have context.";
      
      const query = userMsg.toLowerCase();
      if (query.includes('explain') && query.includes('technician')) {
        botResponse = `🔧 **FIELD TECHNICAL ADVISORY: MCH-004**
        
**Issue Diagnosed:**
Drive Belt Slippage causing severe friction in the drive motor. The high load due to slippage is drawing excessive current, causing motor coil overheating, which is further exacerbated by the high ambient humidity levels.

**Recommended Corrective Action Plan:**
1. Immediate emergency shutdown of Conveyor System MCH-004.
2. Inspect and replace the slipping drive belt.
3. Clean and check the drive motor cooling fan for dust/blockages.
4. Apply tensioner adjustments and verify drive pulley alignment.

**Field Guidelines:**
- Ensure lock-out/tag-out (LOTO) safety protocols are fully completed before opening any panels.
- Refer to model specifications for exact belt tension levels and bearing alignment settings.
- Log your repairs, part numbers used, and completion timestamps in the database after resolution.`;
      } else if (query.includes('summarize') && (query.includes('manager') || query.includes('business'))) {
        botResponse = `📊 **EXECUTIVE SUMMARY: MCH-004 FAILURE IMPACT**

Dear Manager,
We have flagged a critical event on **MCH-004**. Below is the immediate risk assessment:

- **Estimated Downtime:** 3 Hours
- **Estimated Financial Impact:** ₹36,000 INR
- **Batch Priority:** HIGH (Product Box Packing)

**Operational Advice:**
Due to the **HIGH** priority level of the queue, we recommend redirecting pending production capacity to standby units immediately if the downtime is expected to exceed the buffer window. A maintenance work order has been created and dispatched to the field crew.`;
      } else if (query.includes('shutdown') || query.includes('emergency')) {
        botResponse = `⚠️ **CRITICAL EMERGENCY SHUTDOWN ADVISORY: MCH-004**

**REASON FOR ADVISORY:**
A telemetry sensor has breached the absolute maximum safety threshold.
- **Breached Metric:** Temperature (72.5°C), Vibration (3.9 mm/s), Current (6.5A)

**IMMEDIATE COMMANDS:**
1. **POWER DOWN**: Press the physical E-Stop or trigger a soft-stop via the control PLC immediately.
2. **ISOLATE**: Perform Lock-Out Tag-Out (LOTO) on main circuit breaker panel #4.
3. **EVACUATE**: Keep all personnel clear of the drive belt housing until the drive assembly cools down completely.
4. **DISPATCH**: Notify the maintenance lead engineer (Alex Mercer) immediately.`;
      } else if (query.includes('history') || query.includes('maintenance')) {
        botResponse = `According to the SQLite database, machine **MCH-004** has had 2 recent maintenance logs:
1. **2026-07-16**: Motor overheating alert. Inspected cooling fan, cleaned dust accumulation. Temp still high. (Engineer: Alex Mercer)
2. **2026-07-10**: Conveyor belt slip. Tensioned belt and replaced drive pulley wheel. (Engineer: Alex Mercer)`;
      } else if (query.includes('manual') || query.includes('spec')) {
        botResponse = `According to the CS-400 Maintenance Manual:
- **Normal Temp:** 20°C to 55°C (Max: 65°C)
- **Normal Vibration:** 0.1 to 2.5 mm/s (RMS)
- **Normal Current:** 4.0A to 5.5A
- **Code E101 (Motor Overheating)** lists drive belt slippage or cooling fan blockages as main causes.`;
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
      setChatLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-gray-100 flex flex-col font-sans selection:bg-[#aa3bff]/30 selection:text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0f1118]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#aa3bff]/20 p-2.5 rounded-xl border border-[#aa3bff]/40 shadow-[0_0_15px_rgba(170,59,255,0.2)]">
            <Cpu className="w-6 h-6 text-[#aa3bff]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white m-0 flex items-center gap-2">
              FactoryLens <span className="text-xs bg-[#aa3bff]/20 text-[#aa3bff] border border-[#aa3bff]/30 px-2 py-0.5 rounded-full font-mono">MCP v1.0</span>
            </h1>
            <p className="text-xs text-gray-400">AI-Powered Factory Anomaly Investigation Console</p>
          </div>
        </div>

        {/* Staging environment indicator & Weather widget */}
        <div className="flex items-center gap-4">
          <div className="glass px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-gray-300">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
            <span>Local Weather: <b>{weatherData.temp}°C, {weatherData.humidity}% Humid</b></span>
          </div>
          <div className="flex bg-[#161922] p-1 rounded-lg border border-gray-800">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'dashboard' ? 'bg-[#aa3bff] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => { if (analysisDone) setActiveTab('analysis'); else alert('Perform investigation analysis first.'); }} 
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'analysis' ? 'bg-[#aa3bff] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Sensor Analytics
            </button>
            <button 
              onClick={() => { if (analysisDone) setActiveTab('investigation'); else alert('Perform investigation analysis first.'); }} 
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'investigation' ? 'bg-[#aa3bff] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Investigation
            </button>
            <button 
              onClick={() => { if (workOrderCreated) setActiveTab('report'); else alert('Create a work order first.'); }} 
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'report' ? 'bg-[#aa3bff] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Reports
            </button>
            <button 
              onClick={() => setActiveTab('chat')} 
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'chat' ? 'bg-[#aa3bff] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              NitroChat
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Machine Status List & Upload Hub */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Machine Inventory Card */}
          <div className="glass rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Machine Fleet</span>
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full font-mono">{machines.length} Units</span>
            </h2>
            <div className="flex flex-col gap-2">
              {machines.map((m) => (
                <div 
                  key={m.machine_id}
                  onClick={() => setSelectedMachine(m.machine_id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${selectedMachine === m.machine_id ? 'bg-[#aa3bff]/10 border-[#aa3bff]/60 shadow-[0_0_10px_rgba(170,59,255,0.05)]' : 'bg-[#12141a]/60 border-gray-800 hover:bg-[#12141a]'}`}
                >
                  <div>
                    <h3 className="text-sm font-semibold text-white">{m.machine_name}</h3>
                    <p className="text-xs text-gray-400">{m.machine_id} • {m.location}</p>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full ${m.status === 'healthy' ? 'bg-green-500' : (m.status === 'warning' ? 'bg-amber-500' : 'bg-red-500 animate-pulse')}`}></span>
                </div>
              ))}
            </div>
          </div>

          {/* Upload Hub Card */}
          <div className="glass rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#aa3bff]" />
              <span>Telemetry Upload Hub</span>
            </h2>
            <p className="text-xs text-gray-400 mb-4">Upload the sensor CSV files and the machine PDF manuals to feed data to the MCP server.</p>
            
            <div className="flex flex-col gap-3">
              {/* File 1: Sensor CSV */}
              <button 
                onClick={() => simulateUpload('sensor')}
                className={`w-full py-2.5 px-3 rounded-lg border text-left flex items-center justify-between transition-all ${filesUploaded.sensor ? 'bg-green-950/20 border-green-800 text-green-300' : 'bg-[#12141a] border-gray-800 hover:border-gray-700 text-gray-300'}`}
              >
                <div className="flex items-center gap-2.5">
                  <FileCode className={`w-4 h-4 ${filesUploaded.sensor ? 'text-green-400' : 'text-gray-400'}`} />
                  <span className="text-xs font-medium">Sensor CSV (anomaly logs)</span>
                </div>
                {filesUploaded.sensor ? <Check className="w-4 h-4 text-green-400" /> : <Upload className="w-4 h-4 text-gray-500" />}
              </button>

              {/* File 2: Manual PDF */}
              <button 
                onClick={() => simulateUpload('manual')}
                className={`w-full py-2.5 px-3 rounded-lg border text-left flex items-center justify-between transition-all ${filesUploaded.manual ? 'bg-green-950/20 border-green-800 text-green-300' : 'bg-[#12141a] border-gray-800 hover:border-gray-700 text-gray-300'}`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className={`w-4 h-4 ${filesUploaded.manual ? 'text-green-400' : 'text-gray-400'}`} />
                  <span className="text-xs font-medium">Machine Manual PDF</span>
                </div>
                {filesUploaded.manual ? <Check className="w-4 h-4 text-green-400" /> : <Upload className="w-4 h-4 text-gray-500" />}
              </button>

              {/* File 3: Maintenance Logs */}
              <button 
                onClick={() => simulateUpload('history')}
                className={`w-full py-2.5 px-3 rounded-lg border text-left flex items-center justify-between transition-all ${filesUploaded.history ? 'bg-green-950/20 border-green-800 text-green-300' : 'bg-[#12141a] border-gray-800 hover:border-gray-700 text-gray-300'}`}
              >
                <div className="flex items-center gap-2.5">
                  <Wrench className={`w-4 h-4 ${filesUploaded.history ? 'text-green-400' : 'text-gray-400'}`} />
                  <span className="text-xs font-medium">Maintenance History (Optional)</span>
                </div>
                {filesUploaded.history ? <Check className="w-4 h-4 text-green-400" /> : <Upload className="w-4 h-4 text-gray-500" />}
              </button>
            </div>

            <button 
              onClick={triggerMockAnalysis}
              disabled={isAnalyzing}
              className="w-full mt-5 bg-[#aa3bff] hover:bg-[#b854ff] active:bg-[#992eed] disabled:bg-gray-800 disabled:text-gray-500 text-white font-medium text-sm py-2.5 rounded-lg transition-all shadow-[0_4px_15px_rgba(170,59,255,0.2)] flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing Logs...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run MCP Diagnostics</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column (Tabs Content) */}
        <div className="lg:col-span-3 flex flex-col gap-6">

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              
              {/* Metrics Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Active Machines</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">5</h3>
                  </div>
                  <Cpu className="w-8 h-8 text-[#aa3bff] opacity-80" />
                </div>

                <div className="glass rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Operational</p>
                    <h3 className="text-2xl font-bold mt-1 text-green-400">3</h3>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500 opacity-80" />
                </div>

                <div className="glass rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Warnings</p>
                    <h3 className="text-2xl font-bold mt-1 text-amber-400">1</h3>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-amber-500 opacity-80" />
                </div>

                <div className="glass rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Critical Failures</p>
                    <h3 className="text-2xl font-bold mt-1 text-red-500">1</h3>
                  </div>
                  <ShieldAlert className="w-8 h-8 text-red-500 opacity-80" />
                </div>
              </div>

              {/* Status Alert Banner */}
              <div className="p-4 rounded-xl border border-red-950 bg-red-950/20 text-red-200 flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm text-white">Critical Alert: MCH-004 (Conveyor System) Telemetry Breach</h4>
                    <p className="text-xs text-red-300 mt-1">
                      Sensor limits breached: Motor coil temp reached 72.5°C (max allowed: 65°C), vibration spiked to 3.9 mm/s. Immediate maintenance inspection required.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setFilesUploaded({ sensor: true, manual: true, history: true });
                    triggerMockAnalysis();
                  }}
                  className="bg-red-800/80 hover:bg-red-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-all"
                >
                  Analyze Telemetry
                </button>
              </div>

              {/* Charts Section */}
              <div className="glass rounded-xl p-5">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#aa3bff]" />
                  <span>Telemetry Analytics: MCH-004 Conveyor Motor</span>
                </h2>
                <div className="h-80 w-full flex items-center justify-center">
                  <Line data={telemetryData} options={chartOptions} />
                </div>
              </div>

              {/* Active Jobs Table */}
              <div className="glass rounded-xl p-5">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#06b6d4]" />
                  <span>Pending Production Schedule</span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400">
                        <th className="py-2.5 px-4">Machine ID</th>
                        <th className="py-2.5 px-4">Active Product</th>
                        <th className="py-2.5 px-4">Priority</th>
                        <th className="py-2.5 px-4">Quantity Target</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-900 bg-[#12141c]/40">
                        <td className="py-3 px-4 font-mono font-bold text-white">MCH-004</td>
                        <td className="py-3 px-4">Product Box Packing</td>
                        <td className="py-3 px-4"><span className="bg-red-950 text-red-400 border border-red-900/50 px-2 py-0.5 rounded-full font-bold">HIGH</span></td>
                        <td className="py-3 px-4">1,500 units</td>
                        <td className="py-3 px-4"><span className="text-red-500 font-medium animate-pulse">STOPPED</span></td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="py-3 px-4 font-mono text-gray-300">MCH-001</td>
                        <td className="py-3 px-4">Automotive Gear G1</td>
                        <td className="py-3 px-4"><span className="bg-amber-950 text-amber-400 border border-amber-900/50 px-2 py-0.5 rounded-full font-medium">MEDIUM</span></td>
                        <td className="py-3 px-4">500 units</td>
                        <td className="py-3 px-4 text-green-400">RUNNING</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="py-3 px-4 font-mono text-gray-300">MCH-002</td>
                        <td className="py-3 px-4">Car Chassis Frame C-4</td>
                        <td className="py-3 px-4"><span className="bg-red-950 text-red-400 border border-red-900/50 px-2 py-0.5 rounded-full font-bold">HIGH</span></td>
                        <td className="py-3 px-4">120 units</td>
                        <td className="py-3 px-4 text-amber-400">WARNING</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="py-3 px-4 font-mono text-gray-300">MCH-003</td>
                        <td className="py-3 px-4">Plastic Casing P-9</td>
                        <td className="py-3 px-4"><span className="bg-blue-950 text-blue-400 border border-blue-900/50 px-2 py-0.5 rounded-full font-medium">LOW</span></td>
                        <td className="py-3 px-4">2,000 units</td>
                        <td className="py-3 px-4 text-green-400">RUNNING</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SENSOR ANALYTICS */}
          {activeTab === 'analysis' && sensorStats && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="glass rounded-xl p-5 border-l-4 border-[#aa3bff]">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Average Temperature</p>
                  <h3 className="text-xl font-bold mt-1 text-white">{sensorStats.averages.temperature}°C</h3>
                  <p className="text-xs text-red-400 mt-1">Peak: {sensorStats.maximums.temperature}°C (Limit: 65°C)</p>
                </div>
                <div className="glass rounded-xl p-5 border-l-4 border-[#06b6d4]">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Average Vibration</p>
                  <h3 className="text-xl font-bold mt-1 text-white">{sensorStats.averages.vibration} mm/s</h3>
                  <p className="text-xs text-red-400 mt-1">Peak: {sensorStats.maximums.vibration} mm/s (Limit: 2.5)</p>
                </div>
                <div className="glass rounded-xl p-5 border-l-4 border-amber-500">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Average Current</p>
                  <h3 className="text-xl font-bold mt-1 text-white">{sensorStats.averages.current} A</h3>
                  <p className="text-xs text-red-400 mt-1">Peak: {sensorStats.maximums.current} A (Limit: 5.5)</p>
                </div>
              </div>

              {/* Anomaly Log */}
              <div className="glass rounded-xl p-5">
                <h2 className="text-base font-semibold text-white mb-4">Detected Telemetry Anomalies (MCP analyzeSensor output)</h2>
                <div className="flex flex-col gap-3">
                  {anomalies.map((a, index) => (
                    <div key={index} className="p-3 bg-[#161822]/60 rounded-lg border border-red-950/60 flex items-start gap-4">
                      <div className="bg-red-950 text-red-400 p-2 rounded-lg font-mono text-xs font-bold">
                        {a.timestamp}
                      </div>
                      <div className="flex-1">
                        <div className="grid grid-cols-4 gap-2 text-xs text-gray-400 mb-2">
                          <div>Temp: <span className="text-red-400 font-bold">{a.temperature}°C</span></div>
                          <div>Vib: <span className="text-red-400 font-bold">{a.vibration} mm/s</span></div>
                          <div>Current: <span className="text-red-400 font-bold">{a.current}A</span></div>
                          <div>Voltage: <span className="text-gray-300">{a.voltage}V</span></div>
                        </div>
                        <ul className="text-xs text-gray-300 list-disc pl-4 space-y-0.5">
                          {a.issues.map((i, idx) => (
                            <li key={idx} className="text-red-200">{i}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setActiveTab('investigation')} 
                  className="bg-[#aa3bff] hover:bg-[#b854ff] text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-all flex items-center gap-2"
                >
                  <span>Synthesize Root Cause</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: INVESTIGATION */}
          {activeTab === 'investigation' && diagnosisResult && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Diagnosed Root Cause Card */}
                <div className="glass rounded-xl p-5 md:col-span-2 flex flex-col gap-4">
                  <div>
                    <span className="text-[10px] bg-[#aa3bff]/20 text-[#aa3bff] border border-[#aa3bff]/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">MCP rootCause Output</span>
                    <h2 className="text-lg font-bold text-white mt-2">Diagnosed Root Cause</h2>
                  </div>
                  
                  <p className="text-sm text-gray-300 bg-[#12141c] p-4 rounded-lg border border-gray-800 leading-relaxed">
                    {diagnosisResult.diagnosis.root_cause}
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-400">AI Confidence Score:</div>
                    <div className="w-32 bg-gray-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full" style={{ width: `${diagnosisResult.diagnosis.confidence_score * 100}%` }}></div>
                    </div>
                    <div className="text-sm font-mono font-bold text-[#aa3bff]">
                      {Math.round(diagnosisResult.diagnosis.confidence_score * 100)}%
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Backing Evidence Synthesized</h4>
                    <ul className="text-xs text-gray-300 space-y-2 pl-2">
                      {diagnosisResult.diagnosis.evidence.map((ev: string, idx: number) => (
                        <li key={idx} className="flex gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#aa3bff] shrink-0" />
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Business Impact & Dispatch */}
                <div className="flex flex-col gap-6">
                  {/* Business Impact Card */}
                  <div className="glass rounded-xl p-5 flex flex-col gap-4">
                    <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Business Impact Estimation</h2>
                    
                    <div className="flex flex-col gap-3 text-xs">
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span className="text-gray-400">Target Line:</span>
                        <span className="font-semibold text-white">{businessImpact.product}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span className="text-gray-400">Batch Priority:</span>
                        <span className="font-bold text-red-400">HIGH</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span className="text-gray-400">Downtime Estimate:</span>
                        <span className="font-semibold text-white">{businessImpact.estimated_downtime_hours} Hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Estimated Revenue Loss:</span>
                        <span className="font-bold text-red-400">₹{businessImpact.estimated_production_loss_inr.toLocaleString('en-IN')} INR</span>
                      </div>
                    </div>
                  </div>

                  {/* Dispatch Work Order */}
                  <div className="glass rounded-xl p-5 flex flex-col gap-4">
                    <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Create Work Order</h2>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-gray-400 uppercase">Assigned Engineer</label>
                      <select 
                        value={assignedEngineer}
                        onChange={(e) => setAssignedEngineer(e.target.value)}
                        className="bg-[#12141c] border border-gray-800 rounded-lg text-xs py-2 px-3 focus:border-[#aa3bff] focus:outline-none"
                      >
                        <option value="Alex Mercer">Alex Mercer (Mechanical Systems)</option>
                        <option value="Sarah Connor">Sarah Connor (Electronics Engineer)</option>
                        <option value="John Doe">John Doe (Robot Specialist)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-gray-400 uppercase">Priority / Urgency</label>
                      <select 
                        value={urgencyLevel}
                        onChange={(e: any) => setUrgencyLevel(e.target.value)}
                        className="bg-[#12141c] border border-gray-800 rounded-lg text-xs py-2 px-3 focus:border-[#aa3bff] focus:outline-none"
                      >
                        <option value="emergency">Emergency Shutdown Required</option>
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                      </select>
                    </div>

                    <button 
                      onClick={handleCreateWorkOrder}
                      className="w-full bg-[#aa3bff] hover:bg-[#b854ff] text-white text-xs font-semibold py-2.5 rounded-lg transition-all"
                    >
                      Dispatch Crew (SQLite insert)
                    </button>
                    {workOrderCreated && (
                      <div className="text-[10px] text-green-400 text-center font-semibold">
                        ✔ Ticket Created! WO #{workOrder.work_order_id}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Recommendations Card */}
              <div className="glass rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Field Recommendations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {diagnosisResult.diagnosis.recommendations.map((rec: string, idx: number) => (
                    <div key={idx} className="p-3 bg-[#12141a]/60 border border-gray-800 rounded-lg flex items-center gap-3">
                      <div className="w-6 h-6 bg-[#aa3bff]/10 border border-[#aa3bff]/30 rounded-full flex items-center justify-center text-xs font-bold text-[#aa3bff]">
                        {idx + 1}
                      </div>
                      <span className="text-xs text-gray-200">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <button 
                  onClick={() => setActiveTab('analysis')}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm px-5 py-2.5 rounded-lg transition-all"
                >
                  Back to Analytics
                </button>
                {workOrderCreated && (
                  <button 
                    onClick={() => setActiveTab('report')}
                    className="bg-[#aa3bff] hover:bg-[#b854ff] text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-[0_4px_15px_rgba(170,59,255,0.2)]"
                  >
                    <span>Inspect Final Report</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: REPORTS */}
          {activeTab === 'report' && workOrder && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="glass rounded-xl p-6 flex flex-col gap-6 max-w-3xl mx-auto w-full border border-gray-800">
                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">FAILURE INVESTIGATION REPORT</h2>
                    <p className="text-xs text-gray-400">WO ID: #WO-{workOrder.work_order_id} | Date: {new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="bg-red-950/40 border border-red-900/50 text-red-400 font-mono text-xs px-3 py-1.5 rounded-full font-bold uppercase">
                    Status: Critical Deviation
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400">Asset Name:</span>
                    <p className="font-semibold text-white mt-0.5">Conveyor System MCH-004</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Location:</span>
                    <p className="font-semibold text-white mt-0.5">Packaging Line 1</p>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">1. Executive Summary</h4>
                  <p className="text-xs text-gray-300 leading-relaxed bg-[#12141c] p-3 rounded border border-gray-900">
                    An telemetry anomaly event occurred causing motor coil temperature, drive shaft vibration, and current loads to exceed normal ranges. Heuristic synthesis of sensor logs and product documents diagnoses a drive belt slippage causing motor overloading.
                  </p>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">2. Backing Evidence (Sensor & Maintenance Records)</h4>
                  <ul className="text-xs text-gray-300 list-disc pl-5 space-y-1">
                    {diagnosisResult.diagnosis.evidence.map((ev: string, idx: number) => (
                      <li key={idx}>{ev}</li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">3. Business Risk Matrix</h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[#12141c] p-2.5 rounded border border-gray-900">
                      <span className="text-gray-400 block mb-0.5">Downtime Estimate</span>
                      <strong className="text-white">3 Hours</strong>
                    </div>
                    <div className="bg-[#12141c] p-2.5 rounded border border-gray-900">
                      <span className="text-gray-400 block mb-0.5">Financial Impact</span>
                      <strong className="text-red-400">₹36,000 INR</strong>
                    </div>
                    <div className="bg-[#12141c] p-2.5 rounded border border-gray-900">
                      <span className="text-gray-400 block mb-0.5">Assigned Crew</span>
                      <strong className="text-white">{assignedEngineer}</strong>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">4. Corrective Action Directives</h4>
                  <ol className="text-xs text-gray-300 list-decimal pl-5 space-y-1">
                    {diagnosisResult.diagnosis.recommendations.map((rec: string, idx: number) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ol>
                </div>

                <div className="border-t border-gray-800 pt-4 flex justify-between items-center text-xs text-gray-400">
                  <span>Author: FactoryLens AI Engineer MCP</span>
                  <span>System: SQLite Seeding + Zod Schema Validation</span>
                </div>
              </div>

              {/* Download Report Actions */}
              <div className="flex justify-center gap-3">
                <a 
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                    `FACTORYLENS REPORT WO-${workOrder.work_order_id}\n\nAsset: MCH-004\nDiagnosis: ${diagnosisResult.diagnosis.root_cause}\nAssigned to: ${assignedEngineer}\nLoss: INR 36,000`
                  )}`}
                  download={`MCH-004_Investigation_Report.txt`}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm px-5 py-2.5 rounded-lg transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Text Report</span>
                </a>
                <button 
                  onClick={() => window.print()}
                  className="bg-[#aa3bff] hover:bg-[#b854ff] text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-[0_4px_15px_rgba(170,59,255,0.2)]"
                >
                  <FileText className="w-4 h-4" />
                  <span>Print / PDF Save</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: NITROCHAT INTERACTIVE PANEL */}
          {activeTab === 'chat' && (
            <div className="glass rounded-xl p-5 flex flex-col h-[520px] animate-fadeIn border border-gray-800">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse"></div>
                  <h3 className="text-sm font-semibold text-white">NitroChat Agent Console</h3>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Channel: #factory-mcp-prompts</span>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
                {chatMessages.map((msg, index) => (
                  <div 
                    key={index}
                    className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                  >
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider mb-1 font-mono">
                      {msg.role === 'user' ? 'Operator' : 'FactoryLens AI'}
                    </span>
                    <div 
                      className={`p-3 rounded-xl text-xs leading-relaxed whitespace-pre-line ${
                        msg.role === 'user' 
                          ? 'bg-[#aa3bff] text-white rounded-tr-none' 
                          : 'bg-[#161822]/90 text-gray-200 border border-gray-850 rounded-tl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="self-start flex flex-col items-start max-w-[85%]">
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider mb-1 font-mono">FactoryLens AI</span>
                    <div className="bg-[#161822]/90 border border-gray-850 p-3 rounded-xl rounded-tl-none text-xs text-gray-400 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#aa3bff]" />
                      <span>Retrieving manuals and database records...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions Prompts suggestions */}
              <div className="mt-4 pt-3 border-t border-gray-850 flex flex-wrap gap-2">
                <button 
                  onClick={() => setUserInput("Explain failure to Technician")}
                  className="bg-[#12141c]/80 hover:bg-[#aa3bff]/10 border border-gray-800 hover:border-[#aa3bff]/40 text-[10px] text-gray-300 hover:text-white px-2.5 py-1.5 rounded-full transition-all"
                >
                  Prompt: Explain to Technician
                </button>
                <button 
                  onClick={() => setUserInput("Summarize for Manager")}
                  className="bg-[#12141c]/80 hover:bg-[#aa3bff]/10 border border-gray-800 hover:border-[#aa3bff]/40 text-[10px] text-gray-300 hover:text-white px-2.5 py-1.5 rounded-full transition-all"
                >
                  Prompt: Summarize for Manager
                </button>
                <button 
                  onClick={() => setUserInput("Generate Emergency Shutdown Advisory")}
                  className="bg-[#12141c]/80 hover:bg-[#aa3bff]/10 border border-gray-800 hover:border-[#aa3bff]/40 text-[10px] text-gray-300 hover:text-white px-2.5 py-1.5 rounded-full transition-all"
                >
                  Prompt: Emergency Shutdown
                </button>
                <button 
                  onClick={() => setUserInput("List recent maintenance history for MCH-004")}
                  className="bg-[#12141c]/80 hover:bg-[#aa3bff]/10 border border-gray-800 hover:border-[#aa3bff]/40 text-[10px] text-gray-300 hover:text-white px-2.5 py-1.5 rounded-full transition-all"
                >
                  DB: Maintenance Log
                </button>
              </div>

              {/* Input Form */}
              <form onSubmit={sendChatMessage} className="mt-3 flex gap-2">
                <input 
                  type="text" 
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask a question about machine manuals or SQLite logs..."
                  className="flex-1 bg-[#12141c] border border-gray-800 hover:border-gray-700 focus:border-[#aa3bff] focus:outline-none rounded-lg text-xs py-2.5 px-3 transition-all"
                />
                <button 
                  type="submit"
                  className="bg-[#aa3bff] hover:bg-[#b854ff] text-white p-2.5 rounded-lg transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#0c0d12] px-6 py-4 flex items-center justify-between text-xs text-gray-500">
        <div>© 2026 FactoryLens MCP Project. MIT License.</div>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
            <span>NitroStack Framework</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
            <span>SQLite Database</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            <span>React + Tailwind v4</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
