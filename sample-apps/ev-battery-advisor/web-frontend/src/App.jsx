import React, { useState, useEffect } from 'react';
import { Leaf, Cpu, Shield, Zap, Search, RefreshCw, ShieldAlert, History, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import UploadMaterial from './components/UploadMaterial';

export default function App() {
  const [requirements, setRequirements] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyRuns, setHistoryRuns] = useState([]);
  const [uploadedMaterial, setUploadedMaterial] = useState(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/history');
      const data = await res.json();
      if (data.status === 'success') {
        setHistoryRuns(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const steps = [
    { label: 'Idle', icon: Search },
    { label: 'Requirement NLP', icon: Cpu },
    { label: 'Pareto Optimization', icon: Shield },
    { label: 'Digital Twin Sim', icon: Zap },
    { label: 'TOPSIS Final Ranking', icon: Leaf }
  ];

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    setStep(1);
    setUploadedMaterial(null); // clear upload banner once pipeline starts

    // Fake progress animation for UX
    const interval = setInterval(() => {
      setStep(s => (s < 4 ? s + 1 : s));
    }, 2000);

    try {
      const res = await fetch('http://localhost:3002/api/analyze-battery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements })
      });
      
      const data = await res.json();
      clearInterval(interval);
      setStep(4);
      
      if (data.error) throw new Error(data.error);
      setResult(data.data);
    } catch (err) {
      clearInterval(interval);
      setStep(0);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="background-glow"></div>
      <div className="background-glow-secondary"></div>
      
      <div className="w-full min-h-screen flex flex-col items-center">
        <main className="w-full max-w-[1600px] px-4 sm:px-6 md:px-8 flex flex-col gap-8 py-12">
        <header className="flex flex-col items-center justify-center text-center mb-6 relative">
          <div className="absolute right-0 top-0 flex gap-4">
            <button 
              className="btn btn-secondary flex items-center gap-2"
              onClick={() => setShowHistory(true)}
            >
              <History size={18} /> Simulation History
            </button>
          </div>
          <div className="badge badge-primary mb-4">Powered by NitroStack + React</div>
          <h1 className="text-6xl mb-4 font-bold text-gradient">EV Battery Advisor</h1>
          <p className="text-xl text-secondary max-w-2xl">
            Agentic decision-support for battery material selection. 
            Enter your constraints below, and our multi-agent orchestrator will handle the rest.
          </p>
        </header>

          <div className="glass-panel w-full self-center flex gap-6">
            <div className="flex-1">
              <h3 className="text-xl mb-4 font-medium">Engineering Requirements</h3>
              <textarea 
                className="input-field mb-4" 
                rows="6"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                disabled={loading}
              />
              <button 
                className="btn btn-primary w-full"
                onClick={handleAnalyze}
                disabled={loading || !requirements.trim()}
              >
                {loading ? (
                  <><RefreshCw size={18} className="animate-spin" /> Orchestrating Multi-Agent Pipeline...</>
                ) : (
                  <><Zap size={18} /> Run AI Simulation Pipeline</>
                )}
              </button>
            </div>
            
            <div className="w-1/3 min-w-[350px]">
              <UploadMaterial onUploadSuccess={(name) => setUploadedMaterial(name || 'Custom Material')} />
            </div>
          </div>

          {/* Uploaded material banner — nudges user to re-run pipeline */}
          {uploadedMaterial && !loading && (
            <div className="w-full flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl px-5 py-3 animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
              <span className="text-blue-300 text-sm font-medium">
                <span className="font-bold text-blue-200">'{uploadedMaterial}'</span> ingested into the knowledge base.
                Re-run the pipeline above to include it in the analysis.
              </span>
              <button onClick={() => setUploadedMaterial(null)} className="ml-auto text-blue-500 hover:text-blue-300 text-xs transition-colors">✕</button>
            </div>
          )}

        {loading && (
            <div className="glass-panel p-8 w-full max-w-5xl self-center">
            <div className="step-container">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const isActive = step === i;
                const isCompleted = step > i;
                return (
                  <div key={i} className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <div className="step-circle">
                      <Icon size={20} />
                    </div>
                    <div className="step-label">{s.label}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-secondary mt-8 animate-pulse">
              Running multi-agent pipeline... This usually takes about 10-15 seconds.
            </p>
          </div>
        )}

        {error && (
            <div className="glass-panel border-accent-danger bg-red-900/10 w-full max-w-5xl self-center">
            <h3 className="text-accent-danger font-bold mb-2 flex items-center gap-2">
              <ShieldAlert size={20} /> Pipeline Error
            </h3>
            <p className="text-secondary">{error}</p>
          </div>
        )}

        {!loading && result && (
          <div className="mt-8 animate-fade-in w-full">
            <Dashboard data={result} />
          </div>
        )}
        </main>
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end backdrop-blur-sm animate-fade-in">
          <div className="w-[450px] bg-[#0f111a] border-l border-[#1f2937] h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="p-6 border-b border-[#1f2937] flex justify-between items-center bg-[#151823]">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <History className="text-blue-400" /> Simulation History
              </h2>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-[#1f2937] rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {historyRuns.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">No past simulations found.</div>
              ) : (
                historyRuns.map((run) => (
                  <div key={run.id} className="bg-[#1a1d29] p-4 rounded-xl border border-[#2d3748] hover:border-blue-500/50 transition-colors cursor-pointer" onClick={() => {
                      const dtData = JSON.parse(run.digitalTwinData);
                      setResult({
                        requirements: run.userPrompt,
                        weights: JSON.parse(run.weights),
                        topCandidate: { name: 'Top Candidate', strengths: [], keyMetrics: {} },
                        topsisRanking: [],
                        paretoFront: JSON.parse(run.paretoFront),
                        digitalTwin: dtData
                      });
                      setShowHistory(false);
                    }}>
                    <div className="text-xs text-blue-400 mb-2 font-medium">
                      {new Date(run.createdAt).toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-3 mb-3">
                      "{run.userPrompt}"
                    </p>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 bg-[#151823] text-gray-400 rounded border border-[#2d3748]">
                        Score: {run.compositeScore?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
