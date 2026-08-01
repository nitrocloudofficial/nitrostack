'use client';

import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { FileText, CheckCircle2, Maximize2, X, Download } from 'lucide-react';

export function ReportNode({ data }: { data: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const report = data.content?.report || data.report || {};
  const confidence = data.confidence || '99%';
  const status = data.status || 'FINALIZED';
  const progress = data.progress || 100;
  const lastUpdate = data.lastUpdate || '10:15 AM';

  return (
    <div className="bg-white border-2 border-red-600 rounded-2xl p-4 shadow-lg w-[340px] font-sans transition-all hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!bg-red-600 !w-3 !h-3" />
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-100 text-red-700 rounded-xl">
            <FileText size={18} />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              Report Generator Agent
              <span className="text-[9px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.2 rounded font-mono font-bold">
                Briefing
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">Evidence-Backed Briefing</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(true)}
          className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-red-50/60 p-2 rounded-xl border border-red-100 mb-3">
        <div>
          <span className="text-slate-400 uppercase block">Status</span>
          <span className="font-bold text-red-700">{status}</span>
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
          <span>Briefing Generation</span>
          <span className="font-bold text-red-700">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="bg-red-600 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Report Summary */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
        <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
          <CheckCircle2 size={12} />
          <span>Synthesis Ready for Physician</span>
        </div>
        <p className="text-slate-700 text-[11px] leading-snug line-clamp-2">
          {report.summary || 'Pneumonia risk identified. Levofloxacin recommended due to severe Penicillin allergy.'}
        </p>
      </div>

      {/* Inspection Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText size={18} className="text-red-600" />
                Report Generator Briefing Preview
              </h4>
              <button onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <p className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans">
                {report.fullReport || "Clinical report summary and assessment."}
              </p>
              <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5">
                <Download size={14} /> Download Final PDF Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
