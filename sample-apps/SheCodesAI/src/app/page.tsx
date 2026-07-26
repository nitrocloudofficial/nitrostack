'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { SearchModal } from '../components/layout/SearchModal';
import { NotificationsDrawer } from '../components/layout/NotificationsDrawer';
import { LandingPage } from '../components/landing/LandingPage';
import { OverviewDashboard } from '../components/dashboard/OverviewDashboard';
import { LiveProcessorRoom } from '../components/meeting/LiveProcessorRoom';
import { VisualWorkflowCanvas } from '../components/workflow/VisualWorkflowCanvas';
import { ContextPackManager } from '../components/contextPacks/ContextPackManager';
import { KnowledgeHub } from '../components/knowledge/KnowledgeHub';
import { VectorMemoryInspector } from '../components/memory/VectorMemoryInspector';
import { IntegrationsCenter } from '../components/integrations/IntegrationsCenter';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';
import { MultiTimezoneCalendar } from '../components/calendar/MultiTimezoneCalendar';
import { WorkspaceGovernance } from '../components/workspace/WorkspaceGovernance';

export default function Home() {
  const { activeTab } = useApp();

  if (activeTab === 'landing') {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header />

      {/* Main App Container */}
      <div className="flex flex-1 relative">
        {/* Sidebar */}
        <Sidebar />

        {/* Dynamic Main View */}
        <main className="flex-1 min-w-0 bg-[#07090e] overflow-y-auto pb-12">
          {activeTab === 'dashboard' && <OverviewDashboard />}
          {activeTab === 'live_room' && <LiveProcessorRoom />}
          {activeTab === 'workflow_builder' && <VisualWorkflowCanvas />}
          {activeTab === 'context_packs' && <ContextPackManager />}
          {activeTab === 'knowledge_hub' && <KnowledgeHub />}
          {activeTab === 'vector_memory' && <VectorMemoryInspector />}
          {activeTab === 'integrations' && <IntegrationsCenter />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'calendar' && <MultiTimezoneCalendar />}
          {activeTab === 'workspace_settings' && <WorkspaceGovernance />}
        </main>
      </div>

      {/* Modals & Drawers */}
      <SearchModal />
      <NotificationsDrawer />
    </div>
  );
}
