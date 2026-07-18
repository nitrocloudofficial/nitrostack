import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, ChevronDown, ChevronRight, Cpu, User, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export default function AgentConsole({ activeStudent }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hello! I am AURA, your Smart Campus Operations Agent. I coordinate multiple MCP tool servers to handle operations across placement eligibility, hostel outpasses, schedules, and complaints.\n\nChoose one of the flagship demo flows below or write your own request:",
      trace: [],
      isWelcome: true
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const demoFlows = [
    {
      label: 'Flow A — Placement Check',
      query: 'Am I eligible for the campus placement drive next week?',
      desc: 'Chains attendance, library, finance, and placement servers.'
    },
    {
      label: 'Flow B — Hostel Outpass',
      query: 'Can I apply for a weekend outpass from 2026-07-20 to 2026-07-22?',
      desc: 'Checks leave policy, attendance, hostel complaints, and files outpass.'
    },
    {
      label: 'Flow C — Conflict Watchdog',
      query: 'Run the timetable conflict watchdog check.',
      desc: 'Proactively audits class schedules against registered campus events.'
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText) => {
    if (!queryText.trim()) return;
    
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: queryText
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.queryAgent(queryText, activeStudent);
      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: res.response,
        trace: res.trace || []
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Error communicating with AURA: ${err.message}`,
        trace: []
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.consoleContainer} className="glass-panel">
      {/* Scrollable Chat History */}
      <div style={styles.chatArea}>
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            style={{
              ...styles.msgRow,
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              ...styles.bubbleContainer,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
            }}>
              <div style={{
                ...styles.avatar,
                background: msg.role === 'user' 
                  ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' 
                  : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
              }}>
                {msg.role === 'user' ? <User size={18} /> : <Cpu size={18} />}
              </div>

              <div style={styles.contentCol}>
                <div style={{
                  ...styles.bubble,
                  backgroundColor: msg.role === 'user' ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.7)',
                  border: msg.role === 'user' ? '1px solid rgba(15,23,42,0.1)' : '1px solid rgba(15,23,42,0.06)',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'
                }}>
                  <div style={styles.messageText}>{msg.text}</div>
                  
                  {/* Suggestion Cards on Welcome message */}
                  {msg.isWelcome && (
                    <div style={styles.suggestionsGrid}>
                      {demoFlows.map((flow, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(flow.query)}
                          style={styles.suggestionCard}
                        >
                          <div style={styles.suggestionTitle}>{flow.label}</div>
                          <div style={styles.suggestionQuery}>"{flow.query}"</div>
                          <div style={styles.suggestionDesc}>{flow.desc}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* MCP Execution Trace Details */}
                {msg.trace && msg.trace.length > 0 && (
                  <TraceVisualizer trace={msg.trace} />
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={styles.msgRow}>
            <div style={styles.bubbleContainer}>
              <div style={{ ...styles.avatar, background: 'rgba(168, 85, 247, 0.2)' }}>
                <Cpu size={18} className="animate-pulse" />
              </div>
              <div style={styles.loadingBubble}>
                <span style={styles.loadingDot}>•</span>
                <span style={styles.loadingDot}>•</span>
                <span style={styles.loadingDot}>•</span>
                <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'var(--txt-soft)' }}>
                  AURA is invoking MCP servers...
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input controls */}
      <div style={styles.inputArea}>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }} 
          style={styles.form}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AURA to audit placements, check outpass leaves, or verify events..."
            style={styles.input}
            disabled={loading}
          />
          <button 
            type="submit" 
            style={{
              ...styles.submitBtn,
              opacity: loading || !input.trim() ? 0.6 : 1
            }}
            disabled={loading || !input.trim()}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

// Collapsible Trace Visualizer component
function TraceVisualizer({ trace }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={styles.traceContainer}>
      <button onClick={() => setIsOpen(!isOpen)} style={styles.traceHeader}>
        <div style={styles.traceHeaderLeft}>
          <Terminal size={14} color="#818cf8" style={{ marginRight: '8px' }} />
          <span>MCP SERVER TOOL CHAIN ({trace.length} CALLS)</span>
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      
      {isOpen && (
        <div style={styles.traceBody}>
          {trace.map((node, i) => (
            <TraceNode key={i} node={node} isLast={i === trace.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function TraceNode({ node, isLast }) {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return <CheckCircle2 size={14} color="#10b981" />;
      case 'failed':
        return <XCircle size={14} color="#ef4444" />;
      default:
        return <AlertTriangle size={14} color="#f59e0b" />;
    }
  };

  return (
    <div style={{
      ...styles.node,
      borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)'
    }}>
      <div onClick={() => setExpanded(!expanded)} style={styles.nodeSummary}>
        <div style={styles.nodeMeta}>
          {getStatusIcon(node.status)}
          <span style={styles.serverBadge}>{node.server}</span>
          <span style={styles.toolName}>{node.tool}</span>
        </div>
        <div style={styles.nodeToggle}>
          <span style={styles.argSummary}>
            {JSON.stringify(node.arguments)}
          </span>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </div>
      </div>

      {expanded && (
        <div style={styles.nodeDetails}>
          <div style={styles.detailSec}>
            <div style={styles.detailLabel}>Tool Parameters:</div>
            <pre style={styles.pre}>{JSON.stringify(node.arguments, null, 2)}</pre>
          </div>
          {node.result && (
            <div style={styles.detailSec}>
              <div style={styles.detailLabel}>MCP Server Response:</div>
              <pre style={styles.preOutput}>{node.result}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  consoleContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 130px)',
    overflow: 'hidden',
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  msgRow: {
    display: 'flex',
    width: '100%',
  },
  bubbleContainer: {
    display: 'flex',
    gap: '16px',
    maxWidth: '85%',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--txt-bright)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    flexShrink: 0,
  },
  contentCol: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  bubble: {
    padding: '16px 20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  messageText: {
    fontSize: '0.95rem',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    color: 'var(--txt-bright)',
  },
  loadingBubble: {
    backgroundColor: 'var(--bg-dark)',
    border: '1px solid rgba(15,23,42,0.06)',
    borderRadius: '16px',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
  },
  loadingDot: {
    fontSize: '1.5rem',
    lineHeight: '1',
    animation: 'pulse 1s infinite alternate',
    marginRight: '4px',
    color: '#a855f7',
  },
  suggestionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
    marginTop: '16px',
  },
  suggestionCard: {
    background: 'rgba(255,255,255,0.65)',
    border: '1px solid rgba(15,23,42,0.08)',
    borderRadius: '12px',
    padding: '12px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  suggestionTitle: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  suggestionQuery: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--txt-bright)',
    margin: '6px 0',
  },
  suggestionDesc: {
    fontSize: '0.7rem',
    color: 'var(--txt-soft)',
  },
  inputArea: {
    padding: '20px 24px',
    backgroundColor: 'var(--bg-deep)',
    borderTop: '1px solid rgba(15,23,42,0.08)',
  },
  form: {
    display: 'flex',
    gap: '12px',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    border: '1px solid rgba(15,23,42,0.1)',
    borderRadius: '12px',
    padding: '14px 20px',
    color: 'var(--txt-bright)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    color: 'var(--txt-bright)',
    border: 'none',
    borderRadius: '12px',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
  },
  traceContainer: {
    marginTop: '12px',
    background: 'rgba(0,0,0,0.02)',
    border: '1px solid rgba(15,23,42,0.06)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  traceHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.02)',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    cursor: 'pointer',
    color: 'var(--txt-bright)',
    fontWeight: '700',
    fontSize: '0.75rem',
    letterSpacing: '0.5px',
  },
  traceHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  traceBody: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '280px',
    overflowY: 'auto',
  },
  node: {
    padding: '10px 16px',
  },
  nodeSummary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },
  nodeMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  serverBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    color: '#c084fc',
    border: '1px solid rgba(168, 85, 247, 0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '600',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  toolName: {
    fontFamily: 'monospace',
    fontWeight: '600',
    fontSize: '0.8rem',
    color: 'var(--txt-bright)',
  },
  nodeToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'var(--txt-soft)',
  },
  argSummary: {
    fontSize: '0.7rem',
    color: 'var(--txt-dim)',
    fontFamily: 'monospace',
    maxWidth: '220px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nodeDetails: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#07080b',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  detailSec: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '0.65rem',
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase',
  },
  pre: {
    fontSize: '0.7rem',
    color: 'var(--txt-soft)',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(255,255,255,0.01)',
    padding: '6px',
    borderRadius: '4px',
  },
  preOutput: {
    fontSize: '0.7rem',
    color: '#10b981',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(16, 185, 129, 0.02)',
    padding: '6px',
    borderRadius: '4px',
    whiteSpace: 'pre-wrap',
  }
};
