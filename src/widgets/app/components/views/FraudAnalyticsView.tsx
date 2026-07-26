'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Activity, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell
} from 'recharts';
import { useAegis, TRANSACTION_DOSSIERS } from '../../context/AegisContext';

import { Variants } from 'framer-motion';

const cardVariants: Variants = {
  hidden:  { opacity: 0, y: 14 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: [0.16,1,0.3,1] as const } }),
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141414] border border-[#D4AF37]/25 rounded-xl p-3 text-xs font-mono-ui shadow-2xl">
      <div className="text-[#D4AF37] mb-1">{label}</div>
      <div className="text-white">{payload[0].value} cases detected</div>
    </div>
  );
};

export const FraudAnalyticsView: React.FC = () => {
  const { investigation, triggerExportData } = useAegis();

  // Combine default dossiers with current active investigation state
  const dossiersMap = { ...TRANSACTION_DOSSIERS, [investigation.id]: investigation };
  const dossiers = Object.values(dossiersMap);

  const totalCases = dossiers.length;
  const criticalCount = dossiers.filter((d) => d.severity === 'CRITICAL').length;
  const highCount = dossiers.filter((d) => d.severity === 'HIGH').length;
  const mediumCount = dossiers.filter((d) => d.severity === 'MEDIUM').length;
  const lowCount = dossiers.filter((d) => d.severity === 'LOW').length;

  const monthlyData = [
    { month: 'Jan', cases: 0 }, { month: 'Feb', cases: 0 }, { month: 'Mar', cases: 0 },
    { month: 'Apr', cases: 0 }, { month: 'May', cases: 0 }, { month: 'Jun', cases: 0 },
    { month: 'Jul', cases: totalCases },
  ];

  const radialData = [
    { name: 'Telecom', value: 100, fill: '#D4AF37' },
    { name: 'VoiceAI', value: 96,  fill: '#5EA2FF'  },
    { name: 'BankMule', value: 88, fill: '#FF4D4F'  },
  ];

  const subTextBreakdown = `${criticalCount} Critical · ${highCount} High · ${mediumCount} Medium · ${lowCount} Low`;

  return (
    <div className="page-enter max-w-6xl mx-auto space-y-8 pb-16">

      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-cinzel font-bold text-white">Threat Analytics</h1>
          <p className="text-sm text-gray-500 font-mono-ui">Aggregated intelligence metrics · Fusion engine confidence scoring</p>
        </div>
        <button
          onClick={() => triggerExportData('json', 'telemetry')}
          className="px-4 py-2 rounded-xl bg-[#141414] border border-white/10 hover:border-[#D4AF37]/30 text-gray-300 text-xs font-mono-ui font-bold transition-all flex items-center gap-2"
        >
          <Download className="w-3.5 h-3.5" /> Export Analytics Metrics
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Cases Detected (2026)', value: `${totalCases}`, sub: subTextBreakdown, color: '#D4AF37' },
          { label: 'Avg Confidence Score',  value: '96%', sub: 'VoiceGuard-v4.2 Accuracy',     color: '#5EA2FF' },
          { label: 'Avg HITL Response',     value: '< 2 min', sub: 'Officer decision latency',   color: '#00C853' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} custom={i} variants={cardVariants} initial="hidden" animate="visible" className="card p-7">
            <div className="text-[10px] font-mono-ui text-gray-500 uppercase tracking-wider mb-4">{kpi.label}</div>
            <div className="text-3xl font-bold font-mono-ui" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-2">{kpi.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* 2-Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Bar Chart */}
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible" className="card p-7">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-sm font-semibold text-gray-200">Monthly Detection Trend</span>
            <span className="ml-auto text-[10px] font-mono-ui text-gray-500">2026 YTD</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: -16 }}>
              <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(212,175,55,0.04)' }} />
              <Bar dataKey="cases" radius={[6, 6, 0, 0]}>
                {monthlyData.map((entry, i) => (
                  <Cell key={i} fill={entry.cases > 0 ? '#D4AF37' : '#1E1E1E'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 text-center text-xs text-gray-600 font-mono-ui">
            All prior months: 0 cases. Active incidents: July 2026 ({totalCases} cases detected across risk tiers).
          </div>
        </motion.div>

        {/* Confidence Radial */}
        <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible" className="card p-7">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-4 h-4 text-[#5EA2FF]" />
            <span className="text-sm font-semibold text-gray-200">Engine Confidence Scores</span>
            <span className="ml-auto text-[10px] font-mono-ui text-gray-500">Current Case</span>
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius="30%" outerRadius="90%"
                data={radialData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar dataKey="value" background={{ fill: '#1A1A1A' }} cornerRadius={8} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="bg-[#141414] border border-[#D4AF37]/25 rounded-xl p-3 text-xs font-mono-ui">
                        <div className="text-[#D4AF37]">{payload[0].payload.name}</div>
                        <div className="text-white">{payload[0].value}% confidence</div>
                      </div>
                    ) : null
                  }
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-center gap-6">
            {radialData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px] font-mono-ui text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                {d.name}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Analytics Pipeline Status Card */}
      <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible"
        className="card p-8 border border-[#D4AF37]/10 flex flex-col items-center text-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/8 border border-[#D4AF37]/20 flex items-center justify-center mb-4">
          <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
        </div>
        <div className="text-gray-300 font-semibold">Historical Intelligence Pipeline Active</div>
        <div className="text-sm text-gray-600 mt-1 max-w-md">
          Monitoring {totalCases} active cases: {criticalCount} Critical, {highCount} High, {mediumCount} Medium, and {lowCount} Low severity. Metrics update dynamically as new threats are processed.
        </div>
      </motion.div>
    </div>
  );
};

