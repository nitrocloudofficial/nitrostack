'use client';

import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Mic, Activity, Maximize2, X } from 'lucide-react';

export function SpeechNode({ data }: { data: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const confidence = data.confidence || '99%';
  const status = data.status || 'STREAMING';
  const progress = data.progress || 100;
  const lastUpdate = data.lastUpdate || 'Live';

  return (
    <div className="bg-white border-2 border-indigo-600 rounded-2xl p-4 shadow-lg w-[320px] font-sans transition-all hover:shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
            <Mic size={18} />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              Speech Transcript
              <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-mono font-bold">
                Audio
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">Real-time Voice Input</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(true)}
          className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-indigo-50/60 p-2 rounded-xl border border-indigo-100 mb-3">
        <div>
          <span className="text-slate-400 uppercase block">Status</span>
          <span className="font-bold text-indigo-700">{status}</span>
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

      {/* Transcript Text Snippet */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs italic text-slate-700">
        "{data.transcript || 'Patient presents with acute chest pain x2 days...'}"
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-indigo-600 !w-3 !h-3" />

      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Mic size={18} className="text-indigo-600" />
                Speech Stream Full Transcript
              </h4>
              <button onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 italic">
              "{data.transcript}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
