'use client';

import React from 'react';
import { ShieldAlert, User, Zap, Sparkles } from 'lucide-react';

interface RightInfoPanelProps {
  activePatient?: any;
  patient?: any;
}

export function RightInfoPanel({ activePatient, patient }: RightInfoPanelProps) {
  const currentPatient = activePatient || patient;
  return (
    <aside className="w-80 bg-white border-l border-slate-200/80 flex flex-col justify-between shrink-0 font-sans p-5 space-y-6 overflow-y-auto z-20">
      {/* Active Patient Quick Card */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <User size={16} className="text-indigo-600" />
            <h3 className="section-title">Active Consultation</h3>
          </div>
          <span className="badge-normal">
            {currentPatient ? 'ACTIVE EHR' : 'NO SELECTION'}
          </span>
        </div>

        {currentPatient ? (
          <div className="patient-card space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="heading-4">{currentPatient.firstName || currentPatient.name} {currentPatient.lastName || ''}</h4>
              <span className="caption-text font-mono">MRN: {currentPatient.mrn || currentPatient.patientId || 'N/A'}</span>
            </div>
            <p className="body-sm font-mono">{currentPatient.dob || currentPatient.dateOfBirth || ''} • {currentPatient.gender || ''}</p>

            <div className="pt-2 space-y-1.5 text-xs">
              <div>
                <span className="label-text block">Phone:</span>
                <span className="text-slate-700 font-mono">{currentPatient.phone || 'N/A'}</span>
              </div>

              <div>
                <span className="label-text block">Insurance / Doctor:</span>
                <span className="text-slate-700">{currentPatient.insurance?.provider || currentPatient.insurance || 'Default Plan'} • {currentPatient.primaryDoctor || 'Dr. Marcus Vance'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center space-y-1 bg-slate-50">
            <span className="text-xs font-bold text-slate-500 block">No Active Patient</span>
            <span className="text-[10px] text-slate-400 font-mono block">Select or add a patient in the workspace</span>
          </div>
        )}
      </div>

      {/* AI Intelligence Briefing Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-indigo-600 border-b border-slate-100 pb-2">
          <Sparkles size={16} />
          <h4 className="font-bold text-xs">NitroStack Multi-Agent Engine</h4>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          ClinicaMind connects Supervisor and Specialist Agents (History, Medication, Research, Gap, Report) to evaluate consultation transcripts and backend EHR tables.
        </p>
      </div>

      {/* Footer Branding */}
      <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-mono flex items-center justify-between">
        <span>ClinicaMind v1.0.0</span>
        <span className="text-emerald-600 font-bold">DB Connected</span>
      </div>
    </aside>
  );
}
