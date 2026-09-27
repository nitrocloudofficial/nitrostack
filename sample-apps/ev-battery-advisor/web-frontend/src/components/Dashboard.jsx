import React, { useState } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  LineChart, Line, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Zap, Activity, Thermometer, RefreshCw, BarChart3, TrendingUp, ZapIcon, Loader2, Download
} from 'lucide-react';
import { exportDashboardToPDF } from '../utils/pdfExport';

function CountUp({ value, decimals = 0 }) {
  const [count, React_setCount] = React.useState(0);
  
  React.useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (end === 0) { React_setCount(0); return; }
    
    const duration = 1000;
    const incrementTime = 16;
    const totalSteps = Math.ceil(duration / incrementTime);
    const increment = end / totalSteps;
    
    let currentStep = 0;
    const timer = setInterval(() => {
      start += increment;
      currentStep++;
      if (currentStep >= totalSteps) {
        React_setCount(end);
        clearInterval(timer);
      } else {
        React_setCount(start);
      }
    }, incrementTime);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <>{count.toFixed(decimals)}</>;
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

// Helper to determine cell color (best/worst)
function getHeatmapColor(val, allVals, higherIsBetter) {
  if (val === undefined || val === null || val === '-') return 'bg-gray-800 text-gray-400';
  const nums = allVals.filter(v => typeof v === 'number');
  if (nums.length === 0) return 'bg-gray-800 text-gray-400';
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  if (max === min) return 'bg-gray-800 text-gray-400';

  const isBest = higherIsBetter ? val === max : val === min;
  const isWorst = higherIsBetter ? val === min : val === max;

  // Returning semi-transparent backgrounds to match radar chart aesthetic
  if (isBest) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  if (isWorst) return 'bg-red-500/20 text-red-400 border border-red-500/30';
  return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
}

const getPaddedDomain = (dataMin, dataMax, minZero = false, maxHundred = false) => {
  if (!isFinite(dataMin) || !isFinite(dataMax)) return [0, 100];
  const range = dataMax === dataMin ? 10 : dataMax - dataMin;
  const pad = range * 0.15;
  let min = dataMin - pad;
  let max = dataMax + pad;
  if (minZero) min = Math.max(0, min);
  if (maxHundred) max = Math.min(100, max);
  return [min, max];
};

export default function Dashboard({ data }) {
  const { topCandidate, allCandidates, paretoFront, dominatedCandidates, topsisRanking } = data;
  
  const [dtTab, setDtTab] = useState('voltage');
  const [cRate, setCRate] = useState(1);
  const [ambientTemp, setAmbientTemp] = useState(25);
  const [dtData, setDtData] = useState(data.digitalTwin);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSuccess, setSimSuccess] = useState(false);
  const [comparisonIds, setComparisonIds] = useState([]);
  const [comparisonDtData, setComparisonDtData] = useState([]);
  const [hoveredRadarCandidate, setHoveredRadarCandidate] = useState(null);
  
  // 1. Radar Data (Top 3 Candidates)
  const top3 = allCandidates?.slice(0, 3) || [];
  
  // Build radar data with proper 0–100 normalization derived from actual data ranges.
  // This ensures the radar polygon SHAPE changes with real data, not just the axis labels.
  const radarAxes = [
    { subject: 'Energy Density', key: 'gravimetricEnergyDensity',   higherIsBetter: true  },
    { subject: 'Cycle Life',     key: 'cycleLifeTo80SOH',            higherIsBetter: true  },
    { subject: 'Thermal Safety', key: 'thermalRunawayOnsetTemp',     higherIsBetter: true  },
    { subject: 'Cost',           key: 'materialCostPerKWh',          higherIsBetter: false },
    { subject: 'C-Rate',         key: 'cRateCapability',             higherIsBetter: true  },
    { subject: 'Carbon',         key: 'recyclability',               higherIsBetter: true  },
  ];

  const radarData = radarAxes.map(axis => {
    // Collect raw values from all candidates (not just top3) for a stable normalisation range
    const allVals = (allCandidates || []).map(c => {
      const m = c.metrics || c.keyMetrics || {};
      return typeof m[axis.key] === 'number' ? m[axis.key] : null;
    }).filter(v => v !== null);

    const rawMin = allVals.length > 0 ? Math.min(...allVals) : 0;
    const rawMax = allVals.length > 0 ? Math.max(...allVals) : 1;
    const range  = rawMax === rawMin ? 1 : rawMax - rawMin;

    const entry = { subject: axis.subject, fullMark: 100 };

    top3.forEach((cand, idx) => {
      const m   = cand.metrics || cand.keyMetrics || {};
      const raw = typeof m[axis.key] === 'number' ? m[axis.key] : rawMin;
      // Normalise to 0–100; for lower-is-better axes invert so bigger = better on chart
      const normalised = axis.higherIsBetter
        ? ((raw - rawMin) / range) * 100
        : ((rawMax - raw) / range) * 100;
      entry[`Candidate${idx}`] = Math.round(normalised * 10) / 10;
    });

    return entry;
  });

  // Extract metrics for Scorecard rows
  const getMetricRow = (key) => top3.map(c => (c.metrics || c.keyMetrics || {})[key]);

  const energyVals = getMetricRow('gravimetricEnergyDensity');
  const costVals = getMetricRow('materialCostPerKWh');
  const cycleVals = getMetricRow('cycleLifeTo80SOH');
  const thermalVals = getMetricRow('thermalRunawayOnsetTemp');
  const cRateVals = getMetricRow('cRateCapability');

  // 2. Pareto Data — robust multi-path extraction so custom uploaded datasets work correctly.
  // The backend returns paretoFront with keyObjectives, but dominatedCandidates only has {id, name}.
  // We resolve dominated metrics from allCandidates by id OR name, with further fallback to keyObjectives.
  const resolveMetrics = (idOrObj) => {
    // Try find in allCandidates by id first, then by name
    const byId   = allCandidates?.find(c => c.id   === (idOrObj?.id   ?? idOrObj));
    const byName = allCandidates?.find(c => c.name === (idOrObj?.name ?? ''));
    const source = byId || byName || idOrObj || {};
    // Metrics can live under .metrics or .keyMetrics (custom uploads may differ)
    return source.metrics || source.keyMetrics || source.keyObjectives || {};
  };

  const paretoData = paretoFront?.map(p => {
    const m = resolveMetrics(p);
    // Prefer keyObjectives (set by backend Pareto tool), fall back to raw metrics
    const cost   = p.keyObjectives?.cost         ?? m.materialCostPerKWh        ?? 0;
    const energy = p.keyObjectives?.energyDensity ?? m.gravimetricEnergyDensity ?? 0;
    return { x: cost, y: energy, z: 100, name: p.name, id: p.id, isPareto: true };
  }) || [];

  const dominatedData = dominatedCandidates?.map(d => {
    const m = resolveMetrics(d);
    const cost   = m.materialCostPerKWh        ?? m.cost         ?? 0;
    const energy = m.gravimetricEnergyDensity  ?? m.energyDensity ?? 0;
    return { x: cost, y: energy, z: 50, name: d.name, id: d.id, isPareto: false };
  }) || [];

  const allScatterData = [...paretoData, ...dominatedData];

  // Sort Pareto points by cost (x-axis) so the dashed frontier line draws left→right
  // correctly for ANY dataset — not zigzagging in backend-return order.
  const paretoDataSorted = [...paretoData].sort((a, b) => a.x - b.x);

  // Derive componentType dynamically from the actual data (not hardcoded)
  const componentType =
    allCandidates?.[0]?.componentType ||
    topsisRanking?.topRecommendation?.componentType ||
    paretoFront?.[0]?.componentType ||
    'material';

  // 3. Digital Twin Data
  const voltData = dtData?.electrochemical?.voltageProfile || [];
  const tempData = dtData?.thermal?.temperatureProfile || [];
  const degData = dtData?.mechanical?.degradationCurve || [];

  const handleReRun = async () => {
    if (!topCandidate?.name) return;
    setIsSimulating(true);
    setSimSuccess(false);
    try {
      const res = await fetch('http://localhost:3002/api/simulate-c-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: data.paretoFront?.[0]?.id || 'lfp-cathode',
          cRate: cRate,
          temp: ambientTemp
        })
      });
      const result = await res.json();
      if (result.status === 'success') {
        setDtData(prev => ({
          ...prev,
          electrochemical: result.data.electrochemical,
          thermal: result.data.thermal
        }));
        setSimSuccess(true);
        setTimeout(() => setSimSuccess(false), 2000);
      } else {
        console.error("Simulation failed:", result.error);
      }
    } catch (e) {
      console.error("Error re-running simulation:", e);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleToggleCompare = (id) => {
    setComparisonIds(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  };

  // Fetch comparison data when comparisonIds change
  React.useEffect(() => {
    if (comparisonIds.length === 0) {
      setComparisonDtData([]);
      return;
    }
    const fetchComparison = async () => {
      setIsSimulating(true);
      try {
        const res = await fetch('http://localhost:3002/api/simulate-multiple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materialIds: comparisonIds, cRate, temp: ambientTemp })
        });
        const result = await res.json();
        if (result.status === 'success') {
          setComparisonDtData(result.data);
        }
      } catch (e) {
        console.error("Error fetching multi-simulation", e);
      } finally {
        setIsSimulating(false);
      }
    };
    fetchComparison();
  }, [comparisonIds]); // note: excluding cRate/ambientTemp so it doesn't auto-fetch on slider drag unless "Run" is clicked

  const activeCandidatesDt = comparisonDtData.length > 0 ? comparisonDtData : [{ materialId: topCandidate?.id, electrochemical: dtData?.electrochemical, thermal: dtData?.thermal, mechanical: dtData?.mechanical }];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col gap-12 w-full pb-16"
    >
      
      {/* ----------------- CATHODE COMPARISON ----------------- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true }} 
        className="bg-[#0B0C10] p-8 rounded-2xl border border-[#1f2937] shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <ZapIcon className="text-orange-500" size={24} />
              <h2 className="text-2xl font-bold text-white">Cathode Comparison</h2>
            </div>
            <p className="text-gray-400 text-sm mt-1">{top3.length} candidates • Radar + Scorecard</p>
          </div>
          <div className="flex gap-2">
            {data?.aiOverrideActive && (
              <span className="bg-[#f59e0b] text-black px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-amber-500/20 animate-pulse-once flex items-center gap-1">
                <ZapIcon size={14} /> AI Override Active
              </span>
            )}
            <span className="bg-[#6366f1] text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20">EV Advisor</span>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          {/* Radar Chart Card */}
          <div className="md:w-1/3 bg-[#111827] rounded-xl border border-[#1f2937] p-4 flex items-center justify-center min-h-[300px]">
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  {top3.map((cand, idx) => {
                    const isHovered = hoveredRadarCandidate === cand.id;
                    const isDimmed = hoveredRadarCandidate !== null && !isHovered;
                    return (
                    <Radar 
                      key={cand.id} 
                      name={cand.name} 
                      dataKey={`Candidate${idx}`} 
                      stroke={COLORS[idx]} 
                      strokeWidth={isHovered ? 3 : 2} 
                      fill={COLORS[idx]} 
                      fillOpacity={isHovered ? 0.3 : isDimmed ? 0.05 : 0.15} 
                      strokeOpacity={isDimmed ? 0.3 : 1}
                      style={isHovered ? { filter: `drop-shadow(0 0 8px ${COLORS[idx]})` } : {}}
                    />
                  )})}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Legend / Rank List */}
          <div className="md:w-2/3 flex flex-col justify-center gap-4 pl-4">
            {top3.map((cand, idx) => (
              <div 
                key={cand.id} 
                onMouseEnter={() => setHoveredRadarCandidate(cand.id)}
                onMouseLeave={() => setHoveredRadarCandidate(null)}
                className={`flex items-start gap-4 p-3 rounded-lg transition-colors border ${hoveredRadarCandidate === cand.id ? 'bg-[#1a2333] border-[#374151]' : 'hover:bg-[#111827] border-transparent hover:border-[#1f2937]'}`}
              >
                <div className="w-5 h-5 rounded mt-1 shadow-sm" style={{ backgroundColor: COLORS[idx], boxShadow: hoveredRadarCandidate === cand.id ? `0 0 10px ${COLORS[idx]}` : 'none' }}></div>
                <div>
                  <div className="text-white font-bold text-lg leading-tight">{cand.name}</div>
                  <div className="text-gray-400 text-sm mt-1">Rank #{idx + 1} • Score: {cand.compositeScore}/100</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric Scorecard Table */}
        <div className="bg-[#111827] rounded-xl border border-[#1f2937] overflow-hidden">
          <div className="p-4 border-b border-[#1f2937] flex items-center gap-2 text-white font-medium bg-[#1a2333]/70 backdrop-blur-md">
            <BarChart3 size={18} className="text-blue-400" /> Metric Scorecard
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#111827] text-gray-400 border-b border-[#1f2937]">
                <tr>
                  <th className="p-4 font-medium w-1/4">Metric</th>
                  {top3.map((cand, i) => (
                    <th key={i} className="p-4 font-bold" style={{ color: COLORS[i] }}>{cand.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]">
                <tr className="hover:bg-[#1a2333]/50 transition-colors">
                  <td className="p-4 text-white font-medium flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm bg-blue-500"></div> Energy Density <span className="text-gray-500 text-xs font-normal">Wh/kg</span>
                  </td>
                  {top3.map((c, i) => (
                    <td key={i} className="p-4">
                      <div className={`inline-flex items-center justify-center min-w-[68px] px-3 py-1 rounded-full font-mono text-sm font-bold shadow-sm animate-pulse-once ${getHeatmapColor(energyVals[i], energyVals, true)}`}>
                        {energyVals[i] || '-'}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-[#1a2333]/50 transition-colors">
                  <td className="p-4 text-white font-medium flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm bg-yellow-500"></div> Cost <span className="text-gray-500 text-xs font-normal">$/kWh</span>
                  </td>
                  {top3.map((c, i) => (
                    <td key={i} className="p-4">
                      <div className={`inline-flex items-center justify-center min-w-[68px] px-3 py-1 rounded-full font-mono text-sm font-bold shadow-sm animate-pulse-once ${getHeatmapColor(costVals[i], costVals, false)}`} style={{ animationDelay: '100ms' }}>
                        {costVals[i] || '-'}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-[#1a2333]/50 transition-colors">
                  <td className="p-4 text-white font-medium flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm bg-emerald-500"></div> Cycle Life <span className="text-gray-500 text-xs font-normal">cycles</span>
                  </td>
                  {top3.map((c, i) => (
                    <td key={i} className="p-4">
                      <div className={`inline-flex items-center justify-center min-w-[68px] px-3 py-1 rounded-full font-mono text-sm font-bold shadow-sm animate-pulse-once ${getHeatmapColor(cycleVals[i], cycleVals, true)}`} style={{ animationDelay: '200ms' }}>
                        {cycleVals[i]?.toLocaleString() || '-'}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-[#1a2333]/50 transition-colors">
                  <td className="p-4 text-white font-medium flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm bg-red-500"></div> Thermal Safety <span className="text-gray-500 text-xs font-normal">°C</span>
                  </td>
                  {top3.map((c, i) => (
                    <td key={i} className="p-4">
                      <div className={`inline-flex items-center justify-center min-w-[68px] px-3 py-1 rounded-full font-mono text-sm font-bold shadow-sm animate-pulse-once ${getHeatmapColor(thermalVals[i], thermalVals, true)}`} style={{ animationDelay: '300ms' }}>
                        {thermalVals[i] || '-'}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-[#1a2333]/50 transition-colors">
                  <td className="p-4 text-white font-medium flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm bg-blue-400"></div> C-Rate <span className="text-gray-500 text-xs font-normal">C</span>
                  </td>
                  {top3.map((c, i) => (
                    <td key={i} className="p-4">
                      <div className={`inline-flex items-center justify-center min-w-[68px] px-3 py-1 rounded-full font-mono text-sm font-bold shadow-sm animate-pulse-once ${getHeatmapColor(cRateVals[i], cRateVals, true)}`} style={{ animationDelay: '400ms' }}>
                        {cRateVals[i] || '-'}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* ----------------- PARETO FRONT ----------------- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true }}
        className="bg-[#0B0C10] p-8 rounded-2xl border border-[#1f2937] shadow-xl"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-emerald-400" size={24} />
            <h2 className="text-2xl font-bold text-white">Pareto Front</h2>
          </div>
          <div className="flex gap-3">
            <span className="bg-[#111827] border border-[#374151] text-gray-300 px-3 py-1 rounded text-xs font-medium flex items-center gap-2">
              <div className="w-2 h-2 bg-[#6366f1] rounded-full"></div> Pareto
            </span>
            <span className="bg-[#111827] border border-[#374151] text-gray-400 px-3 py-1 rounded text-xs font-medium flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-600 rounded-full"></div> Dominated
            </span>
          </div>
        </div>
        <p className="text-gray-400 text-sm mb-6">{componentType} • {allScatterData.length} candidates • {paretoDataSorted.length} on Pareto front</p>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="w-full lg:w-2/3 bg-[#111827] p-6 rounded-xl border border-[#1f2937] flex flex-col justify-center min-h-[400px]">
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis type="number" dataKey="x" name="Cost" domain={([dataMin, dataMax]) => getPaddedDomain(dataMin, dataMax, true)} stroke="#6b7280" tick={{fill: '#9ca3af', fontSize: 12}} label={{ value: 'Material Cost Per KWh ($)', position: 'bottom', fill: '#9ca3af', offset: 0 }} />
                <YAxis type="number" dataKey="y" name="Energy" domain={([dataMin, dataMax]) => getPaddedDomain(dataMin, dataMax, true)} stroke="#6b7280" tick={{fill: '#9ca3af', fontSize: 12}} label={{ value: 'Gravimetric Energy Density (Wh/kg)', angle: -90, position: 'insideLeft', fill: '#9ca3af', offset: 10 }} />
                <RechartsTooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} 
                  itemStyle={{ color: '#fff' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontWeight: 'bold', color: d?.isPareto ? '#6366f1' : '#9ca3af', marginBottom: 4 }}>{d?.name || 'Unknown'}</div>
                        <div style={{ color: '#d1d5db', fontSize: 12 }}>Cost: <span style={{ color: '#f59e0b', fontFamily: 'monospace' }}>${d?.x?.toFixed(2)}/kWh</span></div>
                        <div style={{ color: '#d1d5db', fontSize: 12 }}>Energy: <span style={{ color: '#10b981', fontFamily: 'monospace' }}>{d?.y?.toFixed(0)} Wh/kg</span></div>
                        <div style={{ color: d?.isPareto ? '#6366f1' : '#6b7280', fontSize: 11, marginTop: 4 }}>{d?.isPareto ? '✦ Pareto Optimal' : '● Dominated'}</div>
                      </div>
                    );
                  }}
                />
                <Scatter name="Pareto" data={paretoDataSorted} fill="#6366f1" line={{stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5'}} shape="circle" isAnimationActive={true} animationEasing="ease-out" animationDuration={1500} />
                <Scatter name="Dominated" data={dominatedData} fill="#4b5563" shape="circle" isAnimationActive={true} animationEasing="ease-out" animationDuration={1000} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          </div>

          <div className="w-full lg:w-1/3 bg-[#111827] rounded-xl border border-[#1f2937] flex flex-col h-[400px] overflow-hidden">
          <div className="p-4 border-b border-[#1f2937] flex items-center gap-2 text-white font-medium bg-[#1a2333]/70 backdrop-blur-md shrink-0 z-10">
            <ShieldCheck size={18} className="text-emerald-400" /> Pareto-Optimal Candidates
          </div>
          <div className="flex flex-col overflow-y-auto flex-1 p-2">
            {paretoFront?.map((p, idx) => {
              const isComparing = comparisonIds.includes(p.id);
              const isDisabled = !isComparing && comparisonIds.length >= 3;
              return (
              <motion.div 
                key={p.id} 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.3 }}
                className={`p-4 mb-2 rounded-xl flex items-center justify-between bg-[#111827] hover:bg-[#1a2333] transition-all shadow-lg border-y border-r border-[#1f2937] ${isComparing ? 'border-l-4' : 'border-l border-[#1f2937]'}`}
                style={isComparing ? { borderLeftColor: COLORS[idx % COLORS.length] } : {}}
              >
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <div>
                    <div className="text-white font-bold">{p.name}</div>
                    <div className="text-gray-400 text-xs mt-1">Cost: <span className="text-gray-300 font-mono">${p.keyObjectives?.cost?.toFixed(2)}</span> | Energy: <span className="text-gray-300 font-mono">{p.keyObjectives?.energyDensity?.toFixed(0)}</span> Wh/kg</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors ${isComparing ? 'text-purple-400' : isDisabled ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}>
                    <input 
                      type="checkbox" 
                      className="accent-purple-500 w-3.5 h-3.5"
                      checked={isComparing}
                      disabled={isDisabled}
                      onChange={() => handleToggleCompare(p.id)}
                    />
                    Compare
                  </label>
                  <div className="font-bold bg-[#111827] px-2 py-1 rounded border text-xs" style={{ borderColor: `${COLORS[idx % COLORS.length]}40`, color: COLORS[idx % COLORS.length], boxShadow: `0 0 10px ${COLORS[idx % COLORS.length]}30` }}>Rank #{idx + 1}</div>
                </div>
              </motion.div>
            )})}
          </div>
        </div>
      </div>
      </motion.div>

      {/* ----------------- DIGITAL TWIN ----------------- */}
      <motion.div 
        id="digital-twin-section"
        initial={{ opacity: 0, y: 20 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true }}
        className="bg-[#0B0C10] p-8 rounded-2xl border border-[#1f2937] shadow-xl relative"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="text-purple-500" size={24} />
            <h2 className="text-2xl font-bold text-white">{topCandidate?.name || 'Loading...'}</h2>
          </div>
          <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-sm font-bold border border-emerald-500/30 flex items-center gap-1.5 shadow-lg shadow-emerald-500/10">
            <Thermometer size={16} /> LOW RISK
          </span>
        </div>
        <p className="text-gray-400 text-sm mb-6">{topCandidate?.name?.split(' ')[0]} • cathode • Digital Twin</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-[#111827] p-5 rounded-xl border border-[#1f2937]">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Capacity</div>
            <div className="text-blue-400 text-2xl font-bold font-mono"><CountUp value={dtData?.electrochemical?.predictedCapacityMahG || 0} /></div>
            <div className="text-gray-500 text-xs mt-1">mAh/g</div>
          </div>
          <div className="bg-[#111827] p-5 rounded-xl border border-[#1f2937]">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Peak Temp</div>
            <div className="text-red-400 text-2xl font-bold font-mono"><CountUp value={dtData?.thermal?.peakTemperatureCelsius || 0} decimals={1} /></div>
            <div className="text-gray-500 text-xs mt-1">°C</div>
          </div>
          <div className="bg-[#111827] p-5 rounded-xl border border-[#1f2937]">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Cycle Life</div>
            <div className="text-emerald-400 text-2xl font-bold font-mono"><CountUp value={topCandidate?.keyMetrics?.cycleLifeTo80SOH || 0} /></div>
            <div className="text-gray-500 text-xs mt-1">cycles</div>
          </div>
          <div className="bg-[#111827] p-5 rounded-xl border border-[#1f2937] relative overflow-hidden">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2 relative z-10">Sim Confidence</div>
            <div className="text-purple-400 text-2xl font-bold font-mono relative z-10"><CountUp value={(dtData?.electrochemical?.simulationConfidence || 0) * 100} />%</div>
            <div className="text-gray-500 text-xs mt-1 relative z-10">accuracy</div>
            {/* SVG Progress Ring */}
            <svg className="absolute -right-4 -bottom-4 w-24 h-24 opacity-20 -rotate-90 z-0">
              <circle cx="48" cy="48" r="36" stroke="#374151" strokeWidth="6" fill="none" />
              <motion.circle 
                cx="48" cy="48" r="36" 
                stroke="#a855f7" strokeWidth="6" fill="none" 
                strokeDasharray="226"
                initial={{ strokeDashoffset: 226 }}
                whileInView={{ strokeDashoffset: 226 - (226 * (dtData?.electrochemical?.simulationConfidence || 0)) }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Tabs - Moved above the charts so columns can stretch equally without height mismatch */}
        <div className="w-full xl:w-[calc(66.666%-20px)] mb-6">
          <div className="flex gap-2 bg-[#111827] p-1.5 rounded-xl border border-[#1f2937]">
            <button onClick={() => setDtTab('voltage')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${dtTab === 'voltage' ? 'bg-[#374151] text-white shadow' : 'text-gray-400 hover:text-white hover:bg-[#1f2937]'}`}>
              <ZapIcon size={16} className={dtTab === 'voltage' ? 'text-yellow-500' : ''} /> Voltage
            </button>
            <button onClick={() => setDtTab('thermal')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${dtTab === 'thermal' ? 'bg-[#374151] text-white shadow' : 'text-gray-400 hover:text-white hover:bg-[#1f2937]'}`}>
              <Thermometer size={16} className={dtTab === 'thermal' ? 'text-red-400' : ''} /> Thermal
            </button>
            <button onClick={() => setDtTab('degradation')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${dtTab === 'degradation' ? 'bg-[#374151] text-white shadow' : 'text-gray-400 hover:text-white hover:bg-[#1f2937]'}`}>
              <Activity size={16} className={dtTab === 'degradation' ? 'text-pink-400' : ''} /> Degradation
            </button>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-10 items-stretch">
          {/* Left Column: Charts Container */}
          <div className="w-full xl:w-2/3 bg-[#111827] p-6 rounded-xl border border-[#1f2937] relative flex flex-col justify-center min-h-[350px] shadow-2xl z-20">
          {isSimulating && (
            <div className="absolute inset-0 bg-[#0B0C10]/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl">
              <Loader2 className="animate-spin text-purple-500 mb-4" size={48} />
              <div className="text-white font-bold">Running Digital Twin Simulation...</div>
            </div>
          )}

          <AnimatePresence mode="wait">
          {dtTab === 'voltage' && (
            <motion.div key="voltage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full flex-1">
              <h4 className="text-white font-bold mb-6 flex items-center gap-2"><ZapIcon size={18} className="text-yellow-500"/> Discharge Voltage Curve (P2D-DFN)</h4>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <LineChart margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="capacity" type="number" domain={[0, 250]} allowDuplicatedCategory={false} stroke="#6b7280" tick={{fill: '#9ca3af', fontSize: 12}} label={{ value: 'Capacity (mAh/g)', position: 'bottom', fill: '#9ca3af', offset: 0 }} />
                    <YAxis domain={[2, 5]} stroke="#6b7280" tick={{fill: '#9ca3af', fontSize: 12}} label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft', fill: '#9ca3af', offset: 15 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                    {activeCandidatesDt.length > 1 && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
                    {activeCandidatesDt.map((cand, idx) => (
                      <Line 
                        key={cand.materialId}
                        data={cand.electrochemical?.voltageProfile || []}
                        type="monotone" 
                        dataKey="voltage" 
                        name={allCandidates?.find(c => c.id === cand.materialId)?.name || 'Top Candidate'}
                        stroke={COLORS[idx % COLORS.length]} 
                        strokeWidth={3} 
                        dot={false} 
                        activeDot={{ r: 6 }} 
                        isAnimationActive={true}
                        animationDuration={1500}
                        animationEasing="ease-out"
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
          {dtTab === 'thermal' && (
            <motion.div key="thermal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full flex-1">
              <h4 className="text-white font-bold mb-6 flex items-center gap-2"><Thermometer size={18} className="text-red-400"/> Thermal Profile</h4>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <LineChart margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="timeSeconds" type="number" domain={([dataMin, dataMax]) => getPaddedDomain(dataMin, dataMax, true)} allowDuplicatedCategory={false} stroke="#6b7280" tick={{fill: '#9ca3af', fontSize: 12}} label={{ value: 'Time (s)', position: 'bottom', fill: '#9ca3af', offset: 0 }} />
                    <YAxis domain={[0, 120]} stroke="#6b7280" tick={{fill: '#9ca3af', fontSize: 12}} label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', fill: '#9ca3af', offset: 15 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                    {activeCandidatesDt.length > 1 && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
                    {activeCandidatesDt.map((cand, idx) => (
                      <Line 
                        key={cand.materialId}
                        data={cand.thermal?.temperatureProfile || []}
                        type="monotone" 
                        dataKey="temperatureCelsius" 
                        name={allCandidates?.find(c => c.id === cand.materialId)?.name || 'Top Candidate'}
                        stroke={COLORS[idx % COLORS.length]} 
                        strokeWidth={3} 
                        dot={false} 
                        activeDot={{ r: 6 }} 
                        isAnimationActive={true}
                        animationDuration={1500}
                        animationEasing="ease-out"
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
          {dtTab === 'degradation' && (
            <motion.div key="degradation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full flex-1">
              <h4 className="text-white font-bold mb-6 flex items-center gap-2"><Activity size={18} className="text-pink-400"/> Capacity Retention Curve</h4>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <LineChart margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="cycle" type="number" domain={([dataMin, dataMax]) => getPaddedDomain(dataMin, dataMax, true)} allowDuplicatedCategory={false} stroke="#6b7280" tick={{fill: '#9ca3af', fontSize: 12}} label={{ value: 'Cycle Number', position: 'bottom', fill: '#9ca3af', offset: 0 }} />
                    <YAxis domain={[0, 100]} stroke="#6b7280" tick={{fill: '#9ca3af', fontSize: 12}} label={{ value: 'Capacity Retention (%)', angle: -90, position: 'insideLeft', fill: '#9ca3af', offset: 15 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                    {activeCandidatesDt.length > 1 && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
                    {activeCandidatesDt.map((cand, idx) => (
                      <Line 
                        key={cand.materialId}
                        data={cand.mechanical?.degradationCurve || []}
                        type="monotone" 
                        dataKey="capacityRetentionPct" 
                        name={allCandidates?.find(c => c.id === cand.materialId)?.name || 'Top Candidate'}
                        stroke={COLORS[idx % COLORS.length]} 
                        strokeWidth={3} 
                        dot={false} 
                        activeDot={{ r: 6 }} 
                        isAnimationActive={true}
                        animationDuration={1500}
                        animationEasing="ease-out"
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Controls */}
          <div className="w-full xl:w-1/3 bg-[#111827] p-6 rounded-xl border border-[#1f2937] flex flex-col shadow-2xl z-20">
          <h4 className="text-white text-lg font-bold mb-6 flex items-center gap-2"><RefreshCw size={20} className="text-purple-400" /> Re-run Simulation</h4>
          <div className="flex flex-col justify-center gap-10 mb-8 flex-1">
            
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">Charge/Discharge C-Rate</span>
                <span className="text-white font-bold font-mono bg-[#1f2937] px-2 py-0.5 rounded">{cRate.toFixed(1)}C</span>
              </div>
              <input type="range" min="0.1" max="5" step="0.1" value={cRate} onChange={e => setCRate(parseFloat(e.target.value))} className="w-full h-2 bg-[#374151] rounded-lg appearance-none cursor-pointer accent-purple-500" />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">Ambient Temperature</span>
                <span className="text-white font-bold font-mono bg-[#1f2937] px-2 py-0.5 rounded">{ambientTemp.toFixed(1)}°C</span>
              </div>
              <input type="range" min="-20" max="60" step="1" value={ambientTemp} onChange={e => setAmbientTemp(parseFloat(e.target.value))} className="w-full h-2 bg-[#374151] rounded-lg appearance-none cursor-pointer accent-red-500" />
            </div>
          </div>
          <motion.button 
            layout
            onClick={handleReRun}
            disabled={isSimulating}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isSimulating ? 'bg-[#374151] text-gray-400 cursor-not-allowed' : simSuccess ? 'bg-emerald-500 text-white shadow-emerald-500/50' : 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-purple-500/20 active:scale-[0.99]'}`}
          >
            {isSimulating ? (
              <motion.div key="simulating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={18} /> Simulating...
              </motion.div>
            ) : simSuccess ? (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                <ShieldCheck size={18} /> Simulation Complete
              </motion.div>
            ) : (
              <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                <ZapIcon size={18} /> Run at {cRate.toFixed(1)}C & {ambientTemp}°C
              </motion.div>
            )}
          </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ----------------- COMPARE SLIDE-UP BAR ----------------- */}
      <AnimatePresence>
        {comparisonIds.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1f2937]/90 backdrop-blur-md border border-[#374151] shadow-[0_10px_40px_rgba(0,0,0,0.5)] px-6 py-4 rounded-full z-50 flex items-center gap-6"
          >
            <div className="flex items-center gap-2">
              <ZapIcon size={20} className="text-purple-400" />
              <span className="text-white font-bold">{comparisonIds.length} Candidates Selected</span>
            </div>
            <div className="text-gray-400 text-sm">Scroll down to view side-by-side Digital Twin comparison</div>
            <button 
              onClick={() => document.getElementById('digital-twin-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-[0_0_15px_rgba(147,51,234,0.4)] transition-colors"
            >
              View Comparison
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
