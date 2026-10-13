import { supabase } from './supabase';

export interface CustomLoanResult {
  policyId: string;
  bankName: string;
  loanType: string;
  interestRate: number;
  processingFeePercent: number;
  maxTenureMonths: number;
  maxLoanAmount: number;
  matchScore: number;
  estimatedEmi: number;
  isHighRisk: boolean;
  xaiInsights: string;
}

export async function searchCustomLoans(
  userId: string,
  requestedAmount: number,
  requestedTenureMonths: number,
  targetRate: number,
  targetLoanType: string
): Promise<CustomLoanResult[]> {
  // 1. Eligibility Hard Filters
  const { data: userRow } = await supabase
    .from('users')
    .select('monthly_income')
    .eq('id', userId)
    .single();
  const monthlyIncome = Number(userRow?.monthly_income) || 0;

  const { data: scoreRow } = await supabase
    .from('user_scores')
    .select('score_value')
    .eq('user_id', userId)
    .eq('score_type', 'ALTERNATIVE_CREDIT')
    .single();
  const altCreditScore = scoreRow?.score_value || 0;

  // Calculate existing EMIs for FOIR
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: txns } = await supabase
    .from('bank_transactions')
    .select('amount')
    .eq('transaction_type', 'DEBIT')
    .gte('timestamp', thirtyDaysAgo.toISOString())
    .or('category.eq.Loan EMI,category.eq.Debt');
  const existingEMIs = (txns || []).reduce((sum, t) => sum + Number(t.amount), 0);

  // Fetch policies
  const { data: policies } = await supabase
    .from('bank_loan_policies')
    .select('*')
    .eq('loan_type', targetLoanType);

  if (!policies) return [];

  // Filter Out
  const eligible = policies.filter(p => {
    if (altCreditScore < p.min_cibil_score) return false;
    if (requestedAmount > Number(p.max_loan_amount)) return false;
    if (requestedTenureMonths > p.max_tenure_months) return false;
    return true;
  });

  // 2 & 3 & 4. Similarity Scoring, EMI, FOIR
  const results: CustomLoanResult[] = eligible.map(p => {
    const bankRate = Number(p.base_interest_rate);
    const bankFee = Number(p.processing_fee_percent);
    
    // Base Score
    let score = 100;
    
    // Rate Penalty
    if (bankRate > targetRate) {
      const diff = bankRate - targetRate;
      const penalty = Math.floor(diff / 0.5) * 5;
      score -= penalty;
    } else if (bankRate < targetRate) {
      score += 2;
    }

    // Fee Penalty
    const feePenalty = Math.floor(bankFee / 0.5) * 2;
    score -= feePenalty;

    // Clamp Score
    score = Math.max(30, Math.min(99, score));

    // EMI Calculation: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
    let emi = 0;
    if (bankRate === 0) {
      emi = requestedAmount / requestedTenureMonths;
    } else {
      const r = (bankRate / 12) / 100;
      const n = requestedTenureMonths;
      emi = (requestedAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }
    const estimatedEmi = Math.round(emi);

    // FOIR Validation
    const newTotalEmi = existingEMIs + estimatedEmi;
    const foirLimit = monthlyIncome * 0.5;
    const isHighRisk = newTotalEmi > foirLimit;

    // XAI Insights
    let insight = `This loan matches your ${requestedTenureMonths}-month tenure requirement. `;
    if (bankRate > targetRate) {
      insight += `However, the rate is ${(bankRate - targetRate).toFixed(2)}% higher than your target. `;
    } else {
      insight += `The rate is better than or equal to your target! `;
    }
    if (isHighRisk) {
      insight += `⚠️ Warning: Taking this loan pushes your Debt-to-Income (FOIR) ratio above the safe 50% threshold.`;
    }

    return {
      policyId: p.id,
      bankName: p.bank_name,
      loanType: p.loan_type,
      interestRate: bankRate,
      processingFeePercent: bankFee,
      maxTenureMonths: p.max_tenure_months,
      maxLoanAmount: Number(p.max_loan_amount),
      matchScore: score,
      estimatedEmi,
      isHighRisk,
      xaiInsights: insight
    };
  });

  results.sort((a, b) => b.matchScore - a.matchScore);
  return results.slice(0, 5);
}
