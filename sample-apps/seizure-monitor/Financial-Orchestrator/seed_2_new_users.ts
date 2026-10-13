import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding new users...');

  // 1. Create Users
  const user1 = {
    id: '00000000-0000-4000-a000-000000000003', // Aditi
    name: 'Aditi Sharma',
    email: 'aditi.sharma@email.com',
    phone: '+91-9876543212',
    date_of_birth: '1990-08-20',
    city: 'Mumbai',
    occupation: 'Marketing Director',
    employer_name: 'Global Reach Inc',
    monthly_income: 180000,
    risk_tolerance: 'AGGRESSIVE',
    target_retirement_age: 50
  };

  const user2 = {
    id: '00000000-0000-4000-a000-000000000004', // Vikram
    name: 'Vikram Singh',
    email: 'vikram.singh@email.com',
    phone: '+91-9876543213',
    date_of_birth: '1995-11-10',
    city: 'Delhi',
    occupation: 'Freelance Designer',
    employer_name: 'Self Employed',
    monthly_income: 45000,
    risk_tolerance: 'CONSERVATIVE',
    target_retirement_age: 65
  };

  await supabase.from('users').upsert([user1, user2]);
  console.log('Users created.');

  // 2. Bank Accounts
  const accounts = [
    {
      id: '10000000-0000-4000-b000-000000000003',
      user_id: user1.id,
      bank_name: 'HDFC Bank',
      account_type: 'SAVINGS',
      account_number_masked: 'XXXXXX1234',
      balance: 1250000,
      currency: 'INR'
    },
    {
      id: '10000000-0000-4000-b000-000000000004',
      user_id: user1.id,
      bank_name: 'ICICI Bank',
      account_type: 'CURRENT',
      account_number_masked: 'XXXXXX5678',
      balance: 450000,
      currency: 'INR'
    },
    {
      id: '10000000-0000-4000-b000-000000000005',
      user_id: user2.id,
      bank_name: 'State Bank of India',
      account_type: 'SAVINGS',
      account_number_masked: 'XXXXXX9999',
      balance: 15000,
      currency: 'INR'
    }
  ];
  await supabase.from('bank_accounts').upsert(accounts);
  console.log('Bank Accounts created.');

  // 3. User Scores
  const scores = [
    // Aditi > 700
    {
      user_id: user1.id,
      score_type: 'ALTERNATIVE_CREDIT',
      score_value: 785,
      grade: 'EXCELLENT',
      metrics_breakdown: { savings_rate: 85, foir_percentage: 15 }
    },
    {
      user_id: user1.id,
      bank_name: 'HDFC Bank',
      score_type: 'BRV',
      score_value: 880,
      grade: 'EXCELLENT',
      metrics_breakdown: {}
    },
    {
      user_id: user1.id,
      bank_name: 'ICICI Bank',
      score_type: 'BRV',
      score_value: 750,
      grade: 'GOOD',
      metrics_breakdown: {}
    },
    // Vikram < 720
    {
      user_id: user2.id,
      score_type: 'ALTERNATIVE_CREDIT',
      score_value: 610,
      grade: 'FAIR',
      metrics_breakdown: { savings_rate: 10, foir_percentage: 65 }
    },
    {
      user_id: user2.id,
      bank_name: 'State Bank of India',
      score_type: 'BRV',
      score_value: 580,
      grade: 'FAIR',
      metrics_breakdown: {}
    }
  ];
  await supabase.from('user_scores').upsert(scores);
  console.log('User Scores created.');

  // 4. Financial Goals
  const goals = [
    {
      id: '20000000-0000-4000-c000-000000000001',
      user_id: user1.id,
      name: 'Buy a Luxury Car',
      target_amount: 4500000,
      target_year: 2027,
      priority: 1,
      category: 'VEHICLE',
      current_progress: 1000000,
      source_tier: 'USER_INPUT'
    },
    {
      id: '20000000-0000-4000-c000-000000000002',
      user_id: user2.id,
      name: 'Personal Debt Consolidation',
      target_amount: 500000,
      target_year: 2026,
      priority: 1,
      category: 'DEBT',
      current_progress: 0,
      source_tier: 'AI_RECOMMENDED'
    }
  ];
  await supabase.from('financial_goals').upsert(goals);
  console.log('Financial Goals created.');

  // 5. Bank Transactions
  // Just seed a few representative transactions for each so the simulator works if needed
  const txns = [];
  const now = new Date();
  
  // Aditi Txns
  for(let i=0; i<3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (i * 10));
    txns.push({
      transaction_id: `TXN_ADITI_INC_${i}`,
      account_id: accounts[0].id,
      bank_name: accounts[0].bank_name,
      account_number_masked: accounts[0].account_number_masked,
      transaction_type: 'CREDIT',
      category: 'Salary',
      amount: 180000,
      timestamp: d.toISOString(),
      status: 'SUCCESS'
    });
    txns.push({
      transaction_id: `TXN_ADITI_EMI_${i}`,
      account_id: accounts[0].id,
      bank_name: accounts[0].bank_name,
      account_number_masked: accounts[0].account_number_masked,
      transaction_type: 'DEBIT',
      category: 'Loan EMI',
      amount: 25000,
      timestamp: d.toISOString(),
      status: 'SUCCESS'
    });
  }

  // Vikram Txns
  for(let i=0; i<3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (i * 10));
    txns.push({
      transaction_id: `TXN_VIKRAM_INC_${i}`,
      account_id: accounts[2].id,
      bank_name: accounts[2].bank_name,
      account_number_masked: accounts[2].account_number_masked,
      transaction_type: 'CREDIT',
      category: 'Freelance Income',
      amount: 45000,
      timestamp: d.toISOString(),
      status: 'SUCCESS'
    });
    txns.push({
      transaction_id: `TXN_VIKRAM_EMI_${i}`,
      account_id: accounts[2].id,
      bank_name: accounts[2].bank_name,
      account_number_masked: accounts[2].account_number_masked,
      transaction_type: 'DEBIT',
      category: 'Loan EMI',
      amount: 28000, // High EMI relative to income
      timestamp: d.toISOString(),
      status: 'SUCCESS'
    });
    txns.push({
      transaction_id: `TXN_VIKRAM_BOUNCE_${i}`,
      account_id: accounts[2].id,
      bank_name: accounts[2].bank_name,
      account_number_masked: accounts[2].account_number_masked,
      transaction_type: 'DEBIT',
      category: 'Penalty',
      amount: 500,
      timestamp: d.toISOString(),
      status: 'FAILED' // Simulate bounced payments
    });
  }

  await supabase.from('bank_transactions').upsert(txns);
  console.log('Bank Transactions created.');
  
  console.log('Done.');
}
seed();
