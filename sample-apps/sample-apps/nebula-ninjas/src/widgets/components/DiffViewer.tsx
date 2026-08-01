import React from 'react';

interface DiffViewerProps {
  oldText?: string;
  newText?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ oldText = '', newText = '' }) => {
  return (
    <div className="space-y-2 text-xs font-mono">
      <div className="p-3 bg-rose-950/30 border border-rose-500/20 rounded-md text-rose-300 overflow-x-auto">
        <div className="text-[10px] uppercase font-sans tracking-wider text-rose-400 font-semibold mb-1">
          - Trusted Original Fingerprint
        </div>
        <p className="whitespace-pre-wrap leading-relaxed">{oldText || '(No original text)'}</p>
      </div>

      <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-md text-emerald-300 overflow-x-auto">
        <div className="text-[10px] uppercase font-sans tracking-wider text-emerald-400 font-semibold mb-1">
          + Drifted / Poisoned Description
        </div>
        <p className="whitespace-pre-wrap leading-relaxed">{newText || '(No new text)'}</p>
      </div>
    </div>
  );
};
