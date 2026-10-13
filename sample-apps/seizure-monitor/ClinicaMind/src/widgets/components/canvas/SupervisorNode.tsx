'use client';

import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Brain, Maximize2, X } from 'lucide-react';

export function SupervisorNode({ data }: { data: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const confidence = data.confidence || '98%';
  const status = data.status || 'ACTIVE';
  const progress = data.progress || 100;
  const lastUpdate = data.lastUpdate || 'Just now';

  return (
    <div className="agent-card agent-card-supervisor w-[320px] font-sans transition-all hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!bg-blue-600 !w-3 !h-3" />
      
      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
            <Brain size={18} />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              Supervisor Agent
              <span className="agent-badge-supervisor">
                Master
              </span>
            </h3>
            <p className="caption-text font-mono">Orchestrates domain agents</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(true)}
          className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
          title="Expand reasoning node"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Node Metrics Bar */}
      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-blue-50/60 p-2 rounded-xl border border-blue-100 mb-3">
        <div>
          <span className="text-slate-400 uppercase block">Status</span>
          <span className="font-bold text-blue-700">{status}</span>
        </div>
        <div>
          <span className="text-slate-400 uppercase block">Confidence</span>
          <span className="font-bold text-emerald-600">{confidence}</span>
        </div>
        <div>
          <span className="text-slate-400 uppercase block">Updated</span>
          <span className="font-bold text-slate-700">{lastUpdate}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>Orchestration Progress</span>
          <span className="font-bold text-blue-700">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Content Snippet */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
        <span className="label-text block">Delegated Agents ({data.agentsInvoked?.length || 5}):</span>
        <div className="flex flex-wrap gap-1">
          {(data.agentsInvoked || ['History', 'Medication', 'Research', 'GapAnalysis', 'Report']).map((ag: string, idx: number) => (
            <span key={idx} className="agent-badge-supervisor">
              • {ag}
            </span>
          ))}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-blue-600 !w-3 !h-3" />

      {/* Expansion Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Brain size={18} className="text-blue-600" />
                Supervisor Agent Inspection
              </h4>
              <button onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-900">Clinical Intent & Orchestration Rationale:</p>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                {data.reasoning || "Analyzed real-time speech stream. Identified high risk pneumonia presentation in 70yo diabetic with Penicillin allergy. Triggered parallel queries across History, Medication, PubMed Research, and Gap Analysis agents."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
