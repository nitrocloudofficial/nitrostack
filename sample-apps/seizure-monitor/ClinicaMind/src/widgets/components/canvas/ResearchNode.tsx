'use client';

import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { BookOpen, ExternalLink, Maximize2, X } from 'lucide-react';

export function ResearchNode({ data }: { data: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const articles = data.content?.articles || data.articles || [];
  const confidence = data.confidence || '96%';
  const status = data.status || 'QUERIED';
  const progress = data.progress || 100;
  const lastUpdate = data.lastUpdate || '10:15 AM';

  return (
    <div className="bg-white border-2 border-blue-600 rounded-2xl p-4 shadow-lg w-[320px] font-sans transition-all hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!bg-blue-600 !w-3 !h-3" />
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              Research Agent
              <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-mono font-bold">
                PubMed
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">Literature & Clinical Guidelines</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(true)}
          className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Metrics Bar */}
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
          <span>PubMed Fetch</span>
          <span className="font-bold text-blue-700">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Articles Snippet */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Citations Match ({articles.length || 2}):</span>
        {articles.length > 0 ? (
          <div className="space-y-1">
            <p className="font-bold text-slate-900 line-clamp-1">{articles[0].title}</p>
            <span className="text-[10px] text-blue-600 font-mono block">{articles[0].journal} ({articles[0].year})</span>
          </div>
        ) : (
          <p className="text-slate-500 italic text-[11px]">JAMA 2026 Guidelines for CAP in Diabetic Adults</p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-blue-600 !w-3 !h-3" />

      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BookOpen size={18} className="text-blue-600" />
                Research Agent PubMed Inspection
              </h4>
              <button onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-900">PubMed Evidence Briefing:</p>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 italic">
                "In diabetic patients presenting with chest pain, fever, and productive cough, early empirical Levofloxacin fluoroquinolone therapy significantly reduces 30-day mortality."
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
