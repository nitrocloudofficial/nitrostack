import React, { useState } from 'react';
import { 
  Settings, 
  Server, 
  Key, 
  Sliders, 
  Save, 
  CheckCircle2, 
  Globe, 
  Cpu, 
  ShieldAlert,
  Database
} from 'lucide-react';
import { motion } from 'framer-motion';

export const SettingsView: React.FC = () => {
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [openAiKey, setOpenAiKey] = useState('sk-proj-••••••••••••••••••••••••');
  const [geminiKey, setGeminiKey] = useState('AIzaSy••••••••••••••••••••••••');
  const [anthropicKey, setAnthropicKey] = useState('sk-ant-••••••••••••••••••••••••');
  const [minSavingsThreshold, setMinSavingsThreshold] = useState(40);
  const [maxLatencyTolerance, setMaxLatencyTolerance] = useState(500);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Platform Settings & MCP Config</h1>
              <p className="text-xs text-slate-400">Manage backend API server bridge endpoints, API keys, and model thresholds.</p>
            </div>
          </div>
        </div>

        {isSaved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved Successfully</span>
          </motion.div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: MCP Server Bridge */}
        <div className="p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-4">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span>NitroStack MCP Server Bridge Endpoint</span>
          </h3>

          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-300">Backend API URL</label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="w-full bg-[#0E131A] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <p className="text-[11px] font-mono text-slate-500">Default local bridge listens on port 3001 (`http://localhost:3001`).</p>
          </div>
        </div>

        {/* Section 2: API Keys Management */}
        <div className="p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-4">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>Provider API Keys (Encrypted)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300">Google Gemini API Key</label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full bg-[#0E131A] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300">Anthropic API Key</label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="w-full bg-[#0E131A] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-mono text-slate-300">OpenAI API Key</label>
              <input
                type="password"
                value={openAiKey}
                onChange={(e) => setOpenAiKey(e.target.value)}
                className="w-full bg-[#0E131A] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Optimization Sliders */}
        <div className="p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-6">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Optimization Thresholds & Guardrails</span>
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">Minimum Token Reduction Target</span>
                <span className="text-cyan-400 font-bold">{minSavingsThreshold}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                value={minSavingsThreshold}
                onChange={(e) => setMinSavingsThreshold(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">Maximum Latency Tolerance (ms)</span>
                <span className="text-blue-400 font-bold">{maxLatencyTolerance} ms</span>
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="50"
                value={maxLatencyTolerance}
                onChange={(e) => setMaxLatencyTolerance(Number(e.target.value))}
                className="w-full accent-blue-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
