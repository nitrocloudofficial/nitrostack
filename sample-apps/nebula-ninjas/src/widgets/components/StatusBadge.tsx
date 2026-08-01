import React from 'react';

interface StatusBadgeProps {
  status: 'ALLOWED' | 'BLOCKED' | 'FLAGGED' | 'INFO' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status.toUpperCase()) {
    case 'ALLOWED':
    case 'APPROVED':
    case 'ONLINE':
    case 'VALID':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          {status}
        </span>
      );
    case 'BLOCKED':
    case 'DENIED':
    case 'OFFLINE':
    case 'BROKEN':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
          {status}
        </span>
      );
    case 'FLAGGED':
    case 'PENDING':
    case 'DEGRADED':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          {status}
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 w-fit">
          {status}
        </span>
      );
  }
};
