'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function VendorRiskDashboard() {
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
      <div style={{ position: 'absolute', top: '-150px', left: '-100px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-100px', right: '-50px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(225,29,72,0.1) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} style={{ position: 'relative', zIndex: 1 }}>
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
          <span style={{ fontSize: '1.2em' }}>🔗</span> External Partner Risk Analyzer
        </h2>
        <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0, fontSize: '14px', letterSpacing: '0.01em' }}>Live Third-Party Security Monitoring</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '32px' }}>
          <motion.div whileHover={{ y: -2 }} style={{ 
            padding: '24px', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px', fontWeight: 600 }}>Catering Company</h3>
              <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>Vendor ID: VND-082</p>
            </div>
            <div style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(74,222,128,0.1)', padding: '6px 12px', borderRadius: '8px', alignSelf: 'flex-start' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
              <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Safe</span>
            </div>
          </motion.div>
          
          <motion.div 
            animate={{ borderColor: ['rgba(225,29,72,0.5)', 'rgba(159,18,57,0.5)', 'rgba(225,29,72,0.5)'] }}
            transition={{ repeat: Infinity, duration: 2 }}
            whileHover={{ y: -2 }}
            style={{ 
              padding: '24px', 
              background: 'linear-gradient(145deg, rgba(225, 29, 72, 0.05) 0%, rgba(159, 18, 57, 0.05) 100%)', 
              borderRadius: '16px', 
              border: '2px solid rgba(225,29,72,0.5)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
            <div>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px', fontWeight: 600 }}>External Payroll Company</h3>
              <p style={{ margin: '8px 0 0 0', color: '#fca5a5', fontSize: '14px' }}>Alert: Critical Data Breach Detected</p>
            </div>
            <div style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(225,29,72,0.2)', padding: '6px 12px', borderRadius: '8px', alignSelf: 'flex-start' }}>
              <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fb7185' }} />
              <span style={{ color: '#fb7185', fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Hacked</span>
            </div>
          </motion.div>
        </div>

        <motion.div 
            initial={{ scale: 0.98, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{ 
              marginTop: '32px', 
              background: 'linear-gradient(to right, rgba(225, 29, 72, 0.1), rgba(225, 29, 72, 0.02))', 
              border: '1px solid rgba(225, 29, 72, 0.3)', 
              borderLeft: '4px solid #e11d48',
              borderRadius: '12px', 
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
          <div style={{ background: 'rgba(225,29,72,0.2)', padding: '10px', borderRadius: '50%', flexShrink: 0 }}>
            <span style={{ fontSize: '18px' }}>🚨</span>
          </div>
          <div>
            <h3 style={{ color: '#fda4af', margin: '0 0 4px 0', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical Threat</h3>
            <p style={{ margin: 0, color: '#fecaca', fontSize: '15px' }}>External Payroll Company has been hacked. Freeze all data sharing immediately.</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
