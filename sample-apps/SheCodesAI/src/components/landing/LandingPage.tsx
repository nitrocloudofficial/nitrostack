'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { CONTEXT_PACKS } from '../../data/mockData';
import { 
  Zap, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Database, 
  GitMerge, 
  Sliders, 
  CheckCircle2, 
  Lock, 
  Bot,
  Layers,
  Cpu,
  Globe,
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';

export const LandingPage: React.FC = () => {
  const { setActiveTab, setSelectedPack } = useApp();

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 overflow-x-hidden">
      {/* Background Radial Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-violet-600/10 to-transparent blur-[120px] pointer-events-none z-0" />

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        {/* Top Tagline Pill */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8 shadow-xl"
        >
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="text-xs font-semibold text-indigo-300">
            Adaptive AI Context Intelligence Platform
          </span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.1]"
        >
          One Conversation. <br />
          <span className="bg-gradient-to-r from-white via-indigo-200 to-violet-400 bg-clip-text text-transparent">
            Infinite Intelligent Workflows.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-slate-400 text-lg sm:text-xl max-w-3xl mx-auto font-normal leading-relaxed"
        >
          ContextOS transforms meetings, transcripts, and documents into structured documentation, Jira tickets, Notion knowledge bases, Google Calendar events, and vector memory.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button 
            onClick={() => setActiveTab('live_room')}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base shadow-2xl shadow-indigo-600/30 flex items-center justify-center space-x-3 group transition-all"
          >
            <span>Launch ContextOS Engine</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={() => setActiveTab('context_packs')}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-base flex items-center justify-center space-x-2 transition-all"
          >
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>Explore 25+ Context Packs</span>
          </button>
        </motion.div>

        {/* Hero Interactive Animated Processing Pipeline Preview */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 bg-slate-900/80 backdrop-blur-2xl border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-left"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs font-mono text-slate-400">ContextOS Live AI Reasoning Pipeline</span>
            </div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Zero Auto-Classification • Manual Pack Mode</span>
            </span>
          </div>

          {/* Pipeline Stage Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { step: '01', title: 'Transcript Input', desc: 'Whisper STT / Zoom / Doc' },
              { step: '02', title: 'Context Pack', desc: 'User Selected Rules' },
              { step: '03', title: 'AI Reasoning', desc: 'Task & Deadline Logic' },
              { step: '04', title: 'Human Approval', desc: 'Approve / Edit / Reject' },
              { step: '05', title: 'MCP Orchestration', desc: 'Jira, Notion, Slack, Calendar' }
            ].map((st, idx) => (
              <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 relative">
                <div className="text-[10px] font-mono text-indigo-400 font-bold">{st.step}</div>
                <div className="text-xs font-bold text-white mt-1">{st.title}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{st.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Context Packs Showcase Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-900">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-white">25+ Specialized Context Packs</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-2xl mx-auto">
            Before processing, users manually choose their context pack. The transcript never changes — only the generated workflow adapts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CONTEXT_PACKS.slice(0, 6).map((pack) => (
            <div 
              key={pack.id}
              onClick={() => { setSelectedPack(pack); setActiveTab('live_room'); }}
              className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {pack.category}
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  Manual Select
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                {pack.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {pack.description}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Summary Style:</span>
                <span className="font-semibold text-slate-300 truncate max-w-[150px]">{pack.summaryStyle}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Approved Tool Stack Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-900 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Powered by Your Enterprise Stack</h2>
        <p className="text-slate-400 text-sm mb-10">Direct MCP microservice routing with zero unauthorized access</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-left">
          {[
            { name: 'Jira Software', type: 'Project Management', icon: 'CheckSquare' },
            { name: 'Notion', type: 'Documentation Hub', icon: 'BookOpen' },
            { name: 'Slack', type: 'Communication', icon: 'MessageSquare' },
            { name: 'GitHub', type: 'Version Control', icon: 'GitBranch' },
            { name: 'Google Calendar', type: 'Multi-Timezone Scheduling', icon: 'Calendar' },
            { name: 'Supabase', type: 'PostgreSQL & Auth', icon: 'Database' },
            { name: 'ChromaDB', type: 'Vector Memory Store', icon: 'Cpu' },
            { name: 'Novu', type: 'Multi-Channel Notifications', icon: 'Zap' },
            { name: 'Whisper', type: 'Speech-to-Text STT', icon: 'Mic' },
            { name: 'FastAPI', type: 'Microservice Backend', icon: 'Bot' }
          ].map((tool, idx) => (
            <div key={idx} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-bold text-white">{tool.name}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{tool.type}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-10 bg-slate-950 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-slate-300">ContextOS Platform</span>
            <span>• One Conversation. Infinite Intelligent Workflows.</span>
          </div>
          <div>© 2026 ContextOS Inc. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
