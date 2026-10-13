import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Default dashboard state to prevent 404 infinite reload loops
const defaultDashboardData = {
  healthScore: {
    score: 89,
    dimensions: {
      'Emergency Fund': 85,
      'Insurance': 90,
      'Diversification': 88,
      'Debt Health': 92,
      'Tax Efficiency': 85,
      'Retirement': 94
    }
  },
  xai: [
    { dimension: 'Emergency Fund', score: 85, type: 'POSITIVE', message: 'Score 85/100: Excellent liquidity buffer.' }
  ],
  cashflow: { safeToSpend: 45000, burnRate: 60000, runwayMonths: 6.2, anomalies: [] },
  wealthPaths: {
    currentNetWorth: 2050000,
    horizonYears: 10,
    paths: {
      CONSERVATIVE: { projectedNetWorth: 3690000, riskDescription: 'Low volatility, steady growth.' },
      MODERATE: { projectedNetWorth: 5125000, riskDescription: 'Balanced equity and debt.' },
      AGGRESSIVE: { projectedNetWorth: 8610000, riskDescription: 'High equity exposure.' }
    }
  },
  creditScore: { score: 822, maxScore: 900, factors: ['AI Derived from 6-Dim SEBI/RBI Engine'] },
  brv: { score: 2050, tier: 'GOLD', relationshipYears: 1, totalAUM: 2050000, productsHeld: 3 }
};

const userState: Record<string, any> = {
  'user-001': {
    hasOnboarded: true,
    onboardingData: null,
    dashboardData: defaultDashboardData
  }
};


app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: true, user: 'user-001', hasOnboarded: userState['user-001'].hasOnboarded });
});

app.post('/api/onboarding', (req, res) => {
  const { 
    personal_profile, 
    income_and_cashflow, 
    tax_profile, 
    insurance_and_protection, 
    assets_portfolio, 
    liabilities_and_debt 
  } = req.body;

  // -- BASE VARIABLES --
  const monthly_expenses = income_and_cashflow.monthly_mandatory_living_expenses + income_and_cashflow.monthly_discretionary_spend;
  const annual_income = (income_and_cashflow.monthly_base_pay + income_and_cashflow.monthly_variable_pay) * 12;
  const total_portfolio_value = assets_portfolio.reduce((sum: number, a: any) => sum + a.current_market_value, 0);
  const liquid_savings = assets_portfolio.reduce((sum: number, a: any) => {
    if (a.liquidity_status === 'High') return sum + a.current_market_value;
    if (a.liquidity_status === 'Medium') return sum + (a.current_market_value * 0.5);
    return sum;
  }, 0);
  const total_debt = liabilities_and_debt.reduce((sum: number, l: any) => sum + l.outstanding_amount, 0);
  const credit_card_outstanding = liabilities_and_debt.filter((l: any) => l.loan_type === 'Credit Card').reduce((sum: number, l: any) => sum + l.outstanding_amount, 0);

  const xaiInsights = [];

  // -- DIMENSION 1: Emergency Fund (15%) --
  const months_covered = monthly_expenses > 0 ? (liquid_savings / monthly_expenses) : 99;
  let ef_score = 0;
  if (months_covered >= 6) ef_score = 100;
  else if (months_covered >= 3) ef_score = 60 + ((months_covered - 3) / 3) * 30;
  else if (months_covered >= 1) ef_score = 20 + ((months_covered - 1) / 2) * 40;
  else ef_score = Math.max(0, months_covered * 20);
  
  if (ef_score < 60) xaiInsights.push({ dimension: 'Emergency Fund', score: Math.round(ef_score), type: 'NEGATIVE', message: `Score ${Math.round(ef_score)}/100: Your liquid savings (₹${liquid_savings.toLocaleString()}) cover only ${months_covered.toFixed(1)} months of expenses (₹${monthly_expenses.toLocaleString()}). RBI recommends a 3-6 month buffer.`});
  else xaiInsights.push({ dimension: 'Emergency Fund', score: Math.round(ef_score), type: 'POSITIVE', message: `Score ${Math.round(ef_score)}/100: Excellent liquidity. You have ${months_covered.toFixed(1)} months of runway, exceeding the RBI 6-month benchmark.`});

  // -- DIMENSION 2: Insurance Coverage (20%) --
  const cover_ratio = annual_income > 0 ? (insurance_and_protection.total_term_life_cover / annual_income) : 0;
  let life_score = 0;
  if (insurance_and_protection.total_term_life_cover === 0) life_score = 10;
  else if (cover_ratio >= 15) life_score = 100;
  else if (cover_ratio >= 10) life_score = 70 + ((cover_ratio - 10) / 5) * 30;
  else if (cover_ratio >= 5) life_score = 40 + ((cover_ratio - 5) / 5) * 30;
  else life_score = Math.max(0, (cover_ratio / 5) * 40);
  
  if (personal_profile.dependents > 0 && cover_ratio < 10) life_score = Math.max(0, life_score - 10);

  let health_score = 0;
  const hc = insurance_and_protection.total_health_insurance_cover;
  if (hc >= 1000000) health_score = 100;
  else if (hc >= 500000) health_score = 60 + ((hc - 500000) / 500000) * 40;
  else if (hc > 0) health_score = (hc / 500000) * 60;
  
  const ins_score = (life_score * 0.5) + (health_score * 0.5);
  if (ins_score < 60) xaiInsights.push({ dimension: 'Insurance', score: Math.round(ins_score), type: 'WARNING', message: `Score ${Math.round(ins_score)}/100: Inadequate protection. Life cover is ${cover_ratio.toFixed(1)}x income (IRDAI target 10-15x). Health cover is ₹${(hc/100000).toFixed(1)}L (target ₹10L+).`});
  else xaiInsights.push({ dimension: 'Insurance', score: Math.round(ins_score), type: 'POSITIVE', message: `Score ${Math.round(ins_score)}/100: Strong safety net. Your life and health covers meet or exceed IRDAI recommendations.`});

  // -- DIMENSION 3: Investment Diversification (20%) --
  const equity_val = assets_portfolio.filter((a:any)=>a.category==='Equity').reduce((s:number,a:any)=>s+a.current_market_value,0);
  const debt_val = assets_portfolio.filter((a:any)=>a.category==='Debt').reduce((s:number,a:any)=>s+a.current_market_value,0);
  const gold_val = assets_portfolio.filter((a:any)=>a.category==='Commodity').reduce((s:number,a:any)=>s+a.current_market_value,0);
  
  const act_eq = total_portfolio_value > 0 ? (equity_val/total_portfolio_value)*100 : 0;
  const act_debt = total_portfolio_value > 0 ? (debt_val/total_portfolio_value)*100 : 0;
  const act_gold = total_portfolio_value > 0 ? (gold_val/total_portfolio_value)*100 : 0;

  let ideal_eq = Math.max(20, 100 - personal_profile.current_age);
  if (personal_profile.risk_appetite_score >= 8) ideal_eq += 5;
  if (personal_profile.risk_appetite_score <= 3) ideal_eq -= 5;
  const ideal_gold = 7.5;
  const ideal_debt = Math.max(0, 100 - ideal_eq - ideal_gold);

  const penalty_div = (Math.abs(act_eq - ideal_eq) * 0.5) + (Math.abs(act_debt - ideal_debt) * 0.3) + (Math.max(0, Math.abs(act_gold - ideal_gold) - 2.5) * 0.2);
  let div_score = Math.max(0, Math.min(100, 100 - penalty_div));
  
  const sip_ratio = income_and_cashflow.monthly_net_take_home > 0 ? (income_and_cashflow.total_active_monthly_sips / income_and_cashflow.monthly_net_take_home) * 100 : 0;
  if (sip_ratio >= 20) div_score = Math.min(100, div_score + 5);
  else if (sip_ratio >= 10) div_score = Math.min(100, div_score + 2);

  if (div_score < 60) xaiInsights.push({ dimension: 'Diversification', score: Math.round(div_score), type: 'WARNING', message: `Score ${Math.round(div_score)}/100: Asset mismatch. Current Equity is ${Math.round(act_eq)}%, but SEBI age-based ideal is ${Math.round(ideal_eq)}%. High concentration risk.`});
  else xaiInsights.push({ dimension: 'Diversification', score: Math.round(div_score), type: 'POSITIVE', message: `Score ${Math.round(div_score)}/100: Excellent portfolio balance matching your age (${personal_profile.current_age}) and risk appetite.`});

  // -- DIMENSION 4: Debt Health (20%) --
  const emi_ratio = income_and_cashflow.monthly_net_take_home > 0 ? (income_and_cashflow.total_monthly_emi / income_and_cashflow.monthly_net_take_home) * 100 : 0;
  let emi_score = 0;
  if (emi_ratio <= 20) emi_score = 100;
  else if (emi_ratio <= 30) emi_score = 80;
  else if (emi_ratio <= 40) emi_score = 60;
  else if (emi_ratio <= 50) emi_score = 35;
  else emi_score = Math.max(0, 35 - ((emi_ratio - 50) * 2));

  const da_ratio = (liquid_savings + total_portfolio_value) > 0 ? (total_debt / (liquid_savings + total_portfolio_value)) * 100 : (total_debt > 0 ? 100 : 0);
  let da_score = 0;
  if (da_ratio <= 20) da_score = 100;
  else if (da_ratio <= 40) da_score = 70;
  else if (da_ratio <= 60) da_score = 40;
  else da_score = Math.max(0, 40 - ((da_ratio - 60) * 2));

  let debt_score = (emi_score * 0.5) + (da_score * 0.4) + 10;
  const cc_ratio = income_and_cashflow.monthly_net_take_home > 0 ? (credit_card_outstanding / income_and_cashflow.monthly_net_take_home) * 100 : 0;
  if (cc_ratio > 50) debt_score -= 20;
  else if (cc_ratio > 20) debt_score -= 10;
  debt_score = Math.max(0, Math.min(100, debt_score));

  if (debt_score < 60) xaiInsights.push({ dimension: 'Debt Health', score: Math.round(debt_score), type: 'NEGATIVE', message: `Score ${Math.round(debt_score)}/100: High debt burden. Your EMI consumes ${Math.round(emi_ratio)}% of your income (Target: < 40%). Credit card debt penalties applied.`});
  else xaiInsights.push({ dimension: 'Debt Health', score: Math.round(debt_score), type: 'POSITIVE', message: `Score ${Math.round(debt_score)}/100: Healthy leverage. Debt-to-Asset ratio is a safe ${Math.round(da_ratio)}%.`});

  // -- DIMENSION 5: Tax Efficiency (10%) --
  let tax_score = 100;
  if (personal_profile.tax_regime === 'Old') {
    const s80c = Math.min(tax_profile.section_80c_utilized, 150000) / 150000 * 100;
    const s80d = Math.min(tax_profile.section_80d_utilized, 25000) / 25000 * 100;
    const nps_b = income_and_cashflow.monthly_epf_nps_contribution > 0 ? 100 : 0;
    tax_score = (s80c * 0.5) + (s80d * 0.3) + (nps_b * 0.2);
  }
  if (tax_score < 60) xaiInsights.push({ dimension: 'Tax Efficiency', score: Math.round(tax_score), type: 'WARNING', message: `Score ${Math.round(tax_score)}/100: Sub-optimal IT Act deductions. You are missing out on Section 80C or 80D limits under the Old Regime.`});
  else xaiInsights.push({ dimension: 'Tax Efficiency', score: Math.round(tax_score), type: 'POSITIVE', message: `Score ${Math.round(tax_score)}/100: Fully optimized deductions for your tax regime.`});

  // -- DIMENSION 6: Retirement Readiness (15%) --
  const years_left = Math.max(1, personal_profile.target_retirement_age - personal_profile.current_age);
  const inflation_multiplier = Math.pow(2, years_left / 18);
  const target_corpus = 25 * (monthly_expenses * 12) * inflation_multiplier;
  
  const current_corpus_seed = assets_portfolio.filter((a:any)=>a.linked_goal_id==='retirement').reduce((s:number,a:any)=>s+a.current_market_value, 0) + (12 * income_and_cashflow.monthly_epf_nps_contribution);
  const r = 0.08;
  const fv_seed = current_corpus_seed * Math.pow(1+r, years_left);
  const annual_sip = income_and_cashflow.total_active_monthly_sips * 12;
  const fv_sip = annual_sip * ((Math.pow(1+r, years_left) - 1) / r);
  const projected_corpus = fv_seed + fv_sip;
  
  let ret_score = target_corpus > 0 ? (projected_corpus / target_corpus) * 100 : 100;
  if (years_left < 10 && ret_score < 60) ret_score -= 10;
  ret_score = Math.max(0, Math.min(100, ret_score));

  if (ret_score < 60) xaiInsights.push({ dimension: 'Retirement', score: Math.round(ret_score), type: 'WARNING', message: `Score ${Math.round(ret_score)}/100: Shortfall projected. Based on 4% inflation and 8% returns over ${years_left} years, you will reach ₹${(projected_corpus/10000000).toFixed(2)}Cr, but need 25x expenses (₹${(target_corpus/10000000).toFixed(2)}Cr).`});
  else xaiInsights.push({ dimension: 'Retirement', score: Math.round(ret_score), type: 'POSITIVE', message: `Score ${Math.round(ret_score)}/100: On track for retirement. Projected corpus covers >100% of the 25x expense rule.`});

  // -- AGGREGATE --
  const overallScore = Math.round(
    (ef_score * 0.15) + (ins_score * 0.20) + (div_score * 0.20) + 
    (debt_score * 0.20) + (tax_score * 0.10) + (ret_score * 0.15)
  );

  // 3. Save to state
  userState['user-001'].hasOnboarded = true;
  userState['user-001'].dashboardData = {
    healthScore: {
      score: overallScore,
      dimensions: {
        'Emergency Fund': Math.round(ef_score),
        'Insurance': Math.round(ins_score),
        'Diversification': Math.round(div_score),
        'Debt Health': Math.round(debt_score),
        'Tax Efficiency': Math.round(tax_score),
        'Retirement': Math.round(ret_score)
      }
    },
    xai: xaiInsights,
    cashflow: {
      safeToSpend: Math.round(income_and_cashflow.monthly_net_take_home - monthly_expenses - income_and_cashflow.total_monthly_emi - income_and_cashflow.total_active_monthly_sips), 
      burnRate: monthly_expenses,
      runwayMonths: monthly_expenses > 0 ? (liquid_savings / monthly_expenses) : 99,
      anomalies: []
    },
    wealthPaths: {
      currentNetWorth: total_portfolio_value - total_debt,
      horizonYears: 10,
      paths: {
        CONSERVATIVE: { projectedNetWorth: (total_portfolio_value - total_debt) * 1.8, riskDescription: 'Low volatility, steady growth.' },
        MODERATE: { projectedNetWorth: (total_portfolio_value - total_debt) * 2.5, riskDescription: 'Balanced equity and debt.' },
        AGGRESSIVE: { projectedNetWorth: (total_portfolio_value - total_debt) * 4.2, riskDescription: 'High equity exposure.' }
      }
    },
    creditScore: {
      score: Math.round(600 + (overallScore * 2.5)),
      maxScore: 900,
      factors: ['AI Derived from 6-Dim SEBI/RBI Engine']
    },
    brv: {
      score: Math.round(total_portfolio_value / 1000),
      tier: total_portfolio_value > 5000000 ? 'PLATINUM' : 'GOLD',
      relationshipYears: 1,
      totalAUM: total_portfolio_value,
      productsHeld: assets_portfolio.length
    }
  };

  res.json({ success: true });
});

app.get('/api/dashboard/user-001', (req, res) => {
  const data = userState['user-001'].dashboardData;
  if (!data) return res.status(404).json({ error: 'Not onboarded' });
  res.json(data);
});

// -- DETERMINISTIC PROACTIVE DATA MONITORING ENGINE (No Loans) --
const handleMonitoringRequest = async (req: express.Request, res: express.Response) => {
  try {
    const rawId = (req.params.userId || req.query.userId || req.query.user || 'priya.sharma@email.com') as string;
    const searchTerm = decodeURIComponent(rawId).trim().toLowerCase();



  // 1. Fetch User Record from Supabase
  let dbUser: any = null;
  try {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(searchTerm);
    let q = supabase.from('users').select('*');
    if (isUuid) q = q.eq('id', searchTerm);
    else if (searchTerm.includes('@')) q = q.eq('email', searchTerm);
    else q = q.or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
    
    const { data } = await q;
    if (data && data.length > 0) dbUser = data[0];
  } catch (err) {
    console.warn('Supabase users query warning:', err);
  }

  // 2. Fetch User Bank Accounts from Supabase
  let dbAccounts: any[] = [];
  if (dbUser?.id) {
    try {
      const { data } = await supabase.from('bank_accounts').select('*').eq('user_id', dbUser.id);
      if (data) dbAccounts = data;
    } catch {}
  }

  // Fallback defaults from Supabase database seed dictionary
  const userProfiles: Record<string, any> = {
    'priya.sharma@email.com': { email: 'priya.sharma@email.com', name: 'Priya Sharma', age: 38, occupation: 'Product Manager', city: 'Mumbai', income: 185000, riskTolerance: 8, healthCover: 1000000, termCover: 10000000, s80cUtilized: 150000, safeToSpend: 75000, dependents: 0, taxRegime: 'Old' },
    'rajesh.kumar@email.com': { email: 'rajesh.kumar@email.com', name: 'Rajesh Kumar', age: 34, occupation: 'Software Engineer', city: 'Bangalore', income: 125000, riskTolerance: 6, healthCover: 500000, termCover: 5000000, s80cUtilized: 90000, safeToSpend: 35000, dependents: 1, taxRegime: 'Old' },
    'arun.venkatesh@email.com': { email: 'arun.venkatesh@email.com', name: 'Arun Venkatesh', age: 41, occupation: 'Civil Engineer', city: 'Chennai', income: 95000, riskTolerance: 3, healthCover: 300000, termCover: 3000000, s80cUtilized: 110000, safeToSpend: 18000, dependents: 3, taxRegime: 'Old' },
    'neha.patel@email.com': { email: 'neha.patel@email.com', name: 'Neha Patel', age: 31, occupation: 'Data Analyst', city: 'Ahmedabad', income: 78000, riskTolerance: 6, healthCover: 500000, termCover: 4000000, s80cUtilized: 75000, safeToSpend: 25000, dependents: 0, taxRegime: 'Old' },
    'suresh.iyer@email.com': { email: 'suresh.iyer@email.com', name: 'Suresh Iyer', age: 48, occupation: 'Business Owner', city: 'Hyderabad', income: 320000, riskTolerance: 9, healthCover: 1500000, termCover: 30000000, s80cUtilized: 150000, safeToSpend: 120000, dependents: 2, taxRegime: 'Old' }
  };

  const matchedProfile = dbUser ? {
    name: dbUser.name,
    email: dbUser.email || searchTerm,
    age: dbUser.date_of_birth ? (new Date().getFullYear() - new Date(dbUser.date_of_birth).getFullYear()) : 35,
    occupation: dbUser.occupation || 'Professional',
    city: dbUser.city || 'Metropolitan',
    income: Number(dbUser.monthly_income) || 150000,
    riskTolerance: dbUser.risk_tolerance === 'AGGRESSIVE' ? 8 : (dbUser.risk_tolerance === 'CONSERVATIVE' ? 3 : 6),
    healthCover: 1000000,
    termCover: 10000000,
    s80cUtilized: 150000,
    safeToSpend: Math.round((Number(dbUser.monthly_income) || 150000) * 0.30),
    dependents: dbUser.dependents || 0,
    taxRegime: 'Old'
  } : (userProfiles[searchTerm] || userProfiles['priya.sharma@email.com']);

  // Total Balance from Supabase bank_accounts
  const totalBalance = dbAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const liquidCash = totalBalance > 0 ? totalBalance : matchedProfile.safeToSpend * 4;

  const recommendations = [];

  // ================================================================
  // DETERMINISTIC ALGORITHM 1: Health Insurance Coverage Gap
  // Target Health Cover = Max(₹15L, Monthly Income * 10)
  // ================================================================
  const targetHealthCover = Math.max(1500000, matchedProfile.income * 10);
  const healthGap = targetHealthCover - matchedProfile.healthCover;
  if (healthGap > 0) {
    recommendations.push({
      id: `algo-health-${matchedProfile.name.replace(/\s+/g, '')}`,
      bank_name: 'ICICI Bank',
      product_name: 'ICICI Lombard Elevate Health Plan',
      category: 'HEALTH_INSURANCE',
      expected_return_or_cover: `₹${(targetHealthCover/100000).toFixed(1)}L Cover + Unlimited Reset`,
      reasoning_xai: `[Deterministic Algorithm: IRDAI Health Benchmark] Monthly Income (₹${matchedProfile.income.toLocaleString()}) × 10 = Target Cover ₹${(targetHealthCover/100000).toFixed(1)}L. Your current health cover (₹${(matchedProfile.healthCover/100000).toFixed(1)}L) leaves a calculated risk gap of ₹${(healthGap/100000).toFixed(1)}L.`,
      impact_summary: `Covers ₹${(healthGap/100000).toFixed(1)}L medical risk gap`,
      badge: 'DETERMINISTIC HEALTH GAP',
      status: 'ACTIVE'
    });
  }

  // ================================================================
  // DETERMINISTIC ALGORITHM 2: Term Life Protection (10x + 2x per Dependent)
  // Target Life Cover = Annual Income * (10 + Dependents * 2)
  // ================================================================
  const multiplier = 10 + (matchedProfile.dependents * 2);
  const annualIncome = matchedProfile.income * 12;
  const targetLifeCover = annualIncome * multiplier;
  const lifeGap = targetLifeCover - matchedProfile.termCover;
  if (lifeGap > 0) {
    recommendations.push({
      id: `algo-term-${matchedProfile.name.replace(/\s+/g, '')}`,
      bank_name: 'State Bank of India',
      product_name: 'SBI Life eShield Next',
      category: 'TERM_LIFE',
      expected_return_or_cover: `₹${(targetLifeCover/10000000).toFixed(2)} Cr Target Cover`,
      reasoning_xai: `[Deterministic Algorithm: Income Protection Rule] Annual Income (₹${(annualIncome/100000).toFixed(1)}L) × ${multiplier} multiplier (${matchedProfile.dependents} dependents) = Target Cover ₹${(targetLifeCover/10000000).toFixed(2)}Cr. Current cover of ₹${(matchedProfile.termCover/10000000).toFixed(2)}Cr leaves an unhedged gap of ₹${(lifeGap/10000000).toFixed(2)}Cr.`,
      impact_summary: `Hedges ₹${(lifeGap/10000000).toFixed(2)}Cr income gap`,
      badge: 'DETERMINISTIC LIFE GAP',
      status: 'ACTIVE'
    });
  }

  // ================================================================
  // DETERMINISTIC ALGORITHM 3: Section 80C Tax Deduction Gap
  // Tax Unutilized Gap = Max(0, 150,000 - Section 80C Utilized)
  // Direct Tax Saved = Tax Gap * 31.2%
  // ================================================================
  if (matchedProfile.taxRegime === 'Old' && matchedProfile.s80cUtilized < 150000) {
    const unutilized80C = 150000 - matchedProfile.s80cUtilized;
    const directTaxSaved = Math.round(unutilized80C * 0.312);
    recommendations.push({
      id: `algo-tax-${matchedProfile.name.replace(/\s+/g, '')}`,
      bank_name: 'ICICI Bank',
      product_name: 'ICICI Prudential Tax Plan ELSS',
      category: 'TAX_SAVER',
      expected_return_or_cover: '15.4% CAGR (3Y Lock-in)',
      reasoning_xai: `[Deterministic Algorithm: IT Act Section 80C] Max Limit (₹1,50,000) - Utilized (₹${matchedProfile.s80cUtilized.toLocaleString()}) = ₹${unutilized80C.toLocaleString()} Tax Gap. Allocating to ELSS produces direct tax savings of ₹${directTaxSaved.toLocaleString()} at your 31.2% tax bracket.`,
      impact_summary: `Saves ₹${directTaxSaved.toLocaleString()} in direct income tax`,
      badge: 'DETERMINISTIC TAX SAVER',
      status: 'ACTIVE'
    });
  }

  // ================================================================
  // DETERMINISTIC ALGORITHM 4: Idle Cash Reserve Yield Optimization
  // 6-Month Emergency Buffer = (Monthly Income * 0.40) * 6
  // Excess Uninvested Cash = Max(0, Liquid Savings - Required Emergency Buffer)
  // Yield Gain = Excess Cash * (7.25% - 2.70%)
  // ================================================================
  const monthlyLivingExpenses = matchedProfile.income * 0.40;
  const requiredEmergencyBuffer = monthlyLivingExpenses * 6;
  const excessUninvestedCash = Math.max(0, liquidCash - requiredEmergencyBuffer);
  if (excessUninvestedCash > 20000) {
    const annualYieldGain = Math.round(excessUninvestedCash * (0.0725 - 0.0270));
    recommendations.push({
      id: `algo-fd-${matchedProfile.name.replace(/\s+/g, '')}`,
      bank_name: 'State Bank of India',
      product_name: 'SBI Amrit Vrishti 444-Day FD',
      category: 'FIXED_DEPOSIT',
      expected_return_or_cover: '7.25% p.a.',
      reasoning_xai: `[Deterministic Algorithm: RBI Reserve & Yield Upgrade] Required 6-month buffer: ₹${requiredEmergencyBuffer.toLocaleString()}. Your liquid cash: ₹${liquidCash.toLocaleString()}. Moving surplus ₹${excessUninvestedCash.toLocaleString()} to 444-day Special FD yields ₹${annualYieldGain.toLocaleString()} extra annual income (7.25% vs 2.70%).`,
      impact_summary: `Generates ₹${annualYieldGain.toLocaleString()} extra annual yield`,
      badge: 'DETERMINISTIC YIELD UPGRADE',
      status: 'ACTIVE'
    });
  }

  // ================================================================
  // DETERMINISTIC ALGORITHM 5: Age-Based Equity Allocation (SEBI Rule of 100)
  // Ideal Equity % = Max(20, Min(85, 100 - Age + ((RiskScore - 5) * 2)))
  // Recommended Monthly SIP = Max(5000, Monthly Income * 0.20)
  // ================================================================
  if (matchedProfile.riskTolerance >= 5) {
    const idealEquityPercent = Math.max(20, Math.min(85, 100 - matchedProfile.age + ((matchedProfile.riskTolerance - 5) * 2)));
    const recommendedMonthlySIP = Math.max(5000, Math.round(matchedProfile.income * 0.20));
    recommendations.push({
      id: `algo-sip-${matchedProfile.name.replace(/\s+/g, '')}`,
      bank_name: 'HDFC Bank',
      product_name: 'HDFC Top 100 Equity SIP',
      category: 'SIP',
      expected_return_or_cover: '14.8% CAGR (5Y)',
      reasoning_xai: `[Deterministic Algorithm: SEBI Rule of 100] Ideal Equity Allocation = 100 - Age (${matchedProfile.age}) + Risk Adjustment = ${idealEquityPercent}%. Automating ₹${recommendedMonthlySIP.toLocaleString()}/mo SIP compounds wealth systematically for your target horizon.`,
      impact_summary: `Compounding ${idealEquityPercent}% target equity portfolio`,
      badge: 'DETERMINISTIC WEALTH SIP',
      status: 'ACTIVE'
    });
  }

  // 3. Fetch User Financial Commitments from Supabase
  let dbCommitments: any[] = [];
  try {
    const { data } = await supabase
      .from('financial_commitments')
      .select('*')
      .eq('user_email', matchedProfile.email || searchTerm);
    if (data && data.length > 0) dbCommitments = data;
  } catch (err) {
    console.warn('Supabase commitments query warning:', err);
  }

  // Fallback commitments dictionary if Supabase query is empty
  if (dbCommitments.length === 0) {
    dbCommitments = [
      { id: 'c-1', commitment_name: 'HDFC Home Loan AutoPay EMI', commitment_type: 'LOAN_EMI', amount: 45000, due_date: 'In 3 days', bank_name: 'HDFC Bank', status: 'SCHEDULED' },
      { id: 'c-2', commitment_name: 'ICICI Sapphiro Credit Card Bill', commitment_type: 'CREDIT_CARD_AUTOPAY', amount: 28500, due_date: 'In 5 days', bank_name: 'ICICI Bank', status: 'SCHEDULED' },
      { id: 'c-3', commitment_name: 'HDFC Top 100 Equity SIP Auto-debit', commitment_type: 'SIP_AUTODEBIT', amount: 15000, due_date: 'In 2 days', bank_name: 'HDFC Bank', status: 'SCHEDULED' }
    ];
  }

  // Calculate Overspend & Commitment Deficit Alerts
  const totalUpcomingAutoDebits = dbCommitments.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const spendingAlerts: any[] = [];

  // Overspend Risk Calculation
  if (liquidCash < totalUpcomingAutoDebits) {
    const deficit = totalUpcomingAutoDebits - liquidCash;
    spendingAlerts.push({
      id: `alert-deficit-${matchedProfile.name.replace(/\s+/g, '')}`,
      alert_type: 'COMMITMENT_DEFICIT_RISK',
      title: '🚨 CRITICAL: AutoPay Deficit & Overspend Warning',
      message: `Your upcoming scheduled auto-debits (₹${totalUpcomingAutoDebits.toLocaleString()}) due within 5 days exceed your available liquid cash buffer (₹${liquidCash.toLocaleString()}) by ₹${deficit.toLocaleString()}. Reserve funds immediately to avoid bounce penalties & credit score impact.`,
      amount_at_risk: deficit,
      severity: 'CRITICAL',
      status: 'ACTIVE',
      action_hint: 'Reserve Balance for AutoPay'
    });
  } else {
    spendingAlerts.push({
      id: `alert-autopay-${matchedProfile.name.replace(/\s+/g, '')}`,
      alert_type: 'AUTOPAY_DUE_SOON',
      title: '⚠️ Scheduled Commitments & Auto-Debits Due Soon',
      message: `You have ₹${totalUpcomingAutoDebits.toLocaleString()} in upcoming financial commitments (Home Loan EMI, Credit Card AutoPay, SIP) due over the next 5 days. Liquid buffer of ₹${liquidCash.toLocaleString()} is currently earmarked.`,
      amount_at_risk: totalUpcomingAutoDebits,
      severity: 'WARNING',
      status: 'ACTIVE',
      action_hint: 'Lock Liquidity Buffer'
    });
  }

  // 4. Fetch User Card Privileges (Supabase + In-Memory Fallback)
  let dbUserCards: any[] = [];
  if (dbUser?.id) {
    try {
      const { data: cards } = await supabase
        .from('user_cards')
        .select('*, card_privileges(*)')
        .eq('user_id', dbUser.id);
      if (cards && cards.length > 0) dbUserCards = cards;
    } catch (err) {
      console.warn('Supabase user_cards query warning:', err);
    }
  }

  // Fallback cards & privileges seed dictionary for mock profiles
  const fallbackCardProfiles: Record<string, any[]> = {
    'priya.sharma@email.com': [
      {
        id: 'card-hdfc-regalia-priya',
        bank_name: 'HDFC Bank',
        card_name: 'HDFC Regalia Gold Credit Card',
        card_type: 'CREDIT_CARD',
        card_number_last4: '8912',
        annual_fee: 2500,
        privileges: [
          { id: 'priv-1', privilege_name: 'Complimentary Airport Lounge Access', category: 'LOUNGE', total_quota: 12, used_quota: 4, unit: 'Visits', monetary_value_per_unit: 1500, reset_frequency: 'QUARTERLY', expiry_date: '2026-09-30', is_forgotten_alert: true },
          { id: 'priv-2', privilege_name: 'BookMyShow Buy-1-Get-1 Movie Tickets', category: 'ENTERTAINMENT', total_quota: 24, used_quota: 8, unit: 'Tickets', monetary_value_per_unit: 300, reset_frequency: 'MONTHLY', expiry_date: '2026-08-31', is_forgotten_alert: false },
          { id: 'priv-3', privilege_name: 'Swiggy One & MMT Black Vouchers', category: 'LIFESTYLE', total_quota: 1, used_quota: 0, unit: 'Voucher', monetary_value_per_unit: 2499, reset_frequency: 'ANNUALLY', expiry_date: '2026-08-15', is_forgotten_alert: true },
          { id: 'priv-4', privilege_name: 'Air Accident Insurance Cover (₹1 Cr)', category: 'INSURANCE', total_quota: 1, used_quota: 1, unit: 'Cr Cover', monetary_value_per_unit: 10000, reset_frequency: 'ANNUALLY', expiry_date: '2026-12-31', is_forgotten_alert: false }
        ]
      },
      {
        id: 'card-icici-sapphiro-priya',
        bank_name: 'ICICI Bank',
        card_name: 'ICICI Sapphiro Credit Card',
        card_type: 'CREDIT_CARD',
        card_number_last4: '4401',
        annual_fee: 3500,
        privileges: [
          { id: 'priv-5', privilege_name: 'Golf Course Rounds & Coaching', category: 'GOLF', total_quota: 4, used_quota: 1, unit: 'Rounds', monetary_value_per_unit: 3500, reset_frequency: 'QUARTERLY', expiry_date: '2026-09-30', is_forgotten_alert: true },
          { id: 'priv-6', privilege_name: 'Culinary Treats 15% Dining Cashback', category: 'DINING', total_quota: 12, used_quota: 9, unit: 'Visits', monetary_value_per_unit: 650, reset_frequency: 'MONTHLY', expiry_date: '2026-12-31', is_forgotten_alert: false },
          { id: 'priv-7', privilege_name: '1% Fuel Surcharge Waiver', category: 'FUEL', total_quota: 12, used_quota: 10, unit: 'Months', monetary_value_per_unit: 250, reset_frequency: 'MONTHLY', expiry_date: '2026-12-31', is_forgotten_alert: false }
        ]
      }
    ],
    'rajesh.kumar@email.com': [
      {
        id: 'card-sbi-simplyclick-rajesh',
        bank_name: 'State Bank of India',
        card_name: 'SBI SimplyCLICK Credit Card',
        card_type: 'CREDIT_CARD',
        card_number_last4: '1102',
        annual_fee: 499,
        privileges: [
          { id: 'priv-8', privilege_name: 'Cleartrip / Amazon e-Gift Voucher', category: 'LIFESTYLE', total_quota: 1, used_quota: 0, unit: 'Voucher', monetary_value_per_unit: 2000, reset_frequency: 'ANNUALLY', expiry_date: '2026-08-30', is_forgotten_alert: true },
          { id: 'priv-9', privilege_name: 'Domestic Airport Lounge Access', category: 'LOUNGE', total_quota: 4, used_quota: 1, unit: 'Visits', monetary_value_per_unit: 1200, reset_frequency: 'QUARTERLY', expiry_date: '2026-09-30', is_forgotten_alert: true }
        ]
      }
    ],
    'suresh.iyer@email.com': [
      {
        id: 'card-axis-magnus-suresh',
        bank_name: 'Axis Bank',
        card_name: 'Axis Bank Magnus Credit Card',
        card_type: 'CREDIT_CARD',
        card_number_last4: '9988',
        annual_fee: 10000,
        privileges: [
          { id: 'priv-10', privilege_name: 'Unlimited Airport Lounge + Guest Access', category: 'LOUNGE', total_quota: 16, used_quota: 5, unit: 'Visits', monetary_value_per_unit: 2000, reset_frequency: 'QUARTERLY', expiry_date: '2026-09-30', is_forgotten_alert: true },
          { id: 'priv-11', privilege_name: 'Concierge & Airport Meet & Greet', category: 'LIFESTYLE', total_quota: 8, used_quota: 2, unit: 'Services', monetary_value_per_unit: 4000, reset_frequency: 'ANNUALLY', expiry_date: '2026-11-30', is_forgotten_alert: true }
        ]
      }
    ]
  };

  const currentEmail = (matchedProfile?.email || searchTerm || 'priya.sharma@email.com').toLowerCase();
  const finalCards = dbUserCards.length > 0 
    ? dbUserCards 
    : (fallbackCardProfiles[currentEmail] || fallbackCardProfiles['priya.sharma@email.com']);

  // Calculate privilege financial metrics & forgotten alerts
  let totalPrivilegeValue = 0;
  let usedPrivilegeValue = 0;
  let forgottenValueAtRisk = 0;
  const forgottenAlerts: any[] = [];

  finalCards.forEach((card: any) => {
    const privs = card.card_privileges || card.privileges || [];
    privs.forEach((p: any) => {
      const unitVal = Number(p.monetary_value_per_unit || 1000);
      const totalVal = p.total_quota * unitVal;
      const usedVal = p.used_quota * unitVal;
      const unutilVal = totalVal - usedVal;

      totalPrivilegeValue += totalVal;
      usedPrivilegeValue += usedVal;

      if (p.is_forgotten_alert || (p.total_quota - p.used_quota) >= Math.ceil(p.total_quota * 0.5)) {
        forgottenValueAtRisk += unutilVal;
        forgottenAlerts.push({
          cardName: card.card_name,
          bankName: card.bank_name,
          privilegeName: p.privilege_name,
          remainingQuota: p.total_quota - p.used_quota,
          totalQuota: p.total_quota,
          unit: p.unit,
          valueAtRisk: unutilVal,
          expiryDate: p.expiry_date
        });
      }
    });
  });

  res.json({
    userId: searchTerm,
    profileSignals: {
      name: matchedProfile.name,
      age: matchedProfile.age,
      occupation: matchedProfile.occupation,
      city: matchedProfile.city,
      riskTolerance: matchedProfile.riskTolerance,
      healthCover: matchedProfile.healthCover,
      termCover: matchedProfile.termCover,
      s80cUtilized: matchedProfile.s80cUtilized,
      safeToSpend: matchedProfile.safeToSpend,
      liquidCash: liquidCash
    },
    recommendations,
    commitments: dbCommitments,
    spendingAlerts,
    cardPrivilegesData: {
      cards: finalCards,
      summary: {
        totalCards: finalCards.length,
        totalPrivilegeValue,
        usedPrivilegeValue,
        forgottenValueAtRisk,
        forgottenCount: forgottenAlerts.length
      },
      forgottenAlerts
    }
  });

  } catch (err: any) {
    console.error('Monitoring API error:', err);
    res.status(500).json({ error: err.message || 'Internal Monitoring Engine Error' });
  }
};

app.get('/api/monitoring', handleMonitoringRequest);
app.get('/api/monitoring/:userId', handleMonitoringRequest);

app.post('/api/monitoring/apply', (req, res) => {
  const { recommendationId, bankName, productName } = req.body;
  console.log(`[MONITORING] User applied for product: ${productName} from ${bankName} (ID: ${recommendationId})`);
  res.json({
    success: true,
    message: `Application for ${productName} submitted successfully! Your bank advisor from ${bankName} will confirm activation.`
  });
});

app.post('/api/monitoring/claim-privilege', (req, res) => {
  const { privilegeId, privilegeName, cardName } = req.body;
  console.log(`[MONITORING] User claimed card benefit: ${privilegeName} on card ${cardName} (ID: ${privilegeId})`);
  res.json({
    success: true,
    message: `Successfully redeemed "${privilegeName}" on ${cardName}! Benefit quota updated.`
  });
});

app.listen(port, () => {
  console.log(`🚀 Backend running at http://localhost:${port}`);
});

