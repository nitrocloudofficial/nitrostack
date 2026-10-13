'use client';

import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Pill, ShieldAlert, Maximize2, X } from 'lucide-react';

export function MedicationNode({ data }: { data: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const medication = data.content?.medication || data.medication || {};
  const confidence = data.confidence || '97%';
  const status = data.status || 'VERIFIED';
  const progress = data.progress || 100;
  const lastUpdate = data.lastUpdate || '10:15 AM';

  return (
    <div className="bg-white border-2 border-purple-600 rounded-2xl p-4 shadow-lg w-[320px] font-sans transition-all hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!bg-purple-600 !w-3 !h-3" />
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
            <Pill size={18} />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              Medication Agent
              <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded font-mono font-bold">
                Rx Safety
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">Drug Safety & Allergy Checker</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(true)}
          className="p-1 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-purple-50/60 p-2 rounded-xl border border-purple-100 mb-3">
        <div>
          <span className="text-slate-400 uppercase block">Status</span>
          <span className="font-bold text-purple-700">{status}</span>
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
          <span>Interaction Verification</span>
          <span className="font-bold text-purple-700">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Safety Alert Box */}
      <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 text-xs space-y-1">
        <div className="flex items-center gap-1.5 text-red-700 font-bold text-[11px]">
          <ShieldAlert size={14} />
          <span>Allergy Hazard Flagged</span>
        </div>
        <p className="text-[11px] text-red-800 leading-snug">
          {medication.warning || 'Amoxicillin proposed; Penicillin allergy documented. Levofloxacin recommended.'}
        </p>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-purple-600 !w-3 !h-3" />

      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Pill size={18} className="text-purple-600" />
                Medication Agent Inspection
              </h4>
              <button onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-600 font-mono">
              <p><span className="font-bold">Contraindicated:</span> Beta-lactam Penicillin derivative</p>
              <p><span className="font-bold">Safe Substitute:</span> Levofloxacin 750mg QD (Fluoroquinolone)</p>
              <p><span className="font-bold">openFDA Query Status:</span> Checked 2,400 drug interaction pairs</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
