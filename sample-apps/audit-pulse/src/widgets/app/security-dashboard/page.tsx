'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function SecurityDashboard() {
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
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-150px', left: '-50px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} style={{ position: 'relative', zIndex: 1 }}>
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
          <span style={{ fontSize: '1.2em' }}>🛡️</span> Employee Activity Monitor
        </h2>
        <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0, fontSize: '14px', letterSpacing: '0.01em' }}>Live tracking of suspicious internal actions</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '32px' }}>
            <motion.div whileHover={{ y: -2 }} style={{ 
              padding: '24px', 
              background: 'rgba(255,255,255,0.03)', 
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: '#10b981' }} />
                <h3 style={{ margin: 0, color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Safe Employees</h3>
                <p style={{ fontSize: '42px', fontWeight: 800, margin: '16px 0 0 0', color: '#f8fafc' }}>3</p>
            </motion.div>
            
            <motion.div whileHover={{ y: -2 }} style={{ 
              padding: '24px', 
              background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.05) 0%, rgba(153, 27, 27, 0.05) 100%)', 
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: '#ef4444' }} />
                <h3 style={{ margin: 0, color: '#fca5a5', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Suspicious Employees</h3>
                <p style={{ fontSize: '42px', fontWeight: 800, margin: '16px 0 0 0', color: '#f87171' }}>1</p>
            </motion.div>
        </div>

        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.5, duration: 0.4 }}
            style={{ 
              marginTop: '32px', 
              background: 'linear-gradient(to right, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.02))', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              borderLeft: '4px solid #ef4444',
              borderRadius: '12px', 
              padding: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px'
            }}>
          <div style={{ background: 'rgba(239,68,68,0.2)', padding: '10px', borderRadius: '50%', flexShrink: 0 }}>
            <span style={{ fontSize: '18px' }}>🚨</span>
          </div>
          <div>
            <h3 style={{ color: '#fca5a5', margin: '0 0 8px 0', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Breach Attempt</h3>
            <p style={{ color: '#fecaca', margin: '0 0 16px 0', fontSize: '15px', lineHeight: 1.5 }}>
              <strong style={{ color: '#f8fafc' }}>Bob_The_Fired_Guy</strong> is attempting to download the Company Vault.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
              <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
              <em style={{ color: '#f87171', fontSize: '13px', fontStyle: 'normal', fontWeight: 500 }}>Waiting for Human Manager to approve <code>revoke_employee_access</code>...</em>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
