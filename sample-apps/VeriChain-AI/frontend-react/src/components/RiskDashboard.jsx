import React, { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Shield, ShieldAlert, ShieldCheck, TrendingUp, AlertTriangle } from 'lucide-react';

export default function RiskDashboard({ user, token }) {
  const [decisions, setDecisions] = useState([]);
  const [selectedDecisionId, setSelectedDecisionId] = useState('');
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDecisions = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const res = await fetch('/api/decisions', { headers });
        const data = await res.json();
        setDecisions(data);
        if (data.length > 0) {
          setSelectedDecisionId(data[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load decisions:', err.message);
        setLoading(false);
      }
    };
    fetchDecisions();
  }, [token]);

  useEffect(() => {
    if (!selectedDecisionId) return;

    const fetchRiskDetails = async () => {
      setLoading(true);
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const res = await fetch(`/api/reports/${selectedDecisionId}/json`, { headers });
        if (res.ok) {
          const data = await res.json();
          setRiskData(data.risks || null);
        } else {
          setRiskData(null);
        }
      } catch (err) {
        console.error('Failed to fetch risk details:', err.message);
        setRiskData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRiskDetails();
  }, [selectedDecisionId, token]);

  if (decisions.length === 0) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <TrendingUp className="text-blue-500" size={30} />
            Risk Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-1">Multi-dimensional risk assessment and security scoring matrix.</p>
        </div>
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-12 text-center max-w-md mx-auto flex flex-col items-center">
          <Shield size={36} className="text-gray-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Audits Run Yet</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Please run compliance queries in the Decision Engine to compile risk ratings.
          </p>
        </div>
      </div>
    );
  }

  const getRadarData = () => {
    if (!riskData) return [];
    return [
      { category: 'Financial', score: riskData.financial_risk || 0 },
      { category: 'Compliance', score: riskData.compliance_risk || 0 },
      { category: 'Operational', score: riskData.operational_risk || 0 },
      { category: 'Business', score: riskData.business_risk || 0 }
    ];
  };

  const radarData = getRadarData();
  const overallScore = riskData ? riskData.overall_risk_score : 0;

  // Status configuration
  let statusText = 'SECURE STANDING';
  let statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  let StatusIcon = ShieldCheck;
  let radarColor = '#10b981';

  if (overallScore > 65) {
    statusText = 'CRITICAL WARNING';
    statusBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    StatusIcon = ShieldAlert;
    radarColor = '#ef4444';
  } else if (overallScore > 35) {
    statusText = 'ELEVATED RISK';
    statusBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    StatusIcon = AlertTriangle;
    radarColor = '#f59e0b';
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <TrendingUp className="text-blue-500" size={30} />
          Risk Dashboard
        </h1>
        <p className="text-sm text-gray-400 mt-1">Multi-dimensional risk assessment and security scoring matrix.</p>
      </div>

      {/* Selector Card */}
      <div className="bg-glassBg border border-glassBorder rounded-2xl p-5 shadow-xl backdrop-blur-xl">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          Select Decision Context for Risk Audit
        </label>
        <select 
          className="w-full px-4 py-3 bg-gray-950/80 border border-glassBorder rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
          value={selectedDecisionId}
          onChange={e => setSelectedDecisionId(e.target.value)}
        >
          {decisions.map(d => (
            <option key={d.id} value={d.id}>
              Audit #{d.id}: {d.query.substring(0, 50)}...
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-xs text-gray-500 animate-pulse">Calculating threat scores...</div>
      ) : riskData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Radar Category Chart */}
          <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-4">
            <h3 className="text-base font-bold text-white">Risk Category Rating</h3>
            
            <div className="w-full h-[280px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="rgba(255, 255, 255, 0.05)" />
                  <PolarAngleAxis dataKey="category" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#4b5563" tick={{ fill: '#4b5563', fontSize: 9 }} />
                  <Radar
                    name="Risk Score"
                    dataKey="score"
                    stroke={radarColor}
                    fill={radarColor}
                    fillOpacity={0.2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Overall Security status & reasoning checklist */}
          <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-6">
            <h3 className="text-base font-bold text-white">Overall Security Status</h3>
            
            <div className="bg-gray-950/40 border border-glassBorder/60 rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-3">
              <StatusIcon size={42} className={overallScore > 65 ? 'text-rose-400' : (overallScore > 35 ? 'text-amber-400' : 'text-emerald-400')} />
              <h2 className="text-5xl font-black tracking-tight text-white">{overallScore}%</h2>
              <span className={`px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider ${statusBadge}`}>
                {statusText}
              </span>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Risk Audit Findings:</h4>
              {riskData.reasons && riskData.reasons.length > 0 ? (
                <ul className="space-y-2 text-xs text-gray-300">
                  {riskData.reasons.map((reason, index) => (
                    <li key={index} className="flex gap-2 items-start leading-relaxed">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-emerald-400 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                  ✓ Zero critical risk parameters flagged. Secure alignment verified.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-8 text-center text-xs text-gray-500">
          Failed to load risk details for this audit selection.
        </div>
      )}
    </div>
  );
}
