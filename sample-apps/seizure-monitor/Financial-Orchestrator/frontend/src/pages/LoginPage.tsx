import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  onLoginSuccess?: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('priya.sharma@email.com');
  const [password, setPassword] = useState('Priyasharma@4');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validatePassword(name: string, pwd: string): boolean {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 1) return false;
    const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0).toLowerCase() + parts[parts.length - 1].slice(1).toLowerCase() : '';
    const expected = `${first}${last}@4`;
    const altExpected = `${first.toLowerCase()}${last}@4`;
    return pwd === expected || pwd === altExpected;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const searchTerm = userId.trim().toLowerCase();
      
      let query = supabase.from('users').select('*');
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(searchTerm);
      
      if (isUuid) {
        query = query.eq('id', searchTerm);
      } else if (searchTerm.includes('@')) {
        query = query.eq('email', searchTerm);
      } else {
        query = query.or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
      }

      let dbUser: any = null;
      try {
        const { data: users, error: dbError } = await query;
        if (!dbError && users && users.length > 0) {
          dbUser = users[0];
        }
      } catch (err) {
        console.warn('Supabase query error:', err);
      }

      // Fallback for standard demo user if network error occurs
      if (!dbUser && (searchTerm.includes('priya') || searchTerm.includes('sharma'))) {
        dbUser = {
          id: '00000000-0000-4000-a000-000000000002',
          name: 'Priya Sharma',
          email: 'priya.sharma@email.com'
        };
      }

      if (!dbUser) {
        setError(`Access Denied: User "${userId}" not found in Supabase users table.`);
        setLoading(false);
        return;
      }

      if (!validatePassword(dbUser.name, password)) {
        const parts = dbUser.name.trim().split(/\s+/);
        const expectedHint = `${parts[0]}${parts[1] || ''}@4`;
        setError(`Invalid Password for ${dbUser.name}. Required format: Firstnamelastname@4 (e.g. ${expectedHint})`);
        setLoading(false);
        return;
      }

      // Trigger non-blocking backend sync
      const birthYear = dbUser.date_of_birth ? new Date(dbUser.date_of_birth).getFullYear() : 1990;
      const calculatedAge = new Date().getFullYear() - birthYear;
      const income = Number(dbUser.monthly_income) || 185000;

      const payload = {
        user_id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        personal_profile: { current_age: calculatedAge, target_retirement_age: 50, dependents: 0, risk_appetite_score: 8, tax_regime: "Old" },
        income_and_cashflow: { monthly_net_take_home: income, monthly_base_pay: 140000, monthly_variable_pay: 45000, monthly_mandatory_living_expenses: 50000, monthly_discretionary_spend: 20000, monthly_epf_nps_contribution: 15000, total_monthly_emi: 15000, total_active_monthly_sips: 40000 },
        tax_profile: { section_80c_utilized: 150000, section_80d_utilized: 25000, section_24b_utilized: 200000 },
        insurance_and_protection: { total_health_insurance_cover: 1000000, total_term_life_cover: 10000000, corporate_health_cover: 500000 },
        assets_portfolio: [ { category: "Equity", current_market_value: 1500000, liquidity_status: "High", linked_goal_id: "none" }, { category: "Debt", current_market_value: 750000, liquidity_status: "Medium", linked_goal_id: "none" }, { category: "Cash", current_market_value: 300000, liquidity_status: "High", linked_goal_id: "emergency" } ],
        liabilities_and_debt: [ { loan_type: "Home Loan", outstanding_amount: 500000, emi_amount: 15000, is_tax_deductible: true } ]
      };

      fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});

      // Notify parent App component of successful login (App.tsx will automatically redirect /login -> /)
      if (onLoginSuccess) {
        onLoginSuccess(dbUser);
      }
    } catch (e: any) {
      setError(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    navigate('/signup');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#05050A' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', background: 'linear-gradient(45deg, #00F0FF, #7000FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>
            Proactive Orchestrator
          </h1>
          <p style={{ margin: '8px 0 0 0', color: '#8B949E', fontSize: '13px' }}>Supabase Authenticated Gateway</p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(255, 69, 58, 0.15)', border: '1px solid rgba(255, 69, 58, 0.4)', color: '#FF453A', fontSize: '13px', marginBottom: '20px', lineHeight: '1.4' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#8B949E', marginBottom: '8px' }}>SUPABASE EMAIL OR USER ID</label>
            <input 
              type="text" 
              value={userId} 
              onChange={(e) => setUserId(e.target.value)}
              placeholder="priya.sharma@email.com"
              required
              style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#8B949E', marginBottom: '8px' }}>PASSWORD</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Priyasharma@4"
              required
              style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none' }} 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '8px', padding: '14px', background: 'linear-gradient(45deg, #00F0FF, #7000FF)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0, 240, 255, 0.2)' }}
          >
            {loading ? 'Authenticating...' : 'Sign In with Supabase'}
          </button>

          <div style={{ margin: '16px 0 8px 0', padding: '12px', background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.15)', borderRadius: '8px', fontSize: '11px', color: '#8B949E', lineHeight: '1.5' }}>
            <strong style={{ color: '#00F0FF' }}>Valid Supabase Users in Database:</strong>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: '16px' }}>
              <li>priya.sharma@email.com (Pass: Priyasharma@4)</li>
              <li>rajesh.kumar@email.com (Pass: Rajeshkumar@4)</li>
              <li>arun.venkatesh@email.com (Pass: Arunvenkatesh@4)</li>
              <li>neha.patel@email.com (Pass: Nehapatel@4)</li>
              <li>suresh.iyer@email.com (Pass: Sureshiyer@4)</li>
            </ul>
          </div>

          <div style={{ textAlign: 'center', margin: '8px 0', color: '#8B949E', fontSize: '13px' }}>
            or
          </div>

          <button type="button" onClick={handleSignUp} style={{ padding: '14px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
            Create New Account (AI Onboarding)
          </button>
        </form>
      </div>
    </div>
  );
};
