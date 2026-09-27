'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface GatewayData {
  status?: string;
  selectedProvider?: string;
  modelName?: string;
  apiKeyStatus?: string;
  multiProviderFallbacksEnabled?: boolean;
  latencyMs?: number;
  activeCapabilities?: string[];
  gatewayNotice?: string;
}

export default function ExternalAiGatewayWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const data: GatewayData = rawData?.result || (rawData?.selectedProvider ? rawData : (rawData?.output || rawData || {}));

  if (!rawData || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        background: isDark ? '#1e293b' : '#f8fafc',
        color: isDark ? '#f1f5f9' : '#0f172a',
        borderRadius: '16px'
      }}>
        🤖 Connecting External Multi-Model AI Provider Gateway...
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: isDark
        ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
        : 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)',
      borderRadius: '20px',
      color: isDark ? '#ffffff' : '#0f172a',
      maxWidth: '480px',
      boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '2px solid #8b5cf6'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🔑</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>External AI Model Gateway</h3>
            <span style={{ fontSize: '11px', opacity: 0.75 }}>Model: {data?.modelName || 'gpt-4o-2026'}</span>
          </div>
        </div>

        <span style={{
          background: '#8b5cf6',
          color: 'white',
          fontSize: '11px',
          fontWeight: 800,
          padding: '4px 10px',
          borderRadius: '20px'
        }}>
          CONNECTED
        </span>
      </div>

      {/* Provider Details Card */}
      <div style={{
        background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
        border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'),
        padding: '12px',
        borderRadius: '12px',
        marginBottom: '14px',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span>Provider: <strong>{data?.selectedProvider}</strong></span>
          <span style={{ color: '#10b981', fontWeight: 700 }}>Latency: {data?.latencyMs || 142}ms</span>
        </div>
        <div style={{ fontSize: '11px', opacity: 0.8 }}>
          API Key Status: <strong style={{ color: '#10b981' }}>{data?.apiKeyStatus}</strong> • Auto-Fallback: <strong>{data?.multiProviderFallbacksEnabled ? 'ENABLED' : 'DISABLED'}</strong>
        </div>
      </div>

      {/* Capabilities List */}
      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700 }}>Active Agentic Capabilities:</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        {(data?.activeCapabilities || ['Multi-Modal Reasoning', 'Structured JSON Output', 'Tool Calling']).map((cap, idx) => (
          <span key={idx} style={{
            background: isDark ? 'rgba(139, 92, 246, 0.15)' : '#ede9fe',
            color: isDark ? '#c4b5fd' : '#6d28d9',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 8px',
            borderRadius: '8px'
          }}>
            ✓ {cap}
          </span>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: '11px', opacity: 0.8, fontStyle: 'italic' }}>
        💡 {data?.gatewayNotice || 'External AI Gateway connected for multi-model inference.'}
      </p>
    </div>
  );
}
