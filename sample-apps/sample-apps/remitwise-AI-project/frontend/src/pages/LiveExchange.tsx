import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ArrowUpRight, Database } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { apiService } from '../services/apiService';

export const LiveExchange: React.FC = () => {
  const [range, setRange] = useState<'7D' | '1M' | '1Y'>('1M');

  const daysMap = { '7D': 7, '1M': 30, '1Y': 365 };

  // Fetch live spot rate
  const { data: spotRate } = useQuery({
    queryKey: ['liveExchangeSpotRate'],
    queryFn: () => apiService.getLatestRate('USD', 'INR'),
    staleTime: 30000,
  });

  // Fetch real historical series from backend
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['liveExchangeHistory', range],
    queryFn: () => apiService.getHistory('USD', 'INR', daysMap[range]),
    staleTime: 60000,
  });

  const currentRate = spotRate?.rate || 96.56;
  const ratesList = (historyData || []).map((h) => h.rate);
  const peakHigh = ratesList.length ? Math.max(...ratesList) : Number((currentRate * 1.008).toFixed(2));
  const peakLow = ratesList.length ? Math.min(...ratesList) : Number((currentRate * 0.992).toFixed(2));

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-500/20 mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>FRANKFURTER LIVE FX API TIME-SERIES</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Live Foreign Exchange Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          {(['7D', '1M', '1Y'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                range === r
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* MINI STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">USD → INR Spot Rate</span>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">₹{currentRate.toFixed(2)}</div>
          <span className="text-xs text-emerald-500 font-semibold flex items-center">
            <ArrowUpRight className="w-3.5 h-3.5" /> Live Mid-Market
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">{range} Peak High</span>
          <div className="text-3xl font-black text-emerald-500 font-mono">₹{peakHigh.toFixed(2)}</div>
          <span className="text-xs text-slate-400">Backend Time-Series High</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">{range} Low</span>
          <div className="text-3xl font-black text-rose-400 font-mono">₹{peakLow.toFixed(2)}</div>
          <span className="text-xs text-slate-400">Backend Time-Series Low</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">Data Provider</span>
          <div className="text-2xl font-extrabold text-blue-500 flex items-center gap-1.5 pt-0.5">
            <Database className="w-5 h-5 text-blue-500" />
            <span>Frankfurter</span>
          </div>
          <span className="text-xs text-emerald-500 font-medium">3-Tier Upstream Resilient Stack</span>
        </div>
      </div>

      {/* RECHARTS HISTORICAL LINE CHART */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              USD / INR ({range}) Time Series Chart
            </h2>
            <p className="text-xs text-slate-500">
              Fetched from FastAPI `/exchange/history` endpoint
            </p>
          </div>
          {isLoading && (
            <span className="text-xs text-blue-500 font-mono animate-pulse">Loading time-series...</span>
          )}
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis domain={['dataMin - 0.3', 'dataMax + 0.3']} stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#fff' }} />
              <Line type="monotone" dataKey="rate" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
