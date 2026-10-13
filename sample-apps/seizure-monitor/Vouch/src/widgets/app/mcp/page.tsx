'use client';

import React from 'react';
import { Navbar } from '../../components/Navbar';
import { MCPServerInspector } from '../../components/MCPServerInspector';

export default function StandaloneMCPPage() {
  const handleNavigate = (route: string) => {
    if (route === 'landing') window.location.href = '/';
    else window.location.href = `/${route}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 0%, #151D33 0%, #0F172A 100%)', color: '#F8FAFC' }}>
      <Navbar activeRoute="mcp" onRouteChange={handleNavigate} />
      <main style={{ padding: '32px 24px 60px 24px' }}>
        <MCPServerInspector />
      </main>
    </div>
  );
}
