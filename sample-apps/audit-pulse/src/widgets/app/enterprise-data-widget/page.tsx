'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function EnterpriseDataWidget(props: any) {
  const [injectedData, setInjectedData] = React.useState<any>(null);
  const [messages, setMessages] = React.useState<any[]>([]);

  React.useEffect(() => {
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

  let data = injectedData || props?.data || props?.payload || props?.result || props?.toolCall || props;
  let parsedPayload: any = data;

  if (typeof data === 'string') {
    try { parsedPayload = JSON.parse(data); } catch(e) {}
  } else if (data && data.content && Array.isArray(data.content) && data.content[0]?.text) {
    try { parsedPayload = JSON.parse(data.content[0].text); } catch(e) {}
  }

  if (!parsedPayload?.row_count && messages.length > 0) {
     for (const msg of messages) {
       let p = msg;
       if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) {} }
       if (p?.type === 'NITRO_INJECT_OPENAI' && p?.data?.toolOutput) {
         p = p.data.toolOutput;
       }
       if (p?.content?.[0]?.text) { try { p = JSON.parse(p.content[0].text); } catch(e) {} }
       if (p?.status === 'success' && p?.row_count !== undefined) {
         parsedPayload = p;
         break;
       }
     }
  }

  const hasData = parsedPayload && parsedPayload.data && Array.isArray(parsedPayload.data) && parsedPayload.data.length > 0;
  
  const queryData = hasData ? parsedPayload.data : [
    { department_name: 'Marketing_Department', money_spent_today: 15400, unusual_expenses: 'Yes' },
    { department_name: 'Sales_Department', money_spent_today: 1200, unusual_expenses: 'No' }
  ];
  
  const explanation = parsedPayload?.explanation || "Dynamic SQL query results visualized.";
  const rowCount = parsedPayload?.row_count !== undefined ? parsedPayload.row_count : (hasData ? queryData.length : 2);

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
      <div style={{ position: 'absolute', bottom: '-100px', right: '-50px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

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
          <span style={{ fontSize: '1.2em' }}>🧠</span> Company Database Query
        </h2>
        <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0, fontSize: '14px', letterSpacing: '0.01em' }}>{explanation}</p>
        
        {parsedPayload?.identity_verified && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.5 }}
            style={{ 
              marginTop: '16px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))', 
              border: '1px solid rgba(16, 185, 129, 0.5)', 
              color: '#34d399', 
              padding: '6px 12px', 
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.05em'
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path><path d="M12 15v2"></path></svg>
            🔓 IDENTITY VERIFIED: HR ADMIN
          </motion.div>
        )}

        {parsedPayload?.pii_masked && !parsedPayload?.identity_verified && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ 
              duration: 0.5, 
              repeat: Infinity, 
              repeatType: "reverse", 
              repeatDelay: 2
            }}
            style={{ 
              marginTop: '16px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))', 
              border: '1px solid rgba(239, 68, 68, 0.4)', 
              color: '#f87171', 
              padding: '6px 12px', 
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.05em'
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            🚨 PII AUTO-MASKING ACTIVE
          </motion.div>
        )}
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          margin: '28px 0', 
          padding: '16px 24px', 
          background: 'rgba(255,255,255,0.03)', 
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <span style={{ fontWeight: 600, color: '#e2e8f0', letterSpacing: '0.02em', fontSize: '15px' }}>Total Records Found</span>
          <motion.span 
            initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
            style={{ 
              background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)', 
              color: '#fff', 
              padding: '6px 16px', 
              borderRadius: '20px', 
              fontWeight: 700,
              fontSize: '15px',
              boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)'
            }}
          >
            {rowCount}
          </motion.span>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '16px', border: rowCount > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
          {rowCount === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '16px', margin: 0 }}>No results found in the database for this query.</p>
            </motion.div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(0,0,0,0.2)' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {Object.keys(queryData[0] || {}).map(key => (
                    <th key={key} style={{ 
                      padding: '16px', 
                      color: '#94a3b8', 
                      textTransform: 'uppercase', 
                      fontSize: '12px', 
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queryData.map((row: any, i: number) => (
                  <motion.tr 
                    key={i} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.1 + (i * 0.05) }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.2s' }}
                  >
                    {Object.values(row).map((val: any, j: number) => (
                      <td key={j} style={{ padding: '16px', color: '#f1f5f9', fontSize: '14px' }}>
                        {typeof val === 'number' ? (
                          <span style={{ fontFamily: 'monospace', color: '#7dd3fc' }}>{val}</span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
