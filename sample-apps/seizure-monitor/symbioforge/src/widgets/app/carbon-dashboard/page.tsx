'use client';

import type { ReactNode } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { Leaf, Droplets, Trash2, DollarSign, TrendingUp, Recycle, Zap } from 'lucide-react';

export const dynamic = 'force-dynamic';

export interface Waste {}

interface CarbonMetrics {
  success: boolean;
  circularScore: number;
  totalCo2Avoided: number;
  totalLandfillDiverted: number;
  totalWaterSaved: number;
  totalEnergySaved: number;
  totalFinancialValue: number;
}

function MetricCard({ icon, label, value, unit, color, bgColor }: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div style={{
      backgroundColor: '#1e293b',
      borderRadius: '12px',
      border: '1px solid #334155',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          backgroundColor: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>{label}</span>
      </div>
      <div>
        <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc' }}>{value}</span>
        <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '6px' }}>{unit}</span>
      </div>
    </div>
  );
}

function CircularScoreGauge({ score }: { score: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle
          cx="90" cy="90" r={radius} fill="none"
          stroke={scoreColor} strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="90" y="82" textAnchor="middle" fill="#f8fafc" fontSize="32" fontWeight="bold">
          {score}
        </text>
        <text x="90" y="105" textAnchor="middle" fill="#94a3b8" fontSize="12">
          out of 100
        </text>
      </svg>
      <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Circular Economy Score</span>
    </div>
  );
}

function ComparisonBar({ label, before, after, unit, color }: {
  label: string;
  before: number;
  after: number;
  unit: string;
  color: string;
}) {
  const max = Math.max(before, after, 1);
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
        <span>{label}</span>
        <span style={{ color: '#10b981', fontWeight: 'bold' }}>
          {after > 0 ? `-${((after / Math.max(before, 1)) * 100).toFixed(0)}%` : '0%'} reduced
        </span>
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(before / max) * 100}%`, backgroundColor: '#64748b', borderRadius: '4px' }} />
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Before: {before.toLocaleString()} {unit}</div>
        </div>
        <TrendingUp size={14} style={{ color: '#10b981', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(Math.max(before - after, 0) / max) * 100}%`, backgroundColor: color, borderRadius: '4px' }} />
          </div>
          <div style={{ fontSize: '10px', color, marginTop: '2px' }}>After: {Math.max(before - after, 0).toLocaleString()} {unit}</div>
        </div>
      </div>
    </div>
  );
}

export default function CarbonDashboard() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<CarbonMetrics>();

  if (!isReady) {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Initializing SDK...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Loading Carbon Dashboard...
      </div>
    );
  }

  const estimatedBaselineCo2 = data.totalCo2Avoided * 3.2;
  const estimatedBaselineLandfill = data.totalLandfillDiverted * 2.5;
  const estimatedBaselineWater = data.totalWaterSaved * 1.8;

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      borderRadius: '12px',
      maxWidth: '860px',
      margin: '0 auto',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Recycle style={{ color: '#10b981' }} /> Carbon & Impact Dashboard
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Cluster-wide environmental and financial impact metrics
          </p>
        </div>
      </div>

      {/* Top: Score + Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Circular Score */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          border: '1px solid #334155',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <CircularScoreGauge score={data.circularScore} />
        </div>

        {/* Metric Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <MetricCard
            icon={<Leaf size={20} />}
            label="CO2 Avoided"
            value={data.totalCo2Avoided.toFixed(1)}
            unit="tons/year"
            color="#10b981"
            bgColor="rgba(16,185,129,0.15)"
          />
          <MetricCard
            icon={<Trash2 size={20} />}
            label="Landfill Diverted"
            value={data.totalLandfillDiverted.toFixed(1)}
            unit="tons/year"
            color="#8b5cf6"
            bgColor="rgba(139,92,246,0.15)"
          />
          <MetricCard
            icon={<Droplets size={20} />}
            label="Water Saved"
            value={(data.totalWaterSaved / 1000).toFixed(1)}
            unit="KL/year"
            color="#06b6d4"
            bgColor="rgba(6,182,212,0.15)"
          />
          <MetricCard
            icon={<Zap size={20} />}
            label="Energy Saved"
            value={(data.totalEnergySaved / 1000).toFixed(1)}
            unit="MWh/year"
            color="#ec4899"
            bgColor="rgba(236,72,153,0.15)"
          />
          <MetricCard
            icon={<DollarSign size={20} />}
            label="Financial Value"
            value={`INR ${(data.totalFinancialValue / 100000).toFixed(1)}L`}
            unit="per year"
            color="#f59e0b"
            bgColor="rgba(245,158,11,0.15)"
          />
        </div>
      </div>

      {/* Before vs After Comparison */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        border: '1px solid #334155',
        padding: '20px',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 'bold', color: '#cbd5e1' }}>
          Before vs After SymbioForge Integration
        </h3>
        <ComparisonBar
          label="Carbon Emissions"
          before={estimatedBaselineCo2}
          after={data.totalCo2Avoided}
          unit="tons/yr"
          color="#10b981"
        />
        <ComparisonBar
          label="Landfill Waste"
          before={estimatedBaselineLandfill}
          after={data.totalLandfillDiverted}
          unit="tons/yr"
          color="#8b5cf6"
        />
        <ComparisonBar
          label="Water Usage"
          before={estimatedBaselineWater}
          after={data.totalWaterSaved}
          unit="L/yr"
          color="#06b6d4"
        />
      </div>
    </div>
  );
}

