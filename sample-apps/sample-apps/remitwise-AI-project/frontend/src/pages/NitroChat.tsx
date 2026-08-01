import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, Cpu, Layers, MessageSquare, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/apiService';
import { AgentChatResponse } from '../types';

import { AgentWorkflowPipeline } from '../components/chat/AgentWorkflowPipeline';
import { ExplainRecommendationCard } from '../components/chat/ExplainRecommendationCard';
import { ResponseComparisonCharts } from '../components/chat/ResponseComparisonCharts';
import { RiskAssessmentCard } from '../components/chat/RiskAssessmentCard';
import { AgentLogsPanel } from '../components/chat/AgentLogsPanel';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  agentResponse?: AgentChatResponse;
  isLoading?: boolean;
}

const PROMPT_SUGGESTIONS = [
  'Send 1000 USD to India. Cheapest provider & KYC docs?',
  'Compare Wise vs Remitly for UK to India $2000 transfer',
  'What compliance & KYC documents are needed for Mexico?',
  'Optimal time to convert 500 EUR to INR this week',
];

export const NitroChat: React.FC = () => {
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: '👋 Hello! I am **RemitWise Autonomous Multi-Agent AI**. Ask me anything about international money transfers, exchange rate predictions, provider fee comparisons, or KYC compliance rules.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery.trim();
    if (!textToSend || isTyping) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setInputQuery('');
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await apiService.sendAgentChat(textToSend, 'nitrochat-session');

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.summary,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentResponse: response,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      console.error('Error fetching agent response:', e);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                NitroChat Multi-Agent AI
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                v2.0 Live
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Powered by OrchestratorAgent ➔ Exchange, Provider & Compliance Agents
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages([messages[0]])}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Clear Session</span>
        </button>
      </div>

      {/* Prompt Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">
          Try Prompt:
        </span>
        {PROMPT_SUGGESTIONS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/80 hover:border-blue-500/50 hover:bg-slate-800 hover:text-white transition-all duration-200"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Main Chat Conversation Container */}
      <div className="rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800 min-h-[500px] flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Messages Stream */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[680px]">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-teal-400 shrink-0 mt-1 shadow">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`space-y-4 max-w-full sm:max-w-[88%] ${msg.sender === 'user' ? 'items-end' : ''}`}>
                {/* Message Bubble Text */}
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-tr-none shadow-md'
                      : 'bg-slate-900/90 text-slate-100 border border-slate-800 rounded-tl-none shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap font-sans">{msg.text}</p>

                  <span className="block text-[10px] text-right mt-2 opacity-60 font-mono">
                    {msg.timestamp}
                  </span>
                </div>

                {/* Enhanced Post-Response UI Cards (For AI messages with Agent Responses) */}
                {msg.sender === 'ai' && msg.agentResponse && (
                  <div className="space-y-3 pt-2">
                    {/* Section 1: Agent Workflow Pipeline */}
                    <AgentWorkflowPipeline response={msg.agentResponse} />

                    {/* Section 2: Explain Recommendation */}
                    <ExplainRecommendationCard response={msg.agentResponse} />

                    {/* Section 3: Visual Comparison Charts */}
                    <ResponseComparisonCharts response={msg.agentResponse} />

                    {/* Section 4: Risk Assessment Indicator */}
                    <RiskAssessmentCard response={msg.agentResponse} />

                    {/* Section 5: Agent Execution Terminal Logs */}
                    <AgentLogsPanel response={msg.agentResponse} />
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 mt-1 shadow">
                  <User className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          ))}

          {/* Thinking Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 text-slate-400 text-xs font-mono p-3 bg-slate-900/80 rounded-xl border border-slate-800 w-fit"
            >
              <Bot className="w-4 h-4 text-teal-400 animate-spin" />
              <span>Orchestrator Planning & Agents Executing...</span>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-950/80 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask NitroChat AI (e.g. Send $1000 to India - cheapest provider & compliance)..."
              disabled={isTyping}
              className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans placeholder-slate-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isTyping}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 hover:opacity-95 text-white font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
