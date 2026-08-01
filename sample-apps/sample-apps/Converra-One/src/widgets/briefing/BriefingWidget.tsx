'use client';

import React from 'react';

export interface BriefingWidgetProps {
  userName?: string;
  urgentCount?: number;
  tasksCount?: number;
  eventsCount?: number;
  suggestedFocus?: string;
  onViewPriority?: () => void;
}

export const BriefingWidget: React.FC<BriefingWidgetProps> = ({
  userName = 'Alex',
  urgentCount = 2,
  tasksCount = 3,
  eventsCount = 3,
  suggestedFocus = 'Review Prof. Vance Raft parameters before 3 PM call & approve PR #342 memory fix',
  onViewPriority
}) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '20px',
        padding: '24px 28px',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Subtle Gradient Pulse */}
      <div
        style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
          pointerEvents: 'none'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>☀️</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
              Good Morning, {userName}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Here is your AI-synthesized executive briefing for Saturday, July 25
            </p>
          </div>
        </div>

        {/* Agent Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            color: '#38bdf8',
            fontWeight: 600
          }}
        >
          <span>🤖 Synthesized by Summary Agent</span>
        </div>
      </div>

      {/* Grid Summary Highlights */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '20px'
        }}
      >
        <div
          onClick={onViewPriority}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '14px',
            padding: '14px 16px',
            cursor: 'pointer'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#f87171', textTransform: 'uppercase' }}>
            Urgent Messages
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#fef2f2', marginTop: '4px' }}>
            {urgentCount} <span style={{ fontSize: '12px', fontWeight: 400, color: '#fca5a5' }}>Action Needed</span>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '14px',
            padding: '14px 16px'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase' }}>
            Pending Tasks
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#f0f9ff', marginTop: '4px' }}>
            {tasksCount} <span style={{ fontSize: '12px', fontWeight: 400, color: '#bae6fd' }}>Extracted by AI</span>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '14px',
            padding: '14px 16px'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#c084fc', textTransform: 'uppercase' }}>
            Today Meetings
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#faf5ff', marginTop: '4px' }}>
            {eventsCount} <span style={{ fontSize: '12px', fontWeight: 400, color: '#e9d5ff' }}>No Conflicts</span>
          </div>
        </div>
      </div>

      {/* Suggested Focus Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px dashed rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <span style={{ fontSize: '20px' }}>🎯</span>
        <div style={{ flexGrow: 1 }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            AI Suggested Focus
          </span>
          <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#e2e8f0', fontWeight: 500 }}>
            {suggestedFocus}
          </p>
        </div>
      </div>
    </div>
  );
};
