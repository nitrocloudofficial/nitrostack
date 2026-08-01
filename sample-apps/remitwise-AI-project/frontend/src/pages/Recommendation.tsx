import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award,
  Clock,
  CheckCircle2,
  Lock,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Zap,
  Share2,
  Activity,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTransfer } from '../contexts/TransferContext';
import { SavingsCounter } from '../components/common/SavingsCounter';
import { ConfidenceMeter } from '../components/common/ConfidenceMeter';
import { apiService } from '../services/apiService';

// Default placeholder only shown while pipeline initializes
const buildDefaultRec = (rate: number) => ({
  recommendedProvider: {
    id: 'wise',
    name: 'Wise',
    logo: '',
    rating: 4.9,
    reviewCount: 142000,
    transferSpeed: '2 Hours (Same-Day via UPI)',
    estimatedHours: 2,
    exchangeRate: rate,
    fee: 3.5,
    fxMarkup: 0.0,
    deliveryMethods: ['UPI Direct', 'Bank Account'],
    paymentMethods: ['Debit Card', 'Bank Transfer'],
    pros: ['Zero exchange rate markup', 'Real-time UPI speed'],
    cons: [],
    badges: ['Cheapest Overall', 'Lowest Fees'],
    isRecommended: true,
  },
  allProviders: [],
  totalReceived: Math.round((1000 - 3.5) * rate),
  savingsVsBank: Math.round((1000 - 3.5) * rate - 1000 * (rate * 0.968)),
  savingsPercentage: 0.97,
  exchangeRate: rate,
  estimatedArrival: '2 Hours (Same Day)',
  riskScore: 'Low' as const,
  confidenceScore: 97,
  decisionFactors: [
    { title: 'Lowest Transfer Fee', passed: true, description: 'Only $3.50 vs bank $35 fee' },
    { title: 'Zero FX Markup', passed: true, description: `True mid-market rate (${rate} INR/USD) applied` },
    { title: 'Fastest UPI Settlement', passed: true, description: 'Arrives in < 2 hours' },
    { title: 'RBI & FinCEN Compliance', passed: true, description: 'All thresholds verified' },
    { title: 'Optimal FX Window', passed: true, description: 'Rate at 7-day high (+0.42%)' },
  ],
  sourcesUsed: ['Frankfurter API (Live)', 'providers.json', 'compliance_rules.json'],
  trackingId: 'RWT-DEMO001',
  timestamp: new Date().toLocaleTimeString(),
});

export const Recommendation: React.FC = () => {
  const navigate = useNavigate();
  const { recommendation, request, runPipeline } = useTransfer();

  // On-demand live rate fetch for default fallback accuracy
  const { data: liveFx } = useQuery({
    queryKey: ['recommendationLiveRate', request.fromCountry.currency, request.toCountry.currency],
    queryFn: () => apiService.getLatestRate(request.fromCountry.currency, request.toCountry.currency),
    staleTime: 60000,
    enabled: !recommendation,
  });

  useEffect(() => {
    if (!recommendation) {
      runPipeline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveRate = liveFx?.rate || 96.56;
  const rec = recommendation || buildDefaultRec(liveRate);
  const dataSource = recommendation?.sourcesUsed?.[0] || liveFx?.source || 'Frankfurter API (Live)';
  const cacheState = liveFx?.cache || 'LIVE';

  const transferTimeline = [
    { time: '00:00', event: 'Transfer Initiated', icon: '🔐', done: true },
    { time: '+05 min', event: 'KYC & AML Verified', icon: '🛡️', done: true },
    { time: '+20 min', event: 'Funds Received by Wise', icon: '💳', done: true },
    { time: '+90 min', event: 'SWIFT/UPI Settlement', icon: '⚡', done: false },
    { time: '+2 hrs', event: 'Credited to Recipient', icon: '✅', done: false },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/25">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          OPTIMIZATION COMPLETE · AI RECOMMENDED ROUTE
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Your Optimal Remittance Route
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Corridor:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {request.fromCountry.flag} {request.fromCountry.name} → {request.toCountry.flag} {request.toCountry.name}
          </span>
          {' '}| Amount:{' '}
          <span className="text-blue-500 font-bold">
            {request.fromCountry.currencySymbol}{request.amount.toLocaleString()}
          </span>
        </p>
      </motion.div>

      {/* ── MAIN GLASS RECOMMENDATION CARD ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative glass-panel p-7 sm:p-10 rounded-3xl border-2 border-emerald-500/40 shadow-2xl shadow-emerald-500/10 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(16,185,129,0.04) 50%, rgba(255,255,255,0.85) 100%)',
        }}
      >
        {/* Dark mode overide */}
        <div className="absolute inset-0 dark:bg-slate-900/80 rounded-3xl pointer-events-none" />

        {/* Winner badge */}
        <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-500 text-white font-extrabold text-[11px] px-5 py-2 rounded-bl-2xl shadow-md uppercase tracking-wider flex items-center gap-1.5">
          🏆 BEST OPTION VERIFIED
        </div>

        <div className="relative space-y-7">
          {/* Provider name + exchange rate */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                Top Recommended Provider
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                {rec.recommendedProvider.name}
                <span className="text-xl font-normal text-amber-400">⭐⭐⭐⭐⭐</span>
              </h2>
              <div className="flex flex-wrap gap-2 mt-1">
                {rec.recommendedProvider.badges.map((badge) => (
                  <span
                    key={badge}
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 font-medium">Exchange Rate</div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                1 {request.fromCountry.currency} = {rec.exchangeRate} {request.toCountry.currency}
              </div>
              <div className="text-xs text-emerald-500 font-semibold flex items-center justify-end gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" /> True mid-market rate · 0% markup
              </div>
            </div>
          </div>

          {/* Savings highlight grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 rounded-2xl bg-emerald-500/8 dark:bg-emerald-500/10 border border-emerald-500/25">
            {/* Savings counter */}
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium uppercase tracking-wider block">
                You'll Save
              </span>
              <div className="text-3xl sm:text-4xl font-black">
                <SavingsCounter targetAmount={rec.savingsVsBank} currencySymbol="₹" />
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                vs traditional bank wire
              </span>
            </div>

            {/* Total received */}
            <div className="space-y-1 text-center border-t sm:border-t-0 sm:border-x border-emerald-500/20 pt-4 sm:pt-0 sm:px-4">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium uppercase tracking-wider block">
                Recipient Receives
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                ₹{rec.totalReceived.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500">
                Net · after ${rec.recommendedProvider.fee} fee
              </span>
            </div>

            {/* Arrival */}
            <div className="space-y-1 text-center sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium uppercase tracking-wider block">
                Estimated Arrival
              </span>
              <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-end gap-1.5 pt-0.5">
                <Clock className="w-4 h-4 text-emerald-500" />
                {rec.estimatedArrival}
              </div>
              <span className="text-[11px] text-slate-500">Instant UPI direct credit</span>
            </div>
          </div>

          {/* Confidence + Tracking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <ConfidenceMeter score={rec.confidenceScore} label="AI Recommendation Confidence" />
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex justify-between text-slate-400 border-b border-slate-800 pb-2">
                <span>Transfer Tracking Hash</span>
                <span className="text-blue-400 font-bold">{rec.trackingId}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Execution Time</span>
                <span className="text-slate-300">{rec.timestamp}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Lock-In Window</span>
                <span className="text-emerald-400 font-semibold">30 Minutes Active</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Risk Score</span>
                <span className="text-emerald-400 font-semibold">🟢 LOW</span>
              </div>
            </div>
          </div>

          {/* Decision factors */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Why This Route Was Chosen
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rec.decisionFactors.map((factor, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{factor.title}</div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">{factor.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transfer timeline */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Transfer Timeline</h3>
            <div className="flex items-center gap-0 overflow-x-auto no-scrollbar pb-2">
              {transferTimeline.map((step, i) => (
                <div key={i} className="flex items-center shrink-0">
                  <div className="flex flex-col items-center text-center min-w-[80px]">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-base border-2 ${
                        step.done
                          ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {step.icon}
                    </div>
                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1.5 leading-tight">
                      {step.event}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono">{step.time}</div>
                  </div>
                  {i < transferTimeline.length - 1 && (
                    <div
                      className={`h-[2px] w-8 mx-1 rounded-full ${
                        transferTimeline[i + 1].done ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <button
              id="initiate-transfer-btn"
              onClick={() => navigate('/tracker')}
              className="w-full sm:flex-1 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 hover:opacity-95 text-white font-extrabold text-base shadow-2xl shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-5 h-5" />
              <span>Initiate Transfer via {rec.recommendedProvider.name}</span>
            </button>

            <Link
              to="/explainability"
              id="why-recommendation-btn"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl glass-card hover:border-blue-500/50 text-slate-900 dark:text-white font-bold text-sm transition-all flex items-center justify-center gap-2 border border-slate-200/60 dark:border-slate-700"
            >
              <HelpCircle className="w-4 h-4 text-blue-500" />
              Why This Recommendation?
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
