'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface MentorGuidanceData {
  scenario?: string;
  instruction?: string;
  verbosity?: 'short' | 'detailed';
}

function cleanName(text: string) {
  if (!text) return '';
  return text.replace(/_/g, ' ');
}

export default function MentorGuidanceWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<MentorGuidanceData>();

  return (
    <div style={{
      padding: '20px',
      background: '#121215',
      color: '#fef2f2',
      borderRadius: '12px',
      border: '1px solid #ef4444',
      fontFamily: "'Inter', system-ui, sans-serif",
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fca5a5', letterSpacing: '-0.01em' }}>
            🚨 CRITICAL OPERATIONAL GUIDANCE
          </h3>
          <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 500 }}>Immediate Senior Mentor Protocol</span>
        </div>

        <span style={{
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#fca5a5',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          fontSize: '10px',
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: '4px',
          textTransform: 'uppercase'
        }}>
          VERBOSITY: {data?.verbosity || 'short'}
        </span>
      </div>

      <div style={{
        background: '#18181b',
        borderRadius: '8px',
        padding: '14px',
        marginBottom: '16px',
        borderLeft: '3px solid #ef4444',
        border: '1px solid #27272a'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '6px' }}>
          ⚠️ DETECTED TELEMETRY BREACH
        </div>
        <div style={{ fontSize: '12px', lineHeight: '1.5', fontFamily: "'JetBrains Mono', monospace", color: '#fca5a5' }}>
          {cleanName(data?.scenario || 'Vibration: 5.0 mm/s (EXCEEDS 4.5) | Temp: 95C (EXCEEDS 90C)')}
        </div>
      </div>

      <div style={{
        background: '#7f1d1d',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '14px',
        border: '1px solid rgba(254, 202, 202, 0.2)'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#ffffff', marginBottom: '10px' }}>
          ACTION CHECKLIST (EXECUTE IMMEDIATELY)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>1</span>
            <strong>ACTIVATE EMERGENCY SHUTDOWN PUMP B IMMEDIATELY</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>2</span>
            <span>Notify Shift Lead & Maintenance Supervisor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>3</span>
            <span>Do NOT restart before physical bearing inspection</span>
          </div>
        </div>
      </div>
    </div>
  );
}
