import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Qualitative Context
  const [age, setAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(60);
  const [riskTolerance, setRiskTolerance] = useState(7);
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
  
  // Extraction Simulation State
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLog, setScanLog] = useState<string>('');
  const [extractedData, setExtractedData] = useState<any>(null);

  const simulateExtraction = () => {
    setScanning(true);
    setScanProgress(0);
    
    const logs = [
      "Initializing AI Document Vision...",
      "Extracting Tax Profiles from Form 16...",
      "Validating Certified Income Brackets...",
      "Parsing Mutual Fund CAS...",
      "Structuring Exact Asset Allocations...",
      "Mapping Insurance Coverage & Emergency Funds...",
      "Calculating Existing Debt & Tax Obligations...",
      "Extraction Complete."
    ];

    let currentLog = 0;
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanning(false);
          // EXACT MOCK DATA REQUIRED BY USER
          setExtractedData({
            taxProfile: "Form 16 Verified - Old Regime (80C & 80D Utilized)",
            certifiedIncome: "₹2,400,000 Annual (Top 5% Bracket)",
            taxObligation: "₹420,000 Annual Tax Liability",
            assetAllocation: "60% Equity (₹15L), 30% Debt (₹7.5L), 10% Gold (₹2.5L)",
            emergencyFund: "₹300,000 Liquid Cash",
            insuranceCoverage: "₹1Cr Term Life, ₹10L Health Insurance",
            activeInvestments: "₹40,000 Monthly SIPs Active",
            existingDebt: "₹500,000 Home Loan (₹15k EMI)",
            retirementSavings: "₹800,000 in EPF/NPS"
          });
          return 100;
        }
        
        if (prev % 15 === 0 && currentLog < logs.length) {
          setScanLog(logs[currentLog]);
          currentLog++;
        }
        
        return prev + 5;
      });
    }, 150);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      simulateExtraction();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractedData) return;
    
    setLoading(true);

    // This converts the mock data into the required JSON format for the scoring engine
    const payload = {
      "personal_profile": {
        "current_age": age,
        "target_retirement_age": retirementAge,
        "dependents": 2,
        "risk_appetite_score": riskTolerance,
        "tax_regime": "Old"
      },
      "income_and_cashflow": {
        "monthly_net_take_home": 150000,
        "monthly_base_pay": 120000,
        "monthly_variable_pay": 30000,
        "monthly_mandatory_living_expenses": 60000,
        "monthly_discretionary_spend": 20000,
        "monthly_epf_nps_contribution": 15000,
        "total_monthly_emi": 15000,
        "total_active_monthly_sips": 40000
      },
      "tax_profile": {
        "section_80c_utilized": 150000,
        "section_80d_utilized": 25000,
        "section_24b_utilized": 200000
      },
      "insurance_and_protection": {
        "total_health_insurance_cover": 1000000,
        "total_term_life_cover": 10000000,
        "corporate_health_cover": 500000
      },
      "assets_portfolio": [
        { "category": "Equity", "current_market_value": 1500000, "liquidity_status": "High", "linked_goal_id": lifeGoals.join(', ') },
        { "category": "Debt", "current_market_value": 750000, "liquidity_status": "Medium", "linked_goal_id": "none" },
        { "category": "Cash", "current_market_value": 300000, "liquidity_status": "High", "linked_goal_id": "emergency" }
      ],
      "liabilities_and_debt": [
        { "loan_type": "Home Loan", "outstanding_amount": 500000, "emi_amount": 15000, "is_tax_deductible": true }
      ]
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#05050A', padding: '40px' }}>
      
      {/* Background Glows */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(0, 240, 255, 0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(112, 0, 255, 0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', position: 'relative', zIndex: 10, padding: '48px', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 12px 0', background: 'linear-gradient(45deg, #00F0FF, #7000FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {step === 1 ? 'Step 1: User-Provided Context' : 'Step 2: AI Document Extraction'}
          </h1>
          <p style={{ color: '#8B949E', fontSize: '15px', margin: 0 }}>
            {step === 1 ? 'Capture qualitative inputs to personalize the orchestration engine.' : 'Upload Form 16 and CAS to extract structured entities.'}
          </p>
        </div>

        {/* STEP 1: Qualitative Context */}
        {step === 1 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={inputGroupStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={labelStyle}>Current Age</label>
                  <span style={{ color: '#00F0FF', fontWeight: 700 }}>{age} Years</span>
                </div>
                <input type="range" min="18" max="80" value={age} onChange={(e) => setAge(Number(e.target.value))} style={{ width: '100%', accentColor: '#00F0FF', cursor: 'pointer' }} />
              </div>

              <div style={inputGroupStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={labelStyle}>Target Retirement Age</label>
                  <span style={{ color: '#00F0FF', fontWeight: 700 }}>{retirementAge} Years</span>
                </div>
                <input type="range" min="40" max="80" value={retirementAge} onChange={(e) => setRetirementAge(Number(e.target.value))} style={{ width: '100%', accentColor: '#00F0FF', cursor: 'pointer' }} />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={labelStyle}>Risk Tolerance (1-10)</label>
                <span style={{ color: '#00F0FF', fontWeight: 700 }}>{riskTolerance}/10</span>
              </div>
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
                  style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '16px', outline: 'none', flex: 2, padding: '12px' }} 
                />
                <input 
                  type="text" 
                  placeholder="Range (e.g. ₹5L, 3-5 yrs)" 
                  value={customGoalRange} 
                  onChange={e => setCustomGoalRange(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomGoal())}
                  style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '16px', outline: 'none', flex: 1, padding: '12px' }} 
                />
                <button type="button" onClick={addCustomGoal} style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Add</button>
              </div>
            </div>

            <button 
              onClick={() => setStep(2)}
              style={{ width: '100%', padding: '18px', background: 'linear-gradient(45deg, #00F0FF, #7000FF)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '16px', cursor: 'pointer', marginTop: '16px', boxShadow: '0 10px 30px rgba(0, 240, 255, 0.2)' }}
            >
              Continue to Document Upload ➔
            </button>
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Link to="/login" style={{ color: '#8B949E', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Already have an account? Sign in</Link>
            </div>
          </div>
        )}

        {/* STEP 2: Document Upload & Extraction */}
        {step === 2 && (
          <div>
            {!extractedData && !scanning && (
              <div style={{ border: '2px dashed rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '64px 32px', textAlign: 'center', background: 'rgba(0, 240, 255, 0.05)', position: 'relative' }}>
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileUpload}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  accept=".pdf"
                />
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
                <h3 style={{ color: '#fff', margin: '0 0 8px 0' }}>Upload Form 16 & CAS Documents</h3>
                <p style={{ color: '#8B949E', margin: 0, fontSize: '14px' }}>Drag and drop PDFs to extract structured entities.</p>
              </div>
            )}

            {scanning && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: '60px', height: '60px', border: '4px solid rgba(0, 240, 255, 0.1)', borderTop: '4px solid #00F0FF', borderRadius: '50%', margin: '0 auto 24px auto', animation: 'spin 1s linear infinite' }} />
                <h3 style={{ color: '#00F0FF', margin: '0 0 16px 0' }}>{scanProgress}% - Extracting Structured Entities</h3>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', color: '#8B949E', fontFamily: 'monospace', fontSize: '13px' }}>
                  {scanLog || 'Initializing AI pipeline...'}
                </div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {extractedData && !scanning && (
              <form onSubmit={handleSubmit}>
                <div style={{ background: 'rgba(0, 255, 135, 0.05)', border: '1px solid rgba(0, 255, 135, 0.2)', padding: '24px', borderRadius: '12px', marginBottom: '32px' }}>
                  <h3 style={{ color: '#00FF87', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✓</span> AI Extraction Successful
                  </h3>
                  
                  {/* Detailed Extracted Entities Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', color: '#fff', fontSize: '14px' }}>
                    
                    <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #00F0FF' }}>
                      <div style={{ color: '#8B949E', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Tax Profiles (Form 16)</div>
                      <div style={{ fontWeight: 600 }}>{extractedData.taxProfile}</div>
                    </div>
                    
                    <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #00F0FF' }}>
                      <div style={{ color: '#8B949E', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Certified Income Bracket</div>
                      <div style={{ fontWeight: 600 }}>{extractedData.certifiedIncome}</div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #00F0FF' }}>
                      <div style={{ color: '#8B949E', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Asset Allocations (CAS)</div>
                      <div style={{ fontWeight: 600 }}>{extractedData.assetAllocation}</div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #00F0FF' }}>
                      <div style={{ color: '#8B949E', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Emergency Fund</div>
                      <div style={{ fontWeight: 600 }}>{extractedData.emergencyFund}</div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #00F0FF' }}>
                      <div style={{ color: '#8B949E', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Insurance Coverage</div>
                      <div style={{ fontWeight: 600 }}>{extractedData.insuranceCoverage}</div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #00F0FF' }}>
                      <div style={{ color: '#8B949E', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Tax Obligations</div>
                      <div style={{ fontWeight: 600, color: '#FF5F6D' }}>{extractedData.taxObligation}</div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #00F0FF' }}>
                      <div style={{ color: '#8B949E', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Active Investments</div>
                      <div style={{ fontWeight: 600 }}>{extractedData.activeInvestments}</div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #00F0FF' }}>
                      <div style={{ color: '#8B949E', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Existing Debt</div>
                      <div style={{ fontWeight: 600 }}>{extractedData.existingDebt}</div>
                    </div>

                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  style={{ width: '100%', padding: '18px', background: 'linear-gradient(45deg, #00F0FF, #7000FF)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '16px', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0, 240, 255, 0.2)' }}
                >
                  {loading ? 'Crunching Telemetry...' : 'Calculate 6-Dimensional Score ➔'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
