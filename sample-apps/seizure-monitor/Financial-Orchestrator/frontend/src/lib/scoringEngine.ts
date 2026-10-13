import { supabase } from './supabase';

export async function calculateAlternativeCreditScore(userId: string) {
  try {
    // Fetch User Income
    const { data: user } = await supabase
      .from('users')
      .select('monthly_income')
      .eq('id', userId)
      .single();

    if (!user) throw new Error('User not found');
    const monthlyIncome = Number(user.monthly_income) || 0;
    const expectedIncome60Days = monthlyIncome * 2;

    // Fetch Last 60 days of transactions
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: txns } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('status', 'SUCCESS')
      .gte('timestamp', sixtyDaysAgo.toISOString());

    const allTxns = txns || [];
    
    // Inflow Consistency (30% weight -> Max 165 pts)
    const credits = allTxns.filter(t => t.transaction_type === 'CREDIT');
    const totalCredits = credits.reduce((sum, t) => sum + Number(t.amount), 0);
    
    let inflowScore = 0;
    if (expectedIncome60Days > 0) {
      const inflowRatio = totalCredits / expectedIncome60Days;
      if (inflowRatio >= 0.9) inflowScore = 165;
      else if (inflowRatio >= 0.7) inflowScore = 130;
      else if (inflowRatio >= 0.5) inflowScore = 80;
      else inflowScore = 40;
    } else {
      inflowScore = 80; // default if no income defined
    }

    // FOIR (25% weight -> Max 137.5 pts, let's round to 138)
    const debits = allTxns.filter(t => t.transaction_type === 'DEBIT');
    const totalDebits = debits.reduce((sum, t) => sum + Number(t.amount), 0);
    
    const recurringCategories = ['Loan EMI', 'Debt', 'Utilities', 'Credit Card Bill'];
    const recurringDebits = debits.filter(t => recurringCategories.includes(t.category));
    const totalMonthlyEMIs = recurringDebits.reduce((sum, t) => sum + Number(t.amount), 0) / 2; // average per month

    let foirScore = 0;
    const foir = monthlyIncome > 0 ? (totalMonthlyEMIs / monthlyIncome) : 0;
    if (foir < 0.3) foirScore = 138;
    else if (foir <= 0.5) foirScore = 90;
    else foirScore = 20;

    // Stress & Penalty (25% weight -> Max 137 pts)
    // Fetch failed transactions
    const { data: failedTxns } = await supabase
      .from('bank_transactions')
      .select('id')
      .eq('status', 'FAILED')
      .gte('timestamp', sixtyDaysAgo.toISOString());
    
    const failedCount = failedTxns?.length || 0;
    const lowBalanceCount = allTxns.filter(t => Number(t.balance_after_transaction) < 1000).length;
    
    let stressScore = 137;
    stressScore -= (failedCount * 30);
    stressScore -= (lowBalanceCount * 10);
    stressScore = Math.max(0, stressScore);

    // Savings Rate (20% weight -> Max 110 pts)
    let savingsScore = 0;
    if (totalCredits > 0) {
      const savingsRate = (totalCredits - totalDebits) / totalCredits;
      if (savingsRate >= 0.3) savingsScore = 110;
      else if (savingsRate >= 0.2) savingsScore = 80;
      else if (savingsRate >= 0.1) savingsScore = 50;
      else if (savingsRate > 0) savingsScore = 20;
      else savingsScore = 0;
    }

    // Calculate Total Score (Range 300 to 850)
    let totalScore = 300 + inflowScore + foirScore + stressScore + savingsScore;
    totalScore = Math.min(850, Math.round(totalScore));

    let grade = 'POOR';
    if (totalScore >= 740) grade = 'EXCELLENT';
    else if (totalScore >= 670) grade = 'GOOD';
    else if (totalScore >= 580) grade = 'FAIR';

    const metricsBreakdown = {
      foir_percentage: Math.round(foir * 100),
      inflow_stability: Math.round((inflowScore / 165) * 100),
      stress_resilience: Math.round((stressScore / 137) * 100),
      savings_rate: Math.round((savingsScore / 110) * 100)
    };

    // UPSERT Logic
    // We first delete the existing row to enforce "only ONE active score"
    await supabase.from('user_scores')
      .delete()
      .eq('user_id', userId)
      .eq('score_type', 'ALTERNATIVE_CREDIT');

    await supabase.from('user_scores')
      .insert([{
        user_id: userId,
        bank_name: null,
        score_type: 'ALTERNATIVE_CREDIT',
        score_value: totalScore,
        grade: grade,
        metrics_breakdown: metricsBreakdown
      }]);

    console.log(`Successfully calculated Alt Credit Score: ${totalScore} (${grade})`);
  } catch (error) {
    console.error('Error calculating Alt Credit Score:', error);
  }
}

export async function calculateBRVScore(userId: string) {
  try {
    // Fetch user's bank accounts to get total wealth
    const { data: accounts } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId);

    if (!accounts || accounts.length === 0) return;

    const totalLiquidWealth = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

    // Fetch transactions
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: txns } = await supabase
      .from('bank_transactions')
      .select('*')
      .gte('timestamp', sixtyDaysAgo.toISOString());

    const allTxns = txns || [];
    const totalTxnCount = allTxns.length;

    const bankNames = [...new Set(accounts.map(a => a.bank_name))];

    for (const bank of bankNames) {
      // 1. Deposit Loyalty (40% -> Max 400 pts)
      const bankAccounts = accounts.filter(a => a.bank_name === bank);
      const bankBalance = bankAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
      
      let depositScore = 0;
      if (totalLiquidWealth > 0) {
        const share = bankBalance / totalLiquidWealth;
        depositScore = Math.round(share * 400);
      }

      // 2. Transaction Dominance (30% -> Max 300 pts)
      const bankTxns = allTxns.filter(t => t.bank_name === bank);
      let domScore = 0;
      if (totalTxnCount > 0) {
        const domShare = bankTxns.length / totalTxnCount;
        domScore = Math.round(domShare * 300);
      }

      // 3. Repayment Track Record (30% -> Max 300 pts)
      const failedBankTxns = bankTxns.filter(t => t.status === 'FAILED');
      let repaymentScore = 300;
      repaymentScore -= (failedBankTxns.length * 50);
      repaymentScore = Math.max(0, repaymentScore);

      const totalScore = Math.min(1000, depositScore + domScore + repaymentScore);
      
      let grade = 'BRONZE';
      if (totalScore >= 850) grade = 'PLATINUM';
      else if (totalScore >= 700) grade = 'GOLD';
      else if (totalScore >= 500) grade = 'SILVER';

      const metricsBreakdown = {
        deposit_loyalty_pts: depositScore,
        transaction_dominance_pts: domScore,
        repayment_pts: repaymentScore,
        bank_balance: bankBalance
      };

      // UPSERT Logic
      await supabase.from('user_scores')
        .delete()
        .eq('user_id', userId)
        .eq('score_type', 'BRV')
        .eq('bank_name', bank);

      await supabase.from('user_scores')
        .insert([{
          user_id: userId,
          bank_name: bank,
          score_type: 'BRV',
          score_value: totalScore,
          grade: grade,
          metrics_breakdown: metricsBreakdown
        }]);
    }
    
    console.log(`Successfully calculated BRV scores for ${bankNames.length} banks.`);
  } catch (error) {
    console.error('Error calculating BRV Score:', error);
  }
}
