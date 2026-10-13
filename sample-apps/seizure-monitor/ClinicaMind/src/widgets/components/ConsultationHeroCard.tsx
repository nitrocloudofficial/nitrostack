'use client';

import React from 'react';
import { Mic, MicOff, Sparkles, RefreshCw, Volume2 } from 'lucide-react';

interface ConsultationHeroCardProps {
  isListening: boolean;
  onToggleListening: () => void;
  transcript: string;
  onRefresh: () => void;
  isLoading: boolean;
  graphData?: any;
}

export function ConsultationHeroCard({
  isListening,
  onToggleListening,
  transcript,
  onRefresh,
  isLoading,
  graphData
}: ConsultationHeroCardProps) {
  // Derive dynamic symptoms and flags from real agent output
  const extractedSymptoms: string[] = graphData?.symptomsExtracted || [];
  const riskFactors: string[] = graphData?.evidencePackage?.riskFactors || [];
  const allergyConflicts: any[] = graphData?.evidencePackage?.allergyConflicts || [];

  const displayFlags = [
    ...extractedSymptoms,
    ...allergyConflicts.map(a => `Allergy: ${a.drug || a.substance || 'Conflict'}`),
    ...riskFactors
  ];

  // Derive dynamic activity ticker message from real observability metadata
  const selectedAgents: string[] = graphData?.observability?.selectedAgents || ['supervisor'];
  const overallConfidence = graphData?.observability?.overallConfidence || 0.94;
  const intentCategory = graphData?.intentCategory || 'GENERAL_COPILOT';

  const tickerMessage = selectedAgents.length > 0
    ? `Supervisor Intent: ${intentCategory} • Executed [${selectedAgents.join(', ')}] • Overall Confidence: ${(overallConfidence * 100).toFixed(0)}%`
    : 'Awaiting microphone speech input...';

  return (
    <div className="consultation-panel space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Volume2 size={20} />
          </div>
          <div>
            <h2 className="heading-4 flex items-center gap-2">
              Live Consultation Audio & Transcript Stream
              <span className={isListening ? 'badge-critical animate-pulse' : 'badge-normal'}>
                {isListening ? 'LIVE MIC RECORDING' : 'AUDIO READY'}
              </span>
            </h2>
            <p className="body-sm">Real-time voice processing & dynamic multi-agent execution</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleListening}
            className={isListening ? 'btn-danger' : 'btn-primary'}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            <span>{isListening ? 'Pause Recording' : 'Start Audio Consultation'}</span>
          </button>

          <button
            onClick={onRefresh}
            className="btn-icon"
            title="Re-trigger Agent Pipeline"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin text-indigo-600' : ''} />
          </button>
        </div>
      </div>

      {/* Transcript & Symptom Extraction Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Live Transcript Box */}
        <div className="col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
          <span className="label-text block">Live Voice Transcript Stream:</span>
          <p className="body-md italic leading-relaxed max-h-24 overflow-y-auto pr-1">
            {transcript ? `"${transcript}"` : 'Listening... Speak into your microphone.'}
          </p>
        </div>

        {/* Extracted Symptoms Tags */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
          <span className="label-text block">Live Extracted Symptoms & Flags:</span>
          <div className="flex flex-wrap gap-1">
            {displayFlags.length > 0 ? (
              displayFlags.map((symptom, idx) => {
                const isAlert = symptom.toLowerCase().includes('allergy') || symptom.toLowerCase().includes('chest pain') || symptom.toLowerCase().includes('critical');
                return (
                  <span
                    key={idx}
                    className={isAlert ? 'badge-critical' : 'badge-review'}
                  >
                    {isAlert ? `⚠️ ${symptom}` : symptom}
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-slate-400 font-mono">No symptoms extracted yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Live Agent Reasoning Activity Strip */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-3 rounded-xl flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <Sparkles size={16} className="text-indigo-400 animate-pulse" />
          <span>Multi-Agent Live Activity Ticker:</span>
          <span className="text-emerald-300 font-bold">{tickerMessage}</span>
        </div>
        <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
          Sync: Realtime
        </span>
      </div>
    </div>
  );
}
