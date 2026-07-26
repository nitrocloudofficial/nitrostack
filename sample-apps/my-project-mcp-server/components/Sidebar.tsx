'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, type UserRole } from '@/lib/auth-context';
import { useCase } from '@/lib/case-context';
import { Badge } from './ui/Badge';

export function Sidebar({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { caseData, caseId, setCaseId, availableCaseIds } = useCase();
  const [collapsed, setCollapsed] = useState(false);

  const ALL_NAV_ITEMS: { label: string; href: string; icon: string; role?: Exclude<UserRole, 'guest'> }[] = [
    { label: 'Overview & Login', href: '/', icon: '🏠' },
    { label: 'Hospital Dashboard', href: '/hospital', icon: '🏥', role: 'hospital' },
    { label: 'Patient Portal', href: '/patient', icon: '👤', role: 'patient' },
    { label: 'Insurer Review Queue', href: '/insurer', icon: '🛡️', role: 'insurer' },
  ];

  // Filter out non-authorized navigation items completely
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => {
    if (!item.role) return true; // Always visible (Overview/Home)
    if (!user) return true; // Visible when not logged in so user can pick portal
    return user.role === item.role; // ONLY show authorized role item when logged in
  });

  const DEMO_CASES = [
    { id: 'clean-case', name: 'Clean Case (Full Approval)', badge: 'Clean' },
    { id: 'gotcha-case', name: 'Gotcha Case (Rate Discrepancy)', badge: 'Flagged' },
  ];

  // The two seeded demo cases always show first, with nice names/badges.
  // Anything else submitted through the Hospital view (tracked in
  // availableCaseIds) is appended below so the switcher never goes stale.
  const caseList = [
    ...DEMO_CASES,
    ...availableCaseIds
      .filter((id) => !DEMO_CASES.some((demo) => demo.id === id))
      .map((id) => ({ id, name: 'Submitted case', badge: 'New' })),
  ];

  return (
    <aside
      className={`glass-nav no-print relative flex flex-col border-r transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      } ${className}`}
    >
      {/* Header & Collapse Toggle */}
      <div className="flex items-center justify-between border-b border-white/40 p-3.5">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 font-bold text-xs text-white shadow-2xs">
            CM
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold tracking-tight text-slate-900 leading-none">
                Care Mediator
              </span>
              <span className="text-[10px] font-semibold text-teal-700 tracking-wide">
                Role Portal
              </span>
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="glass-soft flex h-7 w-7 items-center justify-center rounded-lg text-xs text-slate-500"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Logged-In User Profile Card */}
      {user ? (
        <div className="border-b border-white/40 p-3.5">
          {!collapsed ? (
            <div className="glass-soft rounded-xl p-3">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Signed In
                </span>
                <Badge
                  tone={
                    user.role === 'patient'
                      ? 'verified'
                      : user.role === 'hospital'
                        ? 'ink'
                        : 'slate'
                  }
                  className="text-[9px] py-0 px-1.5"
                >
                  {user.role}
                </Badge>
              </div>
              <p className="mt-1 text-xs font-bold text-slate-900 truncate">{user.name}</p>
              <p className="text-[11px] font-mono text-slate-500 truncate">{user.idNumber}</p>

              <div className="mt-2.5 pt-2 border-t border-white/40 flex items-center justify-between">
                <Link href="/" className="text-[11px] font-bold text-teal-700 hover:underline">
                  Switch Role
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="text-[10px] text-slate-400 hover:text-slate-700"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title={`${user.name} (${user.role})`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 font-bold text-xs text-white">
                {user.name.charAt(0)}
              </div>
            </div>
          )}
        </div>
      ) : (
        !collapsed && (
          <div className="border-b border-white/40 p-3.5 bg-amber-400/10 backdrop-blur-md">
            <p className="text-xs font-bold text-amber-900">🔒 Not Logged In</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Please sign in to access your role portal.</p>
            <Link href="/" className="mt-2 block text-xs font-bold text-teal-700 hover:underline">
              Go to Login →
            </Link>
          </div>
        )
      )}

      {/* Authorized Navigation Links */}
      <nav className="flex-1 space-y-1 p-2">
        <p className={`px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${collapsed ? 'hidden' : 'block'}`}>
          Navigation
        </p>
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold backdrop-blur-md transition-all ${
                isActive
                  ? 'bg-slate-900/80 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
              }`}
              title={item.label}
            >
              <span className="text-sm shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="truncate flex-1">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Demo Case Switcher Section */}
      {!collapsed && (
        <div className="border-t border-white/40 p-3 bg-white/20 backdrop-blur-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            ⚡ Quick Demo Cases
          </p>
          <div className="space-y-1.5">
            {caseList.map((demo) => {
              const isSelected = caseId === demo.id;
              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => setCaseId(demo.id)}
                  className={`w-full text-left rounded-lg p-2 text-xs font-semibold backdrop-blur-md transition-all ${
                    isSelected
                      ? 'bg-teal-600/85 text-white font-bold shadow-2xs'
                      : 'bg-white/35 border border-white/50 text-slate-700 hover:bg-white/55'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px]">{demo.id}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : demo.badge === 'Clean' ? 'bg-teal-500/15 text-teal-700' : 'bg-amber-400/15 text-amber-700'
                    }`}>
                      {demo.badge}
                    </span>
                  </div>
                  <p className="text-[10px] opacity-80 mt-0.5 truncate">{demo.name}</p>
                </button>
              );
            })}
          </div>

          {caseData && (
            <div className="mt-2.5 pt-2 border-t border-white/40 text-[10px] text-slate-500">
              <span>Active Case: </span>
              <strong className="text-slate-800">{caseData.patientName}</strong>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
