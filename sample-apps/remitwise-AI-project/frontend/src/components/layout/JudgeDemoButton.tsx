import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Sparkles, Loader2 } from 'lucide-react';
import { useTransfer } from '../../contexts/TransferContext';

export const JudgeDemoButton: React.FC = () => {
  const navigate = useNavigate();
  const { runJudgeDemoMode, isPipelineRunning } = useTransfer();
  const [loading, setLoading] = useState(false);

  const handleDemoClick = async () => {
    if (loading || isPipelineRunning) return;
    setLoading(true);
    try {
      await runJudgeDemoMode(navigate);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={handleDemoClick}
        disabled={loading || isPipelineRunning}
        className="group relative flex items-center gap-2.5 px-5 py-3 rounded-full bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-md border border-white/20"
      >
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-300"></span>
        </span>

        {loading || isPipelineRunning ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : (
          <Play className="w-4 h-4 fill-white text-white group-hover:translate-x-0.5 transition-transform" />
        )}

        <span className="flex items-center gap-1.5">
          <span>🎬 Demo Mode</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        </span>
      </button>
    </div>
  );
};
