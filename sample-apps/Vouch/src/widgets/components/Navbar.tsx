'use client';

import React, { useState } from 'react';
import { Badge, Button } from './DesignSystem';
import { PDFModal } from './PDFModal';

interface NavbarProps {
  activeRoute: string;
  onRouteChange: (route: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeRoute, onRouteChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPDFOpen, setIsPDFOpen] = useState(false);

  const navItems = [
    { id: 'landing', label: '🌐 Home', desc: 'Product overview & demo' },
    { id: 'dashboard', label: '📊 Dashboard', desc: 'Analytics & insights' },
    { id: 'review', label: '⭐ Review Audit', desc: 'Multi-signal proof engine' },
    { id: 'business', label: '🏢 Business Hub', desc: 'Reputation & fraud risk' },
    { id: 'admin', label: '🛡️ Admin Console', desc: 'Moderation & system health' },
    { id: 'mcp', label: '⚡ MCP Server', desc: 'MCP Tools & JSON-RPC' },
    { id: 'ai-risk', label: '🤖 AI Risk Report', desc: 'Deep AI audit report' },
  ];

  return (
    <>
      <PDFModal isOpen={isPDFOpen} onClose={() => setIsPDFOpen(false)} />
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '12px 24px',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          {/* Brand Logo & Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              onClick={() => onRouteChange('landing')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '20px',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
              }}>
                V
              </div>
              <div>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#F8FAFC', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.5px' }}>
                  Vouch
                </span>
                <span style={{ fontSize: '10px', color: '#818CF8', fontWeight: 700, marginLeft: '6px', background: 'rgba(79, 70, 229, 0.15)', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(79, 70, 229, 0.3)' }}>
                  MCP PRO
                </span>
              </div>
            </div>

            {/* Quick Search */}
            <div style={{ position: 'relative', width: '200px' }}>
              <input
                type="text"
                placeholder="Search reviews, businesses, IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '7px 12px 7px 32px',
                  color: '#F8FAFC',
                  fontSize: '12px',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
              />
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', opacity: 0.5 }}>
                🔍
              </span>
            </div>
          </div>

          {/* Central Nav Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(30, 41, 59, 0.5)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onRouteChange(item.id)}
                style={{
                  background: activeRoute === item.id ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)' : 'transparent',
                  border: activeRoute === item.id ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
                  color: activeRoute === item.id ? '#FFFFFF' : '#94A3B8',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* User & PDF Trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button variant="secondary" size="sm" onClick={() => setIsPDFOpen(true)}>
              📄 Show PDF Report
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px 4px 4px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '12px',
                color: '#FFF',
              }}>
                A
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#F8FAFC' }}>Alex Chen</span>
              <Badge variant="emerald" size="sm">Truth Keeper</Badge>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
