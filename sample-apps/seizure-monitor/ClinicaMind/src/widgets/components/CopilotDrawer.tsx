'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, User, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Database, FileText, Activity } from 'lucide-react';

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  providerInfo?: { provider: string; model: string };
  agentsInvoked?: Array<{ name: string; confidence: number }>;
  evidencePackage?: any;
  citations?: string[];
  isError?: boolean;
}

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName?: string;
  transcript?: string;
}

export function CopilotDrawer({
  isOpen,
  onClose,
  patientId = '',
  patientName = 'No Active Patient',
  transcript = ''
}: CopilotDrawerProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      text: `Hello Dr. Vance! I am your ClinicaMind LLM Copilot. I have full context on active patient ${patientName} (ID: ${patientId}). Ask me any clinical question about guidelines, drug contraindications, or treatment options.`,
      time: 'Just now',
      providerInfo: { provider: 'ClinicaMind Multi-Agent Engine', model: 'NitroStack MCP' },
      agentsInvoked: [
        { name: 'History Agent', confidence: 0.98 },
        { name: 'Medication Agent', confidence: 0.95 }
      ],
      citations: ['Patient EHR Allergy Record', 'JAMA 2026 Guidelines']
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [currentOrchestrationStep, setCurrentOrchestrationStep] = useState<string>('');
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentOrchestrationStep, isThinking]);

  if (!isOpen) return null;

  const quickPrompts = [
    'Why is Penicillin contraindicated for this patient?',
    'What are the JAMA 2026 guidelines for Pneumonia?',
    'Generate a 1-page EMR consultation summary note',
    'Check interaction: Warfarin + Ibuprofen'
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim() || isThinking) return;

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsThinking(true);
    setCurrentOrchestrationStep('Initializing Supervisor Agent...');

    // Extract conversation memory (previous 6 turns)
    const historyForBackend = messages
      .filter((m) => !m.isError && m.id !== 'welcome-msg')
      .slice(-6)
      .map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text
      }));

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          patientId,
          conversationHistory: historyForBackend
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const payload = JSON.parse(jsonStr);

              if (payload.type === 'step') {
                setCurrentOrchestrationStep(payload.text);
              } else if (payload.type === 'done') {
                const aiMsg: CopilotMessage = {
                  id: `ai-${Date.now()}`,
                  sender: 'ai',
                  text: payload.answer,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  providerInfo: payload.providerInfo,
                  agentsInvoked: payload.agentsInvoked,
                  evidencePackage: payload.evidencePackage,
                  citations: payload.citations
                };

                setMessages((prev) => [...prev, aiMsg]);
                setIsThinking(false);
                setCurrentOrchestrationStep('');
              } else if (payload.type === 'error') {
                const errorMsg: CopilotMessage = {
                  id: `err-${Date.now()}`,
                  sender: 'ai',
                  text: `⚠️ ${payload.message}`,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isError: true
                };
                setMessages((prev) => [...prev, errorMsg]);
                setIsThinking(false);
                setCurrentOrchestrationStep('');
              }
            } catch {
              // Parse error ignored for chunk safety
            }
          }
        }
      }
    } catch (err: any) {
      const errorMsg: CopilotMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: `⚠️ Inference Error: ${err?.message || 'Unable to connect to LLM Provider stream.'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages((prev) => [...prev, errorMsg]);
      setIsThinking(false);
      setCurrentOrchestrationStep('');
    }
  };

  const toggleEvidence = (id: string) => {
    setExpandedEvidenceId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-[440px] h-full bg-white border-l border-slate-200/80 shadow-2xl flex flex-col justify-between font-sans">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-sm">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                ClinicaMind LLM Copilot
                <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-700 px-1.5 py-0.2 rounded font-mono">
                  Multi-Agent
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">Context: {patientName} (ID: {patientId})</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chat Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col space-y-1.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] p-3.5 rounded-2xl text-xs space-y-2 shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white font-medium rounded-br-none'
                    : msg.isError
                    ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-none'
                    : 'bg-white text-slate-900 border border-slate-200/80 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                {/* LLM Provider Info Badge */}
                {msg.providerInfo && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span>Engine: {msg.providerInfo.provider}</span>
                    <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-bold">{msg.providerInfo.model}</span>
                  </div>
                )}

                {/* Expandable Evidence Panel */}
                {(msg.agentsInvoked || msg.citations || msg.evidencePackage) && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <button
                      onClick={() => toggleEvidence(msg.id)}
                      className="w-full flex items-center justify-between text-[10px] font-mono font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/60 p-1.5 rounded-lg border border-indigo-100 transition"
                    >
                      <span className="flex items-center gap-1">
                        <Database size={12} /> Evidence Panel ({msg.agentsInvoked?.length || 0} Agents)
                      </span>
                      {expandedEvidenceId === msg.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {expandedEvidenceId === msg.id && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2 text-[10px] font-mono text-slate-700 animate-fade-in">
                        {/* Invoked Agents */}
                        {msg.agentsInvoked && (
                          <div>
                            <span className="text-slate-400 font-bold uppercase block mb-1">Invoked Agents & Confidence:</span>
                            <div className="flex flex-wrap gap-1">
                              {msg.agentsInvoked.map((ag, i) => (
                                <span key={i} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-700 font-bold">
                                  {ag.name}: Math.round({ag.confidence * 100})%
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Citations */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div>
                            <span className="text-slate-400 font-bold uppercase block mb-1">Citations & PMIDs:</span>
                            <div className="space-y-0.5">
                              {msg.citations.map((c, i) => (
                                <div key={i} className="text-slate-600 flex items-center gap-1">
                                  • {c}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-400 px-1">{msg.time}</span>
            </div>
          ))}

          {/* Real-time Streaming Agent Orchestration Ticker */}
          {isThinking && (
            <div className="p-3 bg-white border border-indigo-200 rounded-2xl max-w-[85%] text-xs font-mono space-y-1.5 shadow-sm animate-pulse-glow">
              <div className="flex items-center gap-2 text-indigo-600 font-bold">
                <Sparkles size={14} className="animate-spin text-indigo-600" />
                <span>NitroStack Agent Orchestration...</span>
              </div>
              <p className="text-[11px] text-slate-600 italic bg-indigo-50/50 p-2 rounded-xl border border-indigo-100">
                {currentOrchestrationStep || 'Evaluating clinical context...'}
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips & Input Form */}
        <div className="p-4 border-t border-slate-100 bg-white space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Suggested Queries:</span>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  disabled={isThinking}
                  className="text-[10px] bg-slate-100 hover:bg-indigo-50 disabled:opacity-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 px-2 py-1 rounded-lg text-left transition font-medium"
                >
                  ⚡ {prompt}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask Copilot about guidelines, drugs, or lab findings..."
              disabled={isThinking}
              className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isThinking}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition shadow-xs"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
