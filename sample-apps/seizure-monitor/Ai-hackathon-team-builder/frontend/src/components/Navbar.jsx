import React from 'react';
import { Cpu, Users, MessageSquare, LayoutDashboard, Sparkles, PlusCircle, UserCheck } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenRegister, currentUserProfile, onOpenProfile }) {
  return (
    <header className="glass-panel" style={{ borderRadius: '0 0 20px 20px', borderTop: 'none', padding: '16px 32px', marginBottom: '24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('chat')}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
          }}>
            <Cpu size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="gradient-text" style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.5px' }}>TITAN AI</h1>
              <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                <Sparkles size={10} /> MCP ORCHESTRATOR
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AI Hackathon Team Builder & Compatibility Engine</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.5)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <button 
            className={`btn ${activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('chat')}
            style={{ borderRadius: '12px', padding: '8px 18px', fontSize: '0.88rem' }}
          >
            <MessageSquare size={16} />
            AI Assistant
          </button>
          
          <button 
            className={`btn ${activeTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('directory')}
            style={{ borderRadius: '12px', padding: '8px 18px', fontSize: '0.88rem' }}
          >
            <Users size={16} />
            Student Roster
          </button>

          <button 
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('dashboard')}
            style={{ borderRadius: '12px', padding: '8px 18px', fontSize: '0.88rem' }}
          >
            <LayoutDashboard size={16} />
            Team Dashboard
          </button>
        </nav>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentUserProfile && (
            <button 
              className="btn btn-secondary" 
              onClick={onOpenProfile}
              style={{ 
                borderColor: 'rgba(99, 102, 241, 0.4)', 
                background: 'rgba(99, 102, 241, 0.1)', 
                color: '#fff',
                fontSize: '0.86rem'
              }}
            >
              <UserCheck size={16} color="#818cf8" />
              <span>My Profile ({currentUserProfile.name.split(' ')[0]})</span>
            </button>
          )}

          <button className="btn btn-cyan" onClick={onOpenRegister}>
            <PlusCircle size={17} />
            Register Student
          </button>
        </div>

      </div>
    </header>
  );
}
