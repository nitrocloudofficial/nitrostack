import React, { useState } from 'react';
import { 
  Star, 
  Sparkles, 
  Zap, 
  Sliders, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  TrendingDown,
  Cpu
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ModelPreset {
  id: string;
  name: string;
  targetProvider: string;
  targetModel: string;
  targetLatencyMs: number;
  tokenTargetReduction: string;
  description: string;
  isActive: boolean;
}

const mockPresets: ModelPreset[] = [
  {
    id: 'preset-1',
    name: 'Max Cost Optimization (Tier 1)',
    targetProvider: 'Google Gemini',
    targetModel: 'gemini-3.5-flash',
    targetLatencyMs: 350,
    tokenTargetReduction: '65%+',
    description: 'Routes compute to sub-cent flash models with strict AST prompt minimization.',
    isActive: true
  },
  {
    id: 'preset-2',
    name: 'Balanced Performance & Quality',
    targetProvider: 'Anthropic',
    targetModel: 'claude-3-5-haiku',
    targetLatencyMs: 420,
    tokenTargetReduction: '50%+',
    description: 'Optimal choice for reasoning tasks requiring near-GPT-4o intelligence at Haiku pricing.',
    isActive: false
  },
  {
    id: 'preset-3',
    name: 'Ultra Low Latency Real-time',
    targetProvider: 'Groq / Meta Llama',
    targetModel: 'llama-3.1-8b-instant',
    targetLatencyMs: 120,
    tokenTargetReduction: '70%+',
    description: 'Extremely high throughput for streaming customer service pipelines.',
    isActive: false
  }
];

interface FavoritesViewProps {
  onSelectPrompt: (promptText: string) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ onSelectPrompt }) => {
  const [presets, setPresets] = useState<ModelPreset[]>(mockPresets);

  const togglePreset = (id: string) => {
    setPresets(prev => prev.map(p => ({
      ...p,
      isActive: p.id === id
    })));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Star className="w-5 h-5 fill-amber-400/20" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Favorites & Model Presets</h1>
              <p className="text-xs text-slate-400">Configure default routing thresholds and starred optimization policies.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Routing Presets Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Active Compute Routing Presets</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {presets.map(preset => (
            <motion.div
              key={preset.id}
              whileHover={{ y: -2 }}
              onClick={() => togglePreset(preset.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-4 ${
                preset.isActive
                  ? 'bg-[#141A24] border-cyan-500/50 shadow-[0_0_25px_rgba(0,242,254,0.15)]'
                  : 'bg-[#141A24]/60 border-white/[0.06] hover:bg-[#141A24]'
              }`}
            >
              {preset.isActive && (
                <span className="absolute top-0 right-0 bg-gradient-to-l from-cyan-500 to-blue-500 text-white text-[10px] font-mono font-bold px-3 py-1 rounded-bl-xl shadow-md">
                  DEFAULT PRESET
                </span>
              )}

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <Cpu className={`w-4 h-4 ${preset.isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <h4 className="text-sm font-bold text-white">{preset.name}</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{preset.description}</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-white/[0.04] text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Target Model:</span>
                  <span className="text-white font-semibold">{preset.targetModel}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Target Latency:</span>
                  <span className="text-cyan-400 font-semibold">&lt; {preset.targetLatencyMs} ms</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Token Reduction:</span>
                  <span className="text-emerald-400 font-bold">{preset.tokenTargetReduction}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    preset.isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-white/[0.04] text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.isActive ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> : null}
                  <span>{preset.isActive ? 'Active Routing Policy' : 'Set as Active'}</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Starred Favorite Prompts */}
      <div className="space-y-4 pt-6">
        <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" />
          <span>Starred Prompt Shortcuts</span>
        </h3>

        <div className="p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#0E131A] border border-white/[0.06]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>Next.js Server Actions + Zod AST Refactor</span>
              </div>
              <p className="text-xs font-mono text-slate-400">Refactor React components step by step with Zod validation.</p>
            </div>
            <button
              onClick={() => onSelectPrompt("Refactor this React component step by step using Next.js Server Actions and Zod validation.")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20"
            >
              Run Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
