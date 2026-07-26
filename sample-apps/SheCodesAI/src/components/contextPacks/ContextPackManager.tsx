'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CONTEXT_PACKS } from '../../data/mockData';
import { ContextPack, ToolType } from '../../types';
import { Grid, Plus, Search, Sparkles, Check, Layers, Sliders, X, Shield, ArrowRight } from 'lucide-react';

export const ContextPackManager: React.FC = () => {
  const { selectedPack, setSelectedPack, customPacks, addCustomPack, setActiveTab } = useApp();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  // Custom Pack Form state
  const [packName, setPackName] = useState('');
  const [category, setCategory] = useState('Custom');
  const [description, setDescription] = useState('');
  const [summaryStyle, setSummaryStyle] = useState('Custom Executive Summary');
  const [dashboardLayout, setDashboardLayout] = useState('Custom Kanban');

  const allPacks = [...CONTEXT_PACKS, ...customPacks];

  const categories = ['All', ...Array.from(new Set(CONTEXT_PACKS.map(p => p.category)))];

  const filteredPacks = allPacks.filter(p => {
    const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesQuery && matchesCat;
  });

  const handleCreateCustomPack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packName) return;

    const newPack: ContextPack = {
      id: `custom-${Date.now()}`,
      name: packName,
      category,
      description,
      icon: 'Sliders',
      color: 'from-violet-600 to-indigo-600',
      summaryStyle,
      dashboardLayout,
      planningLogic: 'Custom Action Rules',
      timelineStyle: 'Custom Milestone View',
      reminderRules: '24h Follow-up Alerts',
      notificationLogic: 'Slack + Email Digest',
      memoryStructure: 'Custom Graph Schema',
      analytics: 'Custom Velocity Index',
      suggestedIntegrations: ['Notion', 'Slack'],
      isCustom: true
    };

    addCustomPack(newPack);
    setIsBuilderOpen(false);
    setPackName('');
    setDescription('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <Grid className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-extrabold text-white">Context Packs Library (25+ Packs)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manual Context Selection Mode • Never Auto-Classified • Transcripts stay constant, workflows transform
          </p>
        </div>

        <button
          onClick={() => setIsBuilderOpen(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Build Custom Context Pack</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search packs (Software, Medical, Hackathon...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Context Packs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPacks.map(pack => {
          const isSelected = selectedPack.id === pack.id;

          return (
            <div 
              key={pack.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden group ${
                isSelected
                  ? 'bg-gradient-to-br from-indigo-950/60 via-slate-900 to-violet-950/40 border-indigo-500 shadow-2xl shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                    {pack.category}
                  </span>
                  {pack.isCustom ? (
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      Custom Pack
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Manual Select
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white mb-1.5 flex items-center justify-between">
                  <span>{pack.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                </h3>

                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {pack.description}
                </p>

                {/* Specs List */}
                <div className="space-y-1.5 text-[11px] border-t border-slate-800/80 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Summary Style:</span>
                    <span className="font-semibold text-slate-300 truncate max-w-[170px]">{pack.summaryStyle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dashboard Layout:</span>
                    <span className="font-semibold text-slate-300 truncate max-w-[170px]">{pack.dashboardLayout}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reminder Rules:</span>
                    <span className="font-semibold text-indigo-300 truncate max-w-[170px]">{pack.reminderRules}</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  {pack.suggestedIntegrations.map(tool => (
                    <span key={tool} className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      {tool}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => { setSelectedPack(pack); setActiveTab('live_room'); }}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1 transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{isSelected ? 'Active Pack' : 'Select Pack'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Context Pack Builder Modal */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Create Custom Context Pack</h3>
              </div>
              <button onClick={() => setIsBuilderOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomPack} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Pack Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Quantum Computing R&D"
                  value={packName}
                  onChange={(e) => setPackName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Category</label>
                <input 
                  type="text" 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Description & Objective</label>
                <textarea 
                  placeholder="Define the domain workflow rules and target outputs..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Summary Style</label>
                  <input 
                    type="text" 
                    value={summaryStyle}
                    onChange={(e) => setSummaryStyle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Dashboard Layout</label>
                  <input 
                    type="text" 
                    value={dashboardLayout}
                    onChange={(e) => setDashboardLayout(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30"
                >
                  Save & Apply Context Pack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
