import { Link, useMatches } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Activity, BarChart3, Eye, Bell, Search, Zap,
  ChevronRight, Radio,
} from "lucide-react";

const navItems = [
  { to: "/admin", label: "Live Monitoring", icon: Radio, exact: true },
  { to: "/admin/analytics", label: "Interventions", icon: BarChart3, exact: false },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.pathname ?? "";

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-gray-100 flex" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-[260px] bg-[#0f1424] border-r border-white/5 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white">Rampo</div>
              <div className="text-[10px] text-blue-400 font-medium tracking-wide uppercase">CX Intelligence</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">Monitor</div>
          {navItems.map((item) => {
            const isActive = item.exact
              ? currentPath === item.to || currentPath === item.to + "/"
              : currentPath.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
              AS
            </div>
            <div>
              <div className="text-xs font-medium text-gray-300">Agent: Srinivas</div>
              <div className="text-[10px] text-gray-500">Support Tier 2</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-[#0f1424]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Activity size={14} className="text-blue-400" />
            <span className="text-gray-500">Admin</span>
            <ChevronRight size={12} className="text-gray-600" />
            <span className="text-gray-300 font-medium">
              {currentPath.includes("/session/") ? "Session Details" :
               currentPath.includes("/analytics") ? "Intervention Analytics" : "Live Monitoring"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search sessions..."
                className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder:text-gray-600 w-56 focus:outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>
            <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
              <Bell size={16} className="text-gray-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
