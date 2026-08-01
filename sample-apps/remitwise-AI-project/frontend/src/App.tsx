import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { TransferProvider } from './contexts/TransferContext';

import { LiveTicker } from './components/layout/LiveTicker';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { JudgeDemoButton } from './components/layout/JudgeDemoButton';
import { DeveloperDebugPanel } from './components/common/DeveloperDebugPanel';

import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { Compare } from './pages/Compare';
import { AgentPipeline } from './pages/AgentPipeline';
import { Recommendation } from './pages/Recommendation';
import { Explainability } from './pages/Explainability';
import { ProviderList } from './pages/ProviderList';
import { LiveExchange } from './pages/LiveExchange';
import { Compliance } from './pages/Compliance';
import { TransferTracker } from './pages/TransferTracker';
import { Settings } from './pages/Settings';
import { NitroChat } from './pages/NitroChat';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TransferProvider>
          <Router>
            <div className="min-h-screen flex flex-col font-sans aurora-bg text-slate-900 dark:text-slate-100 transition-colors duration-300">
              {/* Sticky Top Live FX Ticker (30s Polling) */}
              <LiveTicker />

              {/* Navigation Header */}
              <Navbar />

              {/* Main Page Body */}
              <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/chat" element={<NitroChat />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/pipeline" element={<AgentPipeline />} />
                  <Route path="/recommendation" element={<Recommendation />} />
                  <Route path="/explainability" element={<Explainability />} />
                  <Route path="/providers" element={<ProviderList />} />
                  <Route path="/live-exchange" element={<LiveExchange />} />
                  <Route path="/compliance" element={<Compliance />} />
                  <Route path="/tracker" element={<TransferTracker />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>

              {/* Floating Hackathon Judge Demo Button */}
              <JudgeDemoButton />

              {/* Developer Live API Debug Panel */}
              <DeveloperDebugPanel />

              {/* Global Footer */}
              <Footer />
            </div>
          </Router>
        </TransferProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
