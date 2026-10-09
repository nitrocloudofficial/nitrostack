'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Example widget demonstrating NitroStack Widget SDK
 * This widget is fully compatible with OpenAI ChatGPT
 */

interface CalculatorData {
  operation: string;
  a: number;
  b: number;
  result: number;
  expression: string;
}

export default function CalculatorResult() {
  // Use Widget SDK hooks
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ viewMode: 'compact' | 'detailed' }>(() => ({
    viewMode: 'detailed'
  }));

  // Access tool output from Widget SDK
  const data = getToolOutput<CalculatorData>();

  if (!data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Loading...
      </div>
    );
  }

  const getOperationColor = (op: string) => {
    const colors: Record<string, string> = {
      add: '#10b981',
      subtract: '#f59e0b',
      multiply: '#3b82f6',
      divide: '#8b5cf6'
    };
    return colors[op] || '#6b7280';
  };

  const getOperationIcon = (op: string) => {
    const icons: Record<string, string> = {
      add: '➕',
      subtract: '➖',
      multiply: '✖️',
      divide: '➗'
    };
    return icons[op] || '🔢';
  };

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';

  return (
    <div style={{
      padding: '24px',
      background: isDark
        ? 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      color: 'white',
      maxWidth: '400px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      transition: 'all 0.3s ease',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>
            {getOperationIcon(data.operation)}
          </span>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', opacity: 0.9 }}>
              Calculator Result
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.7 }}>
              {data.operation.charAt(0).toUpperCase() + data.operation.slice(1)}
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <button
          onClick={() => setState({
            viewMode: state?.viewMode === 'compact' ? 'detailed' : 'compact'
          })}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.2s',
          }}
        >
          {state?.viewMode === 'compact' ? '📊 Detailed' : '📋 Compact'}
        </button>
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        padding: '20px',
        backdropFilter: 'blur(10px)',
        marginBottom: '16px'
      }}>
        <div style={{
          fontSize: '28px',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '12px',
          fontFamily: 'monospace'
        }}>
          {data.expression}
        </div>

        {state?.viewMode === 'detailed' && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            fontSize: '14px',
            opacity: 0.9,
            marginTop: '16px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>First</div>
              <div style={{ fontWeight: 'bold', fontSize: '20px' }}>{data.a}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>Second</div>
              <div style={{ fontWeight: 'bold', fontSize: '20px' }}>{data.b}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>Result</div>
              <div style={{
                fontWeight: 'bold',
                fontSize: '24px',
                color: '#fbbf24'
              }}>
                {data.result}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{
        fontSize: '12px',
        textAlign: 'center',
        opacity: 0.7,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>✨ NitroStack Calculator</span>
        <span style={{ fontSize: '10px' }}>
          Theme: {theme || 'light'} | Mode: {state?.viewMode || 'detailed'}
        </span>
      </div>
    </div>
  );
}
