'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  answeredBy?: string;
  relatedIncidents?: string[];
  mode?: 'live' | 'mock';
}

interface ExecutiveResponse {
  question: string;
  answer: string;
  relatedIncidents: string[];
  answeredBy: string;
}

const SUGGESTIONS = [
  'Why is engineering health low?',
  'Summarize today\'s risks',
  'Which department is under the most pressure?',
  'Check release calendar conflicts'
];

export default function ExecutiveChatWidget() {
  const theme = useTheme();
  const { isReady, callTool } = useWidgetSDK();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'assistant',
      text: 'Hello. I am the Executive Copilot Agent. Ask me operational questions like "Why is engineering health low?", "Summarize today\'s risks", etc.',
      timestamp: new Date().toISOString(),
      answeredBy: 'Executive Agent',
      mode: 'mock'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const isDark = theme === 'dark';
  const bg = isDark ? 'radial-gradient(circle at top left, #0f172a, #020617)' : '#f8fafc';
  const cardBg = isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? 'rgba(51, 65, 85, 0.5)' : '#e2e8f0';
  const shadow = isDark ? '0 8px 32px 0 rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.05)';
  const backdropFilter = isDark ? 'blur(8px)' : 'none';

  const shellStyle: React.CSSProperties = { 
    padding: 32, 
    textAlign: 'center', 
    color: text, 
    background: bg, 
    borderRadius: 16, 
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
  };

  if (!isReady) return <div style={shellStyle}>Initializing Executive Copilot Room...</div>;

  const getLocalMockAnswer = (question: string) => {
    const q = question.toLowerCase();
    if (q.includes('engineering') && (q.includes('low') || q.includes('why') || q.includes('health'))) {
      return {
        answer: 'Engineering health is currently 74% (warning). Database deployment failed on primary checkout service. Active incidents are processed by the Engineering Agent to diagnose root causes and suggest mitigations.',
        relatedIncidents: ['INC-1004'],
        answeredBy: 'Executive Agent'
      };
    }
    if (q.includes('release') || q.includes('launch') || q.includes('meeting')) {
      return {
        answer: 'We currently monitor calendar meetings and release windows. Open incidents will block or delay launch events if feature progress falls under 80%. I recommend postponing demo reviews or resolving the underlying database migrations if active.',
        relatedIncidents: ['INC-1004'],
        answeredBy: 'Executive Agent'
      };
    }
    if (q.includes('pressure') || q.includes('most') || q.includes('worst')) {
      return {
        answer: 'Engineering is under the most pressure at 74% (warning). Database deployment failed on primary checkout service.',
        relatedIncidents: ['INC-1004'],
        answeredBy: 'Executive Agent'
      };
    }
    if (q.includes('risk') || q.includes('summar')) {
      return {
        answer: 'Company health is 82% (warning) with 1 open incident. Active alerts: Failed Production Database Rollout (critical).',
        relatedIncidents: ['INC-1004'],
        answeredBy: 'Executive Agent'
      };
    }
    return {
      answer: 'Company health is 82% (warning). There is 1 open incident. Ask me about a department\'s health, meeting risk, or general operational risks.',
      relatedIncidents: ['INC-1004'],
      answeredBy: 'Executive Agent'
    };
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      let result: ExecutiveResponse;
      let mode: 'live' | 'mock' = 'live';

      try {
        result = await callTool('executiveChat', { question: textToSend }) as unknown as ExecutiveResponse;
      } catch (err) {
        console.warn('Live tool call failed or running standalone. Falling back to local mock.', err);
        const mock = getLocalMockAnswer(textToSend);
        result = {
          question: textToSend,
          answer: mock.answer,
          relatedIncidents: mock.relatedIncidents,
          answeredBy: mock.answeredBy
        };
        mode = 'mock';
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        sender: 'assistant',
        text: result.answer,
        timestamp: new Date().toISOString(),
        answeredBy: result.answeredBy,
        relatedIncidents: result.relatedIncidents,
        mode
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      const errMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        sender: 'assistant',
        text: '❌ Error: Failed to retrieve answer from Executive Copilot.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: bg,
      color: text,
      padding: 24,
      borderRadius: 16,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      border: `1px solid ${border}`,
      boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      height: 520
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '1.2px', color: '#6366f1', fontWeight: 800, textTransform: 'uppercase' }}>Executive Agent Copilot</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, letterSpacing: '-0.5px' }}>Strategic Advisory Room</div>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: 999,
          background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#e0e7ff',
          color: '#6366f1',
          fontSize: 10,
          fontWeight: 800,
          border: '1px solid rgba(99, 102, 241, 0.3)'
        }}>
          LIVE CHAT
        </div>
      </div>

      {/* Suggested Questions */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(s)}
            disabled={loading}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              background: cardBg,
              border: `1px solid ${border}`,
              color: text,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              boxShadow: shadow
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.1)' : '#f3f4f6';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = border;
              e.currentTarget.style.background = cardBg;
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Message Feed */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        margin: '12px 0',
        borderTop: `1px solid ${border}`,
        borderBottom: `1px solid ${border}`
      }}>
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                width: '100%'
              }}
            >
              <div style={{
                maxWidth: '80%',
                background: isUser ? '#6366f1' : cardBg,
                color: isUser ? '#ffffff' : text,
                borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                padding: '12px 16px',
                border: isUser ? 'none' : `1px solid ${border}`,
                boxShadow: shadow,
                backdropFilter
              }}>
                {!isUser && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 10, color: muted, fontWeight: 700 }}>
                    <span>{m.answeredBy ?? 'Copilot'}</span>
                    {m.mode === 'mock' && (
                      <span style={{
                        background: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7',
                        color: '#d97706',
                        padding: '1px 4px',
                        borderRadius: 3,
                        fontSize: 8,
                        fontWeight: 900
                      }}>MOCK</span>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </div>
                
                {!isUser && m.relatedIncidents && m.relatedIncidents.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${border}`, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: muted, fontWeight: 700 }}>Incidents:</span>
                    {m.relatedIncidents.map(incId => (
                      <span key={incId} style={{
                        fontSize: 9,
                        padding: '2px 6px',
                        background: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2',
                        color: '#ef4444',
                        borderRadius: 4,
                        fontWeight: 800
                      }}>
                        {incId}
                      </span>
                    ))}
                  </div>
                )}
                
                <div style={{ textAlign: 'right', fontSize: 9, color: isUser ? 'rgba(255,255,255,0.7)' : muted, marginTop: 4 }}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: cardBg,
              color: text,
              borderRadius: '16px 16px 16px 2px',
              padding: '12px 16px',
              border: `1px solid ${border}`,
              boxShadow: shadow
            }}>
              <div style={{ fontSize: 13, color: muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="animate-pulse" style={{ fontSize: 16 }}>●</span>
                <span>Executive Agent is formulating report...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputValue);
        }}
        style={{ display: 'flex', gap: 10, flexShrink: 0 }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask the executive advisor..."
          disabled={loading}
          style={{
            flex: 1,
            background: isDark ? '#0f172a' : '#ffffff',
            border: `1px solid ${border}`,
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 13,
            color: text,
            outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          style={{
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '0 20px',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
            opacity: loading || !inputValue.trim() ? 0.6 : 1
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
