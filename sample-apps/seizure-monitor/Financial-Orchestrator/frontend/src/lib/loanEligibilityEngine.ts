import { supabase } from './supabase';

export interface EligibleLoanOffer {
  policyId: string;
  bankName: string;
  loanType: string;
  originalRate: number;
  discountedRate: number;
  rateDiscount: number;
  originalProcessingFee: number;
  discountedProcessingFee: number;
  processingFeeSaved: number;
  maxTenureMonths: number;
  maxLoanAmount: number;
  requestedAmount: number;
  estimatedEmi: number;
  brvScore: number;
  brvGrade: string;
  brvTier: 1 | 2 | 3;
  isPreApproved: boolean;
  savingsCallout: string;
  policyDetails: any;
  matchScore: number;
  xaiReasoning: {
    primaryJustification: string;
    keyHighlights: string[];
    eligibilityCriteria: string[];
  };
}

export interface EligibilityResult {
  altCreditScore: number;
  altCreditGrade: string;
  offers: EligibleLoanOffer[];
  highestBrvBank: string | null;
  foir: number;
  borrowingCapacity: number;
}

function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  if (annualRate === 0) return principal / tenureMonths;
  const r = (annualRate / 12) / 100;
  return (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
}

export async function getEligibleLoanOffers(
  userId: string,
  targetLoanAmount: number,
  targetLoanType: string
): Promise<EligibilityResult> {
  // 1. Fetch User Data (for FOIR & Borrowing Capacity)
  const { data: user } = await supabase
    .from('users')
    .select('monthly_income')
    .eq('id', userId)
    .single();
  const monthlyIncome = Number(user?.monthly_income) || 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: txns } = await supabase
    .from('bank_transactions')
    .select('amount')
    .eq('transaction_type', 'DEBIT')
    .gte('timestamp', thirtyDaysAgo.toISOString())
    .or('category.eq.Loan EMI,category.eq.Debt');
  const totalMonthlyEMIs = (txns || []).reduce((sum, t) => sum + Number(t.amount), 0);
  
  const foir = monthlyIncome > 0 ? (totalMonthlyEMIs / monthlyIncome) * 100 : 0;
  const maxAllowedEMI = Math.max(0, (monthlyIncome * 0.5) - totalMonthlyEMIs);
  
  let borrowingCapacity = 0;
  if (maxAllowedEMI > 0) {
    const r = (10 / 12) / 100; // generic 10% rate
    borrowingCapacity = maxAllowedEMI * ((1 - Math.pow(1 + r, -60)) / r);
  }

  // 2. Fetch the user's ALTERNATIVE_CREDIT score
  const { data: altScoreRow } = await supabase
    .from('user_scores')
    .select('*')
    .eq('user_id', userId)
    .eq('score_type', 'ALTERNATIVE_CREDIT')
    .single();

  const altCreditScore = altScoreRow?.score_value ?? 0;
  const altCreditGrade = altScoreRow?.grade ?? 'UNKNOWN';

  // 3. Fetch ALL of the user's BRV scores (one per bank)
  const { data: brvRows } = await supabase
    .from('user_scores')
    .select('*')
    .eq('user_id', userId)
    .eq('score_type', 'BRV');

  const brvScores = brvRows || [];
  const connectedBanks = new Map<string, { score: number; grade: string }>();
  let highestBrvBank: string | null = null;
  let highestBrvScore = -1;

  for (const brv of brvScores) {
    connectedBanks.set(brv.bank_name, { score: brv.score_value, grade: brv.grade });
    if (brv.score_value > highestBrvScore) {
      highestBrvScore = brv.score_value;
      highestBrvBank = brv.bank_name;
    }
  }

  // 4. Fetch policies matching the target loan type
  const { data: policies } = await supabase
    .from('bank_loan_policies')
    .select('*')
    .eq('loan_type', targetLoanType);

  if (!policies || policies.length === 0) {
    return { altCreditScore, altCreditGrade, offers: [], highestBrvBank, foir: Math.round(foir), borrowingCapacity: Math.round(borrowingCapacity) };
  }

  // 5. Strict Filtering (Eligibility Gate)
  const eligible = policies.filter(policy => {
    if (!connectedBanks.has(policy.bank_name)) return false;
    if (altCreditScore < policy.min_cibil_score) return false;
    if (targetLoanAmount > Number(policy.max_loan_amount)) return false;
    return true;
  });

  // 6. BRV Dynamic Pricing & Perks (with Best Match scoring)
  const offers: EligibleLoanOffer[] = eligible.map(policy => {
    const bankBrv = connectedBanks.get(policy.bank_name)!;
    const brvScore = bankBrv.score;
    const brvGrade = bankBrv.grade;

    const originalRate = Number(policy.base_interest_rate);
    const originalFee = Number(policy.processing_fee_percent);
    let discountedRate = originalRate;
    let discountedFee = originalFee;
    let brvTier: 1 | 2 | 3 = 3;
    let isPreApproved = false;
    
    let matchScore = 80; // Base score
    const highlights: string[] = [];

    if (brvScore > 800) {
      brvTier = 1;
      discountedRate = Math.max(0, originalRate - 0.5);
      discountedFee = 0;
      isPreApproved = true;
      matchScore += 15;
      highlights.push('Loyalty Tier 1: 0.5% Rate Discount & Zero Fees');
    } else if (brvScore >= 600) {
      brvTier = 2;
      discountedRate = Math.max(0, originalRate - 0.25);
      discountedFee = originalFee * 0.5;
      matchScore += 10;
      highlights.push('Loyalty Tier 2: 0.25% Rate Discount & 50% Off Fees');
    }

    if (policy.policy_details?.prepayment_penalty === 0) {
      matchScore += 5;
      highlights.push('Zero pre-closure penalties');
    }

    const rateDiscount = originalRate - discountedRate;
    const processingFeeSaved = originalFee - discountedFee;
    const feeAmountSaved = Math.round((processingFeeSaved / 100) * targetLoanAmount);
    const estimatedEmi = Math.round(calculateEMI(targetLoanAmount, discountedRate, policy.max_tenure_months));

    if (estimatedEmi > maxAllowedEMI) {
      matchScore -= 30;
      highlights.push('Warning: High EMI relative to your income capacity');
    } else {
      matchScore += 5;
    }

    let savingsCallout = '';
    if (brvTier === 1) {
      savingsCallout = `Because your ${policy.bank_name} BRV Score is ${brvScore}, you get a 0.5% rate discount and your ${originalFee}% processing fee is completely waived, saving you ₹${feeAmountSaved.toLocaleString('en-IN')} upfront. Pre-approved status active.`;
    } else if (brvTier === 2) {
      savingsCallout = `Your ${policy.bank_name} BRV Score of ${brvScore} qualifies you for a 0.25% rate discount and 50% off processing fees, saving you ₹${feeAmountSaved.toLocaleString('en-IN')}.`;
    } else {
      savingsCallout = `Standard rates apply. Increase your ${policy.bank_name} BRV score above 600 to unlock loyalty discounts.`;
    }

    const totalInterest = (estimatedEmi * policy.max_tenure_months) - targetLoanAmount;
    const justification = `${policy.bank_name} ${policy.loan_type.replace(/_/g, ' ')} is a highly optimized match based on your BRV tier, offering an estimated total interest cost of ₹${totalInterest.toLocaleString('en-IN')} over ${policy.max_tenure_months} months.`;

    const eligibilityCriteria = [];
    eligibilityCriteria.push(`✅ Credit Score (${altCreditScore}) meets the minimum requirement of ${policy.min_cibil_score}.`);
    eligibilityCriteria.push(`✅ Requested amount is within the max limit of ₹${(policy.max_loan_amount/100000).toFixed(1)}L.`);
    eligibilityCriteria.push(`✅ You have an active relationship and BRV score with ${policy.bank_name}.`);
    if (estimatedEmi <= maxAllowedEMI) {
      eligibilityCriteria.push(`✅ Your income capacity comfortably supports this estimated EMI.`);
    }

    return {
      policyId: policy.id,
      bankName: policy.bank_name,
      loanType: policy.loan_type,
      originalRate,
      discountedRate,
      rateDiscount,
      originalProcessingFee: originalFee,
      discountedProcessingFee: discountedFee,
      processingFeeSaved,
      maxTenureMonths: policy.max_tenure_months,
      maxLoanAmount: Number(policy.max_loan_amount),
      requestedAmount: targetLoanAmount,
      estimatedEmi,
      brvScore,
      brvGrade,
      brvTier,
      isPreApproved,
      savingsCallout,
      policyDetails: policy.policy_details,
      matchScore: Math.min(99, matchScore),
      xaiReasoning: {
        primaryJustification: justification,
        keyHighlights: highlights,
        eligibilityCriteria
      }
    };
  });

  // Sort: highest match score first
  offers.sort((a, b) => b.matchScore - a.matchScore);

  return { altCreditScore, altCreditGrade, offers, highestBrvBank, foir: Math.round(foir), borrowingCapacity: Math.round(borrowingCapacity) };
}
