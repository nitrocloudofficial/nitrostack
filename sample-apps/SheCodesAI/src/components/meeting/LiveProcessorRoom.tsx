'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CONTEXT_PACKS } from '../../data/mockData';
import { InputSourceType, ReasoningStage } from '../../types';
import { 
  Video, 
  FileText, 
  Mic, 
  UploadCloud, 
  Sparkles, 
  Play, 
  Check, 
  X, 
  Layers,
  ArrowRight,
  ShieldCheck,
  Bot,
  File,
  Paperclip,
  CheckCircle2,
  Upload
} from 'lucide-react';
import { motion } from 'framer-motion';

const STAGES: ReasoningStage[] = [
  'Reading Transcript',
  'Understanding Context',
  'Extracting Tasks',
  'Detecting Deadlines',
  'Planning Workflow',
  'Checking Previous Memory',
  'Waiting for Approval',
  'Executing MCP',
  'Updating Knowledge',
  'Completed'
];

export const LiveProcessorRoom: React.FC = () => {
  const { 
    selectedPack, 
    setSelectedPack, 
    tasks, 
    approveTask, 
    rejectTask, 
    isReasoningRunning, 
    setIsReasoningRunning,
    reasoningStageIndex,
    setReasoningStageIndex,
    setActiveTab,
    customTranscript,
    setCustomTranscript,
    uploadedFileName,
    setUploadedFileName,
    triggerNodeProgression
  } = useApp();

  const [inputSource, setInputSource] = useState<InputSourceType>('live');
  const [meetingUrl, setMeetingUrl] = useState('https://meet.google.com/xyz-dev-sync');

  // Live AI Reasoning Progress Simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isReasoningRunning && reasoningStageIndex < STAGES.length - 1) {
      timer = setTimeout(() => {
        setReasoningStageIndex(prev => prev + 1);
      }, 900);
    } else if (reasoningStageIndex === STAGES.length - 1) {
      setIsReasoningRunning(false);
    }
    return () => clearTimeout(timer);
  }, [isReasoningRunning, reasoningStageIndex, setIsReasoningRunning, setReasoningStageIndex]);

  const handleStartProcessing = () => {
    setReasoningStageIndex(0);
    setIsReasoningRunning(true);
  };

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h1 className="text-2xl font-extrabold text-white">Live AI Processing Room</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manual Context Selection • Transcript constant across workflow transformations
          </p>
        </div>

        <button
          onClick={handleStartProcessing}
          disabled={isReasoningRunning}
          className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-xl transition-all ${
            isReasoningRunning
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/30'
          }`}
        >
          <Play className={`w-4 h-4 ${isReasoningRunning ? 'animate-spin' : ''}`} />
          <span>{isReasoningRunning ? 'Processing Live Context...' : 'Run AI Processing Pipeline'}</span>
        </button>
      </div>

      {/* Grid: Left Input & Context Pack Picker | Right Live Reasoning & Approval Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Source & Context Pack Selector (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Input Source Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>1. Choose Input Source</span>
              <span className="text-[10px] text-indigo-400 font-mono">Whisper STT Engine</span>
            </h2>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'live', label: 'Live Meeting', icon: Video, desc: 'Zoom / Meet / Teams' },
                { id: 'transcript', label: 'Uploaded Text', icon: FileText, desc: 'Type/Paste Transcript' },
                { id: 'audio', label: 'Audio File', icon: Mic, desc: 'Whisper .WAV/.MP3' },
                { id: 'document', label: 'Document', icon: UploadCloud, desc: 'PDF / Docx' }
              ].map(src => {
                const Icon = src.icon;
                const isSelected = inputSource === src.id;

                return (
                  <button
                    key={src.id}
                    onClick={() => setInputSource(src.id as InputSourceType)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/10'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <div className="text-xs font-bold">{src.label}</div>
                    <div className="text-[10px] text-slate-500">{src.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Input Dynamic Box Area */}
            <div className="mt-3 pt-3 border-t border-slate-800/80">
              {inputSource === 'live' && (
                <div>
                  <label className="text-[10px] text-slate-400 font-medium block mb-1">Live Meeting URL</label>
                  <input 
                    type="text" 
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              )}

              {inputSource === 'transcript' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Paste or Type Raw Transcript</label>
                    <button 
                      onClick={() => setCustomTranscript("Haswitheswari KamboJi: Team, today we are deploying the FastAPI auth microservice to Staging. Ananya, configure ChromaDB vector store. Priya, review Q3 Notion roadmap. David, schedule architecture review.")}
                      className="text-[10px] text-indigo-400 hover:underline"
                    >
                      Fill Sample Transcript
                    </button>
                  </div>
                  <textarea 
                    value={customTranscript}
                    onChange={(e) => setCustomTranscript(e.target.value)}
                    rows={4}
                    placeholder="Type or paste meeting notes, conversation, or transcript here..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                  />
                </div>
              )}

              {inputSource === 'audio' && (
                <div className="space-y-2">
                  <label className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Upload Audio Recording (Whisper STT)</label>
                  <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950 rounded-xl p-4 text-center cursor-pointer relative group">
                    <input 
                      type="file" 
                      accept="audio/*"
                      onChange={(e) => handleFileDrop(e, 'audio')}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <Mic className="w-6 h-6 text-indigo-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-semibold text-slate-300">
                      {uploadedFileName || 'Click or drag & drop audio file (.wav, .mp3, .m4a)'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Automatic Whisper Speech-to-Text Transcription</div>
                  </div>
                </div>
              )}

              {inputSource === 'document' && (
                <div className="space-y-2">
                  <label className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Upload Document (.PDF / .DOCX / .TXT)</label>
                  <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950 rounded-xl p-4 text-center cursor-pointer relative group">
                    <input 
                      type="file" 
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => handleFileDrop(e, 'doc')}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <UploadCloud className="w-6 h-6 text-indigo-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-semibold text-slate-300">
                      {uploadedFileName || 'Click or drag & drop document file (.pdf, .docx, .txt)'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">ContextOS OCR & Document Parser</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Manual Context Pack Picker */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>2. Manual Context Pack</span>
              </h2>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Never Auto-Classified
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Select desired context. The transcript remains unchanged while generated outputs adapt.
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {CONTEXT_PACKS.map(pack => {
                const isSelected = selectedPack.id === pack.id;
                return (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPack(pack)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-900/40 to-violet-900/40 border-indigo-500 text-white shadow-lg'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold flex items-center space-x-2">
                        <span>{pack.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{pack.summaryStyle}</div>
                    </div>
                    <span className="text-[9px] uppercase font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {pack.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: AI Reasoning Panel & Human Approval Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Live AI Reasoning Panel */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Live AI Reasoning Panel
                </h3>
              </div>
              <span className="text-xs font-mono text-indigo-300">
                Stage {reasoningStageIndex + 1} / {STAGES.length}: <strong className="text-white">{STAGES[reasoningStageIndex]}</strong>
              </span>
            </div>

            {/* Stage Progress Bar */}
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <motion.div 
                className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${((reasoningStageIndex + 1) / STAGES.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Stages Grid Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {STAGES.map((stg, idx) => {
                const isPassed = idx < reasoningStageIndex;
                const isCurrent = idx === reasoningStageIndex;

                return (
                  <div 
                    key={idx}
                    className={`p-2 rounded-lg text-[10px] font-semibold border transition-all text-center ${
                      isCurrent
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30 animate-pulse'
                        : isPassed
                        ? 'bg-slate-950 text-indigo-300 border-indigo-500/30'
                        : 'bg-slate-950/40 text-slate-600 border-slate-800/60'
                    }`}
                  >
                    {isPassed ? '✓ ' : ''}{stg}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Human Approval Cards */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Human Approval Cards (Pre-MCP Execution)
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                {tasks.filter(t => t.status === 'pending').length} Pending Approval
              </span>
            </div>

            <div className="space-y-3">
              {tasks.map(task => (
                <div 
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all ${
                    task.status === 'approved' 
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-300'
                      : task.status === 'rejected'
                      ? 'bg-rose-950/20 border-rose-800/40 opacity-60'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        task.priority === 'Critical' ? 'bg-rose-500 text-white' :
                        task.priority === 'High' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-xs font-bold text-white">{task.title}</span>
                    </div>

                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 self-start sm:self-auto">
                      AI Confidence: {task.confidenceScore}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-3">{task.description}</p>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] pt-3 border-t border-slate-900">
                    <div className="flex items-center space-x-4 text-slate-400">
                      <span>Owner: <strong className="text-slate-200">{task.owner}</strong></span>
                      <span>Deadline: <strong className="text-slate-200">{task.deadline}</strong></span>
                      <span>Tool: <strong className="text-indigo-400 font-mono">{task.suggestedTool}</strong></span>
                    </div>

                    {/* Action Controls */}
                    {task.status === 'pending' ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => approveTask(task.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 shadow-md shadow-emerald-600/20 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Trigger MCP</span>
                        </button>
                        <button
                          onClick={() => rejectTask(task.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-200 border border-slate-700 font-medium text-xs flex items-center space-x-1 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <span className={`text-xs font-bold px-3 py-1 rounded-lg flex items-center space-x-1 ${
                        task.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>APPROVED (MCP Executed)</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => setActiveTab('workflow_builder')}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>View Visual MCP Workflow Execution Canvas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
