'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { RightInfoPanel } from '../../components/RightInfoPanel';
import { Sparkles, ShieldAlert, Pill, FileText, Activity } from 'lucide-react';

export default function AIInsightsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInsightsData() {
      try {
        setLoading(true);
        const [pRes, aRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/audit')
        ]);
        const [pData, aData] = await Promise.all([
          pRes.json(),
          aRes.json()
        ]);

        if (pData.success) setPatients(pData.data || []);
        if (aData.success) setAuditLogs(aData.data || []);
      } catch (err) {
        console.error('Failed to load insights data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInsightsData();
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 sticky top-0 backdrop-blur-xs z-20 shadow-xs">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              AI Risk Analytics & Audit Insights
              <span className="text-xs font-mono bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-bold">
                Backend Data Active
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Population risk stratification, drug safety alerts, and system audit logs</p>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Registered Patients Cohort */}
            <div className="bg-white border border-slate-200/80 p-6 rounded-2xl space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldAlert size={18} className="text-indigo-600" />
                <span>Backend Patient Records Cohort ({patients.length})</span>
              </h3>

              {patients.length > 0 ? (
                <div className="space-y-3 text-xs max-h-72 overflow-y-auto">
                  {patients.map((p) => (
                    <div key={p.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{p.firstName} {p.lastName} (MRN: {p.mrn})</span>
                        <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] px-2 py-0.5 rounded font-bold">
                          {p.gender}
                        </span>
                      </div>
                      <p className="text-slate-600 font-mono">DOB: {p.dob} • Phone: {p.phone}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-mono">
                  <span>No patients in database cohort.</span>
                </div>
              )}
            </div>

            {/* System & Clinical Audit Log */}
            <div className="bg-white border border-slate-200/80 p-6 rounded-2xl space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Activity size={18} className="text-emerald-600" />
                <span>System Audit Logs ({auditLogs.length})</span>
              </h3>

              {auditLogs.length > 0 ? (
                <div className="space-y-2 text-xs max-h-72 overflow-y-auto font-mono">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-indigo-700">{log.action}</span>
                        <span className="text-slate-400 text-[10px]">{log.createdAt}</span>
                      </div>
                      <div className="text-[10px] text-slate-600">Entity: {log.entityType} ({log.entityId || 'N/A'})</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-mono">
                  <span>No audit logs recorded yet.</span>
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
