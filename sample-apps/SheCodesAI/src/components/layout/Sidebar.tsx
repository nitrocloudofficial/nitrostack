'use client';

import React from 'react';
import { useApp, ActiveTab } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  Mic, 
  GitMerge, 
  Grid, 
  BookOpen, 
  Database, 
  Plug, 
  BarChart3, 
  Calendar, 
  Shield, 
  Globe,
  Sparkles,
  Layers,
  Bot
} from 'lucide-react';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
  highlight?: boolean;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, selectedPack, tasks } = useApp();
  const pendingTasksCount = tasks.filter(t => t.status === 'pending').length;

  const NAV_ITEMS: NavItem[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'live_room', label: 'AI Room & Processor', icon: Mic, badge: 'Live', highlight: true },
    { id: 'workflow_builder', label: 'Visual Workflow (MCP)', icon: GitMerge, badge: pendingTasksCount > 0 ? `${pendingTasksCount} Tasks` : undefined },
    { id: 'context_packs', label: 'Context Packs (25+)', icon: Grid },
    { id: 'knowledge_hub', label: 'Knowledge Hub (Notion)', icon: BookOpen },
    { id: 'vector_memory', label: 'ChromaDB Vector Inspector', icon: Database },
    { id: 'integrations', label: 'MCP Integrations', icon: Plug },
    { id: 'analytics', label: 'Analytics Dashboard', icon: BarChart3 },
    { id: 'calendar', label: 'Timezone Calendar', icon: Calendar },
    { id: 'workspace_settings', label: 'Workspace & Security', icon: Shield },
    { id: 'landing', label: 'Landing Page', icon: Globe }
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/80 backdrop-blur-xl flex flex-col justify-between p-4 sticky top-16 h-[calc(100vh-4rem)] z-30">
      {/* Top Nav Items */}
      <div className="space-y-6">
        {/* Active Context Pack Badge Banner */}
        <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900/90 border border-indigo-500/20 rounded-xl p-3.5 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all" />
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-300 mb-1">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Active Context Engine</span>
          </div>
          <div className="text-sm font-bold text-white truncate">{selectedPack.name}</div>
          <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">{selectedPack.summaryStyle}</div>
        </div>

        {/* Navigation Section */}
        <nav className="space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Platform Engine
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 font-semibold'
                    : item.highlight
                    ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : item.highlight
                      ? 'bg-indigo-500 text-white animate-pulse'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info / Novu & MCP Health */}
      <div className="pt-4 border-t border-slate-900 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-2">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>MCP Gateway</span>
          </span>
          <span className="text-emerald-400 font-mono font-semibold">Ready</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>ChromaDB Vector</span>
          </div>
          <span className="text-xs font-bold text-slate-200">1,536d</span>
        </div>
      </div>
    </aside>
  );
};
