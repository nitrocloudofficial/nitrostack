'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface ProgressStep {
  stepNumber: number;
  stepTitle: string;
  progressPercent: number;
  status: string;
  detail: string;
}

interface ProgressData {
  taskId?: string;
  userId?: string;
  taskTitle?: string;
  selectedTool?: string;
  overallProgressPercent?: number;
  executionState?: string;
  steps?: ProgressStep[];
}

export default function AgenticProgressTrackerWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const data: ProgressData = rawData?.result || (rawData?.steps ? rawData : (rawData?.output || rawData || {}));
  const steps = Array.isArray(data?.steps) ? data.steps : [];

  if (!rawData || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        background: isDark ? '#1e293b' : '#f8fafc',
        color: isDark ? '#f1f5f9' : '#0f172a',
        borderRadius: '16px'
      }}>
        ⚡ Processing Agentic Action Progress Tracker...
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: isDark
        ? 'linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)'
        : 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
      borderRadius: '20px',
      color: isDark ? '#ffffff' : '#0f172a',
      maxWidth: '480px',
      boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '2px solid #6366f1'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>📈</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Agentic Action Progress Tracker</h3>
            <span style={{ fontSize: '11px', opacity: 0.75 }}>Task ID: {data?.taskId || 'TASK-88192'}</span>
          </div>
        </div>

        <span style={{
          background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
          color: 'white',
          fontSize: '11px',
          fontWeight: 800,
          padding: '4px 10px',
          borderRadius: '20px'
        }}>
          100% EXECUTED
        </span>
      </div>

      {/* Progress Bar Container */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
          <span>{data?.taskTitle || 'Autonomous Action Execution'}</span>
          <span style={{ color: '#6366f1' }}>{data?.overallProgressPercent || 100}%</span>
        </div>
        <div style={{
          width: '100%',
          height: '10px',
          background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${data?.overallProgressPercent || 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #6366f1, #10b981)',
            borderRadius: '10px',
            transition: 'width 0.5s ease-in-out'
          }} />
        </div>
      </div>

      {/* Step Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {steps.map((st) => (
          <div key={st.stepNumber} style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
            border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : '#cbd5e1'),
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Step {st.stepNumber}: {st.stepTitle}</span>
              <span style={{ color: '#10b981', fontSize: '11px' }}>{st.progressPercent}%</span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', opacity: 0.8 }}>
              {st.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
