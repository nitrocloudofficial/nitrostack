'use client';

import React from 'react';
import { DepartmentDrift, TelemetrySignal, StrategicBaseline } from '../data/mockData';

interface DepartmentDrawerProps {
  department: DepartmentDrift | null;
  onClose: () => void;
  telemetries: TelemetrySignal[];
  onTriggerNudge: (deptName: string, baselineTitle: string) => void;
  baselines: StrategicBaseline[];
  onShowToast: (msg: string) => void;
}

export const DepartmentDrawer: React.FC<DepartmentDrawerProps> = ({
  department,
  onClose,
  telemetries,
  onTriggerNudge,
  baselines,
  onShowToast,
}) => {
  if (!department) return null;

  const deptTelemetries = telemetries.filter((t) => {
    const deptName = department.name.toLowerCase();
    const sigDept = t.department.toLowerCase();
    return deptName === sigDept ||
           deptName.includes(sigDept) ||
           sigDept.includes(deptName) ||
           (deptName.includes('legal') && sigDept.includes('legal'));
  });

  const primarySignal = deptTelemetries.find(t => t.severity === 'High') || deptTelemetries[0];
  
  const matchedBaseline = primarySignal 
    ? baselines.find(b => b.title === primarySignal.matchedBaselineTitle || b.id === primarySignal.matchedBaselineId)
    : null;

  const getStatusColor = (status: DepartmentDrift['status']) => {
    switch (status) {
      case 'aligned': return '#10B981';
      case 'moderate': return '#F59E0B';
      case 'severe': return '#EF4444';
      default: return '#A1A1AA';
    }
  };

  const statusHex = getStatusColor(department.status);

  // Generate SVG path for 7-day trend graph
  const renderTrendChart = () => {
    const data = department.trendHistory;
    const width = 340;
    const height = 90;
    const padding = 15;
    const pointsCount = data.length;

    const minVal = Math.min(...data, 0);
    const maxVal = Math.max(...data, 1);

    const points = data.map((val, idx) => {
      const x = padding + (idx / (pointsCount - 1)) * (width - padding * 2);
      const y = height - padding - ((val - minVal) / (maxVal - minVal)) * (height - padding * 2);
      return { x, y, val };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`trendGrad-${department.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={statusHex} stopOpacity="0.4" />
            <stop offset="100%" stopColor={statusHex} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={areaD} fill={`url(#trendGrad-${department.id})`} />
        {/* Path line */}
        <path d={pathD} fill="none" stroke={statusHex} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#0B0F17" stroke={statusHex} strokeWidth="2" />
        ))}
      </svg>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(2, 5, 18, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      justifyContent: 'flex-end',
    }}>
      <div className="drawer-enter" style={{
        width: '460px',
        maxWidth: '90vw',
        height: '100%',
        backgroundColor: 'rgba(5, 5, 5, 0.85)',
        backdropFilter: 'blur(16px)',
        borderLeft: '1px solid rgba(37, 99, 235, 0.3)',
        boxShadow: '-10px 0 50px rgba(0, 0, 0, 0.9), -5px 0 30px rgba(37, 99, 235, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(37, 99, 235, 0.05) 0%, transparent 100%)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(37, 99, 235, 0.15)', color: '#60A5FA', border: '1px solid rgba(37, 99, 235, 0.3)' }}>
                {department.code}
              </span>
              <h3 className="glow-text" style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                {department.name} Inspector
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '6px', display: 'block', fontWeight: 500 }}>
              Lead Director: <strong style={{ color: '#E5E7EB' }}>{department.lead}</strong>
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#A1A1AA',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#FFF'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#A1A1AA'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Key Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '16px', borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${statusHex} 0%, transparent 100%)`, opacity: 0.8 }} />
              <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Drift Index</span>
              <div className="glow-text" style={{ fontSize: '28px', fontWeight: 800, color: statusHex, marginTop: '4px' }}>
                {department.driftScore.toFixed(2)}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '16px', borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, #3B82F6 0%, transparent 100%)`, opacity: 0.8 }} />
              <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Cohesion Index</span>
              <div className="glow-text" style={{ fontSize: '28px', fontWeight: 800, color: '#60A5FA', marginTop: '4px' }}>
                {department.cohesionIndex}%
              </div>
            </div>
          </div>

          {/* Interactive Nudge & Policy Section */}
          {primarySignal && (
            <div style={{
              padding: '20px',
              borderRadius: '16px',
              backgroundColor: 'rgba(37, 99, 235, 0.03)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              boxShadow: 'inset 0 0 20px rgba(37, 99, 235, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#60A5FA' }}>[ALERT]</span>
                <span className="glow-text" style={{ fontSize: '13px', fontWeight: 800, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Active Strategic Variance
                </span>
              </div>

              {/* Telemetry Raw Stream */}
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                  Telemetry Raw Stream
                </span>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#93C5FD',
                  backgroundColor: 'rgba(2, 5, 18, 0.8)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                }}>
                  {primarySignal.fullRawMessage}
                </div>
              </div>

              {/* Enterprise Policy Violated */}
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                  Enterprise Policy Violated
                </span>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(67, 56, 202, 0.1)',
                  border: '1px solid rgba(67, 56, 202, 0.3)',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#818CF8', marginBottom: '6px' }}>
                    {matchedBaseline ? `${matchedBaseline.code}: ${matchedBaseline.title}` : primarySignal.matchedBaselineTitle}
                  </div>
                  <div style={{ fontSize: '12px', color: '#A1A1AA', lineHeight: '1.5' }}>
                    {matchedBaseline ? matchedBaseline.description : 'Standard baseline parameters exceeded.'}
                  </div>
                </div>
              </div>

              {/* One-Click Nudge Action */}
              <div style={{ marginTop: '4px' }}>
                <button
                  onClick={() => {
                    const leadName = department.lead.split(' (')[0];
                    onTriggerNudge(department.name, `[ALERT] Automated Nudge sent to ${leadName}: Policy violation detected.`);
                    onShowToast(`[SUCCESS] Slack Nudge Sent via Webhook`);
                  }}
                  className="glow-button"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'linear-gradient(45deg, var(--accent-primary), var(--accent-orange))',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Dispatch Slack Nudge to {department.lead.split(' (')[0]}
                </button>
              </div>
            </div>
          )}

          {/* 7-Day Trend Chart */}
          <div className="glass-card" style={{ padding: '20px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="glow-text" style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>7-Day Drift Trajectory</span>
              <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600 }}>Daily Sampling</span>
            </div>
            {renderTrendChart()}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280', marginTop: '12px', fontWeight: 600 }}>
              <span>Day -7</span>
              <span>Day -4</span>
              <span>Today</span>
            </div>
          </div>

          {/* Flagged Telemetry Stream List */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h4 className="glow-text" style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Recent Flags ({deptTelemetries.length})
              </h4>
              <span style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 700, padding: '4px 8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>Live Ingest</span>
            </div>

            {deptTelemetries.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#A1A1AA', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                No active severe telemetry flags for this unit.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {deptTelemetries.map((signal) => (
                  <div key={signal.id} style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(10, 11, 15, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(37, 99, 235, 0.15)', color: '#60A5FA', border: '1px solid rgba(37, 99, 235, 0.3)' }}>
                          {signal.source}
                        </span>
                        <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 500 }}>{signal.timestamp}</span>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: signal.severity === 'High' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: signal.severity === 'High' ? '#F87171' : '#FBBF24',
                        border: `1px solid ${signal.severity === 'High' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                      }}>
                        Drift {signal.driftScore.toFixed(2)}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '13px', color: '#E5E7EB', fontWeight: 500, lineHeight: '1.5' }}>
                      {signal.payloadPreview}
                    </p>

                    <div style={{ marginTop: '12px', fontSize: '11px', color: '#A1A1AA', fontWeight: 500 }}>
                      Matched Baseline: <span style={{ color: '#818CF8', fontWeight: 700 }}>{signal.matchedBaselineTitle}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(5, 5, 5, 0.95)',
          display: 'flex',
          gap: '12px',
        }}>
          <button
            onClick={() => onTriggerNudge(department.name, department.topDriftTopic)}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: '#60A5FA',
              border: '1px solid rgba(37, 99, 235, 0.4)',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.2)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(37, 99, 235, 0.3)' }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.1)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Trigger Nudge Intervention
          </button>
        </div>
      </div>
    </div>
  );
};
