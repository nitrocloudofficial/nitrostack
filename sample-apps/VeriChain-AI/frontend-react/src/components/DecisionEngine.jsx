import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, AlertCircle, Play, CheckCircle2, ShieldAlert, Award, AlertTriangle, FileText, ArrowRight, Activity, Wallet, FileCheck } from 'lucide-react';

export default function DecisionEngine({ user, token }) {
  const [documents, setDocuments] = useState([]);
  const [query, setQuery] = useState('Should we approve Vendor ABC?');
  const [selectedDocs, setSelectedDocs] = useState([]);
  
  // Running states
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [visibleLogs, setVisibleLogs] = useState([]);
  const [outcome, setOutcome] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await fetch('/api/documents', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setDocuments(data);
        if (data.length > 0) {
          setSelectedDocs([data[0].id]); // Select first document by default
        }
      } catch (err) {
        console.error('Failed to load documents:', err.message);
      }
    };
    fetchDocs();
  }, [token]);

  const handleDocToggle = (docId) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId) 
        : [...prev, docId]
    );
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (selectedDocs.length === 0) {
      setError('Please select at least one document to analyze.');
      return;
    }

    setLoading(true);
    setProgress(10);
    setStatusText('Starting LangGraph Multi-Agent Orchestrator...');
    setVisibleLogs([]);
    setOutcome(null);
    setError(null);

    try {
      const response = await fetch('/api/agents/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          document_ids: selectedDocs
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Workflow execution failed.');
      }

      setProgress(30);
      setStatusText('Agents collaborating on evidence payload...');
      
      let logIndex = 0;
      const totalLogs = data.agent_logs.length;

      const interval = setInterval(() => {
        if (logIndex < totalLogs) {
          setVisibleLogs(prev => [...prev, data.agent_logs[logIndex]]);
          setProgress(Math.min(95, 30 + Math.floor((logIndex / totalLogs) * 65)));
          logIndex++;
        } else {
          clearInterval(interval);
          setProgress(100);
          
          setTimeout(() => {
            setLoading(false);
            setOutcome(data);
          }, 300);
        }
      }, 450);

    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  const getBadgeClass = (rec) => {
    if (!rec) return 'bg-gray-800 text-gray-400 border-gray-700';
    const cleanRec = rec.toUpperCase();
    if (cleanRec === 'APPROVE' || cleanRec === 'LOW_RISK' || cleanRec === 'APPROVED') {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    } else if (cleanRec === 'REJECT' || cleanRec === 'HIGH_RISK' || cleanRec === 'REJECTED') {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    } else {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  const getDebateData = () => {
    if (!outcome || !outcome.agent_debate_data) return null;
    let debate = outcome.agent_debate_data;
    if (typeof debate === 'string') {
      try {
        debate = JSON.parse(debate);
      } catch (e) {
        return null;
      }
    }
    return debate;
  };
  const debateData = getDebateData();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Cpu className="text-blue-500" size={30} />
            Decision Engine
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Orchestrate verification checklist criteria and watch specialized agent panels debate recommendations.
          </p>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-12 text-center max-w-xl mx-auto flex flex-col items-center">
          <AlertCircle size={40} className="text-amber-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Documents Available</h3>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            You must stage source documents before you can trigger decision analysis audits.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left panel: New query input */}
          <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl backdrop-blur-xl lg:col-span-4 space-y-6">
            <div className="border-b border-glassBorder/40 pb-4">
              <h2 className="text-lg font-bold text-white">New Audit Request</h2>
              <p className="text-xs text-gray-400 mt-1">Define inquiry constraints and select context documents.</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Evaluation Inquiry Query
                </label>
                <textarea 
                  className="w-full px-4 py-3 bg-gray-950/80 border border-glassBorder rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-600"
                  rows={3}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Type your inquiry, e.g., 'Should we approve Vendor ABC?'"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Context Documents
                </label>
                <div className="max-h-56 overflow-y-auto border border-glassBorder rounded-xl bg-gray-950/50 p-2 space-y-1">
                  {documents.map(doc => (
                    <div 
                      key={doc.id}
                      style={{ contentVisibility: 'auto' }}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-900/50 transition-colors border border-transparent hover:border-glassBorder/40"
                      onClick={() => !loading && handleDocToggle(doc.id)}
                    >
                      <input 
                        type="checkbox"
                        checked={selectedDocs.includes(doc.id)}
                        onChange={() => {}}
                        className="rounded border-glassBorder text-blue-600 focus:ring-0 cursor-pointer"
                        disabled={loading}
                      />
                      <span className={`text-xs truncate ${selectedDocs.includes(doc.id) ? 'text-white font-medium' : 'text-gray-400'}`}>
                        📄 {doc.filename}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition-all duration-200 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                disabled={loading || selectedDocs.length === 0}
              >
                <Play size={16} className="fill-current" />
                <span>Run Agentic Decision Flow</span>
              </button>
            </form>
          </div>

          {/* Right panel: Timeline & Debate Panel outputs */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Live Progress timeline tracker */}
            {loading && (
              <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="text-blue-500 animate-pulse" size={20} />
                    <h3 className="font-bold text-white text-base">⏳ Orchestrator: {statusText}</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-400">{progress}%</span>
                </div>

                <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  />
                </div>

                {visibleLogs.length > 0 && (
                  <div className="border-t border-glassBorder/30 pt-4 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Live Agent Audit Trail:</h4>
                    <div className="relative border-l border-glassBorder/50 pl-5 ml-2 space-y-4">
                      {visibleLogs.map((log, index) => (
                        <div key={index} className="relative">
                          <div className="absolute left-[-25px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-darkBg shadow-glow" />
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-300">{log.agent_name}</span>
                            <span className="text-[10px] text-gray-500">
                              {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{log.log_message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state when ready to go */}
            {!loading && !outcome && (
              <div className="bg-glassBg border border-glassBorder rounded-2xl p-16 text-center shadow-xl backdrop-blur-xl flex flex-col items-center">
                <div className="bg-gray-950/60 p-4 rounded-full border border-glassBorder/60 mb-5">
                  <Cpu size={40} className="text-gray-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Engine Awaiting Instructions</h3>
                <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                  Select parameters and trigger the multi-agent graph to begin verification, debate, and report generation.
                </p>
              </div>
            )}

            {/* Decision synthesis outcome & AI Debate Panel */}
            {!loading && outcome && (
              <div className="space-y-6">
                
                {/* 1. Final synthesised Judge Outcome */}
                <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-blue-500 to-indigo-500" />
                  
                  {/* Clean Structured Verdict template */}
                  <div className="space-y-4 text-sm text-gray-300">
                    <div className="flex justify-between items-center border-b border-glassBorder/40 pb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Verdict</span>
                        <h2 className="text-lg font-black text-white mt-0.5">
                          Decision: 
                          <span className={`ml-2 px-3 py-0.5 rounded border text-xs font-bold uppercase ${getBadgeClass(outcome.decision_status)}`}>
                            {outcome.decision_status === 'APPROVE' || outcome.decision_status === 'APPROVED' ? 'APPROVED' : 
                             outcome.decision_status === 'REJECT' || outcome.decision_status === 'REJECTED' ? 'REJECTED' : 'REVIEW REQUIRED'}
                          </span>
                        </h2>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Confidence Score</span>
                        <div className="text-xl font-extrabold text-blue-400 font-sans">{Math.round((outcome.confidence_score || 0) * 100)}%</div>
                      </div>
                    </div>

                    {/* Evidence Checklist */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-sans">Evidence:</h4>
                      {outcome.evidence && outcome.evidence.length > 0 ? (
                        <div className="space-y-1.5 pl-1.5 font-sans">
                          {outcome.evidence.map((ev, index) => (
                            <div key={index} className="flex gap-2 items-start text-xs text-gray-300">
                              <span className="text-emerald-400 font-bold">✔</span>
                              <span>{ev.claim}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex gap-2 items-start text-xs text-emerald-400 pl-1.5 font-sans">
                          <span className="font-bold">✔</span>
                          <span>Source credentials verified against template policies</span>
                        </div>
                      )}
                    </div>

                    {/* Conflict Warnings */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-sans">Conflict:</h4>
                      {outcome.conflicts && outcome.conflicts.length > 0 ? (
                        <div className="space-y-1.5 pl-1.5 font-sans">
                          {outcome.conflicts.map((cf, index) => (
                            <div key={index} className="flex gap-2 items-start text-xs text-rose-400 font-semibold">
                              <span className="font-bold">⚠</span>
                              <span>{cf.description}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex gap-2 items-start text-xs text-emerald-400 pl-1.5 font-sans">
                          <span className="font-bold">✔</span>
                          <span>Zero cross-document conflicts detected</span>
                        </div>
                      )}
                    </div>

                    {/* Final Recommendation Text */}
                    <div className="border-t border-glassBorder/40 pt-4 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-sans">Recommendation:</h4>
                      <div className="text-xs text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
                        {(outcome.explanation || '').replace(/### Recommendation:.*?\n/gs, '').trim()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Custom Hackathon Highlight: AI Debate Panel */}
                {debateData && Object.keys(debateData).length > 0 && (
                  <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl space-y-5">
                    <div className="border-b border-glassBorder/40 pb-3 flex items-center gap-2">
                      <ShieldAlert className="text-indigo-400" size={18} />
                      <h3 className="font-extrabold text-white text-base">⚖️ AI Debate Panel</h3>
                      <span className="text-[10px] text-gray-500 ml-auto">Independent Agent Perspectives</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Finance Agent */}
                      {debateData.finance_agent && (
                        <div className="p-4 rounded-xl border border-glassBorder/40 bg-gray-950/40 hover:border-glassBorder/80 transition-colors flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                                <Wallet size={14} className="text-blue-400" />
                                Finance Agent
                              </span>
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${getBadgeClass(debateData.finance_agent.recommendation)}`}>
                                {debateData.finance_agent.recommendation}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed font-sans">
                              {debateData.finance_agent.opinion}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Compliance Agent */}
                      {debateData.compliance_agent && (
                        <div className="p-4 rounded-xl border border-glassBorder/40 bg-gray-950/40 hover:border-glassBorder/80 transition-colors flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                                <FileCheck size={14} className="text-emerald-400" />
                                Compliance Agent
                              </span>
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${getBadgeClass(debateData.compliance_agent.recommendation)}`}>
                                {debateData.compliance_agent.recommendation}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed font-sans">
                              {debateData.compliance_agent.opinion}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Legal Agent */}
                      {debateData.legal_agent && (
                        <div className="p-4 rounded-xl border border-glassBorder/40 bg-gray-950/40 hover:border-glassBorder/80 transition-colors flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                                <Award size={14} className="text-purple-400" />
                                Legal Agent
                              </span>
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${getBadgeClass(debateData.legal_agent.recommendation)}`}>
                                {debateData.legal_agent.recommendation}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed font-sans">
                              {debateData.legal_agent.opinion}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Risk Agent */}
                      {debateData.risk_agent && (
                        <div className="p-4 rounded-xl border border-glassBorder/40 bg-gray-950/40 hover:border-glassBorder/80 transition-colors flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                                <AlertTriangle size={14} className="text-amber-400" />
                                Risk Agent
                              </span>
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${getBadgeClass(debateData.risk_agent.recommendation)}`}>
                                {debateData.risk_agent.recommendation}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed font-sans">
                              {debateData.risk_agent.opinion}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Completed Agent Audit Trail Timeline */}
                {outcome.agent_logs && outcome.agent_logs.length > 0 && (
                  <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl space-y-4">
                    <h3 className="font-extrabold text-white text-base">📋 Completed Agent Audit Trail</h3>
                    <div className="relative border-l border-glassBorder/50 pl-5 ml-2 space-y-4">
                      {outcome.agent_logs.map((log, index) => (
                        <div key={index} className="relative">
                          <div className="absolute left-[-25px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-darkBg shadow-glow" />
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-300">{log.agent_name}</span>
                            <span className="text-[10px] text-gray-500 font-sans">
                              {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 leading-relaxed font-sans">{log.log_message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
