'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '../../../components/Sidebar';
import { RightInfoPanel } from '../../../components/RightInfoPanel';
import { ArrowLeft, Stethoscope, ShieldAlert, Download, Pill } from 'lucide-react';

export function PatientProfileClient({ id }: { id: string }) {
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'documents' | 'imaging' | 'labs' | 'medications' | 'timeline' | 'aiNotes' | 'reports'>('overview');

  useEffect(() => {
    fetch(`/api/patients/${id}`)
      .then(res => res.json())
      .then(json => setProfile(json.profile))
      .catch(err => console.error(err));
  }, [id]);

  if (!profile) {
    return (
      <div className="flex h-screen bg-slate-50 text-slate-500 font-mono items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
        <span>Loading Digital Patient Folder...</span>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'visits', label: `Visit History (${profile.visitHistory?.length || 0})` },
    { id: 'documents', label: `Documents (${profile.documents?.length || 0})` },
    { id: 'imaging', label: 'Imaging (X-Ray/MRI/CT)' },
    { id: 'labs', label: 'Lab Reports' },
    { id: 'medications', label: 'Current Medications' },
    { id: 'timeline', label: 'Clinical Timeline' },
    { id: 'aiNotes', label: 'AI Notes & Alerts' },
    { id: 'reports', label: 'Generated Reports' }
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 sticky top-0 backdrop-blur-xs z-20 shadow-xs">
          <div className="flex items-center gap-4">
            <Link href="/patients" className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {profile.name}
                <span className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                  ID: {profile.patientId}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${profile.riskCategory === 'CRITICAL RISK' || profile.riskCategory === 'HIGH RISK' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                  {profile.riskCategory}
                </span>
              </h1>
              <p className="text-xs text-slate-500">DOB: {profile.dateOfBirth} ({profile.age}y / {profile.gender}) • {profile.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/workspace"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-indigo-200 transition"
            >
              <Stethoscope size={16} />
              <span>Start AI Consultation</span>
            </Link>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-200/80 px-8 flex items-center gap-2 overflow-x-auto text-xs shrink-0 shadow-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200/80 p-6 rounded-2xl space-y-4 shadow-xs">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Personal & Demographics</h3>
                <div className="space-y-2 text-xs text-slate-700">
                  <div><span className="text-slate-400">Email:</span> {profile.email}</div>
                  <div><span className="text-slate-400">Address:</span> {profile.address}</div>
                  <div><span className="text-slate-400">Emergency Contact:</span> {profile.emergencyContact?.name} ({profile.emergencyContact?.phone})</div>
                  <div><span className="text-slate-400">Insurance:</span> {profile.insurance?.provider} (Pol: {profile.insurance?.policyNumber})</div>
                </div>

                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 pt-2">Lifestyle & Habits</h3>
                <div className="space-y-2 text-xs text-slate-700">
                  <div><span className="text-slate-400">Smoking Status:</span> {profile.lifestyle?.smoking}</div>
                  <div><span className="text-slate-400">Alcohol Consumption:</span> {profile.lifestyle?.alcohol}</div>
                  <div><span className="text-slate-400">Exercise:</span> {profile.lifestyle?.exercise}</div>
                  <div><span className="text-slate-400">Dietary Regimen:</span> {profile.lifestyle?.diet}</div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 p-6 rounded-2xl space-y-4 shadow-xs">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Documented Allergies</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.allergies || []).map((a: string, i: number) => (
                    <span key={i} className="badge-critical flex items-center gap-1">
                      <ShieldAlert size={14} /> {a}
                    </span>
                  ))}
                </div>

                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 pt-2">Chronic Conditions</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.conditions || []).map((c: string, i: number) => (
                    <span key={i} className="badge-review">
                      {c}
                    </span>
                  ))}
                </div>

                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 pt-2">Family History</h3>
                <div className="space-y-1 text-xs text-slate-700">
                  {(profile.familyHistory || []).map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 p-6 rounded-2xl space-y-4 shadow-xs">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Active Prescriptions</h3>
                <div className="space-y-1.5 text-xs text-slate-700">
                  {(profile.medications || []).map((m: string, i: number) => (
                    <div key={i} className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 flex items-center gap-2">
                      <Pill size={14} className="text-indigo-600" />
                      <span className="font-medium">{m}</span>
                    </div>
                  ))}
                </div>

                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 pt-2">Recent Lab Results</h3>
                <div className="space-y-1 text-xs text-slate-700">
                  {(profile.recentLabs || []).map((l: string, i: number) => (
                    <div key={i} className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 font-mono text-[11px] text-emerald-800 font-bold">
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VISIT HISTORY */}
          {activeTab === 'visits' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="font-bold text-base text-slate-900">Immutable Visit History Records</h3>
                <span className="text-xs text-slate-500 font-mono">Visits never overwrite previous visits</span>
              </div>

              {(profile.visitHistory || []).map((visit: any) => (
                <div key={visit.id} className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded font-bold">
                        {visit.visitDate}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{visit.chiefComplaint}</h4>
                    </div>
                    <span className="text-xs font-mono text-slate-500">{visit.doctor}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Diagnosis:</span>
                      <p className="font-bold text-indigo-700">{visit.diagnosis}</p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Prescribed Medications:</span>
                      {(visit.medications || []).map((m: string, i: number) => (
                        <p key={i} className="text-slate-700">• {m}</p>
                      ))}
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Recommended Tests:</span>
                      {(visit.testsRecommended || []).map((t: string, i: number) => (
                        <p key={i} className="text-slate-700">• {t}</p>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">AI Notes & Briefing:</span>
                    <p className="text-slate-700 italic">{visit.aiNotes}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: DOCUMENTS & UPLOADS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base text-slate-900 border-b border-slate-200 pb-3">Digital Folder Uploads</h3>
              <div className="grid grid-cols-3 gap-4">
                {(profile.documents || []).map((doc: any) => (
                  <div key={doc.id} className="bg-white border border-slate-200/80 p-4 rounded-2xl space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                        {doc.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{doc.fileSize}</span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 truncate">{doc.name}</h4>
                    {doc.summary && <p className="text-[11px] text-slate-500 italic leading-snug">{doc.summary}</p>}
                    <div className="pt-2 flex justify-between items-center text-[10px] text-slate-400 font-mono border-t border-slate-100">
                      <span>Uploaded {doc.uploadDate}</span>
                      <span className="text-indigo-600 font-bold cursor-pointer hover:underline flex items-center gap-1">
                        <Download size={10} /> Download
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <RightInfoPanel patient={profile} />
    </div>
  );
}
