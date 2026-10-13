import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculateAlternativeCreditScore, calculateBRVScore } from '../lib/scoringEngine';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export const ScoringDashboard: React.FC<{ userId: string }> = ({ userId }) => {
  const [altScore, setAltScore] = useState<any>(null);
  const [brvScores, setBrvScores] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const fetchScores = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_scores')
      .select('*')
      .eq('user_id', userId);
    
    if (data) {
      setAltScore(data.find(s => s.score_type === 'ALTERNATIVE_CREDIT') || null);
      setBrvScores(data.filter(s => s.score_type === 'BRV') || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchScores();
  }, [userId]);

  const handleSimulate = async () => {
    setSimulating(true);
    await calculateAlternativeCreditScore(userId);
    await calculateBRVScore(userId);
    await fetchScores();
    setSimulating(false);
  };

  const getScoreColor = (grade: string) => {
    if (grade === 'EXCELLENT') return '#00FF87';
    if (grade === 'GOOD') return '#00F0FF';
    if (grade === 'FAIR') return '#FFC371';
    return '#FF5F6D';
  };

  const getBrvPerk = (score: number) => {
    if (score >= 850) return 'Pre-approved Auto Loan Unlocked';
    if (score >= 700) return '0% Processing Fees Unlocked';
    if (score >= 500) return 'Priority Customer Support';
    return 'Standard Tier';
  };

  return (
    <div style={{ marginTop: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', color: '#FFF' }}>Dual-Scoring Engine</h2>
        <button 
          onClick={handleSimulate}
          disabled={simulating}
          style={{
            padding: '10px 20px',
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.5)',
            color: '#00F0FF',
            borderRadius: '8px',
            cursor: simulating ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          {simulating ? 'Evaluating Telemetry...' : '⚡ Simulate & Re-evaluate Live Data'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        
        {/* Alt Credit Score Card */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px' }}>
          <h3 style={{ margin: '0 0 24px 0', color: '#8B949E' }}>Alternative Credit Score</h3>
          
          {altScore ? (
            <>
              <div style={{ position: 'relative', width: '200px', height: '120px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Score', value: altScore.score_value - 300 },
                        { name: 'Remaining', value: 850 - altScore.score_value }
                      ]}
                      cx="50%"
                      cy="100%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={80}
                      outerRadius={100}
                      dataKey="value"
                      stroke="none"
                      isAnimationActive={true}
                    >
                      <Cell fill={getScoreColor(altScore.grade)} style={{ filter: `drop-shadow(0px 0px 8px ${getScoreColor(altScore.grade)})` }} />
                      <Cell fill="rgba(255,255,255,0.05)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 800, color: getScoreColor(altScore.grade) }}>
                    {altScore.score_value}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8B949E', fontWeight: 'bold' }}>{altScore.grade}</div>
                </div>
              </div>

              {/* Metrics Breakdown */}
              <div style={{ width: '100%', marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#8B949E' }}>
                    <span>Inflow Stability</span>
                    <span>{altScore.metrics_breakdown.inflow_stability}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                    <div style={{ width: `${altScore.metrics_breakdown.inflow_stability}%`, height: '100%', background: '#00F0FF', borderRadius: '3px' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#8B949E' }}>
                    <span>FOIR Capacity</span>
                    <span>{altScore.metrics_breakdown.foir_percentage}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                    <div style={{ width: `${altScore.metrics_breakdown.foir_percentage}%`, height: '100%', background: '#FFC371', borderRadius: '3px' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#8B949E' }}>
                    <span>Stress Resilience</span>
                    <span>{altScore.metrics_breakdown.stress_resilience}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                    <div style={{ width: `${altScore.metrics_breakdown.stress_resilience}%`, height: '100%', background: '#00FF87', borderRadius: '3px' }} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: '#8B949E', textAlign: 'center', marginTop: '40px' }}>
              No score generated yet.<br/>Click Simulate to generate.
            </div>
          )}
        </div>

        {/* BRV Loyalty Ecosystem */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h3 style={{ margin: '0 0 24px 0', color: '#8B949E' }}>Bank Relationship Value (BRV) Ecosystem</h3>
          
          {brvScores.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {brvScores.map(brv => (
                <div key={brv.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ fontWeight: 'bold', color: '#FFF' }}>{brv.bank_name}</div>
                    <div style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: brv.grade === 'PLATINUM' ? '#E5E4E2' : brv.grade === 'GOLD' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(192, 192, 192, 0.2)', color: brv.grade === 'PLATINUM' ? '#000' : brv.grade === 'GOLD' ? '#FFD700' : '#C0C0C0' }}>
                      {brv.grade}
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00F0FF', marginBottom: '8px' }}>
                    {brv.score_value} <span style={{ fontSize: '14px', color: '#8B949E' }}>/ 1000</span>
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#00FF87', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✨</span> {getBrvPerk(brv.score_value)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div style={{ color: '#8B949E', textAlign: 'center', marginTop: '60px' }}>
              No bank relationships found to score.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
