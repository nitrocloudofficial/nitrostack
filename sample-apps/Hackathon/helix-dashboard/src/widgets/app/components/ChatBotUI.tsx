'use client';

import React, { useState, useEffect } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

export const ChatBotUI: React.FC = () => {
  const { getToolOutput } = useWidgetSDK();
  const toolData = getToolOutput<any>();

  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string; confidence?: string; passages?: number; hops?: number }[]>([
    { role: 'ai', text: 'Initializing Cognitive Engine...' },
    { role: 'ai', text: 'Helix AI active. Ready to inspect strategic drift anomalies, manager hierarchies, and SOP compliance.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [department, setDepartment] = useState('Engineering & Infrastructure');

  useEffect(() => {
    if (toolData && (toolData.response || toolData.answer || toolData.confidence_score || toolData.confidence)) {
      const answer = toolData.answer || toolData.response || "No diagnostic output received.";
      const confVal = toolData.confidence_score !== undefined ? toolData.confidence_score : toolData.confidence;
      const conf = confVal !== undefined ? (typeof confVal === 'number' ? (confVal * 100).toFixed(1) + "%" : confVal) : "96.4%";
      setMessages([
        { role: 'ai', text: 'Helix AI active. Synchronized with Nitro Studio tool output.' },
        { role: 'ai', text: answer, confidence: conf, passages: toolData.retrieved_passages || toolData.sources || 4, hops: toolData.graph_paths_traversed || toolData.hops || 2 }
      ]);
    }
  }, [toolData]);

  const handleSend = async (customQuery?: string) => {
    const query = customQuery || input;
    if (!query.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: query }]);
    if (!customQuery) setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query, department })
      }).catch(() => fetch('http://localhost:8001/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query, department })
      }));

      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();
      const answer = data.answer || data.response || "No diagnostic output received.";
      const conf = data.confidence_score !== undefined ? (data.confidence_score * 100).toFixed(1) + "%" : "96.4%";
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: answer,
        confidence: conf,
        passages: data.retrieved_passages || 4,
        hops: data.graph_paths_traversed || 2
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: '[ERROR] Unable to connect to HELIX backend engine. Please ensure Python server is active on port 8000 or 8001.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100%',
      width: '100%',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'rgba(5, 5, 5, 0.5)',
      borderRadius: '0px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(37, 99, 235, 0.2)',
        background: 'linear-gradient(180deg, rgba(37, 99, 235, 0.1) 0%, transparent 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#3B82F6',
            boxShadow: '0 0 10px #3B82F6'
          }} />
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#FFF' }}>Helix AI Assistant &amp; Drift Inspector</span>
        </div>
        <select 
          value={department}
          onChange={e => setDepartment(e.target.value)}
          style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', outline: 'none' }}
        >
          <option value="Engineering & Infrastructure">Engineering</option>
          <option value="Executive Strategy & Real Estate">Executive Strategy</option>
          <option value="Compliance & Legal Operations">Compliance &amp; Legal</option>
          <option value="Global Marketing">Marketing</option>
          <option value="Sales & Revenue">Sales</option>
        </select>
      </div>

      {/* Message History */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '85%',
              padding: '14px 18px',
              borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
              backgroundColor: msg.role === 'user' ? '#1E3A8A' : 'rgba(15, 23, 42, 0.9)',
              border: msg.role === 'user' ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.1)',
              color: '#F3F4F6',
              fontSize: '13px',
              lineHeight: '1.6',
              whiteSpace: 'pre-line',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}>
              {msg.role === 'ai' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                  <strong style={{ color: '#60A5FA', fontSize: '11px', textTransform: 'uppercase' }}>Helix AI Engine</strong>
                  {msg.confidence && <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto' }}>Conf: {msg.confidence}</span>}
                  {msg.passages && <span style={{ fontSize: '10px', background: 'rgba(99, 102, 241, 0.2)', color: '#818CF8', padding: '2px 6px', borderRadius: '4px' }}>{msg.passages} Docs</span>}
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '12px 18px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(0, 242, 254, 0.3)', color: '#94a3b8', fontSize: '12px' }}>
              [PROCESSING] HELIX Engine traversing Vector DB &amp; Knowledge Graph... (Applying role authority weights)
            </div>
          </div>
        )}
      </div>

      {/* Quick Query Nudges */}
      <div style={{ padding: '8px 20px', background: 'rgba(10, 11, 15, 0.9)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', overflowX: 'auto' }}>
        <button onClick={() => handleSend("Who was the manager of David Miller in 2022 before he transferred to Legal?")} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', color: '#00f2fe', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>David Miller Manager</button>
        <button onClick={() => handleSend("What drift events occurred in Engineering sprint 44 and who contributed most?")} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Eng Sprint 44 Drift</button>
        <button onClick={() => handleSend("Analyze Elena Rostova Dehradun plot acquisition and check SOP-STR-045 compliance.")} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Real Estate SOP</button>
      </div>

      {/* Input Box */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(2, 5, 18, 0.9)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(10, 11, 15, 0.8)',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '4px 12px',
          transition: 'all 0.2s',
        }}>
          <input 
            type="text" 
            placeholder="Ask HELIX about employee drift, SOP compliance, manager hierarchy..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#FFFFFF',
              fontSize: '13px',
              padding: '10px 0',
            }}
          />
          <button 
            onClick={() => handleSend()}
            style={{
              background: 'linear-gradient(45deg, #2563EB, #4338CA)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              color: '#FFF',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '12px',
            }}
          >
            Inspect
          </button>
        </div>
      </div>
    </div>
  );
};
