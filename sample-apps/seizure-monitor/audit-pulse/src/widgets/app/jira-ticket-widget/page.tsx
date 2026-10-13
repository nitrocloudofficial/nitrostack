'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function JiraTicketWidget(props: any) {
  const [injectedData, setInjectedData] = React.useState<any>(null);
  const [messages, setMessages] = React.useState<any[]>([]);

  React.useEffect(() => {
    const w = window as any;
    if (w.openai && w.openai.toolOutput) setInjectedData(w.openai.toolOutput);
    
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

  if (!parsedPayload?.ticket_id && messages.length > 0) {
     for (const msg of messages) {
       let p = msg;
       if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) {} }
       if (p?.type === 'NITRO_INJECT_OPENAI' && p?.data?.toolOutput) p = p.data.toolOutput;
       if (p?.content?.[0]?.text) { try { p = JSON.parse(p.content[0].text); } catch(e) {} }
       if (p?.status === 'success' && p?.ticket_id !== undefined) {
         parsedPayload = p;
         break;
       }
     }
  }

  const hasData = parsedPayload && parsedPayload.ticket_id;
  const ticket = hasData ? parsedPayload : {
    ticket_id: 'HR-4099',
    title: 'Employee Misconduct Detected',
    priority: 'Critical',
    description: 'Suspicious employee downloading massive amounts of company data.'
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return '#ef4444'; // Red
      case 'high': return '#f97316';     // Orange
      case 'medium': return '#eab308';   // Yellow
      default: return '#3b82f6';         // Blue
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', color: '#0f172a', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '15px' }}>
          <div>
            <span style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Action Item Created</span>
            <h2 style={{ margin: '5px 0 0 0', color: '#0f172a', fontSize: '1.4em' }}>{ticket.ticket_id}: {ticket.title}</h2>
          </div>
          <div style={{ backgroundColor: getPriorityColor(ticket.priority), color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.85em', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {ticket.priority}
          </div>
        </div>
        
        <div style={{ backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '6px', fontSize: '0.95em', lineHeight: '1.5', color: '#334155' }}>
          <strong>Description:</strong><br/>
          {ticket.description}
        </div>

        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85em' }}>View Details</button>
          <button style={{ backgroundColor: '#e2e8f0', color: '#475569', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85em' }}>Assign to me</button>
        </div>
      </motion.div>
    </div>
  );
}
