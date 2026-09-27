import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Bell, User as UserIcon, LogOut, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="h-16 border-b border-slate-800 bg-[#0d1322]/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <ShieldCheck className="w-6 h-6 text-black font-bold" />
        </div>
        <div>
          <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-2">
            GigSecure <span className="gradient-text font-black">AI</span>
          </span>
          <span className="text-[10px] text-emerald-400 uppercase tracking-widest block font-medium -mt-1">
            Enterprise Fintech Platform
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link to="/notifications" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              {user.full_name ? user.full_name[0].toUpperCase() : 'G'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-semibold text-white leading-none">{user.full_name}</div>
              <div className="text-xs text-emerald-400 font-mono mt-0.5">{user.role}</div>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition ml-2"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link to="/login" className="px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg transition shadow-lg shadow-emerald-500/20">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
};
