// ============================================
// simulator.ts — Live Financial Environment Simulator
// ============================================
// Usage:  npx tsx simulator.ts seed    (Seeds the initial data)
//         npx tsx simulator.ts tick    (Runs one live transaction/update)
//         npx tsx simulator.ts         (Defaults to running one tick)
//
// Prerequisites:
//   1. Run 005_simulator_tables.sql in your Supabase SQL Editor.
//   2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
// ============================================

import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────
// Supabase Client
// ─────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────
interface SeedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  pan_number_hash: string;
  city: string;
  occupation: string;
  employer_name: string;
  monthly_income: number;
  risk_tolerance: string;
  target_retirement_age: number;
  dependents: number;
  marital_status: string;
}

interface SeedBankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_type: string;
  account_number_masked: string;
  balance: number;
  currency: string;
  account_id_short: string;
}

interface SeedStockCompany {
  tradingsymbol: string;
  company_name: string;
  exchange: string;
  sector: string;
  current_price: number;
  open_price: number;
  close_price: number;
  day_high: number;
  day_low: number;
  volume: number;
}

interface SeedMutualFund {
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
  category: string;
  nav: number;
  open_nav: number;
  close_nav: number;
}

// ─────────────────────────────────────────────
// 1. SEED DATA
// ─────────────────────────────────────────────
const USERS: SeedUser[] = [
  { id: '00000000-0000-4000-a000-000000000001', name: 'Rajesh Kumar', email: 'rajesh.kumar@email.com', phone: '+91-9876543210', date_of_birth: '1992-05-15', pan_number_hash: 'sha256_ABCPK1234F', city: 'Bangalore', occupation: 'Software Engineer', employer_name: 'TechCorp India Pvt Ltd', monthly_income: 125000, risk_tolerance: 'MODERATE', target_retirement_age: 55, dependents: 1, marital_status: 'MARRIED' },
  { id: '00000000-0000-4000-a000-000000000002', name: 'Priya Sharma', email: 'priya.sharma@email.com', phone: '+91-9123456780', date_of_birth: '1988-11-22', pan_number_hash: 'sha256_BCDPS5678G', city: 'Mumbai', occupation: 'Product Manager', employer_name: 'FinServe Technologies', monthly_income: 185000, risk_tolerance: 'AGGRESSIVE', target_retirement_age: 50, dependents: 0, marital_status: 'SINGLE' },
  { id: '00000000-0000-4000-a000-000000000003', name: 'Arun Venkatesh', email: 'arun.venkatesh@email.com', phone: '+91-9988776655', date_of_birth: '1985-03-08', pan_number_hash: 'sha256_CDEAV3456H', city: 'Chennai', occupation: 'Civil Engineer', employer_name: 'L&T Construction', monthly_income: 95000, risk_tolerance: 'CONSERVATIVE', target_retirement_age: 60, dependents: 3, marital_status: 'MARRIED' },
  { id: '00000000-0000-4000-a000-000000000004', name: 'Neha Patel', email: 'neha.patel@email.com', phone: '+91-9654321098', date_of_birth: '1995-07-19', pan_number_hash: 'sha256_DEFNP7890J', city: 'Ahmedabad', occupation: 'Data Analyst', employer_name: 'DataWise Analytics', monthly_income: 78000, risk_tolerance: 'MODERATE', target_retirement_age: 58, dependents: 0, marital_status: 'SINGLE' },
  { id: '00000000-0000-4000-a000-000000000005', name: 'Suresh Iyer', email: 'suresh.iyer@email.com', phone: '+91-9012345678', date_of_birth: '1978-01-30', pan_number_hash: 'sha256_EFGSI2345K', city: 'Hyderabad', occupation: 'Business Owner', employer_name: 'Iyer & Sons Trading Co.', monthly_income: 320000, risk_tolerance: 'AGGRESSIVE', target_retirement_age: 55, dependents: 2, marital_status: 'MARRIED' },
];

const BANK_ACCOUNTS: SeedBankAccount[] = [
  { id: '10000000-0000-4000-b000-000000000001', user_id: USERS[0].id, bank_name: 'State Bank of India', account_type: 'SAVINGS', account_number_masked: 'XXXXXX4412', balance: 300301.0, currency: 'INR', account_id_short: 'sbi_acc_1029' },
  { id: '10000000-0000-4000-b000-000000000002', user_id: USERS[1].id, bank_name: 'HDFC Bank', account_type: 'SAVINGS', account_number_masked: 'XXXXXX7891', balance: 487520.0, currency: 'INR', account_id_short: 'hdfc_acc_2048' },
  { id: '10000000-0000-4000-b000-000000000003', user_id: USERS[2].id, bank_name: 'ICICI Bank', account_type: 'SAVINGS', account_number_masked: 'XXXXXX3356', balance: 142780.0, currency: 'INR', account_id_short: 'icici_acc_3077' },
  { id: '10000000-0000-4000-b000-000000000004', user_id: USERS[3].id, bank_name: 'Axis Bank', account_type: 'SAVINGS', account_number_masked: 'XXXXXX5523', balance: 96340.0, currency: 'INR', account_id_short: 'axis_acc_4015' },
  { id: '10000000-0000-4000-b000-000000000005', user_id: USERS[4].id, bank_name: 'Kotak Mahindra Bank', account_type: 'CURRENT', account_number_masked: 'XXXXXX8890', balance: 1245600.0, currency: 'INR', account_id_short: 'kotak_acc_5063' },
];

const STOCK_COMPANIES: SeedStockCompany[] = [
  { tradingsymbol: 'RELIANCE', company_name: 'Reliance Industries Limited', exchange: 'NSE', sector: 'Oil & Gas / Conglomerate', current_price: 2945.6, open_price: 2940.0, close_price: 2932.15, day_high: 2960.0, day_low: 2920.0, volume: 8432100 },
  { tradingsymbol: 'TATAMOTORS', company_name: 'Tata Motors Limited', exchange: 'NSE', sector: 'Automobile', current_price: 920.5, open_price: 930.0, close_price: 935.0, day_high: 942.0, day_low: 912.0, volume: 15678000 },
  { tradingsymbol: 'HDFCBANK', company_name: 'HDFC Bank Limited', exchange: 'NSE', sector: 'Banking & Finance', current_price: 1685.25, open_price: 1675.0, close_price: 1672.0, day_high: 1698.0, day_low: 1665.0, volume: 6234500 },
  { tradingsymbol: 'INFY', company_name: 'Infosys Limited', exchange: 'NSE', sector: 'Information Technology', current_price: 1562.8, open_price: 1560.0, close_price: 1555.0, day_high: 1575.0, day_low: 1548.0, volume: 5120300 },
  { tradingsymbol: 'TCS', company_name: 'Tata Consultancy Services Limited', exchange: 'NSE', sector: 'Information Technology', current_price: 3810.45, open_price: 3800.0, close_price: 3795.0, day_high: 3825.0, day_low: 3785.0, volume: 3456700 },
];

const LIVE_MUTUAL_FUNDS: SeedMutualFund[] = [
  { scheme_code: '120503', scheme_name: 'Axis Bluechip Fund - Direct Growth', amc_name: 'Axis Mutual Fund', category: 'Large Cap Equity', nav: 52.18, open_nav: 52.00, close_nav: 51.90 },
  { scheme_code: '118989', scheme_name: 'HDFC Mid-Cap Opportunities - Direct Growth', amc_name: 'HDFC Mutual Fund', category: 'Mid Cap Equity', nav: 125.45, open_nav: 124.80, close_nav: 124.20 },
  { scheme_code: '120587', scheme_name: 'ICICI Pru Balanced Advantage - Direct Growth', amc_name: 'ICICI Prudential', category: 'Hybrid', nav: 68.75, open_nav: 68.50, close_nav: 68.60 },
  { scheme_code: '119790', scheme_name: 'SBI Magnum Gilt Fund - Direct Growth', amc_name: 'SBI Mutual Fund', category: 'Debt', nav: 58.90, open_nav: 58.85, close_nav: 58.80 },
];

function buildFinancialProfiles() {
  return [
    {
      user_id: USERS[0].id,
      profile_data: {
        tax_profile: {
          assessment_year: '2025-26',
          employer: 'TechCorp India Pvt Ltd',
          pan: 'ABCPK1234F',
          gross_salary: 1500000,
          basic_salary: 600000,
          hra_received: 300000,
          special_allowance: 450000,
          lta: 50000,
          exemptions: { hra_exemption: 180000, lta_exemption: 50000, standard_deduction: 50000, total_exemptions: 280000 },
          deductions: { section_80C: { total: 135000 }, section_80D: { total: 45000 }, section_24: { home_loan_interest: 200000 }, total_deductions: 435000 },
          taxable_income: 785000,
          tax_computation: { total_tax: 69500, cess_4_percent: 2780, gross_tax_liability: 72280, net_tax_payable: 72280 },
          tds_deducted: 78000,
          refund_due: 5720,
          tax_regime: 'OLD'
        },
        mutual_fund_cas: {
          investor_name: 'Rajesh Kumar',
          pan: 'ABCPK1234F',
          statement_date: '2026-07-01',
          holdings: [
            { amc: 'Axis Mutual Fund', scheme_name: 'Axis Bluechip Fund - Direct Growth', units: 842.35, nav: 52.18, current_value: 439553, invested_value: 360000, xirr_percent: 14.2, asset_class: 'Large Cap Equity' },
            { amc: 'HDFC Mutual Fund', scheme_name: 'HDFC Mid-Cap Opportunities - Direct Growth', units: 1205.6, nav: 125.45, current_value: 1512548, invested_value: 1200000, xirr_percent: 18.6, asset_class: 'Mid Cap Equity' }
          ],
          total_invested: 1844000,
          total_current_value: 2268075,
          overall_gain_percent: 23.0,
          asset_allocation: { large_cap_equity: 19.4, mid_cap_equity: 66.7, small_cap_equity: 4.2, hybrid: 9.7 }
        },
        income_bracket: { certified: true, annual_gross: 1500000, annual_net_after_tax: 1422000, monthly_take_home: 118500, bracket: '₹10L–₹15L', percentile_india: 'Top 5%' }
      }
    },
    {
      user_id: USERS[1].id,
      profile_data: {
        tax_profile: {
          assessment_year: '2025-26',
          employer: 'FinServe Technologies',
          pan: 'BCDPS5678G',
          gross_salary: 2220000,
          basic_salary: 888000,
          exemptions: { total_exemptions: 404400 },
          deductions: { section_80C: { total: 150000 }, section_80D: { total: 75000 }, total_deductions: 290000 },
          taxable_income: 1525600,
          tax_computation: { net_tax_payable: 280987 },
          tds_deducted: 290000,
          refund_due: 9013,
          tax_regime: 'OLD'
        },
        mutual_fund_cas: {
          investor_name: 'Priya Sharma',
          pan: 'BCDPS5678G',
          statement_date: '2026-07-01',
          holdings: [
            { amc: 'Parag Parikh', scheme_name: 'PPFAS Flexi Cap Fund - Direct Growth', units: 6800.15, nav: 72.45, current_value: 492671, invested_value: 400000, xirr_percent: 19.8, asset_class: 'Flexi Cap Equity' }
          ],
          total_invested: 2350000,
          total_current_value: 2537453,
          overall_gain_percent: 7.98,
          asset_allocation: { flexi_cap_equity: 19.4, debt_liquid: 73.7, international_equity: 6.9 }
        },
        income_bracket: { certified: true, annual_gross: 2220000, annual_net_after_tax: 1930000, monthly_take_home: 160833, bracket: '₹15L–₹25L', percentile_india: 'Top 2%' }
      }
    },
    {
      user_id: USERS[2].id,
      profile_data: {
        tax_profile: {
          assessment_year: '2025-26',
          employer: 'L&T Construction',
          pan: 'CDEAV3456H',
          gross_salary: 1140000,
          basic_salary: 456000,
          exemptions: { total_exemptions: 226800 },
          deductions: { total_deductions: 462000 },
          taxable_income: 451200,
          tax_computation: { net_tax_payable: 0 },
          tds_deducted: 15000,
          refund_due: 15000,
          tax_regime: 'OLD'
        },
        mutual_fund_cas: {
          investor_name: 'Arun Venkatesh',
          pan: 'CDEAV3456H',
          statement_date: '2026-07-01',
          holdings: [
            { amc: 'SBI Mutual Fund', scheme_name: 'SBI Magnum Gilt Fund - Direct Growth', units: 12500.0, nav: 58.9, current_value: 736250, invested_value: 700000, xirr_percent: 7.8, asset_class: 'Debt / Gilt' }
          ],
          total_invested: 1900000,
          total_current_value: 2131950,
          overall_gain_percent: 12.2,
          asset_allocation: { debt_gilt: 34.5, hybrid: 65.5 }
        },
        income_bracket: { certified: true, annual_gross: 1140000, annual_net_after_tax: 1125000, monthly_take_home: 93750, bracket: '₹10L–₹15L', percentile_india: 'Top 6%' }
      }
    },
    {
      user_id: USERS[3].id,
      profile_data: {
        tax_profile: {
          assessment_year: '2025-26',
          employer: 'DataWise Analytics',
          pan: 'DEFNP7890J',
          gross_salary: 936000,
          basic_salary: 374400,
          exemptions: { total_exemptions: 192320 },
          deductions: { total_deductions: 155000 },
          taxable_income: 588680,
          tax_computation: { net_tax_payable: 31445 },
          tds_deducted: 36000,
          refund_due: 4555,
          tax_regime: 'NEW'
        },
        mutual_fund_cas: {
          investor_name: 'Neha Patel',
          pan: 'DEFNP7890J',
          statement_date: '2026-07-01',
          holdings: [
            { amc: 'Mirae Asset', scheme_name: 'Mirae Asset Large Cap Fund - Direct Growth', units: 2200.0, nav: 98.6, current_value: 216920, invested_value: 180000, xirr_percent: 15.3, asset_class: 'Large Cap Equity' }
          ],
          total_invested: 276000,
          total_current_value: 333300,
          overall_gain_percent: 20.76,
          asset_allocation: { large_cap_equity: 65.1, mid_cap_equity: 34.9 }
        },
        income_bracket: { certified: true, annual_gross: 936000, annual_net_after_tax: 900000, monthly_take_home: 75000, bracket: '₹7.5L–₹10L', percentile_india: 'Top 8%' }
      }
    },
    {
      user_id: USERS[4].id,
      profile_data: {
        tax_profile: {
          assessment_year: '2025-26',
          employer: 'Iyer & Sons Trading Co.',
          pan: 'EFGSI2345K',
          gross_income: 3840000,
          business_income: 3200000,
          exemptions: { total_exemptions: 0 },
          deductions: { total_deductions: 525000 },
          taxable_income: 3315000,
          tax_computation: { net_tax_payable: 919980 },
          advance_tax_paid: 850000,
          tds_deducted: 48000,
          refund_due: 0,
          balance_tax_due: 21980,
          tax_regime: 'OLD'
        },
        mutual_fund_cas: {
          investor_name: 'Suresh Iyer',
          pan: 'EFGSI2345K',
          statement_date: '2026-07-01',
          holdings: [
            { amc: 'HDFC Mutual Fund', scheme_name: 'HDFC Top 100 Fund - Direct Growth', units: 15000.0, nav: 920.4, current_value: 13806000, invested_value: 10000000, xirr_percent: 21.5, asset_class: 'Large Cap Equity' }
          ],
          total_invested: 12200000,
          total_current_value: 16299070,
          overall_gain_percent: 33.6,
          asset_allocation: { large_cap_equity: 84.7, elss_tax_saver: 8.0, debt_corporate_bond: 7.3 }
        },
        income_bracket: { certified: true, annual_gross: 3840000, annual_net_after_tax: 2920020, monthly_take_home: 243335, bracket: '₹25L–₹50L', percentile_india: 'Top 0.5%' }
      }
    }
  ];
}

// ─────────────────────────────────────────────
// 2. TRANSACTION TEMPLATES
// ─────────────────────────────────────────────
interface TransactionTemplate {
  transaction_type: 'DEBIT' | 'CREDIT';
  payment_channel: string;
  payment_app: string | null;
  merchant_name: string;
  merchant_vpa: string | null;
  category: string;
  description_template: string;
  amount_range: [number, number];
}

const TRANSACTION_TEMPLATES: TransactionTemplate[] = [
  // ── Utilities & Food ──
  { transaction_type: 'DEBIT', payment_channel: 'UPI', payment_app: 'Google Pay', merchant_name: 'TNEB Electricity Board', merchant_vpa: 'tneb.ebills@sbi', category: 'Utilities', description_template: 'UPI/{ref}/Electricity Bill Payment/tneb.ebills@sbi/GPay', amount_range: [1200, 3500] },
  { transaction_type: 'DEBIT', payment_channel: 'UPI', payment_app: 'PhonePe', merchant_name: 'Swiggy', merchant_vpa: 'swiggy@axisbank', category: 'Food & Dining', description_template: 'UPI/{ref}/Swiggy Food Order/swiggy@axisbank/PhonePe', amount_range: [150, 1200] },
  { transaction_type: 'DEBIT', payment_channel: 'UPI', payment_app: 'Google Pay', merchant_name: 'Zomato', merchant_vpa: 'zomato@hdfcbank', category: 'Food & Dining', description_template: 'UPI/{ref}/Zomato Dinner Order/zomato@hdfcbank/GPay', amount_range: [200, 1500] },
  { transaction_type: 'DEBIT', payment_channel: 'UPI', payment_app: 'Paytm', merchant_name: 'Airtel Prepaid', merchant_vpa: 'airtel.recharge@paytm', category: 'Telecom', description_template: 'UPI/{ref}/Airtel Mobile Recharge/airtel.recharge@paytm/Paytm', amount_range: [199, 999] },
  
  // ── Loans, SIPs, & Heavy Debits ──
  { transaction_type: 'DEBIT', payment_channel: 'AUTO_DEBIT', payment_app: null, merchant_name: 'HDFC Home Loan EMI', merchant_vpa: null, category: 'EMI', description_template: 'NACH/{ref}/HDFC HOME LOAN EMI', amount_range: [25000, 55000] },
  { transaction_type: 'DEBIT', payment_channel: 'AUTO_DEBIT', payment_app: null, merchant_name: 'Axis Bluechip MF SIP', merchant_vpa: null, category: 'Investment', description_template: 'NACH/{ref}/SIP Axis Bluechip Fund Direct Growth', amount_range: [5000, 25000] },
  { transaction_type: 'DEBIT', payment_channel: 'NEFT', payment_app: null, merchant_name: 'Landlord - Rent Payment', merchant_vpa: null, category: 'Rent', description_template: 'NEFT/{ref}/Monthly Rent/ACCT-LANDLORD', amount_range: [15000, 45000] },
  { transaction_type: 'DEBIT', payment_channel: 'IMPS', payment_app: null, merchant_name: 'LIC Premium', merchant_vpa: null, category: 'Insurance', description_template: 'IMPS/{ref}/LIC Term Plan Premium/LIC-INDIA', amount_range: [8000, 25000] },
  { transaction_type: 'DEBIT', payment_channel: 'CREDIT_CARD', payment_app: null, merchant_name: 'SBI Credit Card Bill', merchant_vpa: null, category: 'Bill Payment', description_template: 'NEFT/{ref}/SBI Card Bill Repayment', amount_range: [12000, 48000] },
  
  // ── Retail, Healthcare & Fuel ──
  { transaction_type: 'DEBIT', payment_channel: 'DEBIT_CARD', payment_app: null, merchant_name: 'Amazon India', merchant_vpa: null, category: 'Shopping', description_template: 'POS/{ref}/Amazon.in/Electronics Purchase', amount_range: [999, 28000] },
  { transaction_type: 'DEBIT', payment_channel: 'UPI', payment_app: 'Google Pay', merchant_name: 'BigBasket', merchant_vpa: 'bigbasket@yesbank', category: 'Groceries', description_template: 'UPI/{ref}/BigBasket Grocery Order/bigbasket@yesbank/GPay', amount_range: [500, 4500] },
  { transaction_type: 'DEBIT', payment_channel: 'UPI', payment_app: 'PhonePe', merchant_name: 'Apollo Pharmacy', merchant_vpa: 'apollo.pharmacy@icici', category: 'Healthcare', description_template: 'UPI/{ref}/Apollo Pharmacy Purchase/apollo.pharmacy@icici/PhonePe', amount_range: [200, 3200] },
  { transaction_type: 'DEBIT', payment_channel: 'UPI', payment_app: 'Google Pay', merchant_name: 'Shell Petrol Bunk', merchant_vpa: 'shell.fuel@icici', category: 'Fuel', description_template: 'UPI/{ref}/Shell Petrol/shell.fuel@icici/GPay', amount_range: [500, 5000] },

  // ── Income ──
  { transaction_type: 'CREDIT', payment_channel: 'NEFT', payment_app: null, merchant_name: 'Salary Credit', merchant_vpa: null, category: 'Income', description_template: 'NEFT/{ref}/SALARY/{employer}', amount_range: [60000, 350000] },
  { transaction_type: 'CREDIT', payment_channel: 'INTEREST', payment_app: null, merchant_name: 'Bank Interest Credit', merchant_vpa: null, category: 'Income', description_template: 'INT/{ref}/Savings Account Interest', amount_range: [500, 8500] },
  { transaction_type: 'CREDIT', payment_channel: 'UPI', payment_app: 'Google Pay', merchant_name: 'P2P Transfer Received', merchant_vpa: null, category: 'Transfer', description_template: 'UPI/{ref}/Received from Friend/GPay', amount_range: [500, 15000] },
];

const ALERT_TYPES = ['PORTFOLIO_DRAWDOWN', 'BREAKOUT_SIGNAL', 'PRICE_UPDATE'] as const;

// ─────────────────────────────────────────────
// 3. UTILITIES
// ─────────────────────────────────────────────
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min: number, max: number, decimals = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(decimals)); }
function pickRandom<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function generateTxnRef() { return String(randomInt(100000000000, 999999999999)); }
function generateTxnId(channel: string) { return `TXN_${channel.slice(0,4)}_${randomInt(1000000000, 9999999999)}`; }

// ─────────────────────────────────────────────
// 4. SEED FUNCTION
// ─────────────────────────────────────────────
async function seedDatabase() {
  console.log('🌱 Seeding Database...');
  
  const { error: e1 } = await supabase.from('users').upsert(USERS, { onConflict: 'id' });
  if (e1) { console.error('❌ Error seeding users:', e1.message); return; }

  const bankAccountRows = BANK_ACCOUNTS.map(({ account_id_short, ...rest }) => rest);
  const { error: e2 } = await supabase.from('bank_accounts').upsert(bankAccountRows, { onConflict: 'id' });
  if (e2) { console.error('❌ Error seeding bank_accounts:', e2.message); return; }
  
  // Clear existing stock ticks during seed so it doesn't get infinitely large if seeded repeatedly
  const { error: e3 } = await supabase.from('stock_companies').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
  if (e3) { console.error('❌ Error clearing stock_companies:', e3.message); return; }

  const { error: e4 } = await supabase.from('stock_companies').insert(STOCK_COMPANIES); // Insert as new ticks
  if (e4) { console.error('❌ Error seeding stock_companies:', e4.message); return; }

  const { error: m1 } = await supabase.from('live_mutual_funds').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (m1) { console.error('❌ Error clearing live_mutual_funds:', m1.message); return; }
  
  const { error: m2 } = await supabase.from('live_mutual_funds').insert(LIVE_MUTUAL_FUNDS);
  if (m2) { console.error('❌ Error seeding live_mutual_funds:', m2.message); return; }
  
  const { error: e5 } = await supabase.from('user_financial_profiles').upsert(buildFinancialProfiles(), { onConflict: 'user_id' });
  if (e5) { console.error('❌ Error seeding user_financial_profiles:', e5.message); return; }
  
  console.log('✅ Seeding complete!');
}

// ─────────────────────────────────────────────
// 5. TICK ACTIONS (Fetch current -> Update -> Save)
// ─────────────────────────────────────────────
async function generateBankTransaction() {
  // Fetch a random account directly from DB to get the live balance
  const { data: accounts, error: err1 } = await supabase.from('bank_accounts').select('*');
  if (err1 || !accounts?.length) return console.error('❌ Failed to fetch accounts. Did you seed?');
  
  const account = pickRandom(accounts);
  const template = pickRandom(TRANSACTION_TEMPLATES);

  const amount = randomFloat(template.amount_range[0], template.amount_range[1]);
  const ref = generateTxnRef();
  const txnId = generateTxnId(template.payment_channel);

  let newBalance = parseFloat(account.balance);
  if (template.transaction_type === 'DEBIT') newBalance -= amount;
  else newBalance += amount;
  newBalance = parseFloat(newBalance.toFixed(2));

  const shortIdMap: Record<string, string> = {
    'State Bank of India': 'sbi_acc_1029',
    'HDFC Bank': 'hdfc_acc_2048',
    'ICICI Bank': 'icici_acc_3077',
    'Axis Bank': 'axis_acc_4015',
    'Kotak Mahindra Bank': 'kotak_acc_5063',
  };
  const account_id_short = shortIdMap[account.bank_name] || 'unknown_acc';

  // 1. Update the balance in bank_accounts table IN PLACE
  await supabase.from('bank_accounts').update({ balance: newBalance }).eq('id', account.id);

  // 2. Insert the transaction record
  const description = template.description_template.replace('{ref}', ref).replace('{employer}', 'EMPLOYER');
  const row = {
    transaction_id: txnId,
    account_id: account_id_short,
    bank_name: account.bank_name,

    account_number_masked: account.account_number_masked,
    transaction_type: template.transaction_type,
    payment_channel: template.payment_channel,
    payment_app: template.payment_app,
    merchant_name: template.merchant_name,
    merchant_vpa: template.merchant_vpa,
    category: template.category,
    description,
    amount,
    currency: 'INR',
    balance_after_transaction: newBalance,
    timestamp: new Date().toISOString(),
    status: 'SUCCESS',
  };

  const { error } = await supabase.from('bank_transactions').insert(row);
  if (error) return console.error('❌ Bank Txn insert failed:', error.message);

  console.log(`🏦 NEW ${template.transaction_type} | ₹${amount} → ${template.merchant_name} | Acc: ${account.bank_name} (${account.account_number_masked}) | New Bal: ₹${newBalance}`);
}

async function generateMarketAlert() {
  const symbols = ['RELIANCE', 'TATAMOTORS', 'HDFCBANK', 'INFY', 'TCS'];
  const stockSymbol = pickRandom(symbols);

  // Fetch the absolute latest tick for the chosen stock to calculate from
  const { data: latestStocks, error: err1 } = await supabase
    .from('stock_companies')
    .select('*')
    .eq('tradingsymbol', stockSymbol)
    .order('timestamp', { ascending: false })
    .limit(1);

  if (err1 || !latestStocks?.length) return console.error('❌ Failed to fetch stock. Did you seed?');

  const stock = latestStocks[0];
  const previousPrice = parseFloat(stock.current_price);
  
  const direction = Math.random() < 0.5 ? -1 : 1;
  const pctChange = randomFloat(0.5, 3.0);
  const delta = previousPrice * (pctChange / 100) * direction;
  const newPrice = parseFloat((previousPrice + delta).toFixed(2));

  const actualChangePercent = parseFloat((((newPrice - previousPrice) / previousPrice) * 100).toFixed(2));

  // 1. INSERT A NEW ROW INTO STOCK COMPANIES (Time-series)
  const newRow = {
    tradingsymbol: stock.tradingsymbol,
    company_name: stock.company_name,
    exchange: stock.exchange,
    sector: stock.sector,
    current_price: newPrice,
    open_price: stock.open_price,
    close_price: stock.close_price,
    day_high: Math.max(parseFloat(stock.day_high || stock.current_price), newPrice),
    day_low: Math.min(parseFloat(stock.day_low || stock.current_price), newPrice),
    volume: parseInt(stock.volume) + randomInt(1000, 50000),
    timestamp: new Date().toISOString()
  };

  const { error: insertErr } = await supabase.from('stock_companies').insert(newRow);

  if (insertErr) return console.error('❌ Stock insert failed:', insertErr.message);

  let alertType: string;
  if (actualChangePercent < -1.5) alertType = 'PORTFOLIO_DRAWDOWN';
  else if (actualChangePercent > 1.5) alertType = 'BREAKOUT_SIGNAL';
  else alertType = pickRandom(ALERT_TYPES);

  // 2. Add the alert row
  const alertRow = {
    alert_type: alertType,
    broker: 'ZERODHA',
    tradingsymbol: stock.tradingsymbol,
    exchange: stock.exchange,
    current_price: newPrice,
    trigger_price: parseFloat((previousPrice * 1.02).toFixed(2)),
    change_percent: actualChangePercent,
    timestamp: new Date().toISOString(),
  };

  await supabase.from('market_alerts').insert(alertRow);

  const emoji = newPrice > previousPrice ? '🟢' : '🔴';
  console.log(`📈 MARKET TICK ${emoji} | ${stock.tradingsymbol} | ₹${previousPrice} → ₹${newPrice} (${actualChangePercent}%) | New tick inserted!`);
}

async function generateMutualFundTick() {
  const codes = ['120503', '118989', '120587', '119790'];
  const mCode = pickRandom(codes);

  const { data: latestMfs, error: err } = await supabase
    .from('live_mutual_funds')
    .select('*')
    .eq('scheme_code', mCode)
    .order('timestamp', { ascending: false })
    .limit(1);

  if (err || !latestMfs?.length) return console.error('❌ Failed to fetch mutual funds. Did you seed?');

  const mf = latestMfs[0];
  const previousNav = parseFloat(mf.nav);

  const direction = Math.random() < 0.5 ? -1 : 1;
  const pctChange = randomFloat(0.1, 1.5);
  const delta = previousNav * (pctChange / 100) * direction;
  const newNav = parseFloat((previousNav + delta).toFixed(4));

  const newRow = {
    scheme_code: mf.scheme_code,
    scheme_name: mf.scheme_name,
    amc_name: mf.amc_name,
    category: mf.category,
    nav: newNav,
    open_nav: mf.open_nav,
    close_nav: mf.close_nav,
    timestamp: new Date().toISOString()
  };

  const { error: insertErr } = await supabase.from('live_mutual_funds').insert(newRow);
  if (insertErr) return console.error('❌ MF insert failed:', insertErr.message);

  const emoji = newNav > previousNav ? '🟢' : '🔴';
  console.log(`🏦 MF NAV TICK ${emoji} | ${mf.scheme_name} | ₹${previousNav} → ₹${newNav}`);
}

// ─────────────────────────────────────────────
// 6. MAIN EXECUTION
// ─────────────────────────────────────────────
async function main() {
  const arg = process.argv[2] || 'tick';

  if (arg === 'seed') {
    await seedDatabase();
  } else if (arg === 'tick') {
    console.log(`⏱️ Running Single Tick Update: ${new Date().toLocaleTimeString()}`);
    await generateBankTransaction();
    await generateMarketAlert();
    await generateMutualFundTick();
  } else {
    console.error(`Unknown argument: ${arg}. Use 'seed' or 'tick'.`);
  }
}

main();
