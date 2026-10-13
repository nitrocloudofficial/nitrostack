import React, { useState } from 'react';
import { CostComparison, ModelComparisonItem } from '../types/serverTypes';
import { ArrowUpDown, CheckCircle, Zap, TrendingDown, Clock, Activity, ShieldCheck } from 'lucide-react';

interface CostComparisonTableProps {
  costComparison: CostComparison;
}

type SortField = 'modelName' | 'perRequestCost' | 'monthlyCost' | 'latencyMs' | 'performanceScore';

export const CostComparisonTable: React.FC<CostComparisonTableProps> = ({ costComparison }) => {
  const [sortField, setSortField] = useState<SortField>('monthlyCost');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const models: ModelComparisonItem[] = [
    costComparison.currentModel,
    costComparison.recommendedModel,
  ];

  const sortedModels = [...models].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return 0;
  });

  const renderSortIcon = (field: SortField) => {
    return (
      <ArrowUpDown className={`w-3.5 h-3.5 inline ml-1 transition-opacity ${sortField === field ? 'opacity-100 text-cyan-400' : 'opacity-30'}`} />
    );
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141A24]/80 backdrop-blur-xl shadow-2xl">
      {/* Table Header Banner */}
      <div className="px-6 py-4 bg-[#0E131A] border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-400" />
            <span>Compute & Latency Tradeoff Analysis</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Direct comparison between legacy baseline tier and NitroStack recommended tier.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{costComparison.percentageSaved.toFixed(1)}% Total Cost Reduction</span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.01] text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <th className="py-3.5 px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('modelName')}>
                Model Tier {renderSortIcon('modelName')}
              </th>
              <th className="py-3.5 px-6 cursor-pointer hover:text-white transition-colors text-right" onClick={() => handleSort('perRequestCost')}>
                Per Request {renderSortIcon('perRequestCost')}
              </th>
              <th className="py-3.5 px-6 cursor-pointer hover:text-white transition-colors text-right" onClick={() => handleSort('monthlyCost')}>
                Monthly Vol. {renderSortIcon('monthlyCost')}
              </th>
              <th className="py-3.5 px-6 cursor-pointer hover:text-white transition-colors text-right" onClick={() => handleSort('latencyMs')}>
                Latency {renderSortIcon('latencyMs')}
              </th>
              <th className="py-3.5 px-6 cursor-pointer hover:text-white transition-colors text-right" onClick={() => handleSort('performanceScore')}>
                Quality Score {renderSortIcon('performanceScore')}
              </th>
              <th className="py-3.5 px-6 text-center">Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-sm">
            {sortedModels.map((item, idx) => {
              const isRec = item.isRecommended;
              return (
                <tr 
                  key={idx}
                  className={`transition-colors group ${
                    isRec 
                      ? 'bg-gradient-to-r from-cyan-500/[0.08] via-blue-500/[0.03] to-transparent border-l-4 border-l-cyan-400 font-medium' 
                      : 'hover:bg-white/[0.02] text-slate-300'
                  }`}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${
                        isRec ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/[0.05] text-slate-400'
                      }`}>
                        {item.provider.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          {item.modelName}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">{item.provider}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6 text-right font-mono">
                    <span className={isRec ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                      ${item.perRequestCost.toFixed(6)}
                    </span>
                  </td>

                  <td className="py-4 px-6 text-right font-mono">
                    <span className={`px-2.5 py-1 rounded-lg ${isRec ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20' : 'text-slate-300'}`}>
                      ${item.monthlyCost.toFixed(2)}
                    </span>
                  </td>

                  <td className="py-4 px-6 text-right font-mono">
                    <div className="flex items-center justify-end gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className={isRec ? 'text-cyan-300 font-semibold' : 'text-slate-400'}>
                        {item.latencyMs}ms
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-6 text-right font-mono">
                    <div className="flex items-center justify-end gap-2">
                      <Activity className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-semibold text-white">{item.performanceScore}/100</span>
                    </div>
                  </td>

                  <td className="py-4 px-6 text-center">
                    {isRec ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold shadow-[0_0_15px_rgba(0,242,254,0.3)]">
                        <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                        <span>OPTIMAL TIER</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono uppercase tracking-wider px-2 py-1 rounded bg-white/[0.02]">
                        Baseline
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer summary bar */}
      <div className="px-6 py-3 bg-[#0B0F14]/60 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
        <span>* Projected across standard 500,000 monthly enterprise requests</span>
        <span className="text-cyan-400 flex items-center gap-1">
          <Zap className="w-3.5 h-3.5" /> NitroStack Zero-Drift Guarantee
        </span>
      </div>
    </div>
  );
};
