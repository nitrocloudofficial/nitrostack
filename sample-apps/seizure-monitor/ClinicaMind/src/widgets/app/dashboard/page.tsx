'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '../../components/Sidebar';
import { RightInfoPanel } from '../../components/RightInfoPanel';
import { Users, Clock, CheckCircle2, AlertTriangle, Activity, ArrowRight, ShieldAlert, Sparkles, Stethoscope, FileText } from 'lucide-react';

export default function DashboardPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [pRes, vRes, rRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/visits'),
          fetch('/api/reports')
        ]);
        const [pData, vData, rData] = await Promise.all([
          pRes.json(),
          vRes.json(),
          rRes.json()
        ]);

        if (pData.success) setPatients(pData.data || []);
        if (vData.success) setVisits(vData.data || []);
        if (rData.success) setReports(rData.data || []);
      } catch (err) {
        console.error('Failed to load dashboard metrics from backend:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const activeVisits = visits.filter((v) => v.visitStatus === 'IN_PROGRESS');
  const completedVisits = visits.filter((v) => v.visitStatus === 'COMPLETED');
  const scheduledVisits = visits.filter((v) => v.visitStatus === 'SCHEDULED');

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 sticky top-0 backdrop-blur-xs z-20 shadow-xs">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Clinical Operations Dashboard
              <span className="text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                Backend Data Active
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Hospital consultation queue & multi-agent risk monitoring</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/consultations"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-indigo-200 transition"
            >
              <Stethoscope size={16} />
              <span>Launch Consultation Queue</span>
            </Link>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-6 gap-4">
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl space-y-2 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">Total Patients</span>
                <Users size={16} className="text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{patients.length}</div>
              <div className="text-[10px] text-slate-500 font-mono">Backend Patient Records</div>
            </div>

            <div className="bg-white border border-amber-200 p-4 rounded-2xl space-y-2 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-xs font-medium">Scheduled Visits</span>
                <Clock size={16} className="text-amber-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{scheduledVisits.length}</div>
              <div className="text-[10px] text-amber-700 font-mono">Upcoming Appointments</div>
            </div>

            <div className="bg-white border border-indigo-200 p-4 rounded-2xl space-y-2 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between text-indigo-700">
                <span className="text-xs font-medium">Active Visits</span>
                <Activity size={16} className="text-indigo-600 animate-pulse" />
              </div>
              <div className="text-2xl font-black text-indigo-600">{activeVisits.length}</div>
              <div className="text-[10px] text-indigo-700 font-mono">In Progress Consultations</div>
            </div>

            <div className="bg-white border border-emerald-200 p-4 rounded-2xl space-y-2 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-xs font-medium">Completed Visits</span>
                <CheckCircle2 size={16} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{completedVisits.length}</div>
              <div className="text-[10px] text-emerald-700 font-mono">Finished Sessions</div>
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl space-y-2 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">Total Reports</span>
                <FileText size={16} className="text-slate-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{reports.length}</div>
              <div className="text-[10px] text-slate-500 font-mono">Clinical Notes</div>
            </div>

            <div className="bg-white border border-purple-200 p-4 rounded-2xl space-y-2 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between text-purple-700">
                <span className="text-xs font-medium">Database Status</span>
                <Sparkles size={16} className="text-purple-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600">Online</div>
              <div className="text-[10px] text-purple-700 font-mono">Relational DB Engine</div>
            </div>
          </div>

          {/* Active Consultation Spotlight or Empty State */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                  <h3 className="font-bold text-sm text-slate-900">Current Active Consultation</h3>
                </div>
                <Link
                  href="/workspace"
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-bold transition"
                >
                  <span>Open AI Canvas Workspace</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {activeVisits.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {activeVisits.map((v) => (
                    <div key={v.id} className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">Visit ID: {v.id}</span>
                        <span className="badge-critical text-[10px]">{v.visitStatus}</span>
                      </div>
                      <p className="text-xs text-slate-600">Chief Complaint: {v.chiefComplaint || 'Consultation in progress'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-mono">
                  <span>No active consultation in progress. Start an audio consultation from the workspace canvas.</span>
                </div>
              )}
            </div>

            {/* Quick Patient List or Empty State */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900">Registered Patients</h3>
                <span className="text-xs font-mono font-bold text-indigo-600">{patients.length} Patients</span>
              </div>

              {patients.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {patients.map((p) => (
                    <div key={p.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{p.firstName} {p.lastName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">MRN: {p.mrn} • Phone: {p.phone}</div>
                      </div>
                      <span className="badge-normal text-[10px]">{p.gender}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-mono">
                  <span>No patients recorded in database.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <RightInfoPanel activePatient={patients[0] || null} />
    </div>
  );
}
