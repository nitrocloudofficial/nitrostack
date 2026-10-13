import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { searchCustomLoans } from '../lib/customLoanSearchEngine';
import type { CustomLoanResult } from '../lib/customLoanSearchEngine';

export const CustomLoanSearch: React.FC<{ userId: string }> = ({ userId }) => {
  const [amount, setAmount] = useState<number>(500000);
  const [tenure, setTenure] = useState<number>(60);
  const [targetRate, setTargetRate] = useState<number>(10);
  const [loanType, setLoanType] = useState<string>('PERSONAL_LOAN');

  const [results, setResults] = useState<CustomLoanResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setExpandedCard(null);
    try {
      const res = await searchCustomLoans(userId, amount, tenure, targetRate, loanType);
      setResults(res);
    } catch (err) {
      console.error(err);
      alert('Error performing custom loan search.');
    }
    setLoading(false);
  };

  const handleApplyHITL = async (loan: CustomLoanResult) => {
    const payload = {
      bankName: loan.bankName,
      loanType: loan.loanType,
      interestRate: loan.interestRate,
      requestedAmount: amount,
      tenureMonths: tenure
    };

    const { error } = await supabase
      .from('action_payloads')
      .insert([{
        user_id: userId,
        type: 'LOAN_APPLICATION',
        status: 'DRAFTED',
        payload: payload,
        plain_english_summary: `Drafted a custom ${loan.loanType.replace('_', ' ')} application with ${loan.bankName} at ${loan.interestRate}% interest for ₹${amount}.`,
        estimated_impact: `Estimated EMI: ₹${loan.estimatedEmi.toLocaleString('en-IN')} for ${tenure} months.`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }]);

    if (error) {
      alert(`Failed to draft application: ${error.message}`);
    } else {
      alert(`✅ Custom loan application drafted! Check HITL Approvals queue.`);
    }
  };

  return (
    <div style={{ marginTop: '48px', paddingBottom: '64px' }}>
      <h2 style={{ fontSize: '24px', margin: '0 0 24px 0', color: '#FFF' }}>On-Demand Custom Loan Search</h2>
      
      {/* Search Input Bar */}
      <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '16px', alignItems: 'end', marginBottom: '32px', padding: '24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#8B949E', marginBottom: '8px' }}>Loan Amount (₹)</label>
          <input 
            type="number" 
            value={amount} 
            onChange={e => setAmount(Number(e.target.value))}
            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFF' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#8B949E', marginBottom: '8px' }}>Desired Tenure (Months)</label>
          <select 
            value={tenure} 
            onChange={e => setTenure(Number(e.target.value))}
            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFF' }}
          >
            <option value={12}>12 Months (1 Yr)</option>
            <option value={24}>24 Months (2 Yrs)</option>
            <option value={36}>36 Months (3 Yrs)</option>
            <option value={48}>48 Months (4 Yrs)</option>
            <option value={60}>60 Months (5 Yrs)</option>
            <option value={72}>72 Months (6 Yrs)</option>
            <option value={84}>84 Months (7 Yrs)</option>
            <option value={120}>120 Months (10 Yrs)</option>
            <option value={240}>240 Months (20 Yrs)</option>
            <option value={360}>360 Months (30 Yrs)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#8B949E', marginBottom: '8px' }}>Target Interest Rate (%)</label>
          <input 
            type="number" 
            step="0.1"
            value={targetRate} 
            onChange={e => setTargetRate(Number(e.target.value))}
            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFF' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#8B949E', marginBottom: '8px' }}>Loan Type</label>
          <select 
            value={loanType} 
            onChange={e => setLoanType(e.target.value)}
            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFF' }}
          >
            <option value="PERSONAL_LOAN">Personal Loan</option>
            <option value="HOME_LOAN">Home Loan</option>
            <option value="AUTO_LOAN">Auto Loan</option>
            <option value="EDUCATION_LOAN">Education Loan</option>
          </select>
        </div>
        <button 
          onClick={handleSearch}
          disabled={loading}
          style={{ 
            height: '42px',
            padding: '0 24px', 
            background: 'linear-gradient(135deg, #00FF87, #00C9FF)', 
            border: 'none', 
            borderRadius: '8px', 
            color: '#000', 
            fontWeight: 'bold', 
            cursor: loading ? 'not-allowed' : 'pointer' 
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Results Grid */}
      {results && (
        <>
          {results.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: '#8B949E' }}>
              No loans match these exact strict criteria. Try adjusting your amount, tenure, or checking your credit score.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {results.map((loan) => {
                // Determine color based on matchScore
                const badgeColor = loan.matchScore >= 80 ? '#00FF87' : loan.matchScore >= 50 ? '#FFC371' : '#FF5F6D';
                const badgeBg = loan.matchScore >= 80 ? 'rgba(0,255,135,0.1)' : loan.matchScore >= 50 ? 'rgba(255,195,113,0.1)' : 'rgba(255,95,109,0.1)';

                return (
                  <div key={loan.policyId} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '24px' }}>
                    
                    {/* Header & Match Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', margin: 0, color: '#FFF' }}>{loan.bankName}</h3>
                        <span style={{ fontSize: '12px', color: '#8B949E' }}>{loan.loanType.replace('_', ' ')}</span>
                      </div>
                      <div style={{ background: badgeBg, color: badgeColor, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        {loan.matchScore}% Optimal Match
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#8B949E' }}>Interest Rate</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFF' }}>{loan.interestRate}% <span style={{fontSize: '12px', color: '#8B949E'}}>p.a.</span></div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#8B949E' }}>Max Tenure</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFF' }}>{loan.maxTenureMonths} <span style={{fontSize: '12px', color: '#8B949E'}}>mos</span></div>
                      </div>
                    </div>

                    {/* EMI Display */}
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ fontSize: '12px', color: '#8B949E' }}>Est. Monthly EMI (for ₹{(amount / 100000).toFixed(1)} Lakhs)</div>
                      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFD700' }}>
                        ₹{loan.estimatedEmi.toLocaleString('en-IN')}
                      </div>
                      {loan.isHighRisk && (
                         <div style={{ fontSize: '12px', color: '#FF5F6D', marginTop: '4px' }}>
                           ⚠️ Exceeds safe 50% FOIR capacity
                         </div>
                      )}
                    </div>

                    {/* XAI Accordion */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
                      <button 
                        onClick={() => setExpandedCard(expandedCard === loan.policyId ? null : loan.policyId)}
                        style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none', color: '#FFF', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}
                      >
                        <span>🤖 Why this loan? (XAI Insights)</span>
                        <span>{expandedCard === loan.policyId ? '▼' : '▶'}</span>
                      </button>
                      
                      {expandedCard === loan.policyId && (
                        <div style={{ padding: '0 12px 12px 12px', fontSize: '13px', color: '#8B949E' }}>
                          <p style={{ color: '#E5E7EB', margin: 0 }}>{loan.xaiInsights}</p>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
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
                        transition: 'all 0.2s',
                        width: '100%'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(112,0,255,0.4)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(112,0,255,0.2)'}
                    >
                      Apply via HITL Approval
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
