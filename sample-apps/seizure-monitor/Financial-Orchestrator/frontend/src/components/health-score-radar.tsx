import * as React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

export interface HealthScoreRadarProps {
  score: number;
  dimensions: Record<string, number>;
}

export const HealthScoreRadar: React.FC<HealthScoreRadarProps> = ({ score, dimensions }) => {
  // Convert dimensions to recharts format
  const data = Object.entries(dimensions).map(([subject, A]) => ({
    subject,
    A,
    fullMark: 100,
  }));

  const containerStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.8), rgba(10, 10, 15, 0.9))',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '32px',
    color: '#ffffff',
    fontFamily: '"Inter", "Roboto", sans-serif',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    margin: '0 auto',
    position: 'relative',
    overflow: 'hidden',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  };

  const scoreColor = score >= 80 ? '#00FF87' : score >= 50 ? '#FFD700' : '#FF5F6D';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(5,5,10,0.9)', padding: '12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#8B949E' }}>{payload[0].payload.subject}</p>
          <p style={{ margin: 0, fontWeight: 700, color: '#00F0FF' }}>{payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={containerStyle}>
      <div style={{
        position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px',
        background: 'radial-gradient(circle, rgba(0,198,255,0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%'
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', position: 'relative', zIndex: 2 }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 4px 0', background: 'linear-gradient(45deg, #00C6FF, #0072FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Health Score
          </h2>
          <div style={{ fontSize: '13px', color: '#8B949E' }}>6-Dimensional RBI/SEBI DNA</div>
        </div>
        
        {/* Massive Score Display */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '56px', fontWeight: 800, color: scoreColor, lineHeight: '1', textShadow: `0 0 20px ${scoreColor}40` }}>
            {score}
          </div>
          <div style={{ fontSize: '12px', color: '#8B949E', fontWeight: 600, letterSpacing: '2px', marginTop: '4px' }}>
            OUT OF 100
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: '450px', position: 'relative', zIndex: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="60%" data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#A3B1C6', fontSize: 13, fontWeight: 500 }} 
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Radar
              name="Health Score"
              dataKey="A"
              stroke="#00F0FF"
              strokeWidth={3}
              fill="url(#radarGradient)"
              fillOpacity={0.4}
            />
            <defs>
              <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#7000FF" stopOpacity={0.9} />
              </linearGradient>
            </defs>
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
