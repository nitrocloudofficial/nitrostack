'use client';

import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { LandingView } from '../components/LandingView';
import { DashboardView } from '../components/DashboardView';
import { ReviewDetailView } from '../components/ReviewDetailView';
import { BusinessDashboardView } from '../components/BusinessDashboardView';
import { AdminView } from '../components/AdminView';
import { MCPServerInspector } from '../components/MCPServerInspector';
import AIRiskReportWidget from './ai-risk-report/page';

export default function HomeHubPage() {
  const [activeRoute, setActiveRoute] = useState<string>('landing');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 0%, #151D33 0%, #0F172A 100%)',
      color: '#F8FAFC',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Top Navbar */}
      <Navbar activeRoute={activeRoute} onRouteChange={setActiveRoute} />

      {/* Main Screen Body View */}
      <main style={{ padding: '32px 24px 60px 24px' }}>
        {activeRoute === 'landing' && <LandingView onNavigate={setActiveRoute} />}
        {activeRoute === 'dashboard' && <DashboardView onNavigate={setActiveRoute} />}
        {activeRoute === 'review' && <ReviewDetailView onNavigate={setActiveRoute} />}
        {activeRoute === 'business' && <BusinessDashboardView onNavigate={setActiveRoute} />}
        {activeRoute === 'admin' && <AdminView onNavigate={setActiveRoute} />}
        {activeRoute === 'mcp' && <MCPServerInspector />}
        {activeRoute === 'ai-risk' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: '1050px', margin: '0 auto' }}>
            <AIRiskReportWidget />
          </div>
        )}
      </main>
    </div>
  );
}
