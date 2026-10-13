import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { evaluateLoanOptions } from '../utils/evaluateLoanOptions';
import type { CreditEngineResult, EvaluatedLoan } from '../utils/evaluateLoanOptions';
import { ScoringDashboard } from '../components/ScoringDashboard';
import { EligibleLoansView } from '../components/EligibleLoansView';
import { CustomLoanSearch } from '../components/CustomLoanSearch';

export const CreditLoanPage: React.FC = () => {
  const [data, setData] = useState<CreditEngineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  // Since the user is passed down to this page, we'll get it from localStorage or context.
  // We'll just grab it from localStorage directly for this component.
  const currentUser = JSON.parse(localStorage.getItem('orchestrator_user') || '{}');

  useEffect(() => {
    if (!currentUser.id) return;
    evaluateLoanOptions(currentUser.id)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(console.error);
  }, [currentUser.id]);

  const handleApplyHITL = async (loan: EvaluatedLoan) => {
    const payload = {
      bankName: loan.bankName,
      loanType: loan.loanType,
      interestRate: loan.interestRate,
      requestedAmount: data?.activeGoalAmount || 100000,
      tenureMonths: loan.maxTenureMonths
    };

    const { error } = await supabase
      .from('action_payloads')
      .insert([{
        user_id: currentUser.id,
        type: 'LOAN_APPLICATION',
        status: 'DRAFTED',
        payload: payload,
        plain_english_summary: `Drafted a loan application for ${loan.loanType.replace('_', ' ')} with ${loan.bankName} at ${loan.interestRate}% interest.`,
        estimated_impact: `Estimated EMI: ₹${loan.estimatedEmi.toLocaleString('en-IN')} for ${loan.maxTenureMonths} months.`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      }]);

    if (error) {
      alert(`Failed to draft application: ${error.message}`);
    } else {
      alert(`Loan application drafted successfully! Check HITL Approvals queue.`);
    }
  };

  if (loading || !data) return <div className="page-container glass-panel">Loading Credit Engine...</div>;

  let targetLoanType = 'HOME_LOAN';
  if (data.activeGoal) {
    const name = data.activeGoal.toLowerCase();
    if (name.includes('car') || name.includes('auto')) targetLoanType = 'AUTO_LOAN';
    else if (name.includes('education') || name.includes('study')) targetLoanType = 'EDUCATION_LOAN';
    else if (!name.includes('home') && !name.includes('house')) targetLoanType = 'PERSONAL_LOAN';
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Credit & Loan Engine</h1>
          <p className="page-subtitle">Alt-Credit Scoring, BRV Loyalty & Proactive Matching</p>
        </div>
      </header>

      {/* 1. Dual-Scoring Engine */}
      <ScoringDashboard userId={currentUser.id} />

      {/* 2. Original Generic Best Policy Feature */}
      <h2 style={{ fontSize: '24px', margin: '48px 0 24px 0', color: '#FFF' }}>Market-Wide Best Loan Option Matches</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#8B949E', fontSize: '14px', marginBottom: '8px' }}>Current Debt-to-Income (FOIR)</h3>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: data.foir < 40 ? '#00FF87' : data.foir < 50 ? '#FFC371' : '#FF5F6D' }}>
            {data.foir}%
          </div>
          <p style={{ fontSize: '12px', color: '#8B949E', marginTop: '4px' }}>
            {data.foir < 40 ? 'Healthy' : data.foir < 50 ? 'Moderate' : 'High Risk'}
          </p>
        </div>

        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#8B949E', fontSize: '14px', marginBottom: '8px' }}>Borrowing Capacity</h3>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#00F0FF' }}>
            ₹{(data.borrowingCapacity / 100000).toFixed(1)}L
          </div>
          <p style={{ fontSize: '12px', color: '#8B949E', marginTop: '4px' }}>Pre-approved dynamic limit</p>
        </div>

        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#8B949E', fontSize: '14px', marginBottom: '8px' }}>Active Financial Goal Linked</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFF' }}>
            {data.activeGoal || 'No Active Goal'}
          </div>
          <p style={{ fontSize: '12px', color: '#8B949E', marginTop: '4px' }}>
            Target: ₹{(data.activeGoalAmount / 100000).toFixed(1)}L
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {data.recommendations.map((loan) => (
          <div key={loan.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '24px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', margin: 0 }}>{loan.bankName}</h3>
                <span style={{ fontSize: '12px', color: '#8B949E' }}>{loan.loanType.replace('_', ' ')}</span>
              </div>
              <div style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00F0FF', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                {loan.matchScore}% Optimal Match
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#8B949E' }}>Interest Rate</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{loan.interestRate}% <span style={{fontSize: '12px', color: '#8B949E'}}>p.a.</span></div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#8B949E' }}>Max Tenure</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{loan.maxTenureMonths} <span style={{fontSize: '12px', color: '#8B949E'}}>mos</span></div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '12px', color: '#8B949E' }}>Est. Monthly EMI (for ₹{(data.activeGoalAmount / 100000).toFixed(1)}L)</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFC371' }}>₹{loan.estimatedEmi.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
              <button 
                onClick={() => setExpandedCard(expandedCard === loan.id ? null : loan.id)}
                style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none', color: '#FFF', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}
              >
                <span>🤖 Why this loan? (XAI Insights)</span>
                <span>{expandedCard === loan.id ? '▼' : '▶'}</span>
              </button>
              
              {expandedCard === loan.id && (
                <div style={{ padding: '0 12px 12px 12px', fontSize: '13px', color: '#8B949E' }}>
                  
                  <h4 style={{ color: '#FFF', fontSize: '13px', marginBottom: '8px' }}>Eligibility Met:</h4>
                  <ul style={{ paddingLeft: '20px', margin: '0 0 16px 0' }}>
                    {loan.xaiReasoning.eligibilityCriteria.map((crit, i) => (
                      <li key={i} style={{ marginBottom: '4px', color: crit.includes('⚠️') ? '#FFC371' : '#00FF87' }}>{crit}</li>
                    ))}
                  </ul>

                  <h4 style={{ color: '#FFF', fontSize: '13px', marginBottom: '8px' }}>Why this is a good fit:</h4>
                  <p style={{ color: '#E5E7EB', marginBottom: '8px' }}>{loan.xaiReasoning.primaryJustification}</p>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {loan.xaiReasoning.keyHighlights.map((hl, i) => (
                      <li key={i} style={{ marginBottom: '4px', color: hl.includes('Warning') ? '#FF5F6D' : '#00FF87' }}>{hl}</li>
                    ))}
                    <li style={{ marginBottom: '4px' }}>Processing Fee: {loan.processingFeePercent}%</li>
                  </ul>
                </div>
              )}
            </div>

            <button 
              onClick={() => handleApplyHITL(loan)}
              style={{ 
                marginTop: 'auto',
                padding: '12px', 
                background: 'rgba(112,0,255,0.2)', 
                border: '1px solid rgba(112,0,255,0.5)', 
                borderRadius: '8px', 
                color: '#FFF', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(112,0,255,0.4)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(112,0,255,0.2)'}
            >
              Apply via HITL Approval
            </button>
          </div>
        ))}

        {data.recommendations.length === 0 && (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: '#8B949E' }}>
            No matching loan policies found for your profile and goal.
          </div>
        )}
      </div>

      <div style={{ height: '48px' }}></div>

      {/* 3. New Eligible Loans View (Filtered strictly to BRV relationships) */}
      <EligibleLoansView
        userId={currentUser.id}
        targetAmount={data.activeGoalAmount || 1500000}
        targetLoanType={targetLoanType}
      />
      
      <div style={{ height: '48px' }}></div>

      {/* 4. On-Demand Custom Loan Search */}
      <CustomLoanSearch userId={currentUser.id} />
      
      <div style={{ height: '64px' }}></div>
    </div>
  );
};
