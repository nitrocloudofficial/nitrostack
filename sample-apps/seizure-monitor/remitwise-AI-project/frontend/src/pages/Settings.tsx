import React from 'react';
import { Settings as SettingsIcon, Sun, Moon, Globe, Bell, Shield, Database } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-500/20">
          <SettingsIcon className="w-3.5 h-3.5" />
          <span>APPLICATION & AGENT CONFIGURATION</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Platform Settings
        </h1>
        <p className="text-sm text-slate-500">Customize theme aesthetics, corridor defaults, and API endpoints.</p>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-8">
        {/* Theme Settings */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>Color Theme</span>
            </h3>
            <p className="text-xs text-slate-500">Switch between Light mode and Dark Mode</p>
          </div>

          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md"
          >
            Current: {theme.toUpperCase()} MODE
          </button>
        </div>

        {/* Corridor Defaults */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Default Sender Country
            </label>
            <select className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white">
              <option>🇺🇸 United States (USD)</option>
              <option>🇦🇪 United Arab Emirates (AED)</option>
              <option>🇬🇧 United Kingdom (GBP)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Default Recipient Country
            </label>
            <select className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white">
              <option>🇮🇳 India (INR)</option>
              <option>🇵🇭 Philippines (PHP)</option>
              <option>🇲🇽 Mexico (MXN)</option>
            </select>
          </div>
        </div>

        {/* Backend API Configuration */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-500" />
            <span>FastAPI Backend URL Endpoint</span>
          </h3>

          <input
            type="text"
            readOnly
            value="http://localhost:8000"
            className="w-full p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs border border-slate-800"
          />
          <p className="text-[11px] text-slate-500">
            Automatically connects to FastAPI backend at localhost:8000 when active, or operates in resilient standalone mock mode.
          </p>
        </div>
      </div>
    </div>
  );
};
