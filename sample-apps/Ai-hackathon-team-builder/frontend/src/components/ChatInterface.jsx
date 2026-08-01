import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Zap, Terminal, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ChatInterface({ onNavigateToDashboard }) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "👋 Hi! I'm Titan AI, your hackathon team builder assistant powered by MCP. I can search student profiles, evaluate team compatibility, identify missing skills, and build your 3-day hackathon task plan.\n\nTry asking me: *'Find backend developers with Node.js skills'* or *'Check compatibility for my team'*!",
      executed_tools: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || loading) return;

    const userMsg = {
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: queryText })
      });
      const data = await res.json();

      const botMsg = {
        sender: 'bot',
        text: data.reply || "Unable to parse request.",
        executed_tools: data.executed_tools || [],
        data: data.data || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: "⚠️ Couldn't connect to backend server. Make sure `node backend/server.js` is running!",
        executed_tools: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "🔍 Find Node.js & React developers",
    "🎯 Calculate Team Compatibility Score",
    "👥 Assign Roles for my Team",
    "🛠️ Analyze Missing Skill Gaps",
    "📅 Generate 3-Day Hackathon Task Plan",
    "📊 How many total candidates in roster?"
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>MCP Orchestrator Active</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>— 6 Backend Tools Wired</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="badge badge-indigo"><Terminal size={12} /> register_student</span>
          <span className="badge badge-cyan"><Terminal size={12} /> find_students</span>
          <span className="badge badge-emerald"><Terminal size={12} /> compatibility_score</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="glass-panel" style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '16px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {msg.sender === 'bot' ? (
                <>
                  <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={14} color="#fff" />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>Titan AI</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>You</span>
                  <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={14} color="#67e8f9" />
                  </div>
                </>
              )}
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{msg.timestamp}</span>
            </div>

            {/* Message Bubble */}
            <div style={{
              background: msg.sender === 'user' ? 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' : 'rgba(30, 41, 59, 0.7)',
              border: msg.sender === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding: '14px 18px',
              color: '#fff',
              fontSize: '0.94rem',
              lineHeight: '1.6',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              whiteSpace: 'pre-line'
            }}>
              {msg.text}
            </div>

            {/* Executed Tools Badge Log */}
            {msg.executed_tools && msg.executed_tools.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {msg.executed_tools.map((t, i) => (
                  <span key={i} className="badge badge-amber" style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
                    <Zap size={11} /> Executed Tool: <strong style={{ marginLeft: '4px' }}>{t.tool}</strong>
                  </span>
                ))}
              </div>
            )}

            {/* Interactive Data Card Widget */}
            {msg.data && msg.data.type === 'compatibility' && (
              <div style={{ marginTop: '12px', width: '100%', padding: '16px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#a5b4fc' }}>Compatibility Breakdown</span>
                  <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={onNavigateToDashboard}>
                    View Dashboard <ArrowRight size={12} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>{msg.data.score.skill_match}%</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Skill Match</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>{msg.data.score.availability_match}%</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Availability</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#c084fc' }}>{msg.data.score.interest_match}%</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Interest</div>
                  </div>
                  <div style={{ background: 'rgba(99,102,241,0.15)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.4)' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#818cf8' }}>{msg.data.score.overall}%</div>
                    <div style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 700 }}>Overall</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={14} color="#fff" />
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <span className="animate-pulse-glow" style={{ color: 'var(--accent-cyan)' }}>Orchestrating MCP tools...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
        {quickPrompts.map((qp, idx) => (
          <button key={idx} className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '6px 14px', whiteSpace: 'nowrap', borderRadius: '20px' }} onClick={() => handleSend(qp)}>
            {qp}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Ask Titan AI to search students, score compatibility, or assign roles..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0 24px' }} disabled={loading}>
          <Send size={18} />
          Send
        </button>
      </form>

    </div>
  );
}
