'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const trafficData = [
  { time: '10:00', traffic: 15, errors: 12 },
  { time: '10:05', traffic: 20, errors: 15 },
  { time: '10:10', traffic: 18, errors: 10 },
  { time: '10:15', traffic: 9500, errors: 150 },
  { time: '10:20', traffic: 22, errors: 14 }
];

export default function TelemetryDashboard() {
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
      <div style={{ position: 'absolute', top: '-150px', left: '-100px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-100px', right: '-50px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} style={{ position: 'relative', zIndex: 1 }}>
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
          <span style={{ fontSize: '1.2em' }}>⚙️</span> Company Portals Tracker
        </h2>
        <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0, fontSize: '14px', letterSpacing: '0.01em' }}>Live Employee Traffic & Portal Health</p>
        
        <div style={{ 
          marginTop: '28px', 
          padding: '24px', 
          background: 'rgba(255,255,255,0.03)', 
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.05)',
          overflowX: 'auto' 
        }}>
          <LineChart width={800} height={250} data={trafficData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="time" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
            <Line type="monotone" name="Active Users" dataKey="traffic" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', stroke: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#60a5fa' }} />
            <Line type="monotone" name="Failed Logins" dataKey="errors" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', stroke: '#8b5cf6', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#a78bfa' }} />
          </LineChart>
        </div>

        <motion.div 
            initial={{ scale: 0.98, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{ 
              marginTop: '24px', 
              background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.05) 0%, rgba(180, 83, 9, 0.05) 100%)', 
              border: '1px solid rgba(245, 158, 11, 0.3)', 
              borderLeft: '4px solid #fbbf24',
              borderRadius: '12px', 
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
          <div style={{ background: 'rgba(245,158,11,0.2)', padding: '10px', borderRadius: '50%', flexShrink: 0 }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
          </div>
          <div>
            <h3 style={{ color: '#fcd34d', margin: '0 0 4px 0', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Overloaded</h3>
            <p style={{ margin: 0, color: '#fde68a', fontSize: '15px' }}>Financial Dashboard has detected a massive spike in employee traffic causing slowdowns.</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
