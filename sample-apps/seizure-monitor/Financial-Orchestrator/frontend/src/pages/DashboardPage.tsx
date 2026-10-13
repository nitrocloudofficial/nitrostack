import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);

  const defaultData = {
    healthScore: { score: 89, dimensions: { 'Emergency Fund': 85, 'Insurance': 90 } },
    wealthPaths: { currentNetWorth: 2050000 }
  };

  useEffect(() => {
    fetch('/api/dashboard/user-001')
      .then(res => res.json())
      .then(json => {
        if (!json.error && json.wealthPaths) {
          setData(json);
        } else {
          setData(defaultData);
        }
      })
      .catch(() => setData(defaultData));
  }, []);


  const getScoreColor = (score: number) => {
    if (score >= 80) return '#00FF87';
    if (score >= 50) return '#FFC371';
    return '#FF5F6D';
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">System Overview</h1>
          <p className="page-subtitle">Real-time Orchestrator State</p>
        </div>
        <div style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00F0FF', border: '1px solid rgba(0, 240, 255, 0.3)', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
          LIVE
        </div>
      </header>

      {data ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#8B949E' }}>Current Net Worth</h3>
            <div style={{ fontSize: '56px', fontWeight: 800 }}>₹{(data.wealthPaths.currentNetWorth / 100000).toFixed(1)}L</div>
          </div>
          
          <div className="glass-panel" style={{ position: 'relative', height: '240px' }}>
            <h3 style={{ margin: '0 0 0 0', color: '#8B949E', position: 'absolute', top: 32, left: 32, zIndex: 10 }}>Overall Health Score</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Score', value: data.healthScore.score },
                    { name: 'Remaining', value: 100 - data.healthScore.score }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  startAngle={180}
                  endAngle={0}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={true}
                >
                  <Cell fill={getScoreColor(data.healthScore.score)} style={{ filter: `drop-shadow(0px 0px 8px ${getScoreColor(data.healthScore.score)})` }} />
                  <Cell fill="rgba(255,255,255,0.05)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, color: getScoreColor(data.healthScore.score) }}>{data.healthScore.score}</div>
              <div style={{ fontSize: '12px', color: '#8B949E' }}>OUT OF 100</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel">Loading telemetry...</div>
      )}
    </div>
  );
};
