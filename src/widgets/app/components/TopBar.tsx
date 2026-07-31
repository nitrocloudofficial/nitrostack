'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Bell, Clock, Zap, RefreshCw, X, ArrowRight, ShieldCheck, AlertOctagon, ChevronDown } from 'lucide-react';
import { useAegis, SearchResultItem } from '../context/AegisContext';

interface TopBarProps {
  isAlertActive: boolean;
  onSimulateScam: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ isAlertActive, onSimulateScam }) => {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    executeSearchSelect,
    simulateScam,
    isSimulating,
    rescanThreats,
    isRescanning,
    notifications,
    markNotificationsRead,
    setActivePage,
    activePage,
    monitoringPaused,
    setMonitoringPaused,
  } = useAegis();

  const [time, setTime] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showScenarioMenu, setShowScenarioMenu] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const scenarioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (scenarioRef.current && !scenarioRef.current.contains(e.target as Node)) {
        setShowScenarioMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard Navigation for Search
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        executeSearchSelect(searchResults[selectedIndex]);
        setShowSearchResults(false);
      } else if (searchResults.length > 0) {
        executeSearchSelect(searchResults[0]);
        setShowSearchResults(false);
      }
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-[#D4AF37]/30 text-[#D4AF37] font-bold px-0.5 rounded">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const socIsActive = !monitoringPaused;

  return (
    <header className="h-14 px-6 flex items-center justify-between gap-4 border-b border-[#D4AF37]/10 bg-[#0B0B0B]/95 backdrop-blur-md sticky top-0 z-30">
      {/* Left: Global Search */}
      <div className="relative max-w-sm w-full" ref={searchRef}>
        <Search style={{ width: 13, height: 13 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSearchResults(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setShowSearchResults(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search case, account, caller ID, customer…"
          aria-label="Global Search Bar"
          className="w-full pl-8 pr-8 py-1.5 text-[11px] bg-[#141414] border border-[#D4AF37]/12 rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setShowSearchResults(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        )}

        {/* Dropdown Results */}
        <AnimatePresence>
          {showSearchResults && searchQuery.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="absolute left-0 right-0 top-full mt-2 bg-[#121212] border border-[#D4AF37]/25 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto"
              style={{ boxShadow: '0 16px 32px rgba(0,0,0,0.8), 0 0 20px rgba(212,175,55,0.1)' }}
            >
              {searchResults.length > 0 ? (
                <div className="p-2 space-y-1">
                  <div className="px-3 py-1 text-[9px] font-mono-ui text-gray-500 uppercase tracking-widest border-b border-white/5">
                    Found {searchResults.length} Match{searchResults.length > 1 ? 'es' : ''}
                  </div>
                  {searchResults.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        executeSearchSelect(item);
                        setShowSearchResults(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between group ${
                        idx === selectedIndex
                          ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-white'
                          : 'hover:bg-[#1A1A1A] text-gray-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold font-mono-ui">
                            {highlightMatch(item.title, searchQuery)}
                          </span>
                          <span className="text-[9px] font-mono-ui px-1.5 py-0.5 rounded bg-white/5 text-[#D4AF37] border border-[#D4AF37]/20">
                            {item.category}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 truncate mt-0.5 font-mono-ui">
                          {highlightMatch(item.subtitle, searchQuery)}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#D4AF37] shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs font-mono-ui text-gray-500">
                  No matching cases, transactions, or accounts found.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-3">
        {/* SOC Monitoring Status — Hidden on overview, interactive on other pages */}
        {activePage !== 'overview' && (
          <div
            onClick={() => {
              if (activePage === 'monitoring') {
                setMonitoringPaused(!monitoringPaused);
              } else {
                setActivePage('monitoring');
              }
            }}
            title={activePage === 'monitoring'
              ? (monitoringPaused ? 'Click to resume SOC Monitoring' : 'Click to pause SOC Monitoring')
              : 'Click to view Live SOC Monitoring feed'}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-mono-ui font-bold border cursor-pointer transition-all ${
              isAlertActive
                ? 'bg-red-950/40 border-red-500/30 text-red-400 animate-pulse'
                : monitoringPaused
                  ? 'bg-red-950/30 border-red-500/25 text-red-400 hover:border-red-500/50'
                  : 'bg-[#141414] border-[#D4AF37]/15 text-gray-300 hover:text-white hover:border-[#D4AF37]/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isAlertActive
                  ? 'bg-red-500 shadow-[0_0_6px_#FF4D4F]'
                  : monitoringPaused
                    ? 'bg-red-500 shadow-[0_0_6px_#FF4D4F]'
                    : 'bg-[#00C853] shadow-[0_0_6px_#00C853]'
              }`}
            />
            {isAlertActive ? 'CRITICAL ALERT' : monitoringPaused ? 'SOC ON HOLD' : 'SOC MONITORING'}
          </div>
        )}

        {/* IST clock */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] border border-[#D4AF37]/12 rounded-lg text-[10px] font-mono-ui text-gray-400">
          <Clock style={{ width: 10, height: 10 }} className="text-[#D4AF37]" />
          {time || '00:00:00'} IST
        </div>

        {/* Refresh / Threat Rescan */}
        <button
          onClick={rescanThreats}
          disabled={isRescanning}
          title="Rescan Threat Engine Telemetry"
          className="p-2 rounded-lg bg-[#141414] border border-[#D4AF37]/12 text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all disabled:opacity-50"
        >
          <RefreshCw style={{ width: 13, height: 13 }} className={isRescanning ? 'animate-spin text-[#D4AF37]' : ''} />
        </button>

        {/* Simulation Actions Dropdown */}
        <div className="relative" ref={scenarioRef}>
          <button
            onClick={() => setShowScenarioMenu(!showScenarioMenu)}
            disabled={isSimulating}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#D4AF37]/30 text-gray-200 text-[10px] font-mono-ui font-bold tracking-wider transition-all disabled:opacity-50"
          >
            <Zap style={{ width: 11, height: 11 }} className="text-[#D4AF37]" />
            <span>SIMULATE SCENARIO</span>
            <ChevronDown style={{ width: 11, height: 11 }} className={`text-gray-400 transition-transform ${showScenarioMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showScenarioMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-72 bg-[#121212] border border-[#D4AF37]/30 rounded-2xl shadow-2xl overflow-hidden z-50 p-2 space-y-1.5"
                style={{ boxShadow: '0 16px 32px rgba(0,0,0,0.8), 0 0 20px rgba(212,175,55,0.15)' }}
              >
                <div className="px-3 py-1.5 border-b border-white/5 flex items-center justify-between text-[9px] font-mono-ui text-gray-400 uppercase tracking-widest">
                  <span>Test Scenarios</span>
                  <span>Alert Status</span>
                </div>

                <button
                  onClick={() => {
                    simulateScam('high');
                    setShowScenarioMenu(false);
                  }}
                  className="w-full p-2.5 rounded-xl bg-red-950/30 hover:bg-red-950/60 border border-red-500/30 text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-bold font-mono-ui text-red-400">HIGH RISK (Digital Arrest)</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 pl-4">Threat Score: 94/100 · Coercion Spoof</p>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-mono-ui font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                    1 Alert
                  </span>
                </button>

                <button
                  onClick={() => {
                    simulateScam('medium');
                    setShowScenarioMenu(false);
                  }}
                  className="w-full p-2.5 rounded-xl bg-amber-950/30 hover:bg-amber-950/60 border border-amber-500/30 text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold font-mono-ui text-amber-400">MEDIUM RISK (Voice Clone)</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 pl-4">Threat Score: 78/100 · Family Clone</p>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-mono-ui font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    1 Review
                  </span>
                </button>

                <button
                  onClick={() => {
                    simulateScam('safe');
                    setShowScenarioMenu(false);
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#00C853]/10 hover:bg-[#00C853]/20 border border-[#00C853]/30 text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00C853]" />
                      <span className="text-xs font-bold font-mono-ui text-[#00C853]">SAFE TRANSACTION</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 pl-4">Threat Score: 12/100 · Verified Customer</p>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-mono-ui font-bold rounded-full bg-[#00C853]/20 text-[#00C853] border border-[#00C853]/40">
                    0 Alerts
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              markNotificationsRead();
            }}
            title="System Notifications"
            className="relative p-2 rounded-lg bg-[#141414] border border-[#D4AF37]/12 text-gray-500 hover:text-[#D4AF37] transition-all"
          >
            <Bell style={{ width: 13, height: 13 }} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-80 bg-[#121212] border border-[#D4AF37]/25 rounded-2xl shadow-2xl overflow-hidden z-50"
                style={{ boxShadow: '0 16px 32px rgba(0,0,0,0.8), 0 0 20px rgba(212,175,55,0.1)' }}
              >
                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-cinzel font-bold text-white">Notifications</span>
                  <span className="text-[10px] font-mono-ui text-[#D4AF37]">
                    {notifications.length} Events
                  </span>
                </div>
                <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 hover:bg-[#1A1A1A] transition-colors cursor-pointer text-xs font-mono-ui space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-200">{n.title}</span>
                        <span className="text-[9px] text-gray-500">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-snug">{n.body}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
