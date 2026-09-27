'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Leaf, Factory, TrendingUp, Building2, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface DistrictData {
  success: boolean;
  districtName: string;
  state: string;
  reportDate: string;
  compliance: {
    totalFactories: number;
    filed: number;
    pending: number;
    overdue: number;
    complianceRate: number;
  };
  deadlineAlerts: {
    factoryId: string;
    factoryName: string;
    industryType: string;
    daysRemaining: number;
    status: string;
    urgent: boolean;
  }[];
  riskMap: {
    factoryId: string;
    factoryName: string;
    industryType: string;
    riskScore: number;
    riskLevel: 'green' | 'yellow' | 'red';
    riskFactors: string[];
    complianceStatus: string;
  }[];
  districtTargets: {
    landfillTargetTons: number;
    landfillDivertedTons: number;
    diversionProgress: number;
  };
  carbonCredits: {
    totalCredits: number;
    estimatedValueInr: number;
  };
  clusterMetrics: {
    circularScore: number;
    totalCo2Avoided: number;
    totalWaterSaved: number;
    totalFinancialValue: number;
  };
  industryBreakdown: {
    industryType: string;
    factoryCount: number;
    co2Avoided: number;
    savings: number;
  }[];
}

export default function DistrictDashboard() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<DistrictData>();

  if (!isReady) {
    return <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>Initializing SDK...</div>;
  }
  if (!data || !data.success) {
    return <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>Waiting for District Overview data...</div>;
  }

  const { compliance, deadlineAlerts, riskMap, districtTargets, carbonCredits, clusterMetrics, industryBreakdown } = data;

  const formatINR = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const riskColors = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };
  const statusColors = { filed: '#10b981', pending: '#f59e0b', overdue: '#ef4444' };

  const redCount = riskMap.filter(r => r.riskLevel === 'red').length;
  const yellowCount = riskMap.filter(r => r.riskLevel === 'yellow').length;
  const greenCount = riskMap.filter(r => r.riskLevel === 'green').length;

  return (
    <div style={{
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0c1222',
      color: '#f1f5f9',
      borderRadius: '16px',
      maxWidth: '900px',
      margin: '0 auto',
      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
      backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={24} /> District Environmental Intelligence
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            SPCB Officer View — {data.districtName}, {data.state}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Report Date</div>
          <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>{data.reportDate}</div>
        </div>
      </div>

      {/* Compliance Bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Cluster Compliance Rate: {compliance.complianceRate}%
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{compliance.totalFactories} factories</span>
        </div>
        {/* Stacked bar */}
        <div style={{ display: 'flex', height: '28px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#1e293b' }}>
          {compliance.filed > 0 && (
            <div style={{ width: `${(compliance.filed / compliance.totalFactories) * 100}%`, backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>
              {compliance.filed} Filed
            </div>
          )}
          {compliance.pending > 0 && (
            <div style={{ width: `${(compliance.pending / compliance.totalFactories) * 100}%`, backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>
              {compliance.pending} Pending
            </div>
          )}
          {compliance.overdue > 0 && (
            <div style={{ width: `${(compliance.overdue / compliance.totalFactories) * 100}%`, backgroundColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>
              {compliance.overdue} Overdue
            </div>
          )}
        </div>
      </div>

      {/* Top Row: 4 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '10px', padding: '14px', borderLeft: '3px solid #10b981' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Circular Score</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#10b981' }}>{clusterMetrics.circularScore}%</div>
        </div>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '10px', padding: '14px', borderLeft: '3px solid #3b82f6' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Carbon Credits</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#3b82f6' }}>{carbonCredits.totalCredits}</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>{formatINR(carbonCredits.estimatedValueInr)}</div>
        </div>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '10px', padding: '14px', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Landfill Diverted</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#f59e0b' }}>{districtTargets.landfillDivertedTons.toFixed(0)}t</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>/ {districtTargets.landfillTargetTons}t target</div>
        </div>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '10px', padding: '14px', borderLeft: '3px solid #8b5cf6' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Economic Value</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>{formatINR(clusterMetrics.totalFinancialValue)}</div>
        </div>
      </div>

      {/* Diversion Progress Bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>District Landfill Diversion Target</span>
          <span style={{ fontSize: '12px', color: districtTargets.diversionProgress >= 100 ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>{districtTargets.diversionProgress}%</span>
        </div>
        <div style={{ height: '10px', backgroundColor: '#1e293b', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, districtTargets.diversionProgress)}%`,
            height: '100%',
            borderRadius: '5px',
            background: districtTargets.diversionProgress >= 100
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
            transition: 'width 1s ease'
          }} />
        </div>
      </div>

      {/* Two Column: Risk Heatmap + Deadline Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Risk Heatmap */}
        <div style={{ backgroundColor: '#111827', borderRadius: '10px', padding: '16px', border: '1px solid #1e293b' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={14} /> Risk Heatmap
          </h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>🔴 {redCount} High</span>
            <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>🟡 {yellowCount} Medium</span>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>🟢 {greenCount} Low</span>
          </div>
          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {riskMap.slice(0, 8).map(r => (
              <div key={r.factoryId} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', marginBottom: '4px',
                backgroundColor: '#0f172a', borderRadius: '6px', borderLeft: `3px solid ${riskColors[r.riskLevel]}`
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '500' }}>{r.factoryName}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{r.riskFactors[0] || 'No issues'}</div>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: riskColors[r.riskLevel] }}>{r.riskScore}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Deadline Alerts */}
        <div style={{ backgroundColor: '#111827', borderRadius: '10px', padding: '16px', border: '1px solid #1e293b' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} /> Filing Deadline Alerts
          </h3>
          <div style={{ maxHeight: '210px', overflowY: 'auto' }}>
            {deadlineAlerts.slice(0, 8).map(a => (
              <div key={a.factoryId} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', marginBottom: '4px',
                backgroundColor: '#0f172a', borderRadius: '6px',
                borderLeft: `3px solid ${a.urgent ? '#ef4444' : a.daysRemaining <= 90 ? '#f59e0b' : '#334155'}`
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '500' }}>{a.factoryName}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{a.industryType}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: a.urgent ? '#ef4444' : a.daysRemaining <= 90 ? '#f59e0b' : '#94a3b8' }}>
                    {a.daysRemaining}d
                  </div>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>remaining</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Industry Breakdown */}
      <div style={{ backgroundColor: '#111827', borderRadius: '10px', padding: '16px', border: '1px solid #1e293b' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Building2 size={14} /> Industry Sector Breakdown
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
          {industryBreakdown.map(ind => {
            const barWidth = Math.max(15, (ind.co2Avoided / Math.max(...industryBreakdown.map(i => i.co2Avoided))) * 100);
            return (
              <div key={ind.industryType} style={{ backgroundColor: '#0f172a', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '600', marginBottom: '4px' }}>{ind.industryType}</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px' }}>{ind.factoryCount} factories</div>
                <div style={{ height: '4px', backgroundColor: '#1e293b', borderRadius: '2px', marginBottom: '4px' }}>
                  <div style={{ width: `${barWidth}%`, height: '100%', backgroundColor: '#3b82f6', borderRadius: '2px' }} />
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>{ind.co2Avoided} t CO₂ avoided</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '10px', color: '#475569', borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
        SymbioForge × SPCB — Smart Cities Mission Compliant | CPCB Schedule VI Aligned
      </div>
    </div>
  );
}
