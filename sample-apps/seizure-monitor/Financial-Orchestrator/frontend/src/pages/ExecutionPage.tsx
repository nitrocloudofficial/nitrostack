import React from 'react';
import { HitlApprovalCard } from '../components/hitl-approval-card';
import { SafeToSpendMeter } from '../components/safe-to-spend-meter';

export const ExecutionPage: React.FC = () => {
  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Execution Engine</h1>
          <p className="page-subtitle">Human-In-The-Loop (HITL) Approvals</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <HitlApprovalCard 
          actionId="EXEC-982-XYZ" 
          summary="Liquidate ₹15,600 from Liquid Mutual Fund to cover incoming EMI shortage." 
          impact="Prevents EMI bounce penalty of ₹500 and protects Credit Score." 
          expiresAt={new Date(Date.now() + 86400000).toISOString()} 
        />
        
        <SafeToSpendMeter 
          safeAmount={45000} 
          totalBalance={120000} 
          upcomingObligations={35000} 
          savingsTarget={40000} 
        />
      </div>
    </div>
  );
};
