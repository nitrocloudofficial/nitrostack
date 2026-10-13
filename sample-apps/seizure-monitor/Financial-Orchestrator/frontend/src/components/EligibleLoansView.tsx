import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getEligibleLoanOffers } from '../lib/loanEligibilityEngine';
import type { EligibilityResult, EligibleLoanOffer } from '../lib/loanEligibilityEngine';

export const EligibleLoansView: React.FC<{ userId: string; targetAmount: number; targetLoanType: string }> = ({
  userId, targetAmount, targetLoanType
}) => {
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getEligibleLoanOffers(userId, targetAmount, targetLoanType)
      .then(res => {
        setResult(res);
        setLoading(false);
      })
      .catch(err => {
        console.error('EligibleLoansView error:', err);
        setLoading(false);
      });
  }, [userId, targetAmount, targetLoanType]);

  const handleApplyHITL = async (offer: EligibleLoanOffer) => {
    const payload = {
      bankName: offer.bankName,
      loanType: offer.loanType,
      interestRate: offer.discountedRate,
      originalRate: offer.originalRate,
      processingFeePercent: offer.discountedProcessingFee,
      requestedAmount: offer.requestedAmount,
      tenureMonths: offer.maxTenureMonths,
      isPreApproved: offer.isPreApproved,
      brvScore: offer.brvScore,
      brvTier: offer.brvTier
    };

    const { error } = await supabase
      .from('action_payloads')
      .insert([{
        user_id: userId,
        type: 'LOAN_APPLICATION',
        status: 'DRAFTED',
        payload,
        plain_english_summary: `${offer.isPreApproved ? '[PRE-APPROVED] ' : ''}Drafted ${offer.loanType.replace(/_/g, ' ')} application with ${offer.bankName} at BRV-discounted rate of ${offer.discountedRate}% (original: ${offer.originalRate}%).`,
        estimated_impact: `EMI: ₹${offer.estimatedEmi.toLocaleString('en-IN')}/mo for ${offer.maxTenureMonths} months. Processing fee: ${offer.discountedProcessingFee}%.`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }]);

    if (error) {
      alert(`Failed to draft application: ${error.message}`);
    } else {
      alert(`✅ Loan application drafted! Check HITL Approvals queue.`);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: '#8B949E' }}>
        Evaluating eligible loan offers based on your Alt Credit Score & BRV relationships...
      </div>
    );
  }

  if (!result || result.offers.length === 0) {
    return (
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '24px', color: '#FFF', marginBottom: '16px' }}>Eligible Loan Offers</h2>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: '#8B949E' }}>
          No eligible offers found. Ensure you have run the Scoring Engine first (click "Simulate & Re-evaluate" above), and that your Alt Credit Score meets the minimum thresholds of your connected banks' policies.
        </div>
      </div>
    );
  }

  const getGradeColor = (grade: string) => {
    if (grade === 'EXCELLENT') return '#00FF87';
    if (grade === 'GOOD') return '#00F0FF';
    if (grade === 'FAIR') return '#FFC371';
    return '#FF5F6D';
  };

  return (
    <div style={{ marginTop: '48px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', borderLeft: '4px solid #00F0FF' }}>
        <p style={{ margin: 0, color: '#E5E7EB', fontSize: '15px', lineHeight: '1.6' }}>
          Based on your Alternative Credit Score of{' '}
          <span style={{ color: getGradeColor(result.altCreditGrade), fontWeight: 'bold', fontSize: '18px' }}>
            {result.altCreditScore}
          </span>{' '}
          <span style={{ color: '#8B949E' }}>({result.altCreditGrade})</span> and your banking history, you are eligible for the following{' '}
          <span style={{ color: '#00FF87', fontWeight: 'bold' }}>exclusive pre-filtered</span> offers.
        </p>
      </div>

      <h2 style={{ fontSize: '24px', color: '#FFF', marginBottom: '24px' }}>
        Pre-Approved Eligible Offers
        <span style={{ fontSize: '14px', color: '#8B949E', marginLeft: '12px' }}>
          ({result.offers.length} match{result.offers.length !== 1 ? 'es' : ''})
        </span>
      </h2>

      {/* Offer Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {result.offers.map(offer => {
          const isTopBrv = offer.bankName === result.highestBrvBank;
          return (
            <div
              key={offer.policyId}
              className="glass-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '28px',
                border: isTopBrv ? '1.5px solid rgba(255, 215, 0, 0.5)' : undefined,
                boxShadow: isTopBrv ? '0 0 20px rgba(255, 215, 0, 0.08)' : undefined,
                position: 'relative'
              }}
            >
              {/* Top BRV Match Badge */}
              {isTopBrv && (
                <div style={{
                  position: 'absolute', top: '-1px', right: '20px',
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: '#000', fontSize: '10px', fontWeight: 800,
                  padding: '4px 12px', borderRadius: '0 0 6px 6px',
                  letterSpacing: '0.5px', textTransform: 'uppercase'
                }}>
                  ⭐ Top BRV Match
                </div>
              )}

              {/* Pre-Approved Badge */}
              {offer.isPreApproved && (
                <div style={{
                  position: 'absolute', top: '-1px', left: '20px',
                  background: 'linear-gradient(135deg, #00FF87, #00C9FF)',
                  color: '#000', fontSize: '10px', fontWeight: 800,
                  padding: '4px 12px', borderRadius: '0 0 6px 6px',
                  letterSpacing: '0.5px', textTransform: 'uppercase'
                }}>
                  Pre-Approved
                </div>
              )}

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: offer.isPreApproved || isTopBrv ? '8px' : '0' }}>
                <div>
                  <h3 style={{ fontSize: '20px', margin: 0, color: '#FFF' }}>{offer.bankName}</h3>
                  <span style={{ fontSize: '12px', color: '#8B949E' }}>{offer.loanType.replace(/_/g, ' ')}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{
                    background: offer.brvTier === 1 ? 'rgba(255,215,0,0.15)' : offer.brvTier === 2 ? 'rgba(192,192,192,0.15)' : 'rgba(205,127,50,0.15)',
                    color: offer.brvTier === 1 ? '#FFD700' : offer.brvTier === 2 ? '#C0C0C0' : '#CD7F32',
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold'
                  }}>
                    BRV {offer.brvScore} · {offer.brvGrade}
                  </div>
                  <div style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00F0FF', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                    {offer.matchScore}% Optimal Match
                  </div>
                </div>
              </div>

              {/* XAI Pricing Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#8B949E', marginBottom: '4px' }}>Interest Rate</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    {offer.rateDiscount > 0 && (
                      <span style={{ fontSize: '14px', color: '#8B949E', textDecoration: 'line-through' }}>
                        {offer.originalRate}%
                      </span>
                    )}
                    <span style={{ fontSize: '22px', fontWeight: 'bold', color: offer.rateDiscount > 0 ? '#00FF87' : '#FFF' }}>
                      {offer.discountedRate}%
                    </span>
                    <span style={{ fontSize: '11px', color: '#8B949E' }}>p.a.</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#8B949E', marginBottom: '4px' }}>Processing Fee</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    {offer.processingFeeSaved > 0 && (
                      <span style={{ fontSize: '14px', color: '#8B949E', textDecoration: 'line-through' }}>
                        {offer.originalProcessingFee}%
                      </span>
                    )}
                    <span style={{ fontSize: '22px', fontWeight: 'bold', color: offer.discountedProcessingFee === 0 ? '#00FF87' : '#FFF' }}>
                      {offer.discountedProcessingFee === 0 ? 'FREE' : `${offer.discountedProcessingFee}%`}
                    </span>
                  </div>
                </div>
              </div>

              {/* EMI & Tenure */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#8B949E', marginBottom: '4px' }}>Est. Monthly EMI</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFC371' }}>
                    ₹{offer.estimatedEmi.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#8B949E', marginBottom: '4px' }}>Max Tenure</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFF' }}>
                    {offer.maxTenureMonths} <span style={{ fontSize: '12px', color: '#8B949E' }}>mos</span>
                  </div>
                </div>
              </div>

              {/* Savings Callout */}
              <div style={{
                background: 'rgba(0, 255, 135, 0.05)',
                border: '1px solid rgba(0, 255, 135, 0.15)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#00FF87', lineHeight: '1.5' }}>
                  💡 {offer.savingsCallout}
                </p>
              </div>

              {/* XAI Section */}
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
                <button 
                  onClick={() => setExpandedCard(expandedCard === offer.policyId ? null : offer.policyId)}
                  style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none', color: '#FFF', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}
                >
                  <span>🤖 Why this loan? (XAI Insights)</span>
                  <span>{expandedCard === offer.policyId ? '▼' : '▶'}</span>
                </button>
                
                {expandedCard === offer.policyId && (
                  <div style={{ padding: '0 12px 12px 12px', fontSize: '13px', color: '#8B949E' }}>
                    <h4 style={{ color: '#FFF', fontSize: '13px', marginBottom: '8px' }}>Eligibility Met:</h4>
                    <ul style={{ paddingLeft: '20px', margin: '0 0 16px 0' }}>
                      {offer.xaiReasoning.eligibilityCriteria.map((crit, i) => (
                        <li key={i} style={{ marginBottom: '4px', color: crit.includes('⚠️') ? '#FFC371' : '#00FF87' }}>{crit}</li>
                      ))}
                    </ul>

                    <h4 style={{ color: '#FFF', fontSize: '13px', marginBottom: '8px' }}>Why this is a good fit:</h4>
                    <p style={{ color: '#E5E7EB', marginBottom: '8px' }}>{offer.xaiReasoning.primaryJustification}</p>
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                      {offer.xaiReasoning.keyHighlights.map((hl, i) => (
                        <li key={i} style={{ marginBottom: '4px', color: hl.includes('Warning') ? '#FF5F6D' : '#00FF87' }}>{hl}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* HITL Button */}
              <button
                onClick={() => handleApplyHITL(offer)}
                style={{
                  marginTop: 'auto',
                  padding: '14px',
                  background: offer.isPreApproved
                    ? 'linear-gradient(135deg, rgba(0,255,135,0.2), rgba(0,240,255,0.2))'
                    : 'rgba(112,0,255,0.2)',
                  border: offer.isPreApproved
                    ? '1px solid rgba(0,255,135,0.4)'
                    : '1px solid rgba(112,0,255,0.5)',
                  borderRadius: '10px',
                  color: '#FFF',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '14px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {offer.isPreApproved ? '🚀 Apply (Pre-Approved) via HITL' : 'Apply via HITL Approval'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
