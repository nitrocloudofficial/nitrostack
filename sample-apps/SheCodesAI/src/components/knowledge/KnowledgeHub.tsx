'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { KnowledgeArticle } from '../../types';
import { BookOpen, Search, Pin, Archive, History, MessageSquare, ExternalLink, Tag, User, Sparkles, CheckCircle2 } from 'lucide-react';

export const KnowledgeHub: React.FC = () => {
  const { knowledgeArticles } = useApp();
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle>(knowledgeArticles[0]);
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const tags = ['All', 'Architecture', 'FastAPI', 'ChromaDB', 'Product', 'Roadmap'];

  const filteredArticles = knowledgeArticles.filter(art => {
    const matchesQuery = art.title.toLowerCase().includes(query.toLowerCase()) || art.summary.toLowerCase().includes(query.toLowerCase());
    const matchesTag = selectedTag === 'All' || art.tags.includes(selectedTag);
    return matchesQuery && matchesTag;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-violet-400" />
            <h1 className="text-2xl font-extrabold text-white">Notion Knowledge Hub</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Permanent Organizational Knowledge Base • Synced via Notion MCP Integration • Semantic Indexing
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Notion Workspace Connected</span>
          </span>
        </div>
      </div>

      {/* Semantic Search & Tags Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Semantic search (e.g. 'What happened in Sprint 24?')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedTag === tag 
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Articles List | Right Active Document Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Articles Feed (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {filteredArticles.map(art => {
            const isSelected = selectedArticle.id === art.id;

            return (
              <div 
                key={art.id}
                onClick={() => setSelectedArticle(art)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                  isSelected
                    ? 'bg-gradient-to-br from-violet-950/40 to-slate-900 border-violet-500 shadow-xl shadow-violet-500/10'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                    {art.contextPack}
                  </span>
                  <span className="text-[10px] text-slate-500">{art.date}</span>
                </div>

                <h3 className="text-xs font-bold text-white line-clamp-2">{art.title}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{art.summary}</p>

                <div className="flex items-center space-x-1.5 pt-2">
                  {art.tags.map(t => (
                    <span key={t} className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Active Document Details (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          {/* Document Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-[10px] uppercase font-bold text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded border border-violet-500/20">
                  Notion Synced
                </span>
                <span className="text-xs text-slate-400">{selectedArticle.date}</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">{selectedArticle.title}</h2>
            </div>

            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center space-x-1.5 transition-all"
              >
                <History className="w-3.5 h-3.5 text-indigo-400" />
                <span>Versions ({selectedArticle.versions.length})</span>
              </button>
            </div>
          </div>

          {/* Decisions List */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Key Architectural Decisions</span>
            </h4>
            <ul className="space-y-1 text-xs text-slate-300">
              {selectedArticle.decisions.map((dec, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>{dec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Markdown Content Body */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
            {selectedArticle.contentMarkdown}
          </div>

          {/* Version History Drawer Modal */}
          {showVersionHistory && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                <History className="w-4 h-4 text-indigo-400" />
                <span>Document Version History</span>
              </h4>
              <div className="space-y-2">
                {selectedArticle.versions.map((ver, idx) => (
                  <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-indigo-300">{ver.version}</span>
                      <span className="text-slate-400 text-[10px] ml-2">{ver.timestamp} by {ver.author}</span>
                      <p className="text-[11px] text-slate-300 mt-0.5">{ver.changeSummary}</p>
                    </div>
                    <button className="text-[10px] text-indigo-400 font-bold hover:underline">Restore Version</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
