

export interface Allocation {
  instrument: string;
  amount: number;
  category: string;
  reason: string;
}

export interface WealthPath {
  name: string;
  allocations: Allocation[];
  projectedImpact: {
    dimensionImprovements: Record<string, number>;
  };
}

export function generateWealthPaths(
  health: any,
  safeToSpend: number,
  riskTolerance: string
): { safe: WealthPath; balanced: WealthPath; aggressive: WealthPath } {
  
  const emergencyScore = health.dimensions.emergencyFund;
  const debtScore = health.dimensions.debtManagement;
  const idleCash = safeToSpend;

  // Ensure risk tolerance is handled appropriately but math rules take priority for paths
  
  // ==========================================
  // SAFE PATH: Fix Emergency & Debt
  // Allocates 80% to safety, 20% to low-risk
  // ==========================================
  const safeAllocations: Allocation[] = [];
  const safeImpact: Record<string, number> = {};
  
  const safeSafetyAmount = Math.round(idleCash * 0.8);
  const safeLowRiskAmount = idleCash - safeSafetyAmount;

  if (emergencyScore < 80) {
    safeAllocations.push({
      instrument: 'Liquid BeES / Arbitrage Fund',
      amount: safeSafetyAmount,
      category: 'EMERGENCY_FUND',
      reason: `Directing ₹${safeSafetyAmount} to Liquid Funds to rebuild your 6-month buffer.`
    });
    safeImpact['emergencyFund'] = Math.min(100, emergencyScore + 15);
  } else if (debtScore < 80) {
    safeAllocations.push({
      instrument: 'High-Interest Debt Prepayment',
      amount: safeSafetyAmount,
      category: 'DEBT_MANAGEMENT',
      reason: `Allocating ₹${safeSafetyAmount} to prepay high-interest debt and lower your FOIR.`
    });
    safeImpact['debtManagement'] = Math.min(100, debtScore + 15);
  } else {
    safeAllocations.push({
      instrument: 'Conservative Hybrid Fund',
      amount: safeSafetyAmount,
      category: 'ACTIVE_INVESTMENTS',
      reason: `Safety buckets are full. Allocating ₹${safeSafetyAmount} to low-volatility hybrid funds.`
    });
  }

  safeAllocations.push({
    instrument: 'Short-Term Fixed Deposit',
    amount: safeLowRiskAmount,
    category: 'LOW_RISK_YIELD',
    reason: `Routing remaining ₹${safeLowRiskAmount} to an FD for capital preservation.`
  });

  const safePath: WealthPath = {
    name: 'Safe Path',
    allocations: safeAllocations,
    projectedImpact: { dimensionImprovements: safeImpact }
  };


  // ==========================================
  // BALANCED PATH: Even split
  // 3-way split across Emergency, SIP, Debt
  // ==========================================
  const balancedAllocations: Allocation[] = [];
  const balancedImpact: Record<string, number> = {};
  
  const third = Math.floor(idleCash / 3);
  
  balancedAllocations.push({
    instrument: 'Liquid BeES',
    amount: third,
    category: 'EMERGENCY_FUND',
    reason: `₹${third} to Liquid Funds for steady liquidity.`
  });
  balancedImpact['emergencyFund'] = Math.min(100, emergencyScore + 5);

  balancedAllocations.push({
    instrument: 'Index Mutual Fund SIP',
    amount: third,
    category: 'ACTIVE_INVESTMENTS',
    reason: `₹${third} to Index Funds for long-term equity growth.`
  });
  balancedImpact['activeInvestments'] = Math.min(100, health.dimensions.activeInvestments + 10);

  balancedAllocations.push({
    instrument: 'EMI Acceleration',
    amount: idleCash - (third * 2), // The remainder
    category: 'DEBT_MANAGEMENT',
    reason: `₹${idleCash - (third * 2)} towards principal repayment on existing loans.`
  });
  balancedImpact['debtManagement'] = Math.min(100, debtScore + 5);

  const balancedPath: WealthPath = {
    name: 'Balanced Path',
    allocations: balancedAllocations,
    projectedImpact: { dimensionImprovements: balancedImpact }
  };


  // ==========================================
  // AGGRESSIVE PATH: Maximize Yield
  // 80% Equity / Retirement, 20% Emergency
  // ==========================================
  const aggAllocations: Allocation[] = [];
  const aggImpact: Record<string, number> = {};
  
  const aggRiskAmount = Math.round(idleCash * 0.8);
  const aggSafetyAmount = idleCash - aggRiskAmount;

  if (emergencyScore < 50 || debtScore < 50) {
    // If user is truly unhealthy, aggressive path must warn and slightly adjust, but we follow the prompt 
    // "assuming Emergency and Debt scores are acceptable" or we force it if they choose it.
    aggAllocations.push({
      instrument: 'Mid-Cap / Small-Cap Equity SIP',
      amount: aggRiskAmount,
      category: 'ACTIVE_INVESTMENTS',
      reason: `High risk: ₹${aggRiskAmount} into high-growth equity despite critical safety deficits.`
    });
  } else {
    aggAllocations.push({
      instrument: 'Mid-Cap / Small-Cap Equity SIP',
      amount: aggRiskAmount,
      category: 'ACTIVE_INVESTMENTS',
      reason: `Allocating ₹${aggRiskAmount} to high-growth equity to aggressively compound wealth.`
    });
  }
  aggImpact['activeInvestments'] = Math.min(100, health.dimensions.activeInvestments + 25);
  aggImpact['retirement'] = Math.min(100, health.dimensions.retirement + 10);

  aggAllocations.push({
    instrument: 'Liquid BeES',
    amount: aggSafetyAmount,
    category: 'EMERGENCY_FUND',
    reason: `Keeping ₹${aggSafetyAmount} in liquid assets as a minimal buffer.`
  });
  aggImpact['emergencyFund'] = Math.min(100, emergencyScore + 2);

  const aggressivePath: WealthPath = {
    name: 'Aggressive Path',
    allocations: aggAllocations,
    projectedImpact: { dimensionImprovements: aggImpact }
  };

  return {
    safe: safePath,
    balanced: balancedPath,
    aggressive: aggressivePath
  };
}
