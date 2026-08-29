import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Eye, UploadCloud, Cpu, AlertTriangle, 
  TrendingUp, FileText, Settings, ShieldAlert, LogOut, User 
} from 'lucide-react';

import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import EvidenceCenter from './components/EvidenceCenter';
import UploadCenter from './components/UploadCenter';
import DecisionEngine from './components/DecisionEngine';
import ConflictViewer from './components/ConflictViewer';
import RiskDashboard from './components/RiskDashboard';
import Reports from './components/Reports';
import SettingsPage from './components/Settings';
import AdminPanel from './components/AdminPanel';
import LandingPage from './pages/LandingPage';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [showLanding, setShowLanding] = useState(!localStorage.getItem('token'));
  const [activePage, setActivePage] = useState('dashboard');

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setShowLanding(true);
    setActivePage('dashboard');
  };

  // If showing landing page
  if (showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  // If not authenticated, show login
  if (!token || !user) {
    return <AuthScreen setToken={setToken} setUser={setUser} onBackToLanding={() => setShowLanding(true)} />;
  }

  // Draw appropriate page
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard user={user} token={token} onUnauthorized={handleLogout} />;
      case 'evidence_center':
        return <EvidenceCenter user={user} token={token} />;
      case 'upload_center':
        return <UploadCenter user={user} token={token} />;
      case 'decision_engine':
        return <DecisionEngine user={user} token={token} />;
      case 'conflict_viewer':
        return <ConflictViewer user={user} token={token} />;
      case 'risk_dashboard':
        return <RiskDashboard user={user} token={token} />;
      case 'reports':
        return <Reports user={user} token={token} />;
      case 'settings':
        return <SettingsPage user={user} token={token} />;
      case 'admin_panel':
        return <AdminPanel user={user} token={token} />;
      default:
        return <Dashboard user={user} token={token} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'evidence_center', label: 'Evidence Center', icon: Eye },
    { id: 'upload_center', label: 'Upload Center', icon: UploadCloud },
    { id: 'decision_engine', label: 'Decision Engine', icon: Cpu },
    { id: 'conflict_viewer', label: 'Conflict Viewer', icon: AlertTriangle },
    { id: 'risk_dashboard', label: 'Risk Dashboard', icon: TrendingUp },
    { id: 'reports', label: 'Reports & Export', icon: FileText },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  if (user.role === 'admin') {
    navItems.push({ id: 'admin_panel', label: 'Admin Panel', icon: ShieldAlert });
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div style={{ textAlign: 'center', padding: '24px 15px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '4px', fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span>🛡️</span> VeriChain AI
          </h2>
          <small style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Evidence Platform
          </small>
        </div>

        {/* User Card */}
        <div style={{ padding: '20px 15px' }}>
          <div className="glass-card" style={{ padding: '12px 16px', marginBottom: '0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '6px', borderRadius: '50%' }}>
              <User size={16} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontWeight: '700', color: '#ffffff' }}>{user.username}</div>
              <div style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase' }}>
                Role: <span style={{ color: '#3b82f6', fontWeight: '600' }}>{user.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <nav style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <div 
                key={item.id} 
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => setActivePage(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* Logout Control */}
        <div style={{ padding: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <button 
            className="btn btn-danger" 
            style={{ width: '100%', display: 'flex', gap: '8px' }}
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Core View Area */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
