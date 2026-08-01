import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  History, 
  FileText, 
  BarChart3, 
  Bookmark, 
  Star, 
  Clock, 
  Settings, 
  HelpCircle, 
  Info, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Zap
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNewAnalysis: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onNewAnalysis }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const mainItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'history', label: 'History', icon: History },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const libraryItems = [
    { id: 'saved', label: 'Saved Prompts', icon: Bookmark },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'recent', label: 'Recent Sessions', icon: Clock },
  ];

  const bottomItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Docs', icon: HelpCircle },
    { id: 'about', label: 'About NitroStack', icon: Info },
  ];

  const renderNavSection = (items: typeof mainItems, title?: string) => (
    <div className="space-y-1">
      {title && !isCollapsed && (
        <p className="px-3 py-1 text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </p>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            title={isCollapsed ? item.label : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative ${
              isActive
                ? 'bg-cyan-500/[0.1] text-cyan-400 border border-cyan-500/20 shadow-[inset_0_1px_0_0_rgba(0,242,254,0.1)] font-semibold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            {isActive && (
              <span className="absolute left-0 top-2 bottom-2 w-1 bg-cyan-400 rounded-r-full shadow-[0_0_10px_rgba(0,242,254,0.8)]" />
            )}
            <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <aside
      className={`h-[calc(100vh-4rem)] sticky top-16 bg-[#0E131A]/90 backdrop-blur-xl border-r border-white/[0.06] flex flex-col justify-between p-4 transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-20 items-center' : 'w-64'
      }`}
    >
      <div className="space-y-6 w-full">
        {/* New Analysis Hero Button */}
        <button
          onClick={onNewAnalysis}
          className={`w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-2.5 px-4 rounded-xl shadow-[0_0_25px_rgba(0,242,254,0.25)] hover:shadow-[0_0_35px_rgba(0,242,254,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 group relative overflow-hidden border border-white/20`}
        >
          <span className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus className="w-4 h-4 text-white group-hover:rotate-90 transition-transform duration-300" />
          {!isCollapsed && <span className="text-xs font-semibold tracking-wide">New Analysis</span>}
        </button>

        {/* Main Navigation */}
        <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-22rem)] custom-scrollbar pr-1">
          {renderNavSection(mainItems, 'Workspace')}
          {renderNavSection(libraryItems, 'Library')}
        </div>
      </div>

      {/* Bottom section */}
      <div className="space-y-4 pt-4 border-t border-white/[0.06] w-full">
        {renderNavSection(bottomItems)}

        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/[0.02] text-xs transition-colors border border-transparent hover:border-white/[0.04]"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!isCollapsed && <span>Collapse Panel</span>}
        </button>

        {!isCollapsed && (
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/[0.05] to-blue-500/[0.02] border border-cyan-500/20 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Zap className="w-3.5 h-3.5 fill-cyan-400/20" />
              <span>Token Shield</span>
            </span>
            <span className="text-emerald-400 font-semibold">ACTIVE</span>
          </div>
        )}
      </div>
    </aside>
  );
};
