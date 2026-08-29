'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, Compass, GitFork, Users, FileText, Send, RefreshCw } from 'lucide-react';
import OverviewTab from '../components/OverviewTab';
import SdlcSelectorTab from '../components/SdlcSelectorTab';
import RoadmapTab from '../components/RoadmapTab';
import AllocationTab from '../components/AllocationTab';
import Link from 'next/link';

export default function DashboardWidget() {
  const [activeTab, setActiveTab] = useState<'overview' | 'sdlc' | 'roadmap' | 'allocation'>('overview');
  const [projectId, setProjectId] = useState<string>('proj_demo_9823');
  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSdlc, setSelectedSdlc] = useState<string>('Agile-Scrum');

  // Chat/Prompt State
  const [srdPrompt, setSrdPrompt] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string }>>([
    { sender: 'agent', text: 'Hello! I am ProjectPilot AI. Paste your SRD text or project description below to begin multi-agent planning.' },
  ]);

  const fetchContext = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/project/context?id=${id}`);
      if (res.ok) {
        const json = await res.json();
        setProjectData(json);
        if (json.selected_sdlc_model) {
          setSelectedSdlc(json.selected_sdlc_model);
        }
      }
    } catch (err) {
      console.error('Failed to fetch context:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContext(projectId);
  }, [projectId]);

  const handleGeneratePlan = async () => {
    if (!srdPrompt.trim()) return;

    const userText = srdPrompt;
    setSrdPrompt('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);

    setChatMessages((prev) => [
      ...prev,
      { sender: 'agent', text: 'Ingesting SRD, parsing requirements, and running multi-agent tools...' },
    ]);

    // Refresh context after agent execution cycle
    setTimeout(() => {
      fetchContext(projectId);
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[90vh]">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block animate-pulse"></span>
            <h1 className="text-lg font-semibold text-slate-800">ProjectPilot AI</h1>
          </div>
          <p className="text-xs text-slate-500">Multi-Agent Planning Workspace</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/report-preview?id=${projectId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors"
          >
            <FileText size={14} /> Full Executive Report
          </Link>

          <button
            onClick={() => fetchContext(projectId)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 transition-colors"
            title="Refresh State"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full text-xs font-medium text-slate-700 border border-blue-100">
            <span className="text-slate-400">ID:</span>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-blue-600 font-mono font-semibold w-24"
            />
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        {/* Left ChatGPT Interface */}
        <div className="lg:col-span-5 flex flex-col h-full bg-slate-50/30">
          <div className="p-4 border-b border-slate-100 bg-white">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Agent Command Chat</h2>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex gap-2">
              <textarea
                value={srdPrompt}
                onChange={(e) => setSrdPrompt(e.target.value)}
                placeholder="Paste SRD requirements or project goals..."
                className="flex-1 resize-none text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                rows={2}
              />
              <button
                onClick={handleGeneratePlan}
                className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Dashboard Tabs */}
        <div className="lg:col-span-7 flex flex-col h-full bg-white">
          <nav className="flex border-b border-slate-100 px-4 gap-2 pt-2 bg-white shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'bg-blue-50/60 text-slate-800 border-blue-500'
                  : 'text-slate-500 hover:text-slate-700 border-transparent'
              }`}
            >
              <LayoutDashboard size={14} /> Overview
            </button>

            <button
              onClick={() => setActiveTab('sdlc')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'sdlc'
                  ? 'bg-purple-50/60 text-slate-800 border-purple-500'
                  : 'text-slate-500 hover:text-slate-700 border-transparent'
              }`}
            >
              <Compass size={14} /> SDLC
            </button>

            <button
              onClick={() => setActiveTab('roadmap')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'roadmap'
                  ? 'bg-amber-50/60 text-slate-800 border-amber-500'
                  : 'text-slate-500 hover:text-slate-700 border-transparent'
              }`}
            >
              <GitFork size={14} /> Roadmap
            </button>

            <button
              onClick={() => setActiveTab('allocation')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'allocation'
                  ? 'bg-emerald-50/60 text-slate-800 border-emerald-500'
                  : 'text-slate-500 hover:text-slate-700 border-transparent'
              }`}
            >
              <Users size={14} /> Team
            </button>
          </nav>

          <main className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'overview' && (
              <OverviewTab data={projectData} selectedSdlc={selectedSdlc} />
            )}
            {activeTab === 'sdlc' && (
              <SdlcSelectorTab
                candidates={projectData?.sdlc_candidates}
                selected={selectedSdlc}
                onSelect={setSelectedSdlc}
              />
            )}
            {activeTab === 'roadmap' && (
              <RoadmapTab sdlcModel={selectedSdlc} roadmap={projectData?.roadmap} />
            )}
            {activeTab === 'allocation' && (
              <AllocationTab allocations={projectData?.allocations} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}