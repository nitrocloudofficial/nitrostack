import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding 2 EXTRA users...');

  // 1. Create Users
  const user1 = {
    id: '00000000-0000-4000-a000-000000000006', // Anita
    name: 'Anita Desai',
    email: 'anita.desai@email.com',
    phone: '+91-9876543216',
    date_of_birth: '1985-03-25',
    city: 'Pune',
    occupation: 'Senior Consultant',
    employer_name: 'Tech Mahindra',
    monthly_income: 140000,
    risk_tolerance: 'MODERATE',
    target_retirement_age: 55
  };

  const user2 = {
    id: '00000000-0000-4000-a000-000000000007', // Rohan
    name: 'Rohan Gupta',
    email: 'rohan.gupta@email.com',
    phone: '+91-9876543217',
    date_of_birth: '1998-07-14',
    city: 'Chennai',
    occupation: 'Junior Developer',
    employer_name: 'Startup Inc',
    monthly_income: 35000,
    risk_tolerance: 'AGGRESSIVE',
    target_retirement_age: 60
  };

  await supabase.from('users').upsert([user1, user2]);
  console.log('Users created.');

  // 2. Bank Accounts
  const accounts = [
    {
      id: '10000000-0000-4000-b000-000000000006',
      user_id: user1.id,
      bank_name: 'State Bank of India',
      account_type: 'SAVINGS',
      account_number_masked: 'XXXXXX2345',
      balance: 850000,
      currency: 'INR'
    },
    {
      id: '10000000-0000-4000-b000-000000000007',
      user_id: user2.id,
      bank_name: 'Kotak Mahindra Bank',
      account_type: 'SAVINGS',
      account_number_masked: 'XXXXXX8765',
      balance: 20000,
      currency: 'INR'
    }
  ];
  await supabase.from('bank_accounts').upsert(accounts);
  console.log('Bank Accounts created.');

  // 3. User Scores
  const scores = [
    // Anita > 700
    {
      user_id: user1.id,
      score_type: 'ALTERNATIVE_CREDIT',
      score_value: 760,
      grade: 'EXCELLENT',
      metrics_breakdown: { savings_rate: 65, foir_percentage: 25 }
    },
    {
      user_id: user1.id,
      bank_name: 'State Bank of India',
      score_type: 'BRV',
      score_value: 810,
      grade: 'EXCELLENT',
      metrics_breakdown: {}
    },
    // Rohan < 720
    {
      user_id: user2.id,
      score_type: 'ALTERNATIVE_CREDIT',
      score_value: 680,
      grade: 'FAIR',
      metrics_breakdown: { savings_rate: 15, foir_percentage: 55 }
    },
    {
      user_id: user2.id,
      bank_name: 'Kotak Mahindra Bank',
      score_type: 'BRV',
      score_value: 620,
      grade: 'FAIR',
      metrics_breakdown: {}
    }
  ];
  await supabase.from('user_scores').upsert(scores);
  console.log('User Scores created.');

  // 4. Financial Goals
  const goals = [
    {
      id: '20000000-0000-4000-c000-000000000006',
      user_id: user1.id,
      name: 'Buy a House',
      target_amount: 12000000,
      target_year: 2030,
      priority: 1,
      category: 'REAL_ESTATE',
      current_progress: 2500000,
      source_tier: 'USER_INPUT'
    },
    {
      id: '20000000-0000-4000-c000-000000000007',
      user_id: user2.id,
      name: 'Buy a Bike',
      target_amount: 150000,
      target_year: 2026,
      priority: 1,
      category: 'VEHICLE',
      current_progress: 20000,
      source_tier: 'USER_INPUT'
    }
  ];
  await supabase.from('financial_goals').upsert(goals);
  console.log('Financial Goals created.');

  // 5. Bank Transactions
  const txns = [];
  const now = new Date();
  
  // Anita Txns
  for(let i=0; i<3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (i * 10));
    txns.push({
      transaction_id: `TXN_ANITA_INC_${i}`,
      account_id: accounts[0].id,
      bank_name: accounts[0].bank_name,
      account_number_masked: accounts[0].account_number_masked,
      transaction_type: 'CREDIT',
      category: 'Salary',
      amount: 140000,
      timestamp: d.toISOString(),
      status: 'SUCCESS'
    });
    txns.push({
      transaction_id: `TXN_ANITA_EMI_${i}`,
      account_id: accounts[0].id,
      bank_name: accounts[0].bank_name,
      account_number_masked: accounts[0].account_number_masked,
      transaction_type: 'DEBIT',
      category: 'Loan EMI',
      amount: 35000,
      timestamp: d.toISOString(),
      status: 'SUCCESS'
    });
  }

  // Rohan Txns
  for(let i=0; i<3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (i * 10));
    txns.push({
      transaction_id: `TXN_ROHAN_INC_${i}`,
      account_id: accounts[1].id,
      bank_name: accounts[1].bank_name,
      account_number_masked: accounts[1].account_number_masked,
      transaction_type: 'CREDIT',
      category: 'Salary',
      amount: 35000,
      timestamp: d.toISOString(),
      status: 'SUCCESS'
    });
    txns.push({
      transaction_id: `TXN_ROHAN_EMI_${i}`,
      account_id: accounts[1].id,
      bank_name: accounts[1].bank_name,
      account_number_masked: accounts[1].account_number_masked,
      transaction_type: 'DEBIT',
      category: 'Loan EMI',
      amount: 15000, 
      timestamp: d.toISOString(),
      status: 'SUCCESS'
    });
    txns.push({
      transaction_id: `TXN_ROHAN_BOUNCE_${i}`,
      account_id: accounts[1].id,
      bank_name: accounts[1].bank_name,
      account_number_masked: accounts[1].account_number_masked,
      transaction_type: 'DEBIT',
      category: 'Penalty',
      amount: 300,
      timestamp: d.toISOString(),
      status: 'FAILED' 
    });
  }

  await supabase.from('bank_transactions').upsert(txns);
  console.log('Bank Transactions created.');
  
  console.log('Done.');
}
seed();
