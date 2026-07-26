'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function InvoiceAnalysisWidget(props: any) {
  const [injectedData, setInjectedData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const w = window as any;
    if (w.openai && w.openai.toolOutput) {
      setInjectedData(w.openai.toolOutput);
    }
    
    const handleMessage = (event: MessageEvent) => {
      let msg = event.data;
      if (msg && typeof msg === 'object' && msg.source === 'react-devtools-bridge') return;
      
      setMessages(prev => [...prev, msg]);
      
      if (msg && msg.type === 'NITRO_INJECT_OPENAI' && msg.data && msg.data.toolOutput) {
        setInjectedData(msg.data.toolOutput);
      } else if (msg && msg.toolOutput) {
        setInjectedData(msg.toolOutput);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  let raw = injectedData || props;
  let parsedPayload: any = raw;

  if (typeof raw === 'string') {
    try { parsedPayload = JSON.parse(raw); } catch(e) {}
  } else if (raw && raw.content && Array.isArray(raw.content) && raw.content[0]?.text) {
    try { parsedPayload = JSON.parse(raw.content[0].text); } catch(e) {}
  }

  function findPayload(obj: any, depth = 0): any {
    if (!obj || typeof obj !== 'object' || depth > 5) return null;
    if (obj.vendor && obj.invoice_number) return obj;
    for (let key in obj) {
      const res = findPayload(obj[key], depth + 1);
      if (res) return res;
    }
    return null;
  }

  const deepPayload = findPayload(raw);
  if (deepPayload) {
    parsedPayload = deepPayload;
  }

  if (!parsedPayload?.vendor && messages.length > 0) {
     for (const msg of messages) {
       let p = msg;
       if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) {} }
       if (p?.type === 'NITRO_INJECT_OPENAI' && p?.data?.toolOutput) {
         p = p.data.toolOutput;
       }
       if (p?.content?.[0]?.text) { try { p = JSON.parse(p.content[0].text); } catch(e) {} }
       if ((p?.status === 'success' && p?.vendor !== undefined) || p?.status === 'error') {
         parsedPayload = p;
         break;
       }
     }
  }

  const isError = parsedPayload?.status === 'error';
  const vendor = parsedPayload?.vendor || "Unknown Vendor";
  const invoiceNumber = parsedPayload?.invoice_number || "INV-000";
  const discrepancies = parsedPayload?.discrepancies || [];
  const totalOverbilled = parsedPayload?.total_overbilled || 0;
  const isFlagged = totalOverbilled > 0;

  return (
    <div style={{ 
      padding: '32px', 
      fontFamily: '"Inter", system-ui, sans-serif', 
      background: 'linear-gradient(145deg, #09090b 0%, #18181b 100%)', 
      color: '#f8fafc', 
      borderRadius: '24px', 
      border: '1px solid rgba(255,255,255,0.08)', 
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Glow Elements */}
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-150px', left: '-50px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} style={{ position: 'relative', zIndex: 1 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ 
              color: '#e2e8f0', 
              marginTop: 0, 
              marginBottom: '6px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              fontSize: '26px',
              fontWeight: 600,
              letterSpacing: '-0.02em'
            }}>
              <span style={{ fontSize: '1.2em' }}>📄</span> Invoice Analysis Report
            </h2>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px', letterSpacing: '0.01em' }}>AI parsed via Vision OCR against Enterprise MSA Database</p>
          </div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            style={{ 
              padding: '6px 16px', 
              borderRadius: '9999px', 
              fontWeight: 600, 
              fontSize: '13px', 
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              backgroundColor: isError ? 'rgba(245, 158, 11, 0.15)' : (isFlagged ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)'), 
              color: isError ? '#fbbf24' : (isFlagged ? '#f87171' : '#4ade80'), 
              border: `1px solid ${isError ? 'rgba(245, 158, 11, 0.3)' : (isFlagged ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)')}`,
              boxShadow: `0 0 20px ${isError ? 'rgba(245, 158, 11, 0.1)' : (isFlagged ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)')}`
            }}>
            {isError ? "SYSTEM ERROR" : (isFlagged ? "DISCREPANCY DETECTED" : "CLEARED")}
          </motion.div>
        </div>
        
        {isError ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ 
            marginTop: '32px', 
            background: 'linear-gradient(to right, rgba(245, 158, 11, 0.05), rgba(245, 158, 11, 0.02))', 
            border: '1px solid rgba(245, 158, 11, 0.2)', 
            borderLeft: '4px solid #fbbf24',
            borderRadius: '12px', 
            padding: '24px' 
          }}>
            <h3 style={{ color: '#fcd34d', margin: '0 0 12px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Model Configuration Error
            </h3>
            <p style={{ color: '#fde68a', margin: 0, lineHeight: 1.6, opacity: 0.9 }}>
              {parsedPayload?.error || "The Vision AI system encountered an unexpected error."}
            </p>
          </motion.div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '32px' }}>
              <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
                <p style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>Vendor Name</p>
                <p style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>{vendor}</p>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
                <p style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>Invoice Number</p>
                <p style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#f8fafc', fontFamily: 'monospace' }}>{invoiceNumber}</p>
              </motion.div>
            </div>

            {isFlagged ? (
              <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }} style={{ 
                marginTop: '24px', 
                background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.05) 0%, rgba(153, 27, 27, 0.05) 100%)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                borderRadius: '16px', 
                padding: '24px',
                position: 'relative'
              }}>
                <h3 style={{ color: '#fca5a5', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                  <span style={{ backgroundColor: 'rgba(239,68,68,0.2)', padding: '4px 8px', borderRadius: '8px' }}>🚨</span> 
                  Overbilling Detected
                </h3>
                
                <ul style={{ color: '#fecaca', lineHeight: '1.8', margin: '0 0 24px 0', paddingLeft: '28px', fontSize: '15px' }}>
                  {discrepancies.map((d: string, i: number) => (
                    <motion.li key={i} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 + (i * 0.1) }}>
                      {d}
                    </motion.li>
                  ))}
                </ul>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.1)' }}>
                  <span style={{ color: '#fca5a5', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Financial Impact</span>
                  <span style={{ color: '#f87171', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(239,68,68,0.2)' }}>${totalOverbilled.toFixed(2)}</span>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ 
                marginTop: '24px', 
                background: 'linear-gradient(to right, rgba(34, 197, 94, 0.05), rgba(34, 197, 94, 0.02))', 
                border: '1px solid rgba(34, 197, 94, 0.2)', 
                borderLeft: '4px solid #4ade80',
                borderRadius: '12px', 
                padding: '24px', 
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ background: 'rgba(34,197,94,0.1)', padding: '10px', borderRadius: '50%' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div>
                  <h3 style={{ color: '#86efac', margin: '0 0 4px 0', fontSize: '18px' }}>Verification Successful</h3>
                  <p style={{ color: '#bbf7d0', margin: 0, fontSize: '14px', opacity: 0.8 }}>Invoice items strictly match all Master Service Agreement terms.</p>
                </div>
              </motion.div>
            )}
          </>
        )}

      </motion.div>
    </div>
  );
}
