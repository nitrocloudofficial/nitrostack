import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Star, CheckCircle, XCircle, Zap, Shield, ArrowUpRight } from 'lucide-react';
import { INITIAL_PROVIDERS } from '../utils/constants';

export const ProviderList: React.FC = () => {
  return (
    <div className="space-y-8 pb-16">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-500/20">
          <Layers className="w-3.5 h-3.5" />
          <span>SIDE-BY-SIDE PROVIDER MATRIX</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Global Remittance Providers
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Detailed breakdown of exchange rate markups, fixed fees, transfer speeds, and customer reviews.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INITIAL_PROVIDERS.map((provider, idx) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            className={`glass-panel p-6 rounded-2xl border space-y-5 transition-all hover:scale-[1.02] ${
              provider.isRecommended
                ? 'border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-xl'
                : 'border-slate-200/80 dark:border-slate-800'
            }`}
          >
            {/* Top Bar */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{provider.name}</span>
                </h3>
                <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold mt-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{provider.rating}</span>
                  <span className="text-slate-500 font-normal">({provider.reviewCount.toLocaleString()} reviews)</span>
                </div>
              </div>

              {provider.isRecommended && (
                <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  🏆 Top Choice
                </span>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/70 font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block">Exchange Rate</span>
                <span className="font-bold text-slate-900 dark:text-white">{provider.exchangeRate} INR</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans">Transfer Fee</span>
                <span className="font-bold text-emerald-500">${provider.fee.toFixed(2)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 text-[10px] block font-sans">Transfer Speed</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-sans">{provider.transferSpeed}</span>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              {provider.badges.map((b, i) => (
                <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {b}
                </span>
              ))}
            </div>

            {/* Pros & Cons */}
            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                {provider.pros.map((pro, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{pro}</span>
                  </div>
                ))}
              </div>
              {provider.cons.length > 0 && (
                <div className="space-y-1 pt-1">
                  {provider.cons.map((con, cIdx) => (
                    <div key={cIdx} className="flex items-center gap-1.5 text-slate-500">
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{con}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
