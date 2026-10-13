import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log('Fixing user_financial_profiles...');

  // Get users 3, 4, 6, 7
  const ids = [
    '00000000-0000-4000-a000-000000000003',
    '00000000-0000-4000-a000-000000000004',
    '00000000-0000-4000-a000-000000000006',
    '00000000-0000-4000-a000-000000000007'
  ];

  const profiles = ids.map((userId, index) => {
    return {
      user_id: userId,
      profile_data: {
        tax_profile: {
          pan: `ABCDE${1000 + index}F`,
          employer: "Corporate Inc",
          deductions: {
            total_deductions: 150000
          },
          exemptions: {
            total_exemptions: 50000
          },
          taxable_income: 500000
        },
        income_bracket: {
          bracket: "₹5L–₹10L",
          certified: true,
          annual_gross: 800000
        },
        mutual_fund_cas: {
          holdings: []
        }
      }
    };
  });

  // Check if they exist, if not insert
  for (const p of profiles) {
    const { data: existing } = await supabase
      .from('user_financial_profiles')
      .select('id')
      .eq('user_id', p.user_id);
    
    if (!existing || existing.length === 0) {
      await supabase.from('user_financial_profiles').insert([p]);
      console.log(`Inserted profile for ${p.user_id}`);
    } else {
      await supabase.from('user_financial_profiles')
        .update(p)
        .eq('user_id', p.user_id);
      console.log(`Updated profile for ${p.user_id}`);
    }
  }

  console.log('Done.');
}
fix();
