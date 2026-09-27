'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutDashboard, AlertTriangle, BrainCircuit, Factory, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/incident', label: 'Incident', icon: AlertTriangle },
  { href: '/ai-thinking', label: 'AI Thinking', icon: BrainCircuit },
  { href: '/factory-map', label: 'Factory Map', icon: Factory },
  { href: '/reports', label: 'Reports', icon: FileText },
];

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ease-in-out print:hidden ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      style={{
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary)' }}>
          <Factory size={18} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Factory<span style={{ color: 'var(--primary)' }}>OS</span>
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                collapsed ? 'justify-center' : ''
              }`}
              style={{
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--primary-light)' : 'transparent',
              }}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className={`flex-shrink-0 transition-colors ${isActive ? '' : 'group-hover:opacity-80'}`} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-12 border-t transition-colors"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
