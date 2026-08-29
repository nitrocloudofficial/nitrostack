import React, { useEffect, useState } from 'react';
import { StatCard } from '../components/StatCard';
import { 
  BrainCircuit, 
  Coins, 
  ShieldCheck, 
  HeartHandshake, 
  TrendingUp, 
  Zap, 
  Calendar,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    creditScore: 785,
    riskLevel: 'Low Risk',
    activeLoan: 18400,
    dailyAutoPay: 152.78,
    fraudBlocked: 38,
    nomineeVerified: true
  });

  const chartData = [
    { day: 'Mon', income: 1250, repayment: 152 },
    { day: 'Tue', income: 1100, repayment: 152 },
    { day: 'Wed', income: 1450, repayment: 152 },
    { day: 'Thu', income: 980, repayment: 137 },
    { day: 'Fri', income: 1620, repayment: 152 },
    { day: 'Sat', income: 1890, repayment: 152 },
    { day: 'Sun', income: 1750, repayment: 152 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
            <Zap className="w-3.5 h-3.5" /> AI Underwriting & Fraud Shield Active
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            Welcome back, <span className="gradient-text">{user?.full_name || 'Rajesh Verma'}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Zomato & Swiggy Delivery Partner • Unified Cash-Flow Underwritten
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/credit-analysis" className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4" /> Evaluate Credit Score
          </Link>
          <Link to="/invoice-upload" className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition border border-slate-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verify Invoice SHA-256
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Cash-Flow Credit Score"
          value={`${stats.creditScore} / 850`}
          subtitle={`Risk Profile: ${stats.riskLevel}`}
          icon={BrainCircuit}
          trend="15 pts"
          positive={true}
        />
        <StatCard
          title="Active Micro-Loan"
          value={`₹${stats.activeLoan.toLocaleString()}`}
          subtitle={`Daily AutoPay: ₹${stats.dailyAutoPay}`}
          icon={Coins}
          trend="₹1,200 paid"
          positive={true}
        />
        <StatCard
          title="SHA-256 Fraud Shield"
          value={`${stats.fraudBlocked} Duplicate Blocked`}
          subtitle="Multi-Bank Ledger Connected"
          icon={ShieldCheck}
          trend="0 Duplicates"
          positive={true}
        />
        <StatCard
          title="Succession Protection"
          value="Nominee Active"
          subtitle="Sunita Sharma (Wife) 100%"
          icon={HeartHandshake}
          trend="OCR Verified"
          positive={true}
        />
      </div>

      {/* Main Income & AutoPay Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" /> Daily Earnings vs. Dynamic UPI AutoPay
              </h2>
              <p className="text-xs text-slate-400">7-Day Real-Time Cash Flow Velocity & Auto-Debit Execution</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Live Feed
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="repayGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="income" name="Daily Earnings (₹)" stroke="#10b981" fillOpacity={1} fill="url(#incomeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="repayment" name="UPI AutoPay (₹)" stroke="#3b82f6" fillOpacity={1} fill="url(#repayGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Action & Smart Pause Status Card */}
        <div className="space-y-4">
          <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" /> Smart-Pause Safeguard
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              If your daily gig earnings fall to <strong className="text-white">₹0</strong> on any non-working day, our dynamic repayment engine automatically activates <strong className="text-emerald-400">Smart-Pause</strong> to prevent overdraft fees.
            </p>
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-400">Today's Repayment Status:</span>
              <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                ACTIVE (₹152.78)
              </span>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Platform Actions</h3>
            <Link to="/loan-application" className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition flex items-center justify-between px-4 border border-slate-700">
              <span>Apply Micro-Credit Line</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </Link>
            <Link to="/succession" className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition flex items-center justify-between px-4 border border-slate-700">
              <span>Nominee Succession Rescue</span>
              <HeartHandshake className="w-4 h-4 text-emerald-400" />
            </Link>
            <Link to="/reports" className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition flex items-center justify-between px-4 border border-slate-700">
              <span>Download Credit Certificate</span>
              <FileText className="w-4 h-4 text-emerald-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
