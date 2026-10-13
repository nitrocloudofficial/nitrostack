import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { FinancialDNAPage } from './pages/FinancialDNAPage';
import { CreditLoanPage } from './pages/CreditLoanPage';
import { JourneyPage } from './pages/JourneyPage';
import { ExecutionPage } from './pages/ExecutionPage';
import { ProfilePage } from './pages/ProfilePage';
import { MonitoringPage } from './pages/MonitoringPage';


// Placeholder Pages for domains that don't have visual widgets yet
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="page-container">
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">Module Status: Active</p>
      </div>
    </header>
    <div className="glass-panel" style={{ textAlign: 'center', color: '#8B949E' }}>
      Waiting for backend signals...
    </div>
  </div>
);

const AppLayout = ({ children, user, onSignOut }: { children: React.ReactNode; user: any; onSignOut: () => void }) => {
  const location = useLocation();
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup';

  if (isAuthRoute || !user) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#05050A' }}>
      <Sidebar user={user} onSignOut={onSignOut} />
      <main style={{ marginLeft: '260px', flex: 1, position: 'relative', overflowX: 'hidden' }}>
        <div style={{ position: 'fixed', top: '-20%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(112,0,255,0.08) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        {children}
      </main>
    </div>
  );
};

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);


  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('orchestrator_user', JSON.stringify(user));
  };

  const handleSignOut = () => {
    localStorage.removeItem('orchestrator_user');
    setCurrentUser(null);
  };

  return (
    <BrowserRouter>
      <AppLayout user={currentUser} onSignOut={handleSignOut}>
        <Routes>
          {/* Public Auth Routes — Redirect to / if already logged in */}
          <Route path="/login" element={currentUser ? <Navigate to="/" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/signup" element={currentUser ? <Navigate to="/" replace /> : <SignUpPage />} />


          {/* Protected Routes — Redirect to /login if not authenticated */}
          <Route path="/" element={currentUser ? <DashboardPage /> : <Navigate to="/login" replace />} />
          <Route path="/onboarding" element={currentUser ? <OnboardingPage /> : <Navigate to="/login" replace />} />
          <Route path="/profile" element={currentUser ? <ProfilePage /> : <Navigate to="/login" replace />} />
          <Route path="/accounts" element={currentUser ? <PlaceholderPage title="Bank Aggregation" /> : <Navigate to="/login" replace />} />
          <Route path="/taxonomy" element={currentUser ? <PlaceholderPage title="Data Taxonomy" /> : <Navigate to="/login" replace />} />
          <Route path="/dna" element={currentUser ? <FinancialDNAPage /> : <Navigate to="/login" replace />} />
          <Route path="/monitoring" element={currentUser ? <MonitoringPage user={currentUser} /> : <Navigate to="/login" replace />} />

          <Route path="/market" element={currentUser ? <PlaceholderPage title="Market Reactions" /> : <Navigate to="/login" replace />} />

          <Route path="/credit" element={currentUser ? <CreditLoanPage /> : <Navigate to="/login" replace />} />
          <Route path="/journey" element={currentUser ? <JourneyPage /> : <Navigate to="/login" replace />} />
          <Route path="/execution" element={currentUser ? <ExecutionPage /> : <Navigate to="/login" replace />} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to={currentUser ? "/" : "/login"} replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
