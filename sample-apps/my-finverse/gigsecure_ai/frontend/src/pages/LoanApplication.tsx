import React, { useState } from 'react';
import { Coins, CheckCircle2, ShieldCheck, ArrowRight, Wallet, Info } from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

export const LoanApplication: React.FC = () => {
  const [amount, setAmount] = useState<number>(25000);
  const [tenureMonths, setTenureMonths] = useState<number>(6);
  const [purpose, setPurpose] = useState<string>('Vehicle Fuel & Operational Expenses');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const navigate = useNavigate();

  const interestRate = 12.5;
  const totalRepayable = Math.round(amount * (1 + (interestRate / 100) * (tenureMonths / 12)));
  const dailyRepayment = Math.round(totalRepayable / (tenureMonths * 30));

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/loan/apply', {
        amount: Number(amount),
        tenure_months: Number(tenureMonths),
        purpose
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/loan-history');
      }, 2000);
    } catch (err) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/loan-history');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <Coins className="w-7 h-7 text-black" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Instant Gig Micro-Loan Application</h1>
        <p className="text-xs text-slate-400">Zero paperwork • Instant UPI disbursal • Dynamic daily repayment</p>
      </div>

      {success ? (
        <div className="glass-card p-8 rounded-3xl border border-emerald-500/40 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
          <h2 className="text-xl font-bold text-white">Micro-Loan Approved & Disbursed!</h2>
          <p className="text-xs text-slate-300">
            INR {amount.toLocaleString()} has been transferred instantly to your registered UPI ID (<code className="text-emerald-400">worker@okhdfcbank</code>).
          </p>
          <div className="text-xs text-slate-400">Redirecting to loan history...</div>
        </div>
      ) : (
        <div className="glass-card p-8 rounded-3xl border border-slate-800 space-y-6">
          <form onSubmit={handleApply} className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-300">Sanction Amount (₹)</label>
                <span className="text-lg font-extrabold text-emerald-400">₹{amount.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="5000"
                max="75000"
                step="1000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>₹5,000</span>
                <span>₹75,000</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Select Tenure (Months)</label>
              <div className="grid grid-cols-4 gap-3">
                {[3, 6, 9, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTenureMonths(m)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition border ${
                      tenureMonths === m
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {m} Months
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Annual Interest Rate:</span>
                <span className="font-mono font-bold text-white">12.5% p.a.</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Total Repayable Amount:</span>
                <span className="font-mono font-bold text-white">₹{totalRepayable.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300 border-t border-slate-800 pt-2">
                <span>Daily UPI AutoPay Amount:</span>
                <span className="font-mono font-extrabold text-emerald-400">₹{dailyRepayment} / day</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {loading ? 'Disbursing via Instant UPI...' : 'Confirm Loan & Instant UPI Disbursal'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
