'use client';

import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { HelpCircle, AlertCircle, Maximize2, X } from 'lucide-react';

export function GapNode({ data }: { data: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const gaps = data.content?.gaps || data.gaps || [];
  const confidence = data.confidence || '94%';
  const status = data.status || 'ANALYZED';
  const progress = data.progress || 100;
  const lastUpdate = data.lastUpdate || '10:15 AM';

  return (
    <div className="bg-white border-2 border-amber-500 rounded-2xl p-4 shadow-lg w-[320px] font-sans transition-all hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3" />
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
            <HelpCircle size={18} />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              Gap Analysis Agent
              <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-mono font-bold">
                Missing History
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">Missing Clinical Data Detector</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(true)}
          className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-amber-50/60 p-2 rounded-xl border border-amber-100 mb-3">
        <div>
          <span className="text-slate-400 uppercase block">Status</span>
          <span className="font-bold text-amber-700">{status}</span>
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
          <span>Gap Analysis</span>
          <span className="font-bold text-amber-700">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Missing Information Items */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs space-y-1">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Missing Questions to Clarify:</span>
        <div className="space-y-1 text-[11px] text-slate-700">
          <p>• Smoking history or lung exposure?</p>
          <p>• Recent travel or sick contact exposure?</p>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3" />

      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <HelpCircle size={18} className="text-amber-600" />
                Gap Analysis Inspection
              </h4>
              <button onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-900">High Priority Clarifications:</p>
              <ul className="bg-slate-50 p-3 rounded-xl border border-slate-200 list-disc list-inside space-y-1 font-mono">
                <li>Check for occupational chemical inhalant history</li>
                <li>Evaluate renal function baseline prior to fluoroquinolone dosing</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
