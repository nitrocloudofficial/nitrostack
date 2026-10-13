import { supabase } from '../lib/supabase';

export interface EvaluatedLoan {
  id: string;
  bankName: string;
  loanType: string;
  interestRate: number;
  maxTenureMonths: number;
  maxLoanAmount: number;
  processingFeePercent: number;
  matchScore: number;
  xaiReasoning: {
    primaryJustification: string;
    keyHighlights: string[];
    eligibilityCriteria: string[];
  };
  policyDetails: any;
  estimatedEmi: number;
}

export interface CreditEngineResult {
  foir: number;
  borrowingCapacity: number;
  activeGoal: string | null;
  activeGoalAmount: number;
  recommendations: EvaluatedLoan[];
}

function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  if (annualRate === 0) return principal / tenureMonths;
  const r = (annualRate / 12) / 100;
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  return emi;
}

export async function evaluateLoanOptions(userId: string): Promise<CreditEngineResult> {
  // 1. Fetch User Data
  const { data: user } = await supabase
    .from('users')
    .select('monthly_income, date_of_birth')
    .eq('id', userId)
    .single();

  const monthlyIncome = user?.monthly_income || 0;

  // 2. Fetch Active Financial Goal
  const { data: goals } = await supabase
    .from('financial_goals')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: true })
    .limit(1);

  const activeGoal = goals && goals.length > 0 ? goals[0] : null;
  
  // Map Goal to Loan Type
  let targetLoanType = 'PERSONAL_LOAN';
  if (activeGoal) {
    const name = activeGoal.name.toLowerCase();
    if (name.includes('home') || name.includes('house')) targetLoanType = 'HOME_LOAN';
    if (name.includes('car') || name.includes('auto')) targetLoanType = 'AUTO_LOAN';
    if (name.includes('education') || name.includes('study')) targetLoanType = 'EDUCATION_LOAN';
  }

  // 3. Fetch Transactions to calculate FOIR
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: transactions } = await supabase
    .from('bank_transactions')
    .select('amount')
    .eq('transaction_type', 'DEBIT')
    .gte('timestamp', thirtyDaysAgo.toISOString())
    .or('category.eq.Loan EMI,category.eq.Debt'); // Assumes these categories exist for EMIs

  const totalMonthlyEMIs = (transactions || []).reduce((sum, tx) => sum + Number(tx.amount), 0);
  
  const foir = monthlyIncome > 0 ? (totalMonthlyEMIs / monthlyIncome) * 100 : 0;
  
  // Calculate max new EMI user can afford (assuming 50% max FOIR cap)
  const maxAllowedEMI = Math.max(0, (monthlyIncome * 0.5) - totalMonthlyEMIs);

  // 4. Fetch Bank Relationship (BRV Perks)
  const { data: accounts } = await supabase
    .from('bank_accounts')
    .select('bank_name')
    .eq('user_id', userId);
  const existingBanks = new Set((accounts || []).map(a => a.bank_name));

  // Fetch alt credit score for eligibility
  const { data: scoreData } = await supabase
    .from('user_scores')
    .select('score_value')
    .eq('user_id', userId)
    .eq('score_type', 'ALTERNATIVE_CREDIT')
    .single();
  const altCreditScore = scoreData?.score_value || 700;

  // 5. Fetch Policies
  const { data: policies } = await supabase
    .from('bank_loan_policies')
    .select('*')
    .eq('loan_type', targetLoanType);

  if (!policies || policies.length === 0) {
    return {
      foir: Math.round(foir),
      borrowingCapacity: 0,
      activeGoal: activeGoal ? activeGoal.name : null,
      activeGoalAmount: activeGoal ? activeGoal.target_amount : 0,
      recommendations: []
    };
  }

  // 6. Matching & Scoring Engine
  let evaluatedLoans: EvaluatedLoan[] = policies.map((policy) => {
    let finalInterestRate = Number(policy.base_interest_rate);
    let finalProcessingFee = Number(policy.processing_fee_percent);
    let score = 80; // base score
    let highlights = [];

    // BRV Discount Check
    if (existingBanks.has(policy.bank_name)) {
      finalInterestRate = Math.max(0, finalInterestRate - 0.25);
      finalProcessingFee = 0;
      score += 10;
      highlights.push('Loyalty Perk: 0.25% Interest Rate Discount');
      highlights.push('Loyalty Perk: Zero Processing Fee');
    }

    if (policy.policy_details?.prepayment_penalty === 0) {
      score += 5;
      highlights.push('Zero pre-closure penalties');
    }

    const requestedAmount = activeGoal ? Number(activeGoal.target_amount) : 100000;
    const estEmi = calculateEMI(requestedAmount, finalInterestRate, policy.max_tenure_months);
    
    // Penalize if EMI exceeds max allowed
    if (estEmi > maxAllowedEMI) {
      score -= 30; 
      highlights.push('Warning: High EMI relative to your income capacity');
    } else {
      score += 5;
    }

    // Dynamic Justification Generation
    const totalInterest = (estEmi * policy.max_tenure_months) - requestedAmount;
    const justification = `${policy.bank_name} ${policy.loan_type.replace('_', ' ')} is an excellent match, offering an estimated total interest cost of ₹${totalInterest.toLocaleString('en-IN', { maximumFractionDigits: 0 })} over ${policy.max_tenure_months} months.`;

    const eligibilityCriteria = [];
    if (altCreditScore >= policy.min_cibil_score) {
      eligibilityCriteria.push(`✅ Credit Score (${altCreditScore}) meets the minimum requirement of ${policy.min_cibil_score}.`);
    } else {
      eligibilityCriteria.push(`⚠️ Credit Score (${altCreditScore}) is below the minimum requirement of ${policy.min_cibil_score}.`);
    }
    
    if (requestedAmount <= policy.max_loan_amount) {
      eligibilityCriteria.push(`✅ Requested amount (₹${(requestedAmount/100000).toFixed(1)}L) is within max limit (₹${(policy.max_loan_amount/100000).toFixed(1)}L).`);
    } else {
      eligibilityCriteria.push(`⚠️ Requested amount exceeds policy max limit.`);
    }
    
    if (estEmi <= maxAllowedEMI) {
      eligibilityCriteria.push(`✅ Income capacity comfortably supports this EMI.`);
    } else {
      eligibilityCriteria.push(`⚠️ This EMI exceeds your recommended borrowing capacity limit.`);
    }

    if (existingBanks.has(policy.bank_name)) {
      eligibilityCriteria.push(`✅ You hold an active account with ${policy.bank_name}, fulfilling relationship criteria.`);
    }

    return {
      id: policy.id,
      bankName: policy.bank_name,
      loanType: policy.loan_type,
      interestRate: finalInterestRate,
      maxTenureMonths: policy.max_tenure_months,
      maxLoanAmount: policy.max_loan_amount,
      processingFeePercent: finalProcessingFee,
      matchScore: Math.min(99, score),
      xaiReasoning: {
        primaryJustification: justification,
        keyHighlights: highlights,
        eligibilityCriteria
      },
      policyDetails: policy.policy_details,
      estimatedEmi: Math.round(estEmi)
    };
  });

  // Sort by score descending
  evaluatedLoans.sort((a, b) => b.matchScore - a.matchScore);

  // Return Top 3
  const recommendations = evaluatedLoans.slice(0, 3);

  // Calculate Borrowing Capacity based on maxAllowedEMI at a generic 10% rate for 5 years
  const genericRate = 10;
  const genericTenure = 60;
  const r = (genericRate / 12) / 100;
  // PV = EMI * ( (1 - (1+r)^-n) / r )
  let borrowingCapacity = 0;
  if (r > 0 && maxAllowedEMI > 0) {
    borrowingCapacity = maxAllowedEMI * ((1 - Math.pow(1 + r, -genericTenure)) / r);
  }

  return {
    foir: Math.round(foir),
    borrowingCapacity: Math.round(borrowingCapacity),
    activeGoal: activeGoal ? activeGoal.name : null,
    activeGoalAmount: activeGoal ? activeGoal.target_amount : 0,
    recommendations
  };
}
