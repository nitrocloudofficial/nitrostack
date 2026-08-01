'use client';

import { useWidgetSDK, useWidgetState, useTheme } from '@nitrostack/widgets';

interface NotesData {
  subject: string;
  unit?: number;
  unitName?: string;
  summary: string;
  keyDefinitions: Array<{ term: string; definition: string }>;
  importantTopics: string[];
  examFlashcards: Array<{ question: string; answer: string }>;
  topic?: string;
  explanation?: string;
  keyPoints?: string[];
  codeExample?: string;
}

const DEMO_DATA: NotesData = {
  subject: 'Theory of Computation (CS505)',
  unit: 3,
  unitName: 'Context-Free Grammars & Pushdown Automata',
  summary: 'Unit 3 covers Context-Free Grammars (CFG), Chomsky Normal Form (CNF), Greibach Normal Form (GNF), and Pushdown Automata (PDA) including deterministic and non-deterministic variations.',
  keyDefinitions: [
    { term: 'Context-Free Grammar (CFG)', definition: 'A formal grammar in which every production rule is of the form A → α, where A is a single nonterminal and α is a string of terminals and/or nonterminals.' },
    { term: 'Pushdown Automaton (PDA)', definition: 'A finite automaton equipped with an infinite stack memory structure that reads top element and manipulates states.' },
    { term: 'Ambiguous Grammar', definition: 'A context-free grammar for which there exists a terminal string with more than one leftmost derivation or parse tree.' }
  ],
  importantTopics: [
    'Conversion of CFG to Chomsky Normal Form (CNF)',
    'Equivalence of Acceptance by Final State and Empty Stack in PDA',
    'Pumping Lemma for Context-Free Languages',
    'Closure Properties of Context-Free Languages'
  ],
  examFlashcards: [
    { question: 'Q1. What is the difference between NPDA and DPDA?', answer: 'NPDA is strictly more powerful than DPDA. NPDAs accept all CFLs, whereas DPDAs accept only Deterministic Context-Free Languages (DCFLs).' },
    { question: 'Q2. State Pumping Lemma for CFLs.', answer: 'If L is a CFL, there exists a constant p such that any string w ∈ L with |w| ≥ p can be written as w = uvxyz with |vy| ≥ 1, |vxy| ≤ p, and uv^i xy^i z ∈ L for all i ≥ 0.' }
  ]
};

export default function NotesViewer() {
  const theme = useTheme();
  const { getToolOutput, sendFollowUpMessage } = useWidgetSDK();
  const [activeTab, setActiveTab] = useWidgetState<'summary' | 'definitions' | 'flashcards'>('summary');

  const data = getToolOutput<NotesData>() ?? DEMO_DATA;

  const isDark = theme === 'dark';
  const bg = isDark ? '#0f0f1a' : '#f8f9ff';
  const card = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)';
  const text = isDark ? '#e8eaf6' : '#1a1a2e';
  const muted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,26,46,0.5)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)';

  return (
    <div style={{ background: bg, borderRadius: 20, overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif", color: text }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%)', padding: '20px 24px 16px' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>📝 SMART STUDY NOTES</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{data.subject}</div>
        {data.unit && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
            Unit {data.unit}: {data.unitName || 'Key Concepts'}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${border}`, background: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}>
        {[
          { key: 'summary', label: '📖 Overview' },
          { key: 'definitions', label: '🔑 Definitions' },
          { key: 'flashcards', label: '⚡ Flashcards' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            style={{
              flex: 1, padding: '11px 8px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: 'none', color: activeTab === t.key ? '#8f94fb' : muted,
              borderBottom: activeTab === t.key ? '2px solid #8f94fb' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content Body */}
      <div style={{ maxHeight: 380, overflowY: 'auto', padding: '16px 20px' }}>
        {/* Tab 1: Summary */}
        {activeTab === 'summary' && (
          <div>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginBottom: 14, lineHeight: 1.6, fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: '#8f94fb', marginBottom: 6 }}>Executive Summary</div>
              {data.summary || data.explanation}
            </div>

            {(data.importantTopics || data.keyPoints) && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8, letterSpacing: '0.05em' }}>IMPORTANT EXAM TOPICS</div>
                {(data.importantTopics || data.keyPoints || []).map((topic, i) => (
                  <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: '#8f94fb', fontWeight: 800 }}>•</span>
                    <span>{topic}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Definitions */}
        {activeTab === 'definitions' && (
          <div>
            {(data.keyDefinitions || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: muted }}>No key definitions available for this unit.</div>
            ) : (
              (data.keyDefinitions || []).map((def, i) => (
                <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#8f94fb', marginBottom: 4 }}>{def.term}</div>
                  <div style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>{def.definition}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Flashcards */}
        {activeTab === 'flashcards' && (
          <div>
            {(data.examFlashcards || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: muted }}>No flashcards generated for this unit.</div>
            ) : (
              (data.examFlashcards || []).map((fc, i) => (
                <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: text }}>{fc.question}</div>
                  <div style={{ fontSize: 12, color: muted, background: isDark ? 'rgba(255,255,255,0.03)' : '#f0f4ff', padding: '10px 12px', borderRadius: 8, lineHeight: 1.5 }}>
                    <strong style={{ color: '#8f94fb' }}>Answer: </strong>{fc.answer}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 20px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted }}>
        <span>🎓 CampusPilot AI Notes Engine</span>
        <button
          onClick={() => {
            if (typeof sendFollowUpMessage === 'function') {
              try { sendFollowUpMessage(`Generate 5 viva quiz questions based on ${data.subject}`); } catch (err) { console.log(err); }
            }
          }}
          style={{ background: 'none', border: 'none', color: '#8f94fb', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
        >
          Quiz Me on This →
        </button>
      </div>
    </div>
  );
}
