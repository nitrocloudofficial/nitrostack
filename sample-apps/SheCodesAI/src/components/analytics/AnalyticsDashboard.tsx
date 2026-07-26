'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { BarChart3, TrendingUp, Clock, Zap, CheckCircle2, ShieldCheck, Database, Layers } from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const { currentWorkspace } = useApp();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-extrabold text-white">Workspace Analytics & ROI Engine</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time Metrics for {currentWorkspace.name} • Time Saved Calculator • MCP Execution Success Rate
          </p>
        </div>
      </div>

      {/* Metric Cards Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Meetings Processed', value: '482', change: '+18% this month', icon: Clock, color: 'text-indigo-400' },
          { label: 'Tasks Auto-Created (Jira)', value: '1,240', change: '+24% automation rate', icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Hours Saved per Week', value: '142.5 hrs', change: '=$8,500 productivity gain', icon: Zap, color: 'text-amber-400' },
          { label: 'MCP Execution Success', value: '99.4%', change: '0.06% retry rate', icon: ShieldCheck, color: 'text-violet-400' }
        ].map((m, idx) => (
          <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>{m.label}</span>
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">{m.value}</div>
            <div className="text-[10px] text-emerald-400 font-semibold">{m.change}</div>
          </div>
        ))}
      </div>

      {/* Visual Charts Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department Efficiency breakdown */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Department Productivity & Context Pack Usage
          </h3>
          <div className="space-y-3">
            {[
              { dept: 'Engineering (Software Dev Pack)', percentage: 88, tasks: 420 },
              { dept: 'Product (Product Planning Pack)', percentage: 92, tasks: 310 },
              { dept: 'Sales & Client Ops (Sales Pack)', percentage: 79, tasks: 215 },
              { dept: 'Finance & Legal (Legal Pack)', percentage: 84, tasks: 160 }
            ].map((d, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{d.dept}</span>
                  <span className="font-mono font-bold text-indigo-400">{d.tasks} Tasks ({d.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full" style={{ width: `${d.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration Usage Distribution */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            MCP Tool Dispatch Breakdown
          </h3>
          <div className="space-y-2 text-xs font-mono">
            {[
              { tool: 'Jira Software', count: '580 issues', color: 'text-blue-400' },
              { tool: 'Notion Hub', count: '420 pages', color: 'text-violet-400' },
              { tool: 'Slack Alerts', count: '890 digests', color: 'text-emerald-400' },
              { tool: 'Google Calendar', count: '310 events', color: 'text-amber-400' },
              { tool: 'GitHub PRs', count: '185 commits', color: 'text-cyan-400' }
            ].map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className={`font-bold ${t.color}`}>{t.tool}</span>
                <span className="text-slate-300">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
