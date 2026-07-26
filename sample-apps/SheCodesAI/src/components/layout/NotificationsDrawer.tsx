'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, X, ShieldAlert, CheckCircle2, Calendar, MessageSquare, Info } from 'lucide-react';

export const NotificationsDrawer: React.FC = () => {
  const { isNotificationsOpen, setIsNotificationsOpen, notifications } = useApp();

  if (!isNotificationsOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl p-4 flex flex-col justify-between animate-in slide-in-from-right duration-200">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Novu Notifications</h3>
              <p className="text-[10px] text-slate-400">AI Alerts & Escalation Feed</p>
            </div>
          </div>
          <button 
            onClick={() => setIsNotificationsOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications Feed */}
        <div className="mt-4 space-y-3 max-h-[75vh] overflow-y-auto pr-1">
          {notifications.map(item => (
            <div 
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all ${
                item.priority === 'Critical'
                  ? 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                  : item.priority === 'High'
                  ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                  item.priority === 'Critical' ? 'bg-rose-500 text-white' :
                  item.priority === 'High' ? 'bg-amber-500 text-slate-950 font-bold' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  {item.priority}
                </span>
                <span className="text-[10px] text-slate-400">{item.timestamp}</span>
              </div>
              <h4 className="text-xs font-bold text-white mb-1">{item.title}</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">{item.message}</p>
              <div className="mt-2 text-[10px] text-slate-400 flex items-center space-x-1">
                <span>Channel:</span>
                <span className="font-semibold text-indigo-300">{item.channel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-800 text-center text-[10px] text-slate-500">
        Novu Enterprise Engine Active • Multi-channel delivery
      </div>
    </div>
  );
};
