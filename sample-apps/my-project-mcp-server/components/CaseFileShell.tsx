'use client';

import { useState, type ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { Sidebar } from './Sidebar';
import type { BadgeTone } from './ui/Badge';

export function CaseFileShell({
  role,
  roleTone,
  stepper,
  notification,
  timeline,
  right,
  children,
}: {
  role: string;
  roleTone: BadgeTone;
  stepper?: ReactNode;
  /** Optional banner rendered between the stepper and main grid (e.g. insurer decision alerts). */
  notification?: ReactNode;
  timeline: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<'main' | 'timeline' | 'verification'>('main');

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <Sidebar className="hidden lg:flex" />

      {/* Main Container */}
      <div className="flex flex-1 flex-col min-w-0">
        <AppHeader role={role} tone={roleTone} />
        {stepper}
        {notification}

        {/* Mobile/Tablet view tab switcher */}
        <div className="glass-nav no-print border-b lg:hidden">
          <div className="mx-auto flex max-w-7xl px-4 py-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('main')}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold backdrop-blur-md transition-colors ${
                activeTab === 'main'
                  ? 'bg-slate-900/80 text-white shadow-xs'
                  : 'bg-white/35 text-slate-600 hover:bg-white/55'
              }`}
            >
              📋 Case Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold backdrop-blur-md transition-colors ${
                activeTab === 'timeline'
                  ? 'bg-slate-900/80 text-white shadow-xs'
                  : 'bg-white/35 text-slate-600 hover:bg-white/55'
              }`}
            >
              ⏱️ Timeline
            </button>
            {right && (
              <button
                type="button"
                onClick={() => setActiveTab('verification')}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold backdrop-blur-md transition-colors ${
                  activeTab === 'verification'
                    ? 'bg-slate-900/80 text-white shadow-xs'
                    : 'bg-white/35 text-slate-600 hover:bg-white/55'
                }`}
              >
                🛡️ Verification
              </button>
            )}
          </div>
        </div>

        <main className="case-file-main mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 animate-route-in">
          <p className="print-header mb-6 hidden font-mono text-xs uppercase tracking-[0.08em] text-slate-500">
            Care Mediator — Case Summary — {role} view
          </p>

          <div className="case-file-grid grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
            {/* Left Timeline Rail */}
            <aside className={`no-print lg:block lg:sticky lg:top-20 lg:self-start ${activeTab === 'timeline' ? 'block' : 'hidden'}`}>
              {timeline}
            </aside>

            {/* Main Case Content */}
            <div className={`min-w-0 space-y-6 lg:block ${activeTab === 'main' ? 'block' : 'hidden'}`}>
              {children}
            </div>

            {/* Right Verification & Action Rail */}
            <aside className={`no-print space-y-6 lg:block lg:sticky lg:top-20 lg:self-start ${activeTab === 'verification' ? 'block' : 'hidden'}`}>
              {right}
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
