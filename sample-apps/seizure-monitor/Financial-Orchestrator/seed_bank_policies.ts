import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LOAN_POLICIES = [
  // State Bank of India
  {
    bank_name: 'State Bank of India',
    loan_type: 'HOME_LOAN',
    base_interest_rate: 8.40,
    max_tenure_months: 360,
    max_loan_amount: 100000000,
    min_cibil_score: 700,
    processing_fee_percent: 0.35,
    policy_details: { prepayment_penalty: 0, special_campaign: 'Festive Bonanza' }
  },
  {
    bank_name: 'State Bank of India',
    loan_type: 'PERSONAL_LOAN',
    base_interest_rate: 11.15,
    max_tenure_months: 72,
    max_loan_amount: 2000000,
    min_cibil_score: 750,
    processing_fee_percent: 1.0,
    policy_details: { prepayment_penalty: 3.0 }
  },
  
  // HDFC Bank
  {
    bank_name: 'HDFC Bank',
    loan_type: 'HOME_LOAN',
    base_interest_rate: 8.50,
    max_tenure_months: 360,
    max_loan_amount: 150000000,
    min_cibil_score: 650,
    processing_fee_percent: 0.50,
    policy_details: { prepayment_penalty: 0, allows_balance_transfer: true }
  },
  {
    bank_name: 'HDFC Bank',
    loan_type: 'AUTO_LOAN',
    base_interest_rate: 8.90,
    max_tenure_months: 84,
    max_loan_amount: 3000000,
    min_cibil_score: 700,
    processing_fee_percent: 1.0,
    policy_details: { prepayment_penalty: 5.0, ev_discount_percent: 0.25 }
  },
  
  // ICICI Bank
  {
    bank_name: 'ICICI Bank',
    loan_type: 'PERSONAL_LOAN',
    base_interest_rate: 10.75,
    max_tenure_months: 60,
    max_loan_amount: 5000000,
    min_cibil_score: 720,
    processing_fee_percent: 2.25,
    policy_details: { prepayment_penalty: 5.0, quick_disbursal: true }
  },
  {
    bank_name: 'ICICI Bank',
    loan_type: 'HOME_LOAN',
    base_interest_rate: 8.65,
    max_tenure_months: 240,
    max_loan_amount: 50000000,
    min_cibil_score: 680,
    processing_fee_percent: 0.50,
    policy_details: { prepayment_penalty: 0 }
  },
  
  // Axis Bank
  {
    bank_name: 'Axis Bank',
    loan_type: 'HOME_LOAN',
    base_interest_rate: 8.75,
    max_tenure_months: 360,
    max_loan_amount: 50000000,
    min_cibil_score: 700,
    processing_fee_percent: 1.0,
    policy_details: { EMI_holiday_allowed: true, prepayment_penalty: 0 }
  },
  
  // Kotak Mahindra Bank
  {
    bank_name: 'Kotak Mahindra Bank',
    loan_type: 'PERSONAL_LOAN',
    base_interest_rate: 10.99,
    max_tenure_months: 60,
    max_loan_amount: 2500000,
    min_cibil_score: 750,
    processing_fee_percent: 2.50,
    policy_details: { prepayment_penalty: 4.0, zero_foreclosure_after: 36 }
  }
];

async function seedLoanPolicies() {
  console.log('Seeding bank loan policies...');
  
  // Delete existing to avoid duplicates
  const { error: delError } = await supabase.from('bank_loan_policies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delError) {
    console.error('Failed to clear old policies:', delError.message);
  }

  // Insert new policies
  const { error } = await supabase.from('bank_loan_policies').insert(LOAN_POLICIES);
  
  if (error) {
    console.error('❌ Failed to insert loan policies:', error.message);
  } else {
    console.log('✅ Successfully seeded bank loan policies!');
  }
}

seedLoanPolicies();
