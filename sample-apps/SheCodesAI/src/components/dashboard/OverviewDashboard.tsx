'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  Play, 
  Mic, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  BookOpen, 
  Database, 
  Plug, 
  ArrowRight, 
  Sparkles,
  Zap,
  Grid
} from 'lucide-react';

export const OverviewDashboard: React.FC = () => {
  const { 
    setActiveTab, 
    selectedPack, 
    tasks, 
    knowledgeArticles, 
    vectorNodes, 
    integrations,
    currentWorkspace 
  } = useApp();

  const pendingTasks = tasks.filter(t => t.status === 'pending');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-violet-950/60 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-semibold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Workspace: {currentWorkspace.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, Haswitheswari KamboJi.
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Your active context engine is currently set to <strong className="text-indigo-300 font-semibold">{selectedPack.name}</strong>. All meeting transcripts, audio recordings, and documents will adapt to this pack without auto-classification errors.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setActiveTab('live_room')}
              className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs rounded-xl shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all"
            >
              <Mic className="w-4 h-4" />
              <span>Start Live AI Processing</span>
            </button>
            <button
              onClick={() => setActiveTab('context_packs')}
              className="px-5 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all"
            >
              <Grid className="w-4 h-4 text-indigo-400" />
              <span>Change Context Pack</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Pending Human Approvals</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{pendingTasks.length} Tasks</div>
          <div className="text-[10px] text-amber-400 font-semibold">Requires human action before MCP</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Notion Knowledge Base</span>
            <BookOpen className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{knowledgeArticles.length} Articles</div>
          <div className="text-[10px] text-emerald-400 font-semibold">Synced permanently</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ChromaDB Vectors</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{vectorNodes.length} Embeddings</div>
          <div className="text-[10px] text-slate-400 font-semibold">1,536 dimensions cosine index</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active MCP Plugins</span>
            <Plug className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{integrations.length} Integrations</div>
          <div className="text-[10px] text-emerald-400 font-semibold">Slack, Jira, Notion, GitHub, Calendar</div>
        </div>
      </div>

      {/* Grid: Pending Approvals & Recent Notion Knowledge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pending Approvals Card (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Pending Human Approval Cards
            </h3>
            <button 
              onClick={() => setActiveTab('live_room')} 
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {pendingTasks.slice(0, 3).map(task => (
              <div key={task.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {task.priority}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-300">Target: {task.suggestedTool}</span>
                </div>
                <h4 className="text-xs font-bold text-white">{task.title}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-1">{task.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Notion Knowledge Articles (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Recent Notion Knowledge Docs
            </h3>
            <button 
              onClick={() => setActiveTab('knowledge_hub')} 
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center space-x-1"
            >
              <span>Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {knowledgeArticles.map(art => (
              <div key={art.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[9px] font-mono text-violet-400">{art.contextPack} • {art.date}</span>
                <h4 className="text-xs font-bold text-white line-clamp-1">{art.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
