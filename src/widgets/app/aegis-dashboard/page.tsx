'use client';

import React, { useEffect } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { AegisProvider, useAegis, PageId } from '../context/AegisContext';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { CriticalAlertModal } from '../components/CriticalAlertModal';
import { ReportViewerModal } from '../components/ReportViewerModal';
import { LoginView } from '../components/views/LoginView';

import { OverviewView } from '../components/views/OverviewView';
import { LiveMonitoringView } from '../components/views/LiveMonitoringView';
import { InvestigationDetailsView } from '../components/views/InvestigationDetailsView';
import { FraudAnalyticsView } from '../components/views/FraudAnalyticsView';
import { IntelligenceReportsView } from '../components/views/IntelligenceReportsView';
import { SettingsView } from '../components/views/SettingsView';
import { SystemHealthView } from '../components/views/SystemHealthView';

function DashboardContent() {
  const { getToolOutput, callTool } = useWidgetSDK();
  const {
    activePage,
    setActivePage,
    isAuthenticated,
    isAlertOpen,
    setIsAlertOpen,
    toasts,
    removeToast,
    simulateScam,
    handleFreezeTransaction,
    updateFromBackend,
  } = useAegis();

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Wrapped handlers passing callTool from SDK
  const handleSimulateScam = () => simulateScam(callTool);
  const handleFreeze = () => handleFreezeTransaction(callTool);

  // Listen for real MCP tool output pushed from backend host
  const toolData = getToolOutput<any>();
  useEffect(() => {
    if (toolData) {
      updateFromBackend(toolData);
      if ((toolData.threat_score && toolData.threat_score >= 80) || toolData.status === 'FROZEN_PENDING_REVIEW') {
        setIsAlertOpen(true);
      }
    }
  }, [toolData, updateFromBackend, setIsAlertOpen]);

  // Protected Route Check
  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return (
          <OverviewView
            onGoToInvestigation={() => setActivePage('investigation')}
            onSimulateScam={handleSimulateScam}
          />
        );
      case 'monitoring':
        return <LiveMonitoringView />;
      case 'investigation':
        return <InvestigationDetailsView onFreezeApproved={handleFreeze} />;
      case 'analytics':
        return <FraudAnalyticsView />;
      case 'reports':
        return <IntelligenceReportsView />;
      case 'settings':
        return <SettingsView />;
      case 'system':
        return <SystemHealthView />;
      default:
        return <OverviewView onGoToInvestigation={() => setActivePage('investigation')} onSimulateScam={handleSimulateScam} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0B0B0B] text-gray-100 overflow-hidden select-none">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar isAlertActive={isAlertOpen} onSimulateScam={handleSimulateScam} />

        <main className="flex-1 overflow-y-auto px-8 py-8">
          {activePage !== 'overview' && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-5 flex items-center justify-between"
            >
              <button
                onClick={() => setActivePage('overview')}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-[#D4AF37]/25 text-xs font-mono-ui font-semibold text-gray-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all cursor-pointer group shadow-lg"
              >
                <ArrowLeft className="w-4 h-4 text-[#D4AF37] group-hover:-translate-x-1 transition-transform" />
                <span>Back to Overview</span>
              </button>
              <span className="text-[10px] font-mono-ui text-gray-500 uppercase tracking-widest">
                Aegis Protocol / {activePage}
              </span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Critical Alert Modal */}
      <CriticalAlertModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onFreezeApproved={handleFreeze}
        threatScore={94}
      />

      {/* Report Viewer Modal */}
      <ReportViewerModal />

      {/* Toast Notifications Container */}
      <div className="fixed bottom-6 right-6 z-[100] space-y-2.5 max-w-md pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              onClick={() => removeToast(toast.id)}
              className={`pointer-events-auto px-5 py-3.5 rounded-2xl border text-xs text-gray-200 shadow-2xl font-mono-ui flex items-center justify-between gap-3 cursor-pointer ${toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/40 text-red-200'
                : toast.type === 'success'
                  ? 'bg-[#0A1F10]/90 border-[#00C853]/40 text-emerald-200'
                  : toast.type === 'warning'
                    ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
                    : 'bg-[#141414]/90 border-[#D4AF37]/30 text-gray-200'
                }`}
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 20px rgba(212,175,55,0.12)' }}
            >
              <div className="flex items-center gap-2">
                <span>{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function AegisDashboardPage() {
  const { callTool, isReady } = useWidgetSDK();
  return (
    <AegisProvider callTool={callTool} isReady={isReady}>
      <DashboardContent />
    </AegisProvider>
  );
}
