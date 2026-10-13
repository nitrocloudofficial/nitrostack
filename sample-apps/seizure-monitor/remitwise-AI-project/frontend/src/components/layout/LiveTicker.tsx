import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { apiService } from '../../services/apiService';

const TICKER_PAIRS = [
  { base: 'USD', target: 'INR', label: 'USD → INR' },
  { base: 'AED', target: 'INR', label: 'AED → INR' },
  { base: 'GBP', target: 'INR', label: 'GBP → INR' },
  { base: 'CAD', target: 'INR', label: 'CAD → INR' },
  { base: 'AUD', target: 'INR', label: 'AUD → INR' },
  { base: 'SGD', target: 'INR', label: 'SGD → INR' },
  { base: 'EUR', target: 'INR', label: 'EUR → INR' },
];

export const LiveTicker: React.FC = () => {
  // Use React Query with 30s auto-refresh interval for Live Ticker
  const { data: rates, isLoading } = useQuery({
    queryKey: ['liveTickerRates'],
    queryFn: async () => {
      const results = await Promise.all(
        TICKER_PAIRS.map(async (pair) => {
          const res = await apiService.getLatestRate(pair.base, pair.target);
          return {
            pair: pair.label,
            rate: res.rate,
            change: `${res.change24h >= 0 ? '+' : ''}${res.change24h}%`,
            isUp: res.change24h >= 0,
            source: res.source,
          };
        })
      );
      return results;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 25000,
  });

  const displayItems = rates || [
    { pair: 'USD → INR', rate: 96.56, change: '+0.18%', isUp: true, source: 'Frankfurter API' },
    { pair: 'AED → INR', rate: 26.28, change: '+0.12%', isUp: true, source: 'Frankfurter API' },
    { pair: 'GBP → INR', rate: 122.40, change: '+0.25%', isUp: true, source: 'Frankfurter API' },
    { pair: 'CAD → INR', rate: 69.80, change: '-0.08%', isUp: false, source: 'Frankfurter API' },
    { pair: 'AUD → INR', rate: 62.50, change: '+0.15%', isUp: true, source: 'Frankfurter API' },
  ];

  // Duplicate list for smooth seamless ticker scroll
  const marqueeItems = [...displayItems, ...displayItems];

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800/80 select-none overflow-hidden">
      <div className="max-w-full flex items-center h-8">
        {/* Label chip */}
        <div className="flex items-center gap-1.5 px-3 py-1 border-r border-slate-800 shrink-0 bg-slate-900/80 h-full">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
            Live FX Feed (30s)
          </span>
        </div>

        {/* Scrolling ticker */}
        <div className="overflow-hidden flex-1 relative">
          <div className="ticker-track">
            {marqueeItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 mx-4 font-mono shrink-0"
              >
                <span className="text-[11px] text-slate-400 font-semibold">{item.pair}</span>
                <span
                  className={`text-[11px] font-bold transition-colors duration-500 ${
                    item.isUp ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ₹{item.rate.toFixed(2)}
                </span>
                <span
                  className={`flex items-center text-[10px] font-semibold ${
                    item.isUp ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {item.isUp ? (
                    <TrendingUp className="w-2.5 h-2.5 mr-px" />
                  ) : (
                    <TrendingDown className="w-2.5 h-2.5 mr-px" />
                  )}
                  {item.change}
                </span>
                <span className="text-slate-700 ml-2">•</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right side source badge */}
        <div className="flex items-center gap-1.5 px-3 border-l border-slate-800 shrink-0 bg-slate-900/80 h-full">
          <Zap className="w-2.5 h-2.5 text-amber-400" />
          <span className="text-[10px] text-slate-400 font-mono font-medium">
            {isLoading ? 'Polling Live...' : 'Frankfurter API'}
          </span>
        </div>
      </div>
    </div>
  );
};
