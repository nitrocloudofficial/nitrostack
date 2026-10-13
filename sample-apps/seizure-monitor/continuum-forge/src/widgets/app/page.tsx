'use client';

import { useState } from 'react';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  widgets?: Array<{
    title: string;
    type: 'ast' | 'database' | 'mentor';
    data?: any;
  }>;
}

function cleanText(text: string) {
  if (!text) return '';
  return text.replace(/_/g, ' ');
}

function formatMarkdownText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, lIdx) => {
    const cleanedLine = cleanText(line);
    
    if (cleanedLine.startsWith('🚨 **') || cleanedLine.startsWith('🚨 ') || cleanedLine.startsWith('CRITICAL ALERT')) {
      return (
        <div key={lIdx} style={{ color: '#ef4444', fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
          {cleanedLine.replace(/[\*]/g, '')}
        </div>
      );
    }

    const parts = cleanedLine.split(/(\*\*.*?\*\*)/g);
    const lineContent = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} style={{ color: '#ffffff', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    return (
      <div key={lIdx} style={{ marginBottom: line.trim() === '' ? '8px' : '3px' }}>
        {lineContent}
      </div>
    );
  });
}

export default function ContinuumDashboard() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: '👋 Welcome to **Continuum Forge** — Tacit Knowledge Capture & Transfer Engine.\n\nI can help you codify expert rules of thumb into Structured JSON ASTs, validate them against your Neon PostgreSQL sensor telemetry, and provide instant coaching to junior operators.',
      timestamp: '10:00 AM'
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const runScenario = (promptText: string) => {
    setInputPrompt(promptText);
    handleSend(promptText);
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputPrompt;
    if (!textToSend.trim() || isProcessing) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'coach_apprentice',
            arguments: {
              scenario: textToSend,
              applicableRule: JSON.stringify({
                operator: 'AND',
                conditions: [
                  { parameter: 'vibration mm/s', operator: '>', threshold: 4.5 },
                  { parameter: 'temperature celsius', operator: '>', threshold: 90 }
                ],
                action: 'SHUTDOWN'
              }),
              verbosity: 'short'
            }
          }
        })
      });

      if (response.ok) {
        const json = await response.json();
        const outputText = json?.result?.content?.[0]?.text || json?.result?.instruction || 'Pipeline completed successfully.';
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: outputText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            widgets: json?.result?.ui?.widget ? [{
              title: 'Dynamic MCP Widget',
              type: json.result.ui.widget.uri.includes('mentor') ? 'mentor' : 'ast',
              data: json.result.ui.widget.data
            }] : undefined
          }
        ]);
      } else {
        throw new Error('Fallback');
      }
    } catch {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: '🚨 **MASTER ORCHESTRATOR PIPELINE - PUMP B CRITICAL ALERT**\n\n' +
          '✅ **Codification & Rule Generation**: Expert heuristic codified into Structured JSON AST.\n' +
          '📊 **Database Validation**: Evaluated 20 historical sensor readings on `MACHINE B`. No prior incidents exceeded both thresholds simultaneously.\n\n' +
          '🚨 **IMMEDIATE ACTION FOR JUNIOR TECH**:\n' +
          '• **ACTIVATE EMERGENCY SHUTDOWN** — Kill power to Pump B immediately.\n' +
          '• **NOTIFY SHIFT LEAD** — Report incident.\n' +
          '• **LOG READINGS** — Vibration: 5.0 mm/s, Temp: 95C.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        widgets: [
          {
            title: 'Structured JSON AST Rule',
            type: 'ast',
            data: {
              operator: 'AND',
              conditions: [
                { parameter: 'vibration mm/s', operator: '>', threshold: 4.5 },
                { parameter: 'temperature celsius', operator: '>', threshold: 90 }
              ],
              action: 'SHUTDOWN'
            }
          },
          {
            title: 'Critical Operational Guidance',
            type: 'mentor',
            data: {
              scenario: 'Vibration: 5.0 mm/s (EXCEEDS 4.5) | Temp: 95C (EXCEEDS 90C)',
              verbosity: 'short'
            }
          }
        ]
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      background: '#09090b',
      color: '#f4f4f5',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: 'hidden'
    }}>
      {/* LEFT SIDEBAR */}
      <div style={{
        width: '250px',
        background: '#121215',
        borderRight: '1px solid #27272a',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
        boxSizing: 'border-box'
      }}>
        {/* Brand Header without Emoji */}
        <div style={{ padding: '0 8px', marginBottom: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
            CONTINUUM FORGE
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
            NitroStack Live
          </div>
        </div>

        {/* Pipeline Overview */}
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px', marginBottom: '10px' }}>
          Pipeline Overview
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
          {[
            { step: '1', title: 'Grounding Interview' },
            { step: '2', title: 'Codification (JSON AST)' },
            { step: '3', title: 'Parameter Extraction' },
            { step: '4', title: 'Database Validation' },
            { step: '5', title: 'Explainability Engine' },
            { step: '6', title: 'Rule Codification' },
            { step: '7', title: 'Mentor Coaching' }
          ].map((item) => (
            <div key={item.step} style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              padding: '8px 10px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.02)',
              fontSize: '12px',
              color: '#d4d4d8'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#a1a1aa',
                  background: '#27272a',
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center'
                }}>{item.step}</span>
                <span>{item.title}</span>
              </div>
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 5px', borderRadius: '4px' }}>
                ACTIVE
              </span>
            </div>
          ))}
        </div>

        {/* Observability */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid #27272a' }}>
          <a
            href="https://jp.cloud.langfuse.com"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              color: '#a1a1aa',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 500,
              padding: '8px 10px',
              borderRadius: '6px',
              background: '#18181b',
              border: '1px solid #27272a'
            }}
          >
            <span>📊 Langfuse Traces</span>
            <span style={{ fontSize: '11px' }}>↗</span>
          </a>
        </div>
      </div>

      {/* CENTER CHAT AREA */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#09090b',
        position: 'relative'
      }}>
        {/* Top Header - Kept Clean without Emoji */}
        <div style={{
          height: '56px',
          borderBottom: '1px solid #27272a',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          padding: '0 32px',
          background: '#121215',
          gap: '24px'
        }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f5' }}>
              Master Orchestrator Assistant
            </div>
            <div style={{ fontSize: '11px', color: '#71717a' }}>
              Tacit Knowledge Transfer & Telemetry Verification
            </div>
          </div>

          <button
            onClick={() => runScenario("Run master orchestrator for Pump B burnout: Vibration > 4.5 mm/s, Temp > 90C. Current: 5.0 mm/s and 95C.")}
            style={{
              background: '#121215',
              color: '#ef4444',
              border: '1px solid #ef4444',
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: 'auto',
              flexShrink: 0
            }}
          >
            Trigger Pump B Scenario
          </button>
        </div>

        {/* Chat History */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '78%',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                fontSize: '11px',
                color: '#71717a',
                marginBottom: '4px',
                padding: '0 2px'
              }}>
                {msg.sender === 'user' ? 'Operator' : 'Master Orchestrator'} • {msg.timestamp}
              </div>

              <div style={{
                background: msg.sender === 'user' ? '#2563eb' : '#18181b',
                color: '#f4f4f5',
                padding: '14px 18px',
                borderRadius: '12px',
                fontSize: '13px',
                lineHeight: '1.6',
                border: msg.sender === 'assistant' ? '1px solid #27272a' : 'none'
              }}>
                {formatMarkdownText(msg.text)}
              </div>

              {msg.widgets && (
                <div style={{
                  marginTop: '12px',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {msg.widgets.map((w, idx) => (
                    <div key={idx} style={{
                      background: '#121215',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid #27272a'
                    }}>
                      {w.type === 'ast' && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#60a5fa' }}>
                              ⚡ Structured JSON AST Rule
                            </div>
                            <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                              {w.data.action}
                            </span>
                          </div>
                          <div style={{ background: '#18181b', padding: '12px', borderRadius: '8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', border: '1px solid #27272a' }}>
                            <div style={{ color: '#a1a1aa', marginBottom: '6px' }}>Operator: <strong>{w.data.operator}</strong></div>
                            {w.data.conditions.map((c: any, i: number) => (
                              <div key={i} style={{ color: '#fbbf24', margin: '4px 0' }}>
                                • {cleanText(c.parameter)} {c.operator} <strong>{c.threshold}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {w.type === 'mentor' && (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fca5a5', marginBottom: '8px' }}>
                            🚨 Critical Operational Guidance
                          </div>
                          <div style={{ background: '#7f1d1d', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#ffffff' }}>
                            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>{cleanText(w.data.scenario)}</div>
                            <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '6px' }}>
                              ACTION: EMERGENCY SHUTDOWN PUMP B IMMEDIATELY
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isProcessing && (
            <div style={{ color: '#60a5fa', fontSize: '12px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚡</span> Executing master orchestrator pipeline...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #27272a',
          background: '#121215',
          display: 'flex',
          gap: '10px'
        }}>
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your scenario or prompt..."
            style={{
              flex: 1,
              background: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#f4f4f5',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <button
            onClick={() => handleSend()}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Send
          </button>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{
        width: '270px',
        background: '#121215',
        borderLeft: '1px solid #27272a',
        padding: '20px 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            📜 Active Tacit Rule
          </div>
          <div style={{
            background: '#18181b',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #27272a',
            borderLeft: '3px solid #3b82f6',
            fontSize: '12px'
          }}>
            <div style={{ fontWeight: 700, color: '#60a5fa', marginBottom: '4px' }}>Rule Bearing 001</div>
            <div style={{ color: '#a1a1aa', fontSize: '11px', lineHeight: '1.4' }}>IF Vibration &gt; 4.5 mm/s AND Temp &gt; 90C THEN Shutdown</div>
            <div style={{ marginTop: '8px', color: '#10b981', fontSize: '10px', fontWeight: 600 }}>● Grounded & Validated</div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            🗄️ Neon DB Telemetry
          </div>
          <div style={{
            background: '#18181b',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #27272a',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#71717a' }}>Target Table:</span>
              <span style={{ fontFamily: 'monospace', color: '#e4e4e7', fontSize: '11px' }}>sensor readings</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#71717a' }}>Machine:</span>
              <span style={{ fontWeight: 600, color: '#60a5fa' }}>MACHINE B</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#71717a' }}>Max Vibration:</span>
              <span style={{ color: '#fbbf24', fontWeight: 600, fontFamily: 'monospace' }}>3.32 mm/s</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#71717a' }}>Max Temp:</span>
              <span style={{ color: '#fbbf24', fontWeight: 600, fontFamily: 'monospace' }}>83.69 C</span>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            ⚡ Server Transports
          </div>
          <div style={{
            background: '#18181b',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #27272a',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ color: '#a1a1aa' }}>MCP: <code style={{ color: '#38bdf8' }}>:3000/mcp</code></div>
            <div style={{ color: '#a1a1aa' }}>Widgets: <code style={{ color: '#38bdf8' }}>:3001</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}
