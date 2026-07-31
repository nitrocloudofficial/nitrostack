'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Radio, FileSearch,
  BarChart3, FileText, Settings, Activity,
  Shield, ChevronLeft, ChevronRight,
  LogOut, UserCheck, Bell
} from 'lucide-react';
import { useAegis, PageId } from '../context/AegisContext';

interface SidebarProps {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const NAV: Array<{ id: PageId; label: string; icon: any; badge?: string }> = [
  { id: 'overview',       label: 'Overview',              icon: LayoutDashboard },
  { id: 'monitoring',     label: 'Live Monitoring',       icon: Radio,          badge: 'LIVE' },
  { id: 'analytics',      label: 'Threat Analytics',      icon: BarChart3 },
  { id: 'settings',       label: 'Settings',              icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, collapsed, setCollapsed }) => {
  const { logout, user } = useAegis();

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 272 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col h-screen bg-[#0B0B0B] border-r border-[#D4AF37]/10 z-40 shrink-0 overflow-hidden"
      style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.4)' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-6 border-b border-[#D4AF37]/10">
        <div
          onClick={() => setActivePage('overview')}
          className="flex items-center gap-3 overflow-hidden min-w-0 cursor-pointer group"
          title="Return to Overview"
        >
          <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#D4AF37]/30 flex items-center justify-center shrink-0 group-hover:border-[#D4AF37]/60 transition-colors">
            <Shield className="w-4.5 h-4.5 text-[#D4AF37]" style={{ width: 18, height: 18 }} />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col min-w-0"
              >
                <span className="font-cinzel text-sm font-bold tracking-widest text-white whitespace-nowrap group-hover:text-[#D4AF37] transition-colors">
                  AEGIS <span className="text-[#D4AF37]">PROTOCOL</span>
                </span>
                <span className="text-[9px] font-mono-ui tracking-widest text-gray-500 uppercase whitespace-nowrap">
                  Fraud Intelligence
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-[#D4AF37] hover:bg-[#141414] border border-transparent hover:border-[#D4AF37]/20 transition-all shrink-0"
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto overflow-x-hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              title={collapsed ? item.label : undefined}
              className={`
                relative flex items-center w-full rounded-xl px-3 py-3
                transition-all duration-200 group
                ${isActive
                  ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-white'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-[#141414] border border-transparent'
                }
              `}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-[#D4AF37] rounded-r-full" />
              )}

              <Icon
                style={{ width: 16, height: 16 }}
                className={`shrink-0 transition-colors ${isActive ? 'text-[#D4AF37]' : 'group-hover:text-[#D4AF37]'}`}
              />

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="ml-3 text-xs font-medium tracking-wide whitespace-nowrap flex-1 text-left"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {!collapsed && item.badge && (
                <span className={`text-[9px] font-mono-ui font-bold px-1.5 py-0.5 rounded ${
                  item.badge === 'LIVE'
                    ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                    : 'bg-[#D4AF37]/15 text-[#D4AF37]'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Officer Profile & Logout */}
      <div className="px-3 pb-5 border-t border-[#D4AF37]/10 pt-4">
        <div className={`flex items-center gap-3 p-3 rounded-xl bg-[#141414] border border-[#D4AF37]/10 ${collapsed ? 'justify-center' : ''}`}>
          <div className="relative shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] border border-[#D4AF37]/25 flex items-center justify-center">
              <UserCheck style={{ width: 14, height: 14 }} className="text-[#D4AF37]" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[#00C853] border border-[#0B0B0B] rounded-full" />
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <div className="text-[11px] font-semibold text-gray-200 truncate">{user.name}</div>
                <div className="text-[9px] font-mono-ui text-[#D4AF37]/70 truncate">{user.cert}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {!collapsed && (
            <button
              onClick={logout}
              title="Logout Officer Session"
              className="text-gray-600 hover:text-[#D4AF37] transition-colors p-1 rounded hover:bg-[#1A1A1A]"
            >
              <LogOut style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};
