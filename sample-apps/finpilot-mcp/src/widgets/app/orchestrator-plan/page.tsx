'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface OrchestrationStep {
  step: number;
  action: string;
  agent: string;
}

interface OrchestratorData {
  ticker: string;
  originalQuery: string;
  orchestrationPlan: OrchestrationStep[];
  status: string;
}

export default function OrchestratorWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<OrchestratorData>();

  if (!isReady || !data) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(226, 232, 240, 0.6)', fontFamily: 'system-ui' }}>
        <div style={{ fontSize: '14px' }}>Orchestrating agent analysis...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 100%)',
      padding: '32px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'rgb(226, 232, 240)',
      borderRadius: '24px',
      border: '1px solid rgba(148, 163, 184, 0.1)',
      boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)', paddingBottom: '24px' }}>
        <div style={{ 
          width: '48px', height: '48px', 
          background: 'rgba(99, 102, 241, 0.1)', 
          border: '1px solid rgba(99, 102, 241, 0.3)', 
          borderRadius: '12px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px'
        }}>
          🧠
        </div>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px 0' }}>Agent Orchestrator</h1>
          <div style={{ fontSize: '14px', color: 'rgba(226, 232, 240, 0.5)' }}>Planning multi-agent analysis for {data.ticker}</div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', color: 'rgba(226, 232, 240, 0.5)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>Query</div>
        <div style={{ fontSize: '16px', fontStyle: 'italic', color: 'rgba(226, 232, 240, 0.9)', paddingLeft: '12px', borderLeft: '3px solid rgba(99, 102, 241, 0.5)' }}>
          "{data.originalQuery}"
        </div>
      </div>

      <div>
        <div style={{ fontSize: '12px', color: 'rgba(226, 232, 240, 0.5)', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Execution Plan</div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.orchestrationPlan.map((step, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{
                width: '28px', height: '28px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: 'rgb(129, 140, 248)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '700'
              }}>
                {step.step}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(226, 232, 240, 0.9)', fontFamily: 'monospace' }}>
                  {step.action}
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'rgba(226, 232, 240, 0.7)'
              }}>
                {step.agent}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
