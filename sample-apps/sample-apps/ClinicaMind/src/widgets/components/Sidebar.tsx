'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Stethoscope, Sparkles, FileText, BookOpen, ShieldCheck, ChevronRight, Bot, Settings, FolderOpen } from 'lucide-react';

interface SidebarProps {
  onOpenCopilot?: () => void;
}

export function Sidebar({ onOpenCopilot }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: "Today's Queue", href: '/consultations', icon: Stethoscope },
    { name: 'Patients Hub', href: '/patients', icon: Users },
    { name: 'Document Review', href: '/settings/integrations/gmail/review', icon: FolderOpen, badge: 'Review' },
    { name: 'AI Workspace', href: '/workspace', icon: Sparkles, badge: 'Canvas' },
    { name: 'AI Risk Insights', href: '/insights', icon: ShieldCheck },
    { name: 'Clinical Reports', href: '/reports', icon: FileText },
    { name: 'Medical Research', href: '/research', icon: BookOpen },
    { name: 'Settings & Integrations', href: '/settings/integrations/gmail', icon: Settings }
  ];

  return (
    <aside className="sidebar flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 border-b border-slate-100 px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-xl shadow-md shadow-indigo-200">
              <Stethoscope size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                ClinicaMind <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.2 rounded font-mono font-bold">EMR</span>
              </h1>
              <p className="caption-text font-medium">AI Clinical Decision Support</p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Hospital Platform</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/workspace' && pathname === '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border border-indigo-500'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${isActive ? 'bg-indigo-700 text-white border-indigo-500' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Quick Action AI Copilot Trigger */}
        <div className="px-3 py-2">
          <button
            onClick={() => {
              if (onOpenCopilot) onOpenCopilot();
            }}
            className="w-full bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3 rounded-xl shadow-md border border-slate-800 flex items-center justify-between group hover:shadow-lg transition"
          >
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-indigo-400 animate-pulse" />
              <div className="text-left">
                <span className="text-xs font-bold block">Ask AI Copilot</span>
                <span className="text-[9px] text-slate-400 font-mono">Zero-click queries</span>
              </div>
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition" />
          </button>
        </div>
      </div>

      {/* Footer Physician Profile */}
      <div className="p-3 border-t border-slate-100">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between hover:bg-slate-100/80 transition">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">
              MV
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Dr. Marcus Vance</div>
              <div className="caption-text font-mono">Attending Physician</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
