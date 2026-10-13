'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { Code2, Clock, CheckCircle, ChevronRight, Lightbulb, PlayCircle, Building } from 'lucide-react';

interface Problem {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  pattern: string;
  companies: string[];
  acceptanceRate: number;
  estimatedMinutes: number;
  frequency: string;
  statement: string;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
}

interface RecommendOutput {
  filters_applied: any;
  question: Problem;
  recommendation_reason: string;
}

export default function QuestionCardWidget() {
  const { getToolOutput, sendFollowUpMessage, isReady } = useWidgetSDK();
  const data = getToolOutput<RecommendOutput>();

  if (!isReady || !data) {
    return <div style={{ padding: '24px', color: '#fff', textAlign: 'center' }}>Loading question...</div>;
  }

  const q = data.question;

  const bgColors = {
    easy: 'rgba(34, 197, 94, 0.15)',
    medium: 'rgba(245, 158, 11, 0.15)',
    hard: 'rgba(239, 68, 68, 0.15)',
  };
  const textColors = {
    easy: '#4ade80',
    medium: '#fbbf24',
    hard: '#f87171',
  };

  return (
    <div style={{
      padding: '0',
      background: '#0f172a',
      borderRadius: '16px',
      border: '1px solid #1e293b',
      color: 'white',
      width: '100%',
      maxWidth: '800px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '600' }}>{q.title}</h2>
            <span style={{
              background: bgColors[q.difficulty],
              color: textColors[q.difficulty],
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              {q.difficulty}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Code2 size={14} /> {q.topic} • {q.pattern}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {q.estimatedMinutes} mins</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} /> {q.acceptanceRate}% Acc</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '24px' }}>
        {/* AI Reason */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          borderLeft: '3px solid #3b82f6',
          padding: '12px 16px',
          borderRadius: '4px 8px 8px 4px',
          fontSize: '14px',
          color: '#cbd5e1',
          marginBottom: '24px'
        }}>
          <strong style={{ color: '#60a5fa' }}>AI Selection:</strong> {data.recommendation_reason}
        </div>

        <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#e2e8f0', whiteSpace: 'pre-wrap', marginBottom: '24px' }}>
          {q.statement}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#f8fafc' }}>Examples</h3>
          {q.examples.map((ex, i) => (
            <div key={i} style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', marginBottom: '12px', fontFamily: 'monospace', fontSize: '13px' }}>
              <div><strong style={{ color: '#94a3b8' }}>Input:</strong> {ex.input}</div>
              <div style={{ marginTop: '8px' }}><strong style={{ color: '#94a3b8' }}>Output:</strong> {ex.output}</div>
              {ex.explanation && <div style={{ marginTop: '8px', color: '#cbd5e1' }}><strong style={{ color: '#94a3b8' }}>Explanation:</strong> {ex.explanation}</div>}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#f8fafc' }}>Constraints</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '14px', fontFamily: 'monospace' }}>
            {q.constraints.map((c, i) => <li key={i} style={{ marginBottom: '6px' }}>{c}</li>)}
          </ul>
        </div>
        
        {/* Tags */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#1e293b', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', color: '#94a3b8' }}>
             <Building size={12} /> {q.companies.join(', ')}
          </div>
          <div style={{ background: '#1e293b', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', color: '#94a3b8' }}>
             Freq: {q.frequency}
          </div>
        </div>

        {/* Action Bar */}
        <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #1e293b', paddingTop: '24px' }}>
          <button
            onClick={() => sendFollowUpMessage(`Give me hint 1 for ${q.id}`).catch(err => console.warn('sendFollowUpMessage ignored in preview', err))}
            style={{
              flex: 1, padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid #334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '500'
            }}
          >
            <Lightbulb size={16} /> Get Hint
          </button>
          <a
            href={`https://leetcode.com/problems/${q.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid #334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '500', textDecoration: 'none'
            }}
          >
            <Code2 size={16} /> Solve on LeetCode
          </a>
          <button
            onClick={() => sendFollowUpMessage(`I'm done with this one. Give me the next problem.`).catch(err => console.warn('sendFollowUpMessage ignored in preview', err))}
            style={{
              flex: 1, padding: '12px', borderRadius: '8px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '500'
            }}
          >
            Next Problem <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
