'use client';

import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Database, ShieldAlert, Maximize2, X } from 'lucide-react';

export function HistoryNode({ data }: { data: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const history = data.content?.history || data.history || {};
  const confidence = data.confidence || '99%';
  const status = data.status || 'SYNCED';
  const progress = data.progress || 100;
  const lastUpdate = data.lastUpdate || '10:15 AM';

  return (
    <div className="bg-white border-2 border-emerald-500 rounded-2xl p-4 shadow-lg w-[320px] font-sans transition-all hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!bg-emerald-600 !w-3 !h-3" />
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <Database size={18} />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              History Agent
              <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-mono font-bold">
                EHR Data
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">Patient Folder & EHR Store</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(true)}
          className="p-1 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-emerald-50/60 p-2 rounded-xl border border-emerald-100 mb-3">
        <div>
          <span className="text-slate-400 uppercase block">Status</span>
          <span className="font-bold text-emerald-700">{status}</span>
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
          <span>EHR Retrieval</span>
          <span className="font-bold text-emerald-700">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* History Summary */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-900">{history.name || 'Active Patient'} ({history.age || '--'}y)</span>
          <span className="text-[10px] font-mono text-slate-500">ID: {history.patientId || 'N/A'}</span>
        </div>
        {history.allergies && history.allergies.length > 0 && (
          <div className="bg-red-50 text-red-700 p-1.5 rounded-lg border border-red-200 text-[11px] font-bold flex items-center gap-1">
            <ShieldAlert size={12} /> Allergy: {history.allergies.join(', ')}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-emerald-600 !w-3 !h-3" />

      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Database size={18} className="text-emerald-600" />
                History Agent EMR Inspection
              </h4>
              <button onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-600 font-mono">
              <p><span className="font-bold">Conditions:</span> {history.conditions?.join(', ')}</p>
              <p><span className="font-bold">Prescriptions:</span> {history.medications?.join(', ')}</p>
              <p><span className="font-bold">Recent Labs:</span> {history.recentLabs?.join(', ')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
