'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface ExpertDispatch {
  expertName: string;
  status: string;
  findings: string;
}

interface MoERouterData {
  userQuery?: string;
  detectedLocation?: string;
  moeRoutingResult?: {
    primaryCategory: string;
    confidenceScore: number;
    dispatchedExpertsCount: number;
    expertDispatches: ExpertDispatch[];
  };
  recommendedDirective?: string;
}

export default function MoERouterWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const data: MoERouterData = rawData?.result || (rawData?.moeRoutingResult ? rawData : (rawData?.output || rawData || {}));
  const res = data?.moeRoutingResult;
  const experts = Array.isArray(res?.expertDispatches) ? res.expertDispatches : [];

  if (!rawData || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        background: isDark ? '#0f172a' : '#f8fafc',
        color: isDark ? '#f1f5f9' : '#0f172a',
        borderRadius: '16px'
      }}>
        🤖 Orchestrating Mixture-of-Experts (MoE) Agents...
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: isDark
        ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
        : 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
      borderRadius: '20px',
      color: isDark ? '#ffffff' : '#0f172a',
      maxWidth: '480px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '1px solid ' + (isDark ? 'rgba(99, 102, 241, 0.3)' : '#cbd5e1')
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            padding: '8px 12px',
            borderRadius: '12px',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            🧠
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Agentic MoE Decision Engine</h3>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>Multi-Intent Routing • Confidence: {Math.round((res?.confidenceScore || 0.95) * 100)}%</span>
          </div>
        </div>

        <span style={{
          background: 'rgba(99, 102, 241, 0.15)',
          color: '#6366f1',
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: '20px'
        }}>
          {experts.length} Experts Active
        </span>
      </div>

      {/* Patient Query Banner */}
      <div style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
        border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
        padding: '10px 12px',
        borderRadius: '12px',
        marginBottom: '14px',
        fontSize: '12px'
      }}>
        <strong style={{ color: '#6366f1' }}>User Query:</strong> "{data?.userQuery || 'Medical query'}"
      </div>

      {/* Experts Dispatch Grid */}
      <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700 }}>Dispatched Expert Agents</h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
        {experts.map((exp, idx) => (
          <div key={idx} style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
            borderLeft: '4px solid ' + (exp?.status === 'ACTIVE_WARNING' ? '#ef4444' : '#10b981'),
            padding: '10px 12px',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>
              <span>{exp?.expertName}</span>
              <span style={{
                fontSize: '10px',
                color: exp?.status === 'ACTIVE_WARNING' ? '#ef4444' : '#10b981'
              }}>
                {exp?.status}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11px', opacity: 0.85 }}>
              {exp?.findings}
            </p>
          </div>
        ))}
      </div>

      {/* Recommended Action Plan */}
      <div style={{
        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: 'white',
        padding: '12px',
        borderRadius: '12px',
        fontSize: '12px'
      }}>
        <strong>⚡ MoE Recommended Emergency Directive:</strong>
        <p style={{ margin: '4px 0 0 0', lineHeight: 1.4 }}>
          {data?.recommendedDirective || 'Proceed with standard pre-authorization verification.'}
        </p>
      </div>
    </div>
  );
}
