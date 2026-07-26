'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { VectorMemoryNode } from '../../types';
import { Database, Cpu, Search, Sparkles, Network, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export const VectorMemoryInspector: React.FC = () => {
  const { vectorNodes } = useApp();
  const [selectedVector, setSelectedVector] = useState<VectorMemoryNode>(vectorNodes[0]);
  const [searchPrompt, setSearchPrompt] = useState('FastAPI microservices architecture and Supabase JWT');
  const [isQuerying, setIsQuerying] = useState(false);

  const handleRunSimilaritySearch = () => {
    setIsQuerying(true);
    setTimeout(() => {
      setIsQuerying(false);
    }, 600);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-extrabold text-white">ChromaDB Vector Memory Inspector</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Contextual Memory Engine • OpenAI text-embedding-3-small (1,536 Dimensions) • Cosine Similarity Index
          </p>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center space-x-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs flex items-center space-x-3">
            <div>
              <span className="text-[10px] text-slate-500 block">Collection</span>
              <span className="font-mono font-bold text-indigo-300">acme_workspace_memory</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-500 block">Vector Dimensions</span>
              <span className="font-mono font-bold text-emerald-400">1,536d</span>
            </div>
          </div>
        </div>
      </div>

      {/* Embedding Query Tester Tool */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4" />
            <span>Interactive Embedding Vector Similarity Search</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">ChromaDB Query Engine</span>
        </div>

        <div className="flex items-center space-x-3">
          <input 
            type="text" 
            value={searchPrompt}
            onChange={(e) => setSearchPrompt(e.target.value)}
            placeholder="Type query to compute vector distance against past conversation embeddings..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <button
            onClick={handleRunSimilaritySearch}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 whitespace-nowrap flex items-center space-x-1.5"
          >
            <Search className="w-4 h-4" />
            <span>Compute Similarity</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Vector Graph Visualizer | Right Vector Metadata Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Vector Nodes Network Visualizer (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Network className="w-4 h-4 text-violet-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Vector Knowledge Graph Network
              </h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">ChromaDB Active Nodes</span>
          </div>

          <div className="space-y-3">
            {vectorNodes.map(vec => {
              const isSelected = selectedVector.id === vec.id;

              return (
                <motion.div
                  key={vec.id}
                  onClick={() => setSelectedVector(vec)}
                  whileHover={{ scale: 1.01 }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'bg-gradient-to-br from-indigo-950/60 to-violet-950/40 border-indigo-500 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {vec.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                      {(vec.similarityScore * 100).toFixed(1)}% Cosine Match
                    </span>
                  </div>

                  <p className="text-xs font-mono text-slate-200">"{vec.textSnippet}"</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-900">
                    <span>Meeting: <strong className="text-slate-300">{vec.meetingTitle}</strong></span>
                    <span>Pack: <strong className="text-violet-300">{vec.contextPack}</strong></span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Selected Vector Inspector & Entity Graph (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Vector Embedding Details
            </h3>
            <span className="text-[10px] font-mono text-slate-400">{selectedVector.id}</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Snippet Text</span>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-indigo-200">
                {selectedVector.textSnippet}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Connected Entities & Strategy Links</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedVector.connectedEntities.map(ent => (
                  <span key={ent} className="text-[10px] font-mono font-semibold text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    {ent}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Memory Persistence:</span>
                <span className="text-slate-200 font-bold">ChromaDB Permanent Storage</span>
              </div>
              <div className="flex justify-between">
                <span>Vector Dimensions:</span>
                <span className="text-emerald-400 font-bold">1,536 floats</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
