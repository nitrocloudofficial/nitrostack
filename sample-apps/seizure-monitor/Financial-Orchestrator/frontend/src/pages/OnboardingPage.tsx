import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // UI State for the 5 simple fields
  const [age, setAge] = useState(30);
  const [income, setIncome] = useState(150000);
  const [expenses, setExpenses] = useState(50000);
  const [assets, setAssets] = useState(2500000);
  const [debt, setDebt] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Dummy Magic: Mapping 5 inputs into the massive 30-field RBI/SEBI payload
    const payload = {
      "personal_profile": {
        "current_age": age,
        "target_retirement_age": 60,
        "dependents": 2,
        "risk_appetite_score": 7,
        "tax_regime": "Old"
      },
      "income_and_cashflow": {
        "monthly_net_take_home": income,
        "monthly_base_pay": income * 0.8,
        "monthly_variable_pay": income * 0.2,
        "monthly_mandatory_living_expenses": expenses * 0.7,
        "monthly_discretionary_spend": expenses * 0.3,
        "monthly_epf_nps_contribution": income * 0.1, // 10% of income
        "total_monthly_emi": debt > 0 ? debt * 0.02 : 0, // Approx EMI
        "total_active_monthly_sips": (income - expenses) > 0 ? (income - expenses) * 0.5 : 0
      },
      "tax_profile": {
        "section_80c_utilized": 150000,
        "section_80d_utilized": 25000,
        "section_24b_utilized": debt > 2000000 ? 200000 : 0
      },
      "insurance_and_protection": {
        "total_health_insurance_cover": 1000000,
        "total_term_life_cover": income * 15 * 12, // 15x annual income
        "corporate_health_cover": 500000
      },
      "assets_portfolio": [
        { "category": "Equity", "current_market_value": assets * 0.6, "liquidity_status": "High", "linked_goal_id": "retirement" },
        { "category": "Debt", "current_market_value": assets * 0.3, "liquidity_status": "Medium", "linked_goal_id": "none" },
        { "category": "Cash", "current_market_value": assets * 0.1, "liquidity_status": "High", "linked_goal_id": "emergency" }
      ],
      "liabilities_and_debt": debt > 0 ? [
        { "loan_type": "Home Loan", "outstanding_amount": debt * 0.8, "emi_amount": debt * 0.015, "is_tax_deductible": true },
        { "loan_type": "Credit Card", "outstanding_amount": debt * 0.2, "emi_amount": debt * 0.005, "is_tax_deductible": false }
      ] : []
    };

    try {
      const res = await fetch('http://localhost:3001/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        navigate('/dna');
      }
    } catch (err) {
      alert("Network error.");
      console.error(err);
    }
    setLoading(false);
  };

  const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '24px'
  };

  const labelStyle: React.CSSProperties = {
    color: '#8B949E',
    fontSize: '14px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1px'
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '16px',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 600,
    outline: 'none',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#05050A', padding: '40px' }}>
      
      {/* Background Glows */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(0, 240, 255, 0.1) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(112, 0, 255, 0.1) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', position: 'relative', zIndex: 10, padding: '48px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 12px 0', background: 'linear-gradient(45deg, #00F0FF, #7000FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            System Initialization
          </h1>
          <p style={{ color: '#8B949E', fontSize: '15px', margin: 0 }}>
            Configure your client profile. The AI Orchestrator will automatically map these inputs against thousands of institutional permutations.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          
          <div style={inputGroupStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label style={labelStyle}>Client Age</label>
              <span style={{ color: '#00F0FF', fontWeight: 700 }}>{age} Years</span>
            </div>
            <input 
              type="range" 
              min="18" max="80" 
              value={age} 
              onChange={(e) => setAge(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#00F0FF', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Monthly Income (₹)</label>
              <input type="number" style={inputStyle} value={income} onChange={(e) => setIncome(Number(e.target.value))} required />
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Monthly Expenses (₹)</label>
              <input type="number" style={inputStyle} value={expenses} onChange={(e) => setExpenses(Number(e.target.value))} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Total Assets (₹)</label>
              <input type="number" style={inputStyle} value={assets} onChange={(e) => setAssets(Number(e.target.value))} required />
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Total Debt (₹)</label>
              <input type="number" style={inputStyle} value={debt} onChange={(e) => setDebt(Number(e.target.value))} required />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              width: '100%', 
              padding: '18px', 
              background: 'linear-gradient(45deg, #00F0FF, #7000FF)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '12px', 
              fontWeight: 800, 
              fontSize: '16px',
              cursor: 'pointer',
              marginTop: '16px',
              boxShadow: '0 10px 30px rgba(0, 240, 255, 0.2)',
              transition: 'all 0.3s'
            }}
          >
            {loading ? 'Crunching Telemetry...' : 'Initialize AI Engine'}
          </button>
        </form>
      </div>
    </div>
  );
};
