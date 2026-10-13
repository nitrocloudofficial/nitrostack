import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State (Defaulting to the mock demo data)
  const [age, setAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(60);
  const [riskTolerance, setRiskTolerance] = useState(7);
  
  const [income, setIncome] = useState(150000);
  const [expenses, setExpenses] = useState(60000);
  const [assets, setAssets] = useState(2550000);
  const [debt, setDebt] = useState(500000);
  
  const [lifeGoals, setLifeGoals] = useState<string[]>(["Funding Child's Education"]);
  const [customGoal, setCustomGoal] = useState("");
  const [customGoalRange, setCustomGoalRange] = useState("");

  const toggleGoal = (goal: string) => {
    if (lifeGoals.includes(goal)) {
      setLifeGoals(lifeGoals.filter(g => g !== goal));
    } else {
      setLifeGoals([...lifeGoals, goal]);
    }
  };

  const addCustomGoal = () => {
    if (customGoal.trim()) {
      const goalWithRange = customGoalRange.trim() ? `${customGoal.trim()} [${customGoalRange.trim()}]` : customGoal.trim();
      if (!lifeGoals.includes(goalWithRange)) {
        setLifeGoals([...lifeGoals, goalWithRange]);
      }
      setCustomGoal("");
      setCustomGoalRange("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      "personal_profile": {
        "current_age": age,
        "target_retirement_age": retirementAge,
        "dependents": 2,
        "risk_appetite_score": riskTolerance,
        "tax_regime": "Old"
      },
      "income_and_cashflow": {
        "monthly_net_take_home": income,
        "monthly_base_pay": income * 0.8,
        "monthly_variable_pay": income * 0.2,
        "monthly_mandatory_living_expenses": expenses,
        "monthly_discretionary_spend": income * 0.1,
        "monthly_epf_nps_contribution": income * 0.1,
        "total_monthly_emi": debt > 0 ? debt * 0.03 : 0,
        "total_active_monthly_sips": (income - expenses) > 0 ? (income - expenses) * 0.5 : 0
      },
      "tax_profile": {
        "section_80c_utilized": 150000,
        "section_80d_utilized": 25000,
        "section_24b_utilized": debt > 2000000 ? 200000 : 0
      },
      "insurance_and_protection": {
        "total_health_insurance_cover": 1000000,
        "total_term_life_cover": income * 15 * 12,
        "corporate_health_cover": 500000
      },
      "assets_portfolio": [
        { "category": "Equity", "current_market_value": assets * 0.6, "liquidity_status": "High", "linked_goal_id": lifeGoals.join(', ') },
        { "category": "Debt", "current_market_value": assets * 0.3, "liquidity_status": "Medium", "linked_goal_id": "none" },
        { "category": "Cash", "current_market_value": assets * 0.1, "liquidity_status": "High", "linked_goal_id": "emergency" }
      ],
      "liabilities_and_debt": debt > 0 ? [
        { "loan_type": "Home Loan", "outstanding_amount": debt, "emi_amount": debt * 0.03, "is_tax_deductible": true }
      ] : []
    };

    try {
      const res = await fetch('http://localhost:3001/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
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
    marginBottom: '20px'
  };

  const labelStyle: React.CSSProperties = {
    color: '#8B949E',
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1px'
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '14px',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
    width: '100%'
  };

  return (
    <div className="page-container">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">User Profile</h1>
          <p className="page-subtitle">Manage Context & Structured Entities</p>
        </div>
        <div>
          <button 
            onClick={() => navigate('/dna')} 
            style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer' }}
          >
            View Health Score ➔
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '32px', maxWidth: '800px' }}>
        
        <h2 style={{ fontSize: '18px', margin: '0 0 24px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>Qualitative Context</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Current Age ({age})</label>
            <input type="range" min="18" max="80" value={age} onChange={(e) => setAge(Number(e.target.value))} style={{ width: '100%', accentColor: '#00F0FF', cursor: 'pointer' }} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Retirement Age ({retirementAge})</label>
            <input type="range" min="40" max="80" value={retirementAge} onChange={(e) => setRetirementAge(Number(e.target.value))} style={{ width: '100%', accentColor: '#00F0FF', cursor: 'pointer' }} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Risk Tolerance ({riskTolerance}/10)</label>
            <input type="range" min="1" max="10" value={riskTolerance} onChange={(e) => setRiskTolerance(Number(e.target.value))} style={{ width: '100%', accentColor: '#00F0FF', cursor: 'pointer' }} />
          </div>
          <div style={{ ...inputGroupStyle, gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Specific Life Goals</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              {["Funding Child's Education", "Buying a House", "Starting a Business", "Early Retirement (FIRE)"].map(goal => (
                <div 
                  key={goal} 
                  onClick={() => toggleGoal(goal)}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '20px', 
                    border: `1px solid ${lifeGoals.includes(goal) ? '#00F0FF' : 'rgba(255,255,255,0.1)'}`, 
                    background: lifeGoals.includes(goal) ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0,0,0,0.3)',
                    color: lifeGoals.includes(goal) ? '#00F0FF' : '#8B949E',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                >
                  {goal}
                </div>
              ))}
              {lifeGoals.filter(g => !["Funding Child's Education", "Buying a House", "Starting a Business", "Early Retirement (FIRE)"].includes(g)).map(goal => (
                <div 
                  key={goal} 
                  onClick={() => toggleGoal(goal)}
                  style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #00F0FF', background: 'rgba(0, 240, 255, 0.1)', color: '#00F0FF', cursor: 'pointer', fontSize: '14px' }}
                >
                  {goal} ✕
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Type custom goal..." 
                value={customGoal} 
                onChange={e => setCustomGoal(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomGoal())}
                style={{ ...inputStyle, flex: 2, padding: '12px' }} 
              />
              <input 
                type="text" 
                placeholder="Range (e.g. ₹5L, 3-5 yrs)" 
                value={customGoalRange} 
                onChange={e => setCustomGoalRange(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomGoal())}
                style={{ ...inputStyle, flex: 1, padding: '12px' }} 
              />
              <button type="button" onClick={addCustomGoal} style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Add</button>
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: '18px', margin: '32px 0 24px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>Structured Entities (Extracted)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Monthly Income (₹)</label>
            <input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Monthly Expenses (₹)</label>
            <input type="number" value={expenses} onChange={(e) => setExpenses(Number(e.target.value))} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Total Assets (₹)</label>
            <input type="number" value={assets} onChange={(e) => setAssets(Number(e.target.value))} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Total Outstanding Debt (₹)</label>
            <input type="number" value={debt} onChange={(e) => setDebt(Number(e.target.value))} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
          {success && <span style={{ color: '#00FF87', fontWeight: 600 }}>✓ Profile Synchronized</span>}
          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: '14px 28px', background: 'linear-gradient(45deg, #00F0FF, #7000FF)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 240, 255, 0.2)' }}
          >
            {loading ? 'Recalculating...' : 'Update & Recalculate AI Scores'}
          </button>
        </div>

      </form>
    </div>
  );
};
