import React, { useState } from 'react';
import { Send, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Clock, Terminal, BookOpen, Sparkles, Layers, FileText } from 'lucide-react';

interface ToolTraceItem {
  step: number;
  tool_name: string;
  input: any;
  output: any;
  duration_ms: number;
}

interface CitationItem {
  segment_id: string;
  speaker: string;
  content: string;
  source_name: string;
}

interface QueryResponse {
  answer: string;
  is_refusal: boolean;
  tool_trace: ToolTraceItem[];
  citations: CitationItem[];
  highlight_decision_ids: string[];
}

interface ChatQueryViewProps {
  onQueryComplete: (response: QueryResponse) => void;
}

export const ChatQueryView: React.FC<ChatQueryViewProps> = ({ onQueryComplete }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [showTrace, setShowTrace] = useState(true);
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);
  const [citationDetails, setCitationDetails] = useState<any | null>(null);
  const [fetchingCitation, setFetchingCitation] = useState(false);

  const presetQuestions = [
    "Why did we pick Stripe over Adyen?",
    "What are we using for session caching, Redis or Memcached?",
    "Are we still using PostgreSQL, or did that change?",
    "Why did we pick Vercel over Netlify?"
  ];

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;
    setQuestion(queryText);
    setLoading(true);
    setResponse(null);
    setExpandedCitation(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText })
      });
      const data: QueryResponse = await res.json();
      setResponse(data);
      onQueryComplete(data);
    } catch (err) {
      console.error('Failed to execute query:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCitationClick = async (segmentId: string) => {
    if (expandedCitation === segmentId) {
      setExpandedCitation(null);
      setCitationDetails(null);
      return;
    }

    setExpandedCitation(segmentId);
    setFetchingCitation(true);
    try {
      const res = await fetch(`/api/segments/${segmentId}/context?window=2`);
      const data = await res.json();
      setCitationDetails(data);
    } catch (err) {
      console.error('Failed to fetch segment context:', err);
    } finally {
      setFetchingCitation(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }} className="fade-in">
      {/* Preset Demo Buttons */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          💡 Presets (Click to Test Live Pitch Questions):
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleQuery(q)}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '8px 14px',
                color: 'var(--text-secondary)',
                fontSize: '12.5px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <Sparkles size={13} color="var(--accent-cyan)" />
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Query Search Bar */}
      <div className="glass-card" style={{ padding: '8px 16px 8px 20px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuery(question)}
          placeholder="Ask any architectural decision, rationale, or verification question..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontSize: '15px',
            fontFamily: 'var(--font-sans)',
            padding: '8px 0'
          }}
        />
        <button
          onClick={() => handleQuery(question)}
          disabled={loading || !question.trim()}
          style={{
            background: loading ? 'var(--bg-secondary)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: loading ? 'none' : '0 4px 15px rgba(0, 242, 254, 0.3)'
          }}
        >
          {loading ? (
            <>
              <Clock size={16} className="pulse-glow" />
              Investigating...
            </>
          ) : (
            <>
              <Send size={15} />
              Ask Agent
            </>
          )}
        </button>
      </div>

      {/* Loading Pulse Bar */}
      {loading && (
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
          <Sparkles size={28} color="var(--accent-cyan)" className="pulse-glow" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Autonomous Agent Investigation in Progress...
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Querying vector indexes, tracing decision graph edges, and evaluating grounded transcript evidence.
          </p>
        </div>
      )}

      {/* Agent Response Container */}
      {response && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Live Agent Investigation Trace Panel (THE WOW MOMENT) */}
          <div className="glass-card" style={{ padding: '16px 20px' }}>
            <div
              onClick={() => setShowTrace(!showTrace)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Terminal size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.2px' }}>
                  Agent's Multi-Step Investigation Tool Trace ({response.tool_trace.length} Steps)
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {response.tool_trace.reduce((acc, t) => acc + t.duration_ms, 0)}ms total
                </span>
                {showTrace ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {showTrace && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {response.tool_trace.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(10, 13, 20, 0.6)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      borderLeft: '3px solid var(--accent-cyan)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          background: 'rgba(0, 242, 254, 0.15)',
                          color: 'var(--accent-cyan)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          STEP {step.step}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                          {step.tool_name}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {step.duration_ms}ms
                      </span>
                    </div>

                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      <strong>Input:</strong> {JSON.stringify(step.input)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Final Rendered Answer Card */}
          <div
            className="glass-card"
            style={{
              padding: '24px',
              borderColor: response.is_refusal ? 'rgba(255, 183, 3, 0.4)' : 'var(--border-color-glow)',
              background: response.is_refusal ? 'rgba(255, 183, 3, 0.03)' : 'var(--bg-card)'
            }}
          >
            {/* Header Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              {response.is_refusal ? (
                <>
                  <AlertTriangle size={20} color="var(--accent-gold)" />
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--accent-gold)',
                    background: 'rgba(255, 183, 3, 0.15)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    letterSpacing: '0.5px'
                  }}>
                    GROUNDED REFUSAL PROTOCOL TRIGGERED
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} color="var(--accent-green)" />
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--accent-green)',
                    background: 'rgba(0, 245, 212, 0.15)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    letterSpacing: '0.5px'
                  }}>
                    VERIFIED EVIDENCE ANSWER
                  </span>
                </>
              )}
            </div>

            {/* Answer Text */}
            <div style={{ fontSize: '15px', lineHeight: '1.7', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', marginBottom: '20px' }}>
              {response.answer}
            </div>

            {/* Inline Citations Accordion Section */}
            {response.citations.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
                  📌 Grounded Transcript Citations (Click to Expand Context):
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {response.citations.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleCitationClick(c.segment_id)}
                      style={{
                        background: expandedCitation === c.segment_id ? 'var(--accent-blue)' : 'rgba(255, 255, 255, 0.05)',
                        color: expandedCitation === c.segment_id ? '#ffffff' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 600
                      }}
                    >
                      <BookOpen size={13} />
                      Citation [{c.speaker || 'Speaker'} - {c.source_name}]
                    </button>
                  ))}
                </div>

                {/* Citation Expanded Context Drawer */}
                {expandedCitation && (
                  <div
                    style={{
                      marginTop: '14px',
                      background: 'rgba(10, 13, 20, 0.8)',
                      border: '1px solid var(--accent-blue)',
                      borderRadius: '10px',
                      padding: '16px'
                    }}
                    className="fade-in"
                  >
                    <h4 style={{ fontSize: '13px', color: 'var(--accent-cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={15} />
                      Surrounding Conversation Context Window (Segment ID: {expandedCitation.slice(0, 8)}...)
                    </h4>

                    {fetchingCitation ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fetching transcript lines...</p>
                    ) : citationDetails ? (
                      <div>
                        <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#ffffff', background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '6px', marginBottom: '10px' }}>
                          <strong>Target Segment:</strong> "{citationDetails.target_segment?.content}"
                        </div>
                        {citationDetails.context_before?.length > 0 && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                            <strong>Before:</strong> {citationDetails.context_before.map((b: any) => `${b.speaker}: "${b.content}"`).join(' | ')}
                          </div>
                        )}
                        {citationDetails.context_after?.length > 0 && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            <strong>After:</strong> {citationDetails.context_after.map((a: any) => `${a.speaker}: "${a.content}"`).join(' | ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No additional context found.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
