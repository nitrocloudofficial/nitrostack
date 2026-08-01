'use client';

import React from 'react';
import { MOCK_AGENT_LOGS, AgentExecutionLog } from '../mockData';

export interface AgentActivityWidgetProps {
  logs?: AgentExecutionLog[];
}

export const AgentActivityWidget: React.FC<AgentActivityWidgetProps> = ({
  logs = MOCK_AGENT_LOGS
}) => {
  return (
    <div
      style={{
        background: 'rgba(19, 25, 39, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🤖</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
              Multi-Agent Intelligence Execution Stream
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Live execution pipeline & MCP tool traces across specialized AI agents
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 10px #38bdf8', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>Active Workflow</span>
        </div>
      </div>

      {/* Execution Step Flow */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {logs.map((log, index) => (
          <div
            key={log.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              padding: '12px 16px',
              transition: 'background 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                {index + 1}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                    {log.agentName}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                    • {log.action}
                  </span>
                  {log.mcpTool && (
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '1px 6px', borderRadius: '4px' }}>
                      {log.mcpTool}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  {log.details}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: '#10b981', fontFamily: 'monospace', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                ⚡ {log.durationMs}ms
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {log.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
