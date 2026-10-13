'use client';

import { useWidgetSDK, useWidgetState, useTheme } from '@nitrostack/widgets';

interface QuizQuestion {
  question: string;
  options?: string[];
  correctAnswer?: string;
  hint?: string;
  explanation?: string;
}

interface QuizData {
  quizTitle: string;
  subject: string;
  type: string;
  totalQuestions: number;
  questions: QuizQuestion[];
  studyAdvice?: string;
}

const DEMO_DATA: QuizData = {
  quizTitle: 'DBMS & SQL Viva Prep Quiz',
  subject: 'Database Management Systems (CS501)',
  type: 'viva',
  totalQuestions: 4,
  questions: [
    {
      question: 'Q1. What is the difference between 3NF and BCNF?',
      hint: 'Think about determinant functional dependencies (X → Y).',
      explanation: 'BCNF requires every determinant X in a non-trivial functional dependency X → Y to be a super key. 3NF allows Y to be a prime attribute even if X is not a super key.'
    },
    {
      question: 'Q2. Explain ACID properties in DBMS.',
      hint: 'Atomicity, Consistency, Isolation, Durability.',
      explanation: 'Atomicity ensures all-or-nothing execution. Consistency maintains database invariants. Isolation prevents concurrent transaction interference. Durability guarantees committed changes persist.'
    },
    {
      question: 'Q3. What is a Deadlock in DBMS and how is it prevented?',
      hint: 'Wait-for graphs, Wait-Die, Wound-Wait algorithms.',
      explanation: 'A deadlock occurs when two or more transactions indefinitely wait for locks held by each other. Prevention techniques include Wait-Die (non-preemptive) and Wound-Wait (preemptive) schemes.'
    },
    {
      question: 'Q4. What is the purpose of indexing in relational databases?',
      hint: 'B-Trees and B+ Trees query optimization.',
      explanation: 'Indexes optimize query execution speed by reducing disk I/O. B+ Trees are commonly used to support efficient range queries and point lookups.'
    }
  ],
  studyAdvice: 'Focus on Normalization theory, Transaction isolation levels, and B+ Tree indexing for viva exams!'
};

export default function QuizView() {
  const theme = useTheme();
  const { getToolOutput, sendFollowUpMessage } = useWidgetSDK();
  const [revealed, setRevealed] = useWidgetState<Record<number, boolean>>({});

  const data = getToolOutput<QuizData>() ?? DEMO_DATA;

  const isDark = theme === 'dark';
  const bg = isDark ? '#0f0f1a' : '#f8f9ff';
  const card = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)';
  const text = isDark ? '#e8eaf6' : '#1a1a2e';
  const muted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,26,46,0.5)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)';

  const toggleReveal = (idx: number) => {
    setRevealed(prev => ({ ...prev, [idx]: !prev?.[idx] }));
  };

  return (
    <div style={{ background: bg, borderRadius: 20, overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif", color: text }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', padding: '20px 24px 16px' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>❓ VIVA & QUIZ GENERATOR</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{data.quizTitle || data.subject}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
          {data.questions.length} Questions · Type: {data.type.toUpperCase()}
        </div>
      </div>

      {/* Study Advice Banner */}
      {data.studyAdvice && (
        <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#e6fff0', borderBottom: `1px solid ${border}`, padding: '10px 18px', fontSize: 12, color: isDark ? '#38ef7d' : '#0e7054' }}>
          💡 <strong>Pro Tip:</strong> {data.studyAdvice}
        </div>
      )}

      {/* Questions List */}
      <div style={{ maxHeight: 380, overflowY: 'auto', padding: '16px 20px' }}>
        {data.questions.map((q, i) => {
          const isRevealed = revealed?.[i];
          return (
            <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: text }}>
                {q.question}
              </div>

              {q.hint && (
                <div style={{ fontSize: 11, color: muted, marginBottom: 8, fontStyle: 'italic' }}>
                  💡 Hint: {q.hint}
                </div>
              )}

              <button
                onClick={() => toggleReveal(i)}
                style={{
                  background: isRevealed ? 'rgba(56,239,125,0.15)' : (isDark ? 'rgba(255,255,255,0.08)' : '#eef2ff'),
                  color: isRevealed ? '#38ef7d' : '#333',
                  border: `1px solid ${isRevealed ? '#38ef7d' : border}`,
                  borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  marginBottom: isRevealed ? 8 : 0, transition: 'all 0.2s',
                }}
              >
                {isRevealed ? '🙈 Hide Answer' : '👁️ Reveal Model Answer'}
              </button>

              {isRevealed && (
                <div style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f7ff',
                  border: `1px solid ${border}`, borderRadius: 8, padding: '10px 12px', fontSize: 12,
                  color: text, lineHeight: 1.5, marginTop: 6,
                }}>
                  <strong style={{ color: '#11998e' }}>Answer: </strong>
                  {q.explanation || q.correctAnswer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 20px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted }}>
        <span>🎓 CampusPilot Quiz Engine</span>
        <button
          onClick={() => {
            if (typeof sendFollowUpMessage === 'function') {
              try { sendFollowUpMessage(`Generate 5 more advanced viva questions on ${data.subject}`); } catch (err) { console.log(err); }
            }
          }}
          style={{ background: 'none', border: 'none', color: '#11998e', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
        >
          More Questions ↻
        </button>
      </div>
    </div>
  );
}
