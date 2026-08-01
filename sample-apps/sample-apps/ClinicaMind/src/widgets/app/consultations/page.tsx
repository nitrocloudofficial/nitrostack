'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '../../components/Sidebar';
import { RightInfoPanel } from '../../components/RightInfoPanel';
import { Stethoscope, Clock, CheckCircle2, AlertTriangle, Activity, ArrowRight } from 'lucide-react';

export default function ConsultationsQueuePage() {
  const [activeTab, setActiveTab] = useState<'waiting' | 'active' | 'completed' | 'all'>('all');
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVisits() {
      try {
        setLoading(true);
        const res = await fetch('/api/visits');
        const json = await res.json();
        if (json.success) {
          setVisits(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load visits:', err);
      } finally {
        setLoading(false);
      }
    }
    loadVisits();
  }, []);

  const scheduledVisits = visits.filter((v) => v.visitStatus === 'SCHEDULED');
  const activeVisits = visits.filter((v) => v.visitStatus === 'IN_PROGRESS');
  const completedVisits = visits.filter((v) => v.visitStatus === 'COMPLETED');

  const displayedVisits =
    activeTab === 'waiting'
      ? scheduledVisits
      : activeTab === 'active'
      ? activeVisits
      : activeTab === 'completed'
      ? completedVisits
      : visits;

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 sticky top-0 backdrop-blur-xs z-20 shadow-xs">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Today's Consultation Triage Queue
              <span className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                Shift Triage
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Manage patient arrivals, active visits, and launch AI canvas</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/workspace"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-indigo-200 transition"
            >
              <Stethoscope size={16} />
              <span>Launch AI Canvas Workspace</span>
            </Link>
          </div>
        </header>

        {/* Tab Filters */}
        <div className="bg-white border-b border-slate-200/80 px-8 flex items-center gap-2 text-xs font-bold shrink-0 shadow-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-3 border-b-2 transition ${activeTab === 'all' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500'}`}
          >
            All Visits ({visits.length})
          </button>
          <button
            onClick={() => setActiveTab('waiting')}
            className={`px-4 py-3 border-b-2 transition ${activeTab === 'waiting' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-transparent text-slate-500'}`}
          >
            Scheduled ({scheduledVisits.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-3 border-b-2 transition ${activeTab === 'active' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500'}`}
          >
            Active ({activeVisits.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-3 border-b-2 transition ${activeTab === 'completed' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500'}`}
          >
            Completed ({completedVisits.length})
          </button>
        </div>

        {/* Queue Content */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-4">
          {displayedVisits.length > 0 ? (
            <div className="space-y-3">
              {displayedVisits.map((v) => (
                <div key={v.id} className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between shadow-xs hover:shadow-md transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-base text-slate-900">Visit {v.id}</h3>
                      <span className="text-xs font-mono text-slate-500">Patient ID: {v.patientId}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${v.visitStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : v.visitStatus === 'IN_PROGRESS' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                        {v.visitStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{v.chiefComplaint || 'No chief complaint specified'}</p>
                    <span className="text-[10px] text-slate-400 font-mono">Started: {v.startedAt}</span>
                  </div>

                  <Link
                    href="/workspace"
                    className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-xl text-xs font-bold transition"
                  >
                    <span>Open Canvas</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 border border-dashed border-slate-200 rounded-2xl text-center space-y-2 bg-white">
              <Clock size={32} className="mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700">No visits recorded</h3>
              <p className="text-xs text-slate-400">Start an audio consultation session from the main workspace canvas.</p>
            </div>
          )}
        </div>
      </main>

      <RightInfoPanel activePatient={null} />
    </div>
  );
}
