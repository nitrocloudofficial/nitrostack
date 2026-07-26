'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, X, Sparkles, BookOpen, Database, CheckSquare, Grid } from 'lucide-react';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, setActiveTab, setSelectedPack, knowledgeArticles, vectorNodes, tasks, selectedPack } = useApp();
  const [query, setQuery] = useState('');

  if (!isSearchOpen) return null;

  const filteredKnowledge = knowledgeArticles.filter(a => 
    a.title.toLowerCase().includes(query.toLowerCase()) || 
    a.summary.toLowerCase().includes(query.toLowerCase())
  );

  const filteredVectors = vectorNodes.filter(v => 
    v.textSnippet.toLowerCase().includes(query.toLowerCase()) || 
    v.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-24 p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Input Bar */}
        <div className="relative border-b border-slate-800 p-4 flex items-center space-x-3">
          <Search className="w-5 h-5 text-indigo-400" />
          <input 
            type="text"
            placeholder="Type to search Notion docs, ChromaDB vector memories, Context Packs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
          />
          <button 
            onClick={() => setIsSearchOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          {/* Quick Actions */}
          {!query && (
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
                Quick View Shortcuts
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => { setActiveTab('live_room'); setIsSearchOpen(false); }}
                  className="flex items-center space-x-3 p-3 bg-slate-850 hover:bg-slate-800 rounded-xl border border-slate-800 text-left transition-all group"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Open AI Processing Room</div>
                    <div className="text-[10px] text-slate-400">Live AI Reasoning & STT Stream</div>
                  </div>
                </button>

                <button 
                  onClick={() => { setActiveTab('knowledge_hub'); setIsSearchOpen(false); }}
                  className="flex items-center space-x-3 p-3 bg-slate-850 hover:bg-slate-800 rounded-xl border border-slate-800 text-left transition-all group"
                >
                  <BookOpen className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Search Notion Hub</div>
                    <div className="text-[10px] text-slate-400">Published Documentation & ADADRs</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Notion Knowledge Base Results */}
          {filteredKnowledge.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider mb-2 flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Notion Knowledge Base Articles ({filteredKnowledge.length})</span>
              </div>
              <div className="space-y-1.5">
                {filteredKnowledge.map(art => (
                  <div 
                    key={art.id}
                    onClick={() => { setActiveTab('knowledge_hub'); setIsSearchOpen(false); }}
                    className="p-3 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 rounded-xl cursor-pointer transition-all"
                  >
                    <div className="text-xs font-semibold text-slate-200">{art.title}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{art.summary}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ChromaDB Vector Memory Results */}
          {filteredVectors.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-violet-400 tracking-wider mb-2 flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>ChromaDB Vector Embeddings ({filteredVectors.length})</span>
              </div>
              <div className="space-y-1.5">
                {filteredVectors.map(vec => (
                  <div 
                    key={vec.id}
                    onClick={() => { setActiveTab('vector_memory'); setIsSearchOpen(false); }}
                    className="p-3 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-mono text-violet-300">"{vec.textSnippet}"</div>
                      <div className="text-[10px] text-slate-400 mt-1">{vec.meetingTitle} • {vec.category}</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {(vec.similarityScore * 100).toFixed(0)}% match
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 px-4">
          <span>Press ESC to exit search</span>
          <span>Vector Similarity Engine • ChromaDB Active</span>
        </div>
      </div>
    </div>
  );
};
