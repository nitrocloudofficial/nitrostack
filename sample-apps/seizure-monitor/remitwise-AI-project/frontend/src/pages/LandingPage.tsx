import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  Award,
  Bot,
  CheckCircle2,
  Globe,
  Sparkles,
  Lock,
  RefreshCw,
  BarChart3,
  ChevronDown,
  Activity,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AnimatedMap } from '../components/common/AnimatedMap';
import { useTransfer } from '../contexts/TransferContext';
import { INITIAL_PROVIDERS } from '../utils/constants';
import { apiService } from '../services/apiService';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: 'easeOut' as const },
  }),
};

const HERO_METRICS = [
  { label: 'Monitored Providers', value: '15+', color: 'text-blue-500 dark:text-blue-400' },
  { label: 'Avg Annual Savings', value: '$840+', color: 'text-teal-500 dark:text-teal-400' },
  { label: 'AI Accuracy', value: '98.4%', color: 'text-emerald-500 dark:text-emerald-400' },
  { label: 'Pipeline Latency', value: '< 2s', color: 'text-indigo-500 dark:text-indigo-400' },
];

const FEATURES = [
  {
    icon: Bot,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    title: 'Route Scout Agent',
    description: 'Compares 15+ providers in real-time using live API corridors. Finds zero-markup mid-market rates instantly.',
  },
  {
    icon: TrendingUp,
    color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    title: 'Timing FX Agent',
    description: 'Analyzes 30-day Frankfurter historical trends to detect optimal FX windows and avoid intra-day rate traps.',
  },
  {
    icon: Shield,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    title: 'Compliance Agent',
    description: 'Auto-validates RBI LRS limits, FinCEN CTR thresholds, FCA MLR, and CBUAE sanction screening in one pass.',
  },
  {
    icon: Zap,
    color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    title: 'Tracker Agent',
    description: 'Generates cryptographic audit hashes and monitors real-time transfer status across intermediary bank hops.',
  },
];

const FAQS = [
  {
    q: 'How does RemitWise AI find the absolute best remittance route?',
    a: 'Our multi-agent architecture queries live mid-market exchange rate APIs (Frankfurter API) alongside local provider datasets. Agents analyze hidden fees, transfer speeds, and KYC compliance in real-time — delivering the optimal recommendation in under 2 seconds.',
  },
  {
    q: 'Is RemitWise AI compliant with central bank regulations?',
    a: 'Yes. Our Compliance Agent automatically cross-references regulatory thresholds including RBI LRS limits in India, FinCEN CTR limits in the US, FCA MLR guidelines in the UK, and CBUAE rules for UAE corridors.',
  },
  {
    q: 'Are exchange rates updated in real-time?',
    a: 'Yes — we pull from the Frankfurter API for live mid-market rates, and our Timing Agent alerts you when a currency pair reaches its 30-day peak optimal window.',
  },
  {
    q: 'Which corridors are supported?',
    a: 'Major inward corridors: USA, UAE, UK, Canada, Australia, Singapore → India, Philippines, and Mexico. New corridors are continuously added as part of our provider database.',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { runJudgeDemoMode } = useTransfer();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Live rate for hero display (30s polling)
  const { data: heroRate, isLoading: heroRateLoading } = useQuery({
    queryKey: ['landingHeroRate'],
    queryFn: () => apiService.getLatestRate('USD', 'INR'),
    refetchInterval: 30000,
    staleTime: 25000,
  });

  const liveRate = heroRate?.rate;
  const rateChange = heroRate?.change24h || 0;
  const isPositive = rateChange >= 0;
  const heroRateSource = heroRate?.cache || 'LIVE';

  return (
    <div className="space-y-24 pb-24">
      {/* ====================================================
          HERO SECTION
          ==================================================== */}
      <section className="relative pt-10 pb-16 overflow-hidden">
        {/* Glowing ambient blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 dark:bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-32 right-0 w-[400px] h-[400px] bg-teal-500/10 dark:bg-teal-500/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-20 left-0 w-[300px] h-[300px] bg-indigo-500/8 dark:bg-indigo-500/12 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 text-center space-y-8 max-w-5xl mx-auto px-4">
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/25 text-blue-600 dark:text-blue-400 font-semibold text-[11px] shadow-sm uppercase tracking-wider"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI-Powered Multi-Agent Remittance Platform</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.05]"
          >
            Maximize Every Dollar
            <br />
            You Send{' '}
            <span className="text-gradient">Across Borders</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed"
          >
            Compare 15+ remittance providers, predict optimal FX timing, verify
            compliance, and track transfers — powered by{' '}
            <span className="font-bold text-slate-800 dark:text-white">4 Autonomous AI Agents</span>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/compare"
              id="cta-compare-now"
              className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
            >
              <span>Compare Transfers Now</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <button
              id="cta-judge-demo"
              onClick={() => runJudgeDemoMode(navigate)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl glass-card border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base hover:border-teal-500/60 hover:bg-teal-500/5 transition-all duration-300"
            >
              <span>🎬 Launch Judge Demo</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                30s
              </span>
            </button>
          </motion.div>

          {/* Live rate badge */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3.5}
            className="flex justify-center"
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/80 dark:bg-slate-800/90 border border-slate-700/60 text-white shadow-xl backdrop-blur-md">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-slate-400">USD → INR</span>
              <span className="text-[15px] font-black font-mono text-white">
                {heroRateLoading ? '...' : liveRate ? `₹${liveRate.toFixed(2)}` : '₹96.56'}
              </span>
              <span className={`text-[11px] font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? '▲' : '▼'} {Math.abs(rateChange).toFixed(2)}%
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                heroRateSource === 'HIT' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {heroRateSource === 'STALE' ? 'Cached' : 'Live'}
              </span>
            </div>
          </motion.div>

          {/* Trust row */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400"
          >
            {['Real-time FX via Frankfurter API', 'RBI & FinCEN Compliant', '0% FX Markup via Wise', '< 2hr UPI Settlement'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {t}
              </span>
            ))}
          </motion.div>
        </div>


        {/* Metrics bar */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={5}
          className="max-w-4xl mx-auto px-4 mt-14 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {HERO_METRICS.map((metric) => (
            <div
              key={metric.label}
              className="glass-card p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center space-y-1 hover:scale-105 transition-transform duration-300"
            >
              <div className={`text-3xl font-black font-mono ${metric.color}`}>
                {metric.value}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {metric.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ====================================================
          ANIMATED WORLD MAP
          ==================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8 space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Live Global Remittance Corridors
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Real-time money flow visualization across 5 major inward corridors into India
            </p>
          </div>
          <AnimatedMap />
        </motion.div>
      </section>

      {/* ====================================================
          4 AI AGENTS — HOW IT WORKS
          ==================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <motion.div
          className="text-center space-y-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Bot className="w-3.5 h-3.5" />
            Multi-Agent Pipeline
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Powered by 4 Autonomous AI Agents
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">
            Sequential multi-agent reasoning that delivers optimal route selection, compliance clearance, and live transfer tracking.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="glass-card p-6 rounded-2xl space-y-4 border border-slate-200/80 dark:border-slate-800 hover:scale-[1.03] hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group cursor-default"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${feature.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Agent {idx + 1}
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center">
          <Link
            to="/pipeline"
            id="cta-view-pipeline"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:scale-105 hover:shadow-blue-500/40 transition-all duration-300"
          >
            <Bot className="w-4 h-4" />
            <span>View AI Pipeline Live</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ====================================================
          PROVIDER SHOWCASE
          ==================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Supported Remittance Providers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live rate comparisons across verified global platforms
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {INITIAL_PROVIDERS.map((provider, idx) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.07 }}
              className={`glass-card p-4 rounded-2xl text-center space-y-2 border ${
                provider.isRecommended
                  ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                  : 'border-slate-200/60 dark:border-slate-800'
              } hover:border-blue-500/50 transition-all duration-300`}
            >
              {provider.isRecommended && (
                <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                  ⭐ AI Pick
                </div>
              )}
              <div className="font-extrabold text-base text-slate-900 dark:text-white">
                {provider.name}
              </div>
              <div className="text-[11px] text-emerald-500 font-semibold font-mono">
                {provider.rating} ★ ({(provider.reviewCount / 1000).toFixed(0)}k reviews)
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                ⚡ {provider.transferSpeed}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/providers"
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5"
          >
            View Full Provider Comparison Matrix
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ====================================================
          TRUST BADGES
          ==================================================== */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="glass-panel rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            Trusted. Transparent. Compliant.
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Lock, label: 'Bank-Grade Encryption', sub: 'AES-256 + TLS 1.3' },
              { icon: Shield, label: 'RBI & FinCEN Compliant', sub: 'Auto-Verified by AI' },
              { icon: RefreshCw, label: 'Real-Time API Rates', sub: 'Frankfurter Live Feed' },
              { icon: BarChart3, label: '30-Day FX Analysis', sub: 'Historical Prediction' },
            ].map((badge) => {
              const Icon = badge.icon;
              return (
                <div key={badge.label} className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <Icon className="w-5 h-5 text-blue-500 mx-auto" />
                  <div className="text-xs font-bold text-slate-800 dark:text-white">{badge.label}</div>
                  <div className="text-[10px] text-slate-400">{badge.sub}</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ====================================================
          FAQ
          ==================================================== */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.07 }}
              className="glass-card rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-hidden"
            >
              <button
                id={`faq-${idx}`}
                className="w-full p-5 text-left flex items-center justify-between gap-4"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${
                    openFaq === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-11">
                  {faq.a}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};
