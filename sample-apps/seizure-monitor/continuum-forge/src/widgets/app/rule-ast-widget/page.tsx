'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface RuleAstCondition {
  parameter: string;
  operator: string;
  threshold: number | string;
}

interface RuleAstData {
  operator?: string;
  conditions?: RuleAstCondition[];
  action?: string;
  ruleStr?: string;
  rawRule?: any;
}

function cleanName(text: string) {
  if (!text) return '';
  return text.replace(/_/g, ' ');
}

export default function RuleAstWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<RuleAstData>();

  let rule: RuleAstData | null = rawData || null;
  if (rawData?.rawRule) {
    rule = typeof rawData.rawRule === 'string' ? JSON.parse(rawData.rawRule) : rawData.rawRule;
  } else if (rawData?.ruleStr) {
    try { rule = JSON.parse(rawData.ruleStr); } catch { rule = rawData; }
  }

  const conditions = rule?.conditions || [
    { parameter: 'vibration (mm/s)', operator: '>', threshold: 4.5 },
    { parameter: 'temperature (C)', operator: '>', threshold: 90 }
  ];
  const operator = rule?.operator || 'AND';
  const action = rule?.action || 'SHUTDOWN';

  return (
    <div style={{
      padding: '16px',
      background: '#121215',
      color: '#f4f4f5',
      borderRadius: '10px',
      border: '1px solid #27272a',
      fontFamily: "'Inter', system-ui, sans-serif",
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#60a5fa' }}>
            ⚡ Structured JSON AST Rule
          </div>
          <div style={{ fontSize: '11px', color: '#71717a' }}>Grounded Rule Logic</div>
        </div>

        <span style={{
          background: '#ef4444',
          color: '#ffffff',
          padding: '3px 10px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase'
        }}>
          ACTION: {action}
        </span>
      </div>

      <div style={{
        background: '#18181b',
        borderRadius: '8px',
        padding: '12px',
        border: '1px solid #27272a'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid #27272a'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>
            LOGICAL OPERATOR
          </span>
          <span style={{
            background: '#27272a',
            color: '#60a5fa',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            {operator}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {conditions.map((cond, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              background: '#121215',
              padding: '8px 12px',
              borderRadius: '6px',
              borderLeft: '3px solid #3b82f6'
            }}>
              <span style={{
                fontWeight: 500,
                fontFamily: "'JetBrains Mono', monospace",
                color: '#93c5fd',
                fontSize: '12px'
              }}>
                {cleanName(cond.parameter)}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: '#27272a',
                  color: '#f4f4f5',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  fontSize: '11px'
                }}>
                  {cond.operator}
                </span>
                <span style={{
                  fontWeight: 700,
                  color: '#fbbf24',
                  fontSize: '13px',
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {cond.threshold}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
