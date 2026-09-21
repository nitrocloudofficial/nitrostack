'use client';

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '../components/ThemeProvider';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { usePathname } from 'next/navigation';
import './globals.css';

function LayoutInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeIncident, setActiveIncident] = useState<string | null>(null);
  const pathname = usePathname();
  const isLanding = pathname === '/';

  // Poll for active incident status
  useEffect(() => {
    const checkIncident = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/state/summary').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data && data.success && data.data) {
            setActiveIncident(data.data.activeIncident || null);
          }
        }
      } catch {
        // Backend might not be running
      }
    };
    checkIncident();
    const interval = setInterval(checkIncident, 5000);
    return () => clearInterval(interval);
  }, []);

  // Landing page has no sidebar/navbar
  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className="flex-1 flex flex-col transition-all duration-300 print:ml-0 print:p-0 print:m-0"
        style={{ marginLeft: collapsed ? '72px' : '260px' }}
      >
        <Navbar activeIncident={activeIncident} />
        <main className="flex-1 p-6 overflow-y-auto custom-scrollbar print:p-0 print:m-0 print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <title>FactoryOS — Smart Manufacturing Control Center</title>
        <meta name="description" content="The Autonomous Operating System for Smart Factories. AI-powered predictive maintenance, real-time monitoring, and autonomous incident resolution." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <LayoutInner>{children}</LayoutInner>
        </ThemeProvider>
      </body>
    </html>
  );
}
