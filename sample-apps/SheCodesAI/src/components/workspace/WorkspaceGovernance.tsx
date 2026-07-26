'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { MOCK_AUDIT_LOGS } from '../../data/mockData';
import { Shield, Lock, Users, Building, ShieldCheck, Key } from 'lucide-react';

export const WorkspaceGovernance: React.FC = () => {
  const { currentWorkspace, workspaces } = useApp();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-extrabold text-white">Workspace Governance & Security</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Multi-Tenant Isolation • Role-Based Access Control (RBAC) • Audit Security Trail
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300">Supabase RLS & Auth MFA Active</span>
        </div>
      </div>

      {/* Workspace Details */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <Building className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-white">{currentWorkspace.name}</h3>
              <p className="text-xs text-slate-400">Type: {currentWorkspace.type}</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
            Role: {currentWorkspace.role}
          </span>
        </div>

        {/* RBAC Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Role-Based Access Control (RBAC) Matrix
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs text-center font-mono">
            {['Owner', 'Administrator', 'Manager', 'Lead', 'Member', 'Guest'].map((r, idx) => (
              <div 
                key={r} 
                className={`p-3 rounded-xl border ${
                  r === currentWorkspace.role 
                    ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold' 
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div>{r}</div>
                <div className="text-[9px] text-slate-500 mt-1">
                  {r === 'Owner' ? 'Full Control' : r === 'Administrator' ? 'Admin + Security' : 'Department Standard'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Audit Logs */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Security Audit Trail & MFA Verifications</span>
        </h3>

        <div className="space-y-2 text-xs font-mono">
          {MOCK_AUDIT_LOGS.map(log => (
            <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-indigo-400 font-bold">{log.actor}</span>
                <span className="text-slate-400 ml-2">[{log.action}]</span>
                <p className="text-[11px] text-slate-300 mt-0.5">{log.resource} • IP: {log.ip}</p>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {log.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
