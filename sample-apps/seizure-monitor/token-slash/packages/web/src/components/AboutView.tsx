import React from 'react';
import { 
  Info, 
  Cpu, 
  Layers, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink,
  Code2
} from 'lucide-react';
import { motion } from 'framer-motion';

export const AboutView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">About NitroStack &amp; TokenSlash ⚡</h1>
              <p className="text-xs text-slate-400">AI-first developer workspace and dynamic LLM compute router.</p>
            </div>
          </div>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-semibold">
          v1.0.0 Enterprise Release
        </div>
      </div>

      {/* Hero Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">AST Prompt Compression</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Eliminates conversational prompt bloat while converting loose prose into strict XML boundaries and schema definitions.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">NitroStack MCP Engine</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Dynamic Model Recommender and History Analyzer MCP tools evaluating cost-performance ratios across 4 LLM tiers.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">ML Satisfaction Predictor</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Python Logistic Regression Satisfaction Classifier trained on high-volume enterprise API execution telemetry.
          </p>
        </div>
      </div>

      {/* Monorepo Architecture Overview */}
      <div className="p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-4">
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Monorepo Architecture Map</span>
        </h3>

        <div className="p-5 rounded-xl bg-[#0E131A] border border-white/[0.06] font-mono text-xs text-slate-300 space-y-2">
          <div><span className="text-cyan-400 font-bold">packages/web</span> → React 18 + Vite + Tailwind CSS UI Dashboard</div>
          <div><span className="text-cyan-400 font-bold">packages/server</span> → NitroStack MCP Tools (model-recommender, history-analyzer)</div>
          <div><span className="text-cyan-400 font-bold">run_tokenslash.py</span> → Standalone Python Usage Intelligence Inference Engine</div>
        </div>
      </div>
    </div>
  );
};
