'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Calendar as CalendarIcon, Clock, Globe, Plus, User, CheckCircle2 } from 'lucide-react';

export const MultiTimezoneCalendar: React.FC = () => {
  const { calendarEvents } = useApp();
  const [selectedTz, setSelectedTz] = useState('Asia/Kolkata (IST)');

  const timezones = [
    'Asia/Kolkata (IST: +5:30)',
    'America/New_York (EDT: -4:00)',
    'Europe/London (BST: +1:00)',
    'Asia/Tokyo (JST: +9:00)',
    'Australia/Sydney (AEST: +10:00)'
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-extrabold text-white">Google Calendar & Multi-Timezone Engine</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automatic participant timezone detection • IST, EST, GMT, JST auto conversion • Follow-up reminders
          </p>
        </div>

        <button className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-lg shadow-indigo-600/30">
          <Plus className="w-4 h-4" />
          <span>Schedule Auto-Follow-up Event</span>
        </button>
      </div>

      {/* Timezone Converter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
          <Globe className="w-4 h-4 text-indigo-400" />
          <span>Active Display Timezone:</span>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto">
          {timezones.map(tz => (
            <button
              key={tz}
              onClick={() => setSelectedTz(tz)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-all ${
                selectedTz === tz
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tz}
            </button>
          ))}
        </div>
      </div>

      {/* Scheduled Events Feed */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Upcoming Scheduled Follow-ups & Meetings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {calendarEvents.map(evt => (
            <div key={evt.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {evt.contextPack}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {evt.status}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white">{evt.title}</h4>

              <div className="space-y-1 text-xs text-slate-400 font-mono bg-slate-950 p-3 rounded-xl border border-slate-850">
                <div className="flex justify-between">
                  <span>Start:</span>
                  <span className="text-slate-200">{new Date(evt.start).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Timezone Conversion:</span>
                  <span className="text-indigo-400">{evt.timezone}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400">
                <span>Participants: </span>
                <span className="text-slate-200 font-semibold">{evt.participants.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
