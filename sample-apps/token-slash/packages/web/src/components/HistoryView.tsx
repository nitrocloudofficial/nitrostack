import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  TrendingDown, 
  Clock, 
  Zap,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HistoryItem {
  id: string;
  timestamp: string;
  originalPrompt: string;
  optimizedPrompt: string;
  originalTokens: number;
  optimizedTokens: number;
  savingsPercent: number;
  recommendedModel: string;
  provider: string;
  monthlySavings: number;
  category: string;
}

const mockHistoryData: HistoryItem[] = [
  {
    id: 'hist-1',
    timestamp: '10 mins ago',
    originalPrompt: 'Refactor this React component step by step using Next.js Server Actions and Zod validation. Make sure error boundaries are properly handled and types are strictly exported.',
    optimizedPrompt: '<instruction>Refactor React component to Next.js Server Actions with strict Zod validation.</instruction>\n<requirements>\n- Implement error boundary handling\n- Export TypeScript interfaces\n</requirements>',
    originalTokens: 245,
    optimizedTokens: 92,
    savingsPercent: 62.5,
    recommendedModel: 'gemini-3.5-flash',
    provider: 'Google',
    monthlySavings: 1431.20,
    category: 'Code Refactoring'
  },
  {
    id: 'hist-2',
    timestamp: '1 hour ago',
    originalPrompt: 'Analyze this customer support ticket transcript and extract key action items, customer sentiment score, and urgency rating into a JSON object.',
    optimizedPrompt: '<task>Extract JSON schema from transcript</task>\n<schema>\n{ actionItems: string[], sentimentScore: number, urgency: "LOW"|"MED"|"HIGH" }\n</schema>',
    originalTokens: 380,
    optimizedTokens: 110,
    savingsPercent: 71.0,
    recommendedModel: 'claude-3-5-haiku',
    provider: 'Anthropic',
    monthlySavings: 890.50,
    category: 'Data Extraction'
  },
  {
    id: 'hist-3',
    timestamp: '3 hours ago',
    originalPrompt: 'Generate a comprehensive SQL schema for a multi-tenant SaaS application with organization isolation, audit logging, and role-based access control.',
    optimizedPrompt: '<prompt>Generate SQL DDL for multi-tenant SaaS</prompt>\n<constraints>organization isolation, audit logging, RBAC</constraints>',
    originalTokens: 520,
    optimizedTokens: 185,
    savingsPercent: 64.4,
    recommendedModel: 'gpt-4o-mini',
    provider: 'OpenAI',
    monthlySavings: 2150.00,
    category: 'Database Architecture'
  },
  {
    id: 'hist-4',
    timestamp: 'Yesterday',
    originalPrompt: 'Write Python code using Pandas and NumPy to clean an incoming CSV dataset with missing values, normalize date formats, and calculate moving averages.',
    optimizedPrompt: '<task>Clean CSV dataset with Pandas/NumPy</task>\n<pipeline>impute missing, normalize dates, calculate 7-day MA</pipeline>',
    originalTokens: 310,
    optimizedTokens: 115,
    savingsPercent: 62.9,
    recommendedModel: 'gemini-3.5-flash',
    provider: 'Google',
    monthlySavings: 940.00,
    category: 'Data Engineering'
  }
];

interface HistoryViewProps {
  onSelectPrompt: (promptText: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onSelectPrompt }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<HistoryItem[]>(mockHistoryData);

  const categories = ['ALL', 'Code Refactoring', 'Data Extraction', 'Database Architecture', 'Data Engineering'];

  const filteredHistory = historyList.filter(item => {
    const matchesSearch = item.originalPrompt.toLowerCase().includes(search.toLowerCase()) || 
                          item.recommendedModel.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryList(prev => prev.filter(item => item.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Optimization History</h1>
              <p className="text-xs text-slate-400">View, compare, and re-run past prompt compression sessions.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-[#141A24] border border-white/[0.08] text-xs font-mono text-slate-400">
            Total Sessions: <span className="text-cyan-400 font-bold">{historyList.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history by prompt content or model..."
            className="w-full bg-[#141A24]/90 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        {/* Category Selector */}
        <div className="relative">
          <Filter className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-[#141A24]/90 border border-white/[0.08] rounded-xl pl-10 pr-8 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat} value={cat} className="bg-[#141A24] text-white">{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* History Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#141A24]/40 border border-white/[0.06] text-center space-y-3">
              <History className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">No optimization history matching your search filters.</p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <motion.div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  whileHover={{ scale: 1.005 }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'bg-[#141A24] border-cyan-500/40 shadow-[0_0_20px_rgba(0,242,254,0.15)]'
                      : 'bg-[#141A24]/60 border-white/[0.06] hover:bg-[#141A24] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {item.category}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {item.timestamp}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-200 line-clamp-2 pt-1 leading-relaxed">
                        {item.originalPrompt}
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-emerald-400 font-mono font-bold text-xs flex items-center justify-end gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>-{item.savingsPercent}%</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {item.originalTokens} → <span className="text-cyan-400 font-semibold">{item.optimizedTokens} tokens</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span>Model:</span>
                      <span className="text-slate-200 font-semibold">{item.recommendedModel}</span>
                      <span className="text-slate-500">({item.provider})</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPrompt(item.originalPrompt);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] font-semibold transition-colors"
                      >
                        <span>Re-run</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="text-slate-600 hover:text-rose-400 transition-colors p-1"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Selected Item Detail Panel */}
        <div className="lg:col-span-1">
          {selectedItem ? (
            <div className="sticky top-20 p-5 rounded-2xl bg-[#141A24] border border-cyan-500/30 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Session Summary</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500">{selectedItem.timestamp}</span>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="text-[10px] font-mono text-slate-500">Token Reduction</div>
                  <div className="text-base font-bold font-mono text-cyan-400">{selectedItem.savingsPercent}%</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="text-[10px] font-mono text-slate-500">Monthly ROI</div>
                  <div className="text-base font-bold font-mono text-emerald-400">${selectedItem.monthlySavings.toLocaleString()}</div>
                </div>
              </div>

              {/* Original Prompt */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Original Prompt</label>
                <div className="p-3 rounded-xl bg-[#0E131A] border border-white/[0.06] text-xs font-mono text-slate-300 max-h-36 overflow-y-auto custom-scrollbar">
                  {selectedItem.originalPrompt}
                </div>
              </div>

              {/* Optimized Output */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Optimized AST Prompt</label>
                  <button
                    onClick={() => handleCopy(selectedItem.optimizedPrompt, 'detail')}
                    className="text-[10px] font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                  >
                    {copiedId === 'detail' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === 'detail' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-[#0E131A] border border-cyan-500/20 text-xs font-mono text-cyan-300 max-h-36 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                  {selectedItem.optimizedPrompt}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectPrompt(selectedItem.originalPrompt)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-white/20" />
                <span>Load into Optimization Console</span>
              </button>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#141A24]/40 border border-white/[0.06] text-center space-y-2">
              <ChevronRight className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500">Select any history session on the left to inspect its optimization details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
