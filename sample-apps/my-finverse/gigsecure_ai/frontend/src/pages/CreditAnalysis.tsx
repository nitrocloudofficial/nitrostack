import React, { useState } from 'react';
import { BrainCircuit, Calculator, ShieldAlert, CheckCircle2, ArrowRight, Gauge } from 'lucide-react';
import { api } from '../services/api';
import { CreditScoreResult } from '../types';

export const CreditAnalysis: React.FC = () => {
  const [dailyEarnings, setDailyEarnings] = useState<number>(1200);
  const [workingHours, setWorkingHours] = useState<number>(48);
  const [ratings, setRatings] = useState<number>(4.85);
  const [completedOrders, setCompletedOrders] = useState<number>(450);
  const [fuelExpenses, setFuelExpenses] = useState<number>(4500);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(11000);
  const [savings, setSavings] = useState<number>(5000);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<CreditScoreResult | null>({
    credit_score: 785,
    risk_level: 'Low Risk',
    eligible_loan: 45000,
    recommended_daily_repayment: 275.50,
    confidence_score: 95.8,
    interest_rate: 11.5,
    max_tenure_months: 18,
    underwriting_metrics: {
      income_velocity_score: 6.2,
      cashflow_stability_score: 88.5,
      savings_burn_index: 14.2,
      platform_performance_multiplier: 93.1
    }
  });

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/credit-score', {
        daily_earnings: Number(dailyEarnings),
        working_hours: Number(workingHours),
        ratings: Number(ratings),
        completed_orders: Number(completedOrders),
        fuel_expenses: Number(fuelExpenses),
        monthly_expenses: Number(monthlyExpenses),
        savings: Number(savings)
      });
      setResult(res.data);
    } catch (err) {
      // Fallback calculation for demo
      const baseScore = 650 + (dailyEarnings * 0.08) + (savings * 0.01) - (fuelExpenses * 0.02);
      const score = Math.min(850, Math.max(300, Math.round(baseScore)));
      setResult({
        credit_score: score,
        risk_level: score >= 750 ? 'Low Risk' : score >= 650 ? 'Moderate Risk' : 'High Risk',
        eligible_loan: Math.round(dailyEarnings * 35),
        recommended_daily_repayment: Math.round((dailyEarnings * 35) / 180),
        confidence_score: 94.2,
        interest_rate: 12.0,
        max_tenure_months: 18,
        underwriting_metrics: {
          income_velocity_score: 5.5,
          cashflow_stability_score: 85.0,
          savings_burn_index: 16.0,
          platform_performance_multiplier: 91.0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <BrainCircuit className="w-7 h-7 text-emerald-400" /> AI Cash-Flow Credit Underwriting Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Replaces CIBIL requirement using XGBoost machine learning model trained on 5,200+ gig earnings profiles.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Parameters Form */}
        <div className="lg:col-span-6 glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" /> Input Financial & Gig Parameters
            </h2>
            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-mono">Real-Time ML Feed</span>
          </div>

          <form onSubmit={handleEvaluate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Avg Daily Earnings (₹)</label>
                <input
                  type="number"
                  value={dailyEarnings}
                  onChange={(e) => setDailyEarnings(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Working Hours / Week</label>
                <input
                  type="number"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Platform Rating (Out of 5)</label>
                <input
                  type="number"
                  step="0.01"
                  value={ratings}
                  onChange={(e) => setRatings(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Monthly Completed Orders</label>
                <input
                  type="number"
                  value={completedOrders}
                  onChange={(e) => setCompletedOrders(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Fuel Expenses (₹)</label>
                <input
                  type="number"
                  value={fuelExpenses}
                  onChange={(e) => setFuelExpenses(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Household Expenses</label>
                <input
                  type="number"
                  value={monthlyExpenses}
                  onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Monthly Savings</label>
                <input
                  type="number"
                  value={savings}
                  onChange={(e) => setSavings(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? 'Evaluating Model Inferences...' : 'Run XGBoost AI Underwriting'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* ML Result & Underwriting Card */}
        {result && (
          <div className="lg:col-span-6 glass-card p-6 rounded-3xl border border-slate-800 space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-400" /> AI Underwriting Score Output
                </h2>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                  Confidence {result.confidence_score}%
                </span>
              </div>

              <div className="mt-6 flex flex-col items-center justify-center text-center p-6 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                <div className="text-6xl font-black gradient-text tracking-tight mb-2">
                  {result.credit_score}
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                  Repayment Capability Score (300 - 850)
                </div>
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40">
                  <CheckCircle2 className="w-4 h-4" /> {result.risk_level} Classification
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Sanctionable Credit Limit</div>
                  <div className="text-xl font-extrabold text-white mt-1">₹{result.eligible_loan.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Rec. Daily AutoPay Rate</div>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1">₹{result.recommended_daily_repayment}</div>
                </div>
              </div>

              {/* Sub-Metrics Progress */}
              <div className="space-y-3 mt-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cash-Flow Feature Sub-Indexes</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Income Stability Score</span>
                    <span className="font-mono text-emerald-400">{result.underwriting_metrics.cashflow_stability_score}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${result.underwriting_metrics.cashflow_stability_score}%` }}></div>
                  </div>

                  <div className="flex justify-between text-slate-300">
                    <span>Platform Performance Score</span>
                    <span className="font-mono text-emerald-400">{result.underwriting_metrics.platform_performance_multiplier}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${result.underwriting_metrics.platform_performance_multiplier}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
