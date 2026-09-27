'use client';
import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';
import { useEffect, useState } from 'react';

interface AuditTrail {
  avg_sentiment: number;
  base_score: number;
  velocity_adjustment: number;
  price_adjustment: number;
  final_score: number;
}

interface Signal {
  ticker: string;
  timestamp: string;
  price_reaction: string;
  signal_score: number;
  signal_direction: 'bullish' | 'bearish' | 'neutral';
  reasoning: string;
}

interface AssessSignalStrengthData {
  signal: Signal;
  audit_trail: AuditTrail;
}

function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '999px', fontSize: '11px',
      fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
      textTransform: 'uppercase' as const, letterSpacing: '0.5px',
      background: bg, color: fg,
    }}>{label}</span>
  );
}

function RadialGauge({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score]);

  const color = score >= 65 ? '#68d391' : score >= 35 ? '#f8a859' : '#fc8181';
  const cx = 90;
  const cy = 80;
  const radius = 70;
  const circumference = Math.PI * radius;
  const filled = (score / 100) * circumference;
  const dashoffset = circumference - filled;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="180" height="100" viewBox="0 0 180 100">
        {/* Background arc */}
        <path
          d={`M ${cx - radius},${cy} A ${radius},${radius} 0 0,1 ${cx + radius},${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={`M ${cx - radius},${cy} A ${radius},${radius} 0 0,1 ${cx + radius},${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
        {/* Score text */}
        <text x={cx} y={cy - 10} textAnchor="middle" fill="white" fontSize="32" fontWeight="800" fontFamily="'JetBrains Mono', monospace">
          {animatedScore}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="11" fontFamily="system-ui, sans-serif">
          / 100
        </text>
      </svg>
    </div>
  );
}

function AuditRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      <span style={{ fontSize: '13px', opacity: 0.7 }}>{label}</span>
      <span style={{
        fontSize: bold ? '15px' : '14px', fontWeight: bold ? 800 : 600,
        fontFamily: "'JetBrains Mono', monospace",
      }}>{value}</span>
    </div>
  );
}

export default function AssessSignalStrength() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const output = getToolOutput<AssessSignalStrengthData>();
  const isDark = theme === 'dark';

  if (!output) {
    return (
      <div style={{
        padding: '24px', textAlign: 'center', maxWidth: '600px', borderRadius: '16px',
        background: isDark ? 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      }}>Loading...</div>
    );
  }

  const { signal, audit_trail } = output;
  const dirConfig: Record<string, { bg: string; fg: string }> = {
    bullish: { bg: 'rgba(104,211,145,0.25)', fg: '#68d391' },
    bearish: { bg: 'rgba(252,129,129,0.25)', fg: '#fc8181' },
    neutral: { bg: 'rgba(160,174,192,0.25)', fg: '#a0aec0' },
  };
  const dc = dirConfig[signal.signal_direction] || dirConfig.neutral;

  return (
    <div style={{
      maxWidth: '600px', borderRadius: '16px', overflow: 'hidden',
      background: isDark ? 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white', fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '28px' }}>🎯</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Signal Strength Assessment</h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.7 }}>Combined signal scoring</p>
        </div>
      </div>

      <div style={{ padding: '0 24px 20px' }}>
        {/* Gauge */}
        <div style={{
          background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '20px',
          backdropFilter: 'blur(10px)', marginBottom: '12px', textAlign: 'center',
        }}>
          <RadialGauge score={signal.signal_score} />
          <div style={{ marginTop: '8px' }}>
            <Badge label={signal.signal_direction} bg={dc.bg} fg={dc.fg} />
          </div>
        </div>

        {/* Audit Trail */}
        <div style={{
          background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '16px 20px',
          backdropFilter: 'blur(10px)', marginBottom: '12px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', opacity: 0.8, marginBottom: '8px' }}>
            Score Breakdown
          </div>
          <AuditRow label="Avg Sentiment" value={audit_trail.avg_sentiment.toFixed(2)} />
          <AuditRow label="Base Score" value={audit_trail.base_score.toFixed(2)} />
          <AuditRow
            label="Velocity Adjustment"
            value={`${audit_trail.velocity_adjustment >= 0 ? '+' : ''}${audit_trail.velocity_adjustment.toFixed(2)}`}
          />
          <AuditRow
            label="Price Adjustment"
            value={`${audit_trail.price_adjustment >= 0 ? '+' : ''}${audit_trail.price_adjustment.toFixed(2)}`}
          />
          <div style={{ borderBottom: 'none' }}>
            <AuditRow label="Final Score" value={audit_trail.final_score.toFixed(2)} bold />
          </div>
        </div>

        {/* Reasoning */}
        <div style={{
          background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '16px 20px',
          backdropFilter: 'blur(10px)', marginBottom: '12px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', opacity: 0.8, marginBottom: '8px' }}>
            Reasoning
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', opacity: 0.9 }}>{signal.reasoning}</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 24px', borderTop: '1px solid rgba(255,255,255,0.1)',
        fontSize: '12px', opacity: 0.6, textAlign: 'center',
      }}>
        NitroSignal Analyst Agent
      </div>
    </div>
  );
}
