'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function ComplianceRadar() {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div style={{ background: 'linear-gradient(145deg, #020617 0%, #0f172a 100%)', minHeight: '100vh' }} />;

  return (
    <div style={{ 
      padding: '32px', 
      fontFamily: '"Inter", system-ui, sans-serif', 
      background: 'linear-gradient(145deg, #020617 0%, #0f172a 100%)', 
      color: '#f8fafc', 
      borderRadius: '24px', 
      border: '1px solid rgba(255,255,255,0.08)', 
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Glow Elements */}
      <div style={{ position: 'absolute', top: '-150px', left: '-100px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-100px', right: '-50px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{ 
          color: '#f8fafc', 
          marginTop: 0, 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          fontSize: '24px',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '1.2em' }}>🛡️</span> Company Policy Radar
        </h2>
        <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0, fontSize: '14px', letterSpacing: '0.01em' }}>Live Employee Policy Monitoring</p>
        
        <div style={{ 
          marginTop: '32px', 
          background: 'rgba(255,255,255,0.02)', 
          padding: '24px', 
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ 
            borderBottom: '1px solid rgba(255,255,255,0.1)', 
            paddingBottom: '16px',
            margin: '0 0 16px 0',
            color: '#e2e8f0',
            fontSize: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>Recent Employee Actions</h3>
          
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
            <motion.li 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(16,185,129,0.1)', padding: '6px', borderRadius: '50%' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
              <span style={{ color: '#cbd5e1', fontSize: '15px' }}><strong style={{ color: '#f8fafc', fontWeight: 600 }}>John_Smith</strong> read company emails</span>
            </motion.li>
            <motion.li 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(16,185,129,0.1)', padding: '6px', borderRadius: '50%' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
              <span style={{ color: '#cbd5e1', fontSize: '15px' }}><strong style={{ color: '#f8fafc', fontWeight: 600 }}>Sarah_Connor</strong> checked payroll</span>
            </motion.li>
            
            <motion.li 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              style={{ marginTop: '16px' }}
            >
              <motion.div
                animate={{ backgroundColor: ['rgba(225, 29, 72, 0.05)', 'rgba(225, 29, 72, 0.15)', 'rgba(225, 29, 72, 0.05)'] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ 
                  padding: '20px', 
                  borderLeft: '4px solid #e11d48', 
                  borderRadius: '12px',
                  borderTop: '1px solid rgba(225,29,72,0.2)',
                  borderRight: '1px solid rgba(225,29,72,0.2)',
                  borderBottom: '1px solid rgba(225,29,72,0.2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                <div style={{ background: 'rgba(225,29,72,0.2)', padding: '6px', borderRadius: '50%', flexShrink: 0 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>
                <div>
                  <strong style={{ color: '#fda4af', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Policy Violation Detected</strong> <br/>
                  <span style={{ color: '#fecaca', fontSize: '14px', lineHeight: 1.6, display: 'inline-block', marginTop: '4px' }}>
                    <strong style={{ color: '#fff' }}>Sarah_Connor</strong> secretly downloaded all customer passwords.
                  </span>
                </div>
              </motion.div>
            </motion.li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
