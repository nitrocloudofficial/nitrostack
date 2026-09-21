'use client';

import React from 'react';
import { Sun, Moon, Bell, AlertCircle } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function Navbar({ activeIncident }: { activeIncident?: string | null }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 border-b print:hidden"
      style={{
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(20px)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Smart Manufacturing Control Center
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Active Incident Badge */}
        {activeIncident && (
          <div className="badge-critical flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold animate-pulse">
            <AlertCircle size={14} />
            <span>{activeIncident}</span>
          </div>
        )}

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Bell size={20} />
          {activeIncident && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--critical)]" />
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl transition-all duration-300"
          style={{
            color: 'var(--text-secondary)',
            background: 'var(--bg-hover)',
          }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
