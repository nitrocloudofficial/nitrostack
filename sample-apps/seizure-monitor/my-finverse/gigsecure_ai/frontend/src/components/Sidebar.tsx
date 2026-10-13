import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BrainCircuit, 
  Coins, 
  History, 
  CalendarClock, 
  ShieldAlert, 
  FileCheck2, 
  HeartHandshake, 
  UserCheck, 
  FileText, 
  BellRing, 
  SlidersHorizontal,
  Lock,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navGroups = [
    {
      title: "Worker Portal",
      items: [
        { label: "Overview Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "AI Credit Underwriting", icon: BrainCircuit, path: "/credit-analysis" },
        { label: "Apply Micro-Loan", icon: Coins, path: "/loan-application" },
        { label: "Loan History", icon: History, path: "/loan-history" },
        { label: "UPI Repayment Calendar", icon: CalendarClock, path: "/repayment" },
      ]
    },
    {
      title: "Bank & Fraud Shield",
      items: [
        { label: "Multi-Bank Fraud Shield", icon: ShieldAlert, path: "/fraud-shield" },
        { label: "Invoice Upload SHA256", icon: FileCheck2, path: "/invoice-upload" },
      ]
    },
    {
      title: "Nominee Succession Engine",
      items: [
        { label: "Nominee Registration", icon: UserCheck, path: "/nominee" },
        { label: "Succession Portal", icon: HeartHandshake, path: "/succession" },
        { label: "Claim Status Tracker", icon: Building2, path: "/claims" },
      ]
    },
    {
      title: "Intelligence & Reports",
      items: [
        { label: "PDF Report Center", icon: FileText, path: "/reports" },
        { label: "Notifications Log", icon: BellRing, path: "/notifications" },
        { label: "Admin Risk Center", icon: Lock, path: "/admin" },
        { label: "System Settings", icon: SlidersHorizontal, path: "/settings" },
      ]
    }
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#0d1322]/60 backdrop-blur-md flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-6">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={itemIdx}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/5'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 text-emerald-400/90" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 glass-card rounded-xl border border-emerald-500/20 text-center mt-6">
        <div className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          SHA-256 Fraud Ledger Live
        </div>
        <div className="text-[10px] text-slate-400 mt-1">Multi-Bank Ledger Connected</div>
      </div>
    </aside>
  );
};
