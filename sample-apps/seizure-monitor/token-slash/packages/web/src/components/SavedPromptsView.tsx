import React, { useState } from 'react';
import { 
  Bookmark, 
  Search, 
  Plus, 
  Sparkles, 
  Copy, 
  Check, 
  Tag, 
  ArrowRight, 
  Zap,
  Code,
  FileJson,
  Database,
  Brain,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SavedPrompt {
  id: string;
  title: string;
  category: string;
  description: string;
  promptText: string;
  tags: string[];
  estimatedReduction: string;
}

const mockSavedPrompts: SavedPrompt[] = [
  {
    id: 'sp-1',
    title: 'React Component AST Refactor',
    category: 'Code Optimization',
    description: 'Compresses React components into server actions with Zod schema validation rules.',
    promptText: 'Refactor this React component step by step using Next.js Server Actions and Zod validation. Make sure error boundaries are properly handled and types are strictly exported.',
    tags: ['React', 'TypeScript', 'Next.js', 'Zod'],
    estimatedReduction: '62.5%'
  },
  {
    id: 'sp-2',
    title: 'JSON Schema Extractor',
    category: 'Data Extraction',
    description: 'Enforces strict JSON schema output for LLMs with zero extra conversational fluff.',
    promptText: 'Extract all customer metadata, purchase items, total cost, and sentiment score from the text provided below. Output strictly valid JSON matching this schema: { customerId: string, items: Array<{ name: string, price: number }>, total: number, sentiment: "POSITIVE"|"NEUTRAL"|"NEGATIVE" }.',
    tags: ['JSON', 'Schema', 'Extraction'],
    estimatedReduction: '71.0%'
  },
  {
    id: 'sp-3',
    title: 'Multi-Tenant SQL DDL Synthesizer',
    category: 'Database Architecture',
    description: 'Generates isolated Postgres database schemas with audit logging and RLS policies.',
    promptText: 'Generate SQL DDL migration script for a multi-tenant PostgreSQL database with row-level security (RLS) policies, organization isolation, and foreign key constraints.',
    tags: ['PostgreSQL', 'SQL', 'RLS', 'SaaS'],
    estimatedReduction: '58.4%'
  },
  {
    id: 'sp-4',
    title: 'Python Pandas Data Pipeline',
    category: 'Data Engineering',
    description: 'Cleans CSV datasets, imputes null values, and normalizes date columns efficiently.',
    promptText: 'Write a Python function using Pandas to clean an incoming DataFrame: drop columns with over 50% missing values, impute numeric columns with median, and parse all date strings into ISO 8601.',
    tags: ['Python', 'Pandas', 'ETL'],
    estimatedReduction: '65.0%'
  }
];

interface SavedPromptsViewProps {
  onSelectPrompt: (promptText: string) => void;
}

export const SavedPromptsView: React.FC<SavedPromptsViewProps> = ({ onSelectPrompt }) => {
  const [prompts, setPrompts] = useState<SavedPrompt[]>(mockSavedPrompts);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New prompt form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Code Optimization');
  const [newPromptText, setNewPromptText] = useState('');
  const [newTags, setNewTags] = useState('');

  const allTags = ['ALL', ...Array.from(new Set(prompts.flatMap(p => p.tags)))];

  const filteredPrompts = prompts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          p.description.toLowerCase().includes(search.toLowerCase()) ||
                          p.promptText.toLowerCase().includes(search.toLowerCase());
    const matchesTag = selectedTag === 'ALL' || p.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPromptText.trim()) return;

    const newPrompt: SavedPrompt = {
      id: `sp-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      description: 'Custom user prompt template saved to local library.',
      promptText: newPromptText,
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      estimatedReduction: '55.0%'
    };

    setPrompts([newPrompt, ...prompts]);
    setIsModalOpen(false);
    setNewTitle('');
    setNewPromptText('');
    setNewTags('');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Saved Prompt Library</h1>
              <p className="text-xs text-slate-400">Curated enterprise prompts optimized for token efficiency and schema enforcement.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Save New Prompt</span>
        </button>
      </div>

      {/* Search & Tag Filter Bar */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved prompts by title, description, or keyword..."
            className="w-full bg-[#141A24]/90 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        {/* Tags horizontal list */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <Tag className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mr-1" />
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all flex-shrink-0 ${
                selectedTag === tag
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'bg-[#141A24] text-slate-400 border border-white/[0.06] hover:text-white'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Prompts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPrompts.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ y: -2 }}
            className="p-5 rounded-2xl bg-[#141A24] border border-white/[0.08] hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-4 relative group shadow-lg"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-semibold">
                  {item.category}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Est. Reduction: {item.estimatedReduction}
                </span>
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Code Box */}
            <div className="p-3 rounded-xl bg-[#0E131A] border border-white/[0.06] font-mono text-xs text-slate-300 line-clamp-3 relative">
              {item.promptText}
            </div>

            {/* Tags & Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map(t => (
                  <span key={t} className="text-[10px] font-mono text-slate-500 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.04]">
                    #{t}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(item.promptText, item.id)}
                  className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                  title="Copy Prompt"
                >
                  {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => onSelectPrompt(item.promptText)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/30 transition-all flex items-center gap-1.5"
                >
                  <span>Use Prompt</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add New Prompt Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#141A24] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <span>Save Custom Prompt</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddPrompt} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300">Prompt Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Next.js API Route Optimizer"
                    className="w-full bg-[#0E131A] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-[#0E131A] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="Code Optimization">Code Optimization</option>
                    <option value="Data Extraction">Data Extraction</option>
                    <option value="Database Architecture">Database Architecture</option>
                    <option value="Data Engineering">Data Engineering</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300">Prompt Content</label>
                  <textarea
                    required
                    rows={4}
                    value={newPromptText}
                    onChange={(e) => setNewPromptText(e.target.value)}
                    placeholder="Paste original or template prompt here..."
                    className="w-full bg-[#0E131A] border border-white/[0.08] rounded-xl p-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="e.g. React, Next.js, API"
                    className="w-full bg-[#0E131A] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/[0.05] text-xs text-slate-300 hover:bg-white/[0.1]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20"
                  >
                    Save Prompt
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
