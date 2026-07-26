'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  ShieldCheck, 
  Zap, 
  Globe,
  Sparkles,
  Building
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    currentWorkspace, 
    setCurrentWorkspace, 
    workspaces, 
    setIsSearchOpen, 
    isNotificationsOpen, 
    setIsNotificationsOpen, 
    notifications,
    selectedPack
  } = useApp();

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Branding & Active View */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => setActiveTab('landing')}
          className="flex items-center space-x-2.5 group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent tracking-tight">
              ContextOS
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-semibold text-indigo-400/90 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 ml-2">
              Enterprise
            </span>
          </div>
        </button>

        <div className="h-4 w-[1px] bg-slate-800 hidden md:block" />

        {/* Selected Context Pack Indicator */}
        <div className="hidden lg:flex items-center space-x-2 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="text-slate-400">Active Pack:</span>
          <span className="font-semibold text-indigo-300">{selectedPack.name}</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
            Manual
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-3">
        {/* Cmd + K Search Trigger */}
        <button 
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg text-xs transition-all shadow-inner"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Search context, docs, vectors...</span>
          <kbd className="hidden sm:inline-block bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-700">
            ⌘K
          </kbd>
        </button>

        {/* Novu Notifications Bell */}
        <button 
          onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          className="relative p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white transition-all"
          title="Novu Notification Center"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/50 animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Workspace Switcher */}
        <div className="relative group">
          <button className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-slate-800/90 transition-all">
            <Building className="w-3.5 h-3.5 text-violet-400" />
            <span className="font-medium max-w-[120px] truncate">{currentWorkspace.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Workspace Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50">
            <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Switch Workspace
            </div>
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => setCurrentWorkspace(ws)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition-all ${
                  ws.id === currentWorkspace.id 
                    ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30' 
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <span className="truncate">{ws.name}</span>
                <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                  {ws.type}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* User Profile Avatar with MFA Badge */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces" 
              alt="Alex Rivers"
              className="w-8 h-8 rounded-full ring-2 ring-indigo-500/40 object-cover" 
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" title="MFA Verified Session" />
          </div>
          <div className="hidden xl:block text-left text-xs">
            <div className="font-semibold text-slate-200 flex items-center space-x-1">
              <span>Haswitheswari KamboJi</span>
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-[10px] text-slate-400">Lead AI Engineer • Team of 4</div>
          </div>
        </div>
      </div>
    </header>
  );
};
