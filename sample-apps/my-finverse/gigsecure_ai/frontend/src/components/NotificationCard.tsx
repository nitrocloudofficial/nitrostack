import React from 'react';
import { BellRing, Send } from 'lucide-react';
import { NotificationItem } from '../types';

export const NotificationCard: React.FC<{ notif: NotificationItem }> = ({ notif }) => {
  return (
    <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-start justify-between gap-4 text-xs">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 font-bold shrink-0">
          <Send className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-white text-sm">{notif.title}</div>
          <div className="text-slate-300 mt-1 leading-relaxed">{notif.message}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            Channel: <span className="text-emerald-400">{notif.channel}</span> • Dispatched: {notif.created_at}
          </div>
        </div>
      </div>

      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        {notif.status}
      </span>
    </div>
  );
};
