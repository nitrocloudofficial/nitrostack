import React, { useEffect, useState } from 'react';
import { HealthScoreRadar } from '../components/health-score-radar';
import { CashflowTimeline } from '../components/cashflow-timeline';
import { calculateHealthScore } from '../lib/healthScoreEngine';
import { generateWealthPaths } from '../lib/wealthPathEngine';
import { generateXAIExplanation } from '../lib/xaiOrchestrator';

export const FinancialDNAPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [healthScore, setHealthScore] = useState<any | null>(null);
  const [paths, setPaths] = useState<any | null>(null);
  const [xaiData, setXaiData] = useState<any | null>(null);

  useEffect(() => {
    async function loadDNA() {
      try {
        const userStr = localStorage.getItem('orchestrator_user');
        if (!userStr) {
          window.location.href = '/login';
          return;
        }
        const user = JSON.parse(userStr);
        const userId = user.id || '00000000-0000-4000-a000-000000000001';

        const hs = await calculateHealthScore(userId);
        if (!hs) throw new Error("Failed to calculate health score");
        setHealthScore(hs);

        // Calculate safe to spend (Liquid Cash - Emergency target or just Idle Cash)
        // For demonstration, we'll use a fixed idle cash or deriving it from liquidCash
        const idleCash = Math.max(15000, hs.metadata.liquidCash * 0.10); 
        const userRiskTolerance = user.risk_tolerance || 'MODERATE';

        const wp = generateWealthPaths(hs, idleCash, userRiskTolerance);
        setPaths(wp);

        const xai = await generateXAIExplanation(hs, wp);
        setXaiData(xai);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }
    loadDNA();
  }, []);

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', color: '#8B949E' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🧬</div>
          <div>Sequencing Financial DNA...</div>
          <div style={{ fontSize: '12px', marginTop: '8px' }}>Running SEBI/RBI Benchmarks & Gemini XAI</div>
        </div>
      </div>
    );
  }

  const dimensionsRadar = healthScore ? {
    'Emergency Fund': healthScore.dimensions.emergencyFund,
    'Debt Mgmt': healthScore.dimensions.debtManagement,
    'Active Invest': healthScore.dimensions.activeInvestments,
    'Insurance': healthScore.dimensions.insurance,
    'Tax Efficient': healthScore.dimensions.taxEfficiency,
    'Retirement': healthScore.dimensions.retirement
  } : {};

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Financial DNA & Wealth Paths</h1>
          <p className="page-subtitle">Multi-Dimensional Scoring & Autonomous Allocation</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px', alignItems: 'stretch' }}>
        {/* Radar Chart */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {healthScore && <HealthScoreRadar score={healthScore.masterScore} dimensions={dimensionsRadar} />}
        </div>

        {/* XAI Diagnosis */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="glass-panel" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(0, 240, 255, 0.1)', color: '#00F0FF' }}>🤖</div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>XAI Diagnosis</h2>
                <div style={{ fontSize: '12px', color: '#8B949E' }}>Powered by Gemini</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.6, color: '#E1E7EF', flex: 1 }}>
              {xaiData?.health_score_explanation}
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '48px', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#FFF' }}>Autonomous Wealth Paths</h2>
        <p style={{ margin: '4px 0 0 0', color: '#8B949E', fontSize: '14px' }}>Select an allocation strategy to fix deficits.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {/* Safe Path */}
        {paths?.safe && xaiData && (
          <PathCard 
            path={paths.safe} 
            justification={xaiData.path_justifications.find(j => j.path_name === 'Safe Path')?.justification || ''} 
            themeColor="#00FF87" 
          />
        )}
        {/* Balanced Path */}
        {paths?.balanced && xaiData && (
          <PathCard 
            path={paths.balanced} 
            justification={xaiData.path_justifications.find(j => j.path_name === 'Balanced Path')?.justification || ''} 
            themeColor="#00F0FF" 
          />
        )}
        {/* Aggressive Path */}
        {paths?.aggressive && xaiData && (
          <PathCard 
            path={paths.aggressive} 
            justification={xaiData.path_justifications.find(j => j.path_name === 'Aggressive Path')?.justification || ''} 
            themeColor="#FF3366" 
          />
        )}
      </div>

      {healthScore && (
        <div style={{ marginTop: '48px' }}>
          <CashflowTimeline 
            safeToSpend={healthScore.metadata.liquidCash * 0.1} 
            burnRate={healthScore.metadata.monthlyExpenses} 
            runwayMonths={healthScore.metadata.liquidCash / healthScore.metadata.monthlyExpenses} 
            anomalies={[]} 
          />
        </div>
      )}
    </div>
  );
};

const PathCard: React.FC<{ path: any; justification: string; themeColor: string }> = ({ path, justification, themeColor }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', borderTop: `4px solid ${themeColor}` }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: themeColor }}>{path.name}</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        {path.allocations.map((alloc, idx) => (
          <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFF' }}>{alloc.instrument}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: themeColor }}>₹{alloc.amount.toLocaleString()}</div>
            </div>
            <div style={{ fontSize: '11px', color: '#8B949E', marginTop: '4px' }}>{alloc.reason}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px' }}>
        <div 
          onClick={() => setExpanded(!expanded)} 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '12px', color: '#A3B1C6', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}
        >
          <span>XAI Justification</span>
          <span>{expanded ? '▼' : '▶'}</span>
        </div>
        {expanded && (
          <div style={{ marginTop: '12px', fontSize: '13px', lineHeight: 1.5, color: '#E1E7EF' }}>
            {justification}
          </div>
        )}
      </div>

      <button style={{
        marginTop: '24px',
        width: '100%',
        padding: '12px',
        background: `rgba(${themeColor === '#00FF87' ? '0,255,135' : themeColor === '#00F0FF' ? '0,240,255' : '255,51,102'}, 0.1)`,
        color: themeColor,
        border: `1px solid ${themeColor}`,
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}>
        Execute via HITL
      </button>
    </div>
  );
};
