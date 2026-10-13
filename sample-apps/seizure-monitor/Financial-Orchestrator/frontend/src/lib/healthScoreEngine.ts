import { supabase } from './supabase';

export interface HealthScoreResult {
  dimensions: {
    emergencyFund: number;
    debtManagement: number;
    activeInvestments: number;
    insurance: number;
    taxEfficiency: number;
    retirement: number;
  };
  masterScore: number;
  metadata: {
    liquidCash: number;
    monthlyExpenses: number;
    monthlyIncome: number;
    totalMonthlyEMIs: number;
    investRatio: number;
    insuranceTier: number;
    s80cUtilized: number;
    retirementProjected: number;
    retirementTarget: number;
  };
}

export async function calculateHealthScore(userId: string): Promise<HealthScoreResult | null> {
  try {
    // 1. Fetch User Data
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!user) throw new Error('User not found');
    
    const monthlyIncome = Number(user.monthly_income) || 100000;
    const targetRetirementAge = Number(user.target_retirement_age) || 60;
    const currentAge = user.date_of_birth ? (new Date().getFullYear() - new Date(user.date_of_birth).getFullYear()) : 35;

    // 2. Fetch Accounts (Liquid Cash)
    const { data: accounts } = await supabase.from('bank_accounts').select('*').eq('user_id', userId);
    const liquidCash = (accounts || []).reduce((sum, a) => sum + Number(a.balance), 0);

    // 3. Fetch Transactions (last 90 days for stable averages)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const { data: txns } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('status', 'SUCCESS')
      .gte('timestamp', ninetyDaysAgo.toISOString());
      
    const allTxns = txns || [];
    const debits = allTxns.filter(t => t.transaction_type === 'DEBIT');
    
    // Average Monthly Expenses (all debits excluding transfers/investments)
    const excludedCategories = ['Transfer', 'Investment', 'Loan EMI', 'Mutual Fund SIP'];
    const expenseDebits = debits.filter(t => !excludedCategories.includes(t.category));
    const totalExpenses90d = expenseDebits.reduce((sum, t) => sum + Number(t.amount), 0);
    const monthlyExpenses = totalExpenses90d / 3 || (monthlyIncome * 0.4);

    // EMIs
    const emiCategories = ['Loan EMI', 'Debt', 'Credit Card Bill'];
    const emiDebits = debits.filter(t => emiCategories.includes(t.category));
    const totalMonthlyEMIs = (emiDebits.reduce((sum, t) => sum + Number(t.amount), 0)) / 3;

    // SIPs / Equities
    const investCategories = ['Investment', 'Mutual Fund SIP', 'Stocks'];
    const investDebits = debits.filter(t => investCategories.includes(t.category));
    const totalMonthlyInvestments = (investDebits.reduce((sum, t) => sum + Number(t.amount), 0)) / 3;

    // Insurance Premiums
    const insCategories = ['Insurance', 'Life Insurance', 'Health Insurance'];
    const insDebits = debits.filter(t => insCategories.includes(t.category));
    const hasInsuranceDebit = insDebits.length > 0;

    // 4. Fetch Financial Profile
    const { data: profileRow } = await supabase.from('user_financial_profiles').select('*').eq('user_id', userId).single();
    const profile = profileRow?.profile_data || {};
    const taxProfile = profile.tax_profile || {};
    const mfCas = profile.mutual_fund_cas || {};
    
    const s80cUtilized = taxProfile?.deductions?.section_80C?.total || 0;
    const mfCurrentValue = mfCas?.total_current_value || 0;

    // 5. Fetch Goals
    const { data: goals } = await supabase.from('financial_goals').select('*').eq('user_id', userId).eq('category', 'RETIREMENT');
    const retirementGoal = goals?.[0];
    const retirementTarget = retirementGoal ? Number(retirementGoal.target_amount) : 50000000;
    const currentRetirementCorpus = (retirementGoal ? Number(retirementGoal.current_progress) : 0) + mfCurrentValue;

    // ==========================================
    // SCORE CALCULATIONS
    // ==========================================

    // 1. Emergency Fund (Months Saved / 6 * 100)
    let emergencyFund = 0;
    if (monthlyExpenses > 0) {
      const monthsCovered = liquidCash / monthlyExpenses;
      emergencyFund = Math.min(100, (monthsCovered / 6) * 100);
    } else {
      emergencyFund = 100;
    }

    // 2. Debt Management (FOIR)
    let debtManagement = 0;
    const foir = monthlyIncome > 0 ? (totalMonthlyEMIs / monthlyIncome) : 0;
    if (foir < 0.3) debtManagement = 100;
    else if (foir <= 0.5) debtManagement = 60;
    else debtManagement = 20;

    // 3. Active Investments (Target 20% of Income)
    let activeInvestments = 0;
    const investRatio = monthlyIncome > 0 ? (totalMonthlyInvestments / monthlyIncome) : 0;
    activeInvestments = Math.min(100, (investRatio / 0.20) * 100);

    // 4. Insurance Coverage (Tiered)
    let insurance = 0;
    const hasTax80D = taxProfile?.deductions?.section_80D?.total > 0;
    let insuranceCount = 0;
    if (hasInsuranceDebit) insuranceCount++;
    if (hasTax80D) insuranceCount++; 
    
    if (insuranceCount >= 2) insurance = 100;
    else if (insuranceCount === 1) insurance = 50;
    else insurance = 20;

    // 5. Tax Efficiency (80C Utilization)
    let taxEfficiency = Math.min(100, (s80cUtilized / 150000) * 100);

    // 6. Retirement Readiness
    const yearsToRetirement = Math.max(1, targetRetirementAge - currentAge);
    const r = 0.08;
    const projectedCorpus = currentRetirementCorpus * Math.pow(1 + r, yearsToRetirement);
    const retirement = Math.min(100, (projectedCorpus / retirementTarget) * 100);

    // ==========================================
    // WEIGHTED MASTER SCORE
    // ==========================================
    const masterScore = Math.round(
      (emergencyFund * 0.20) +
      (debtManagement * 0.20) +
      (activeInvestments * 0.15) +
      (insurance * 0.15) +
      (taxEfficiency * 0.10) +
      (retirement * 0.20)
    );

    return {
      dimensions: {
        emergencyFund: Math.round(emergencyFund),
        debtManagement: Math.round(debtManagement),
        activeInvestments: Math.round(activeInvestments),
        insurance: Math.round(insurance),
        taxEfficiency: Math.round(taxEfficiency),
        retirement: Math.round(retirement)
      },
      masterScore,
      metadata: {
        liquidCash,
        monthlyExpenses,
        monthlyIncome,
        totalMonthlyEMIs,
        investRatio,
        insuranceTier: insuranceCount,
        s80cUtilized,
        retirementProjected: projectedCorpus,
        retirementTarget
      }
    };
  } catch (error) {
    console.error('Error calculating health score:', error);
    return null;
  }
}
