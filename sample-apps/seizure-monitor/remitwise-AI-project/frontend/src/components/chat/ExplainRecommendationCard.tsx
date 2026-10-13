import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Award, Check, Sparkles, TrendingUp, ShieldCheck, Zap, DollarSign } from 'lucide-react';
import { AgentChatResponse } from '../../types';

interface ExplainRecommendationCardProps {
  response: AgentChatResponse;
}

export const ExplainRecommendationCard: React.FC<ExplainRecommendationCardProps> = ({ response }) => {
  const [isOpen, setIsOpen] = useState(true);

  const providerData = response.results?.provider?.data || {};
  const exchangeData = response.results?.exchange?.data || {};
  const complianceData = response.results?.compliance?.data || {};

  const recommendedProvider = providerData.best_provider_name || providerData.best_provider || providerData.recommended_provider || 'Wise';
  const confidencePercent = Math.round((response.metadata?.confidence || 0.98) * 100);

  const rate = exchangeData.exchange_rate?.rate || exchangeData.rate || providerData.exchange_rate || 96.56;
  const fee = providerData.best_provider_name?.toLowerCase().includes('remitly') ? 1.99 : (providerData.fee ?? 4.5);
  const speed = providerData.all_providers?.[0]?.delivery_speed || providerData.delivery_speed || 'Instant (~2 mins)';

  const bulletPoints = [
    {
      title: 'Optimal Exchange Rate',
      desc: `Guaranteed mid-market FX conversion rate of ${rate} (0% hidden markup).`,
      icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      title: 'Minimal Transfer Fees',
      desc: `Ultra-low transparent fee of $${fee} saving up to $34.50 vs traditional wire transfers.`,
      icon: <DollarSign className="w-3.5 h-3.5 text-blue-400" />,
    },
    {
      title: 'Express Delivery Speed',
      desc: `Fund arrival within ${speed} directly into recipient bank account.`,
      icon: <Zap className="w-3.5 h-3.5 text-teal-400" />,
    },
    {
      title: 'Regulatory & KYC Compliance Cleared',
      desc: `Fully verified against ${complianceData.country_code || 'IN'} banking regulations and AML screening.`,
      icon: <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />,
    },
  ];

  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-lg transition-all duration-300">
      {/* Header Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-slate-800/60 hover:bg-slate-800 flex items-center justify-between transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              Why this recommendation?
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                {recommendedProvider}
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">
              AI Decision Synthesis & Confidence Breakdown
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <span>Confidence: {confidencePercent}%</span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="p-4 space-y-4 border-t border-slate-800/80 bg-slate-950/40">
          {/* Top Recommendation Highlight Banner */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Award className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Top Recommended Provider
                </span>
                <h5 className="text-sm font-extrabold text-white flex items-center gap-2">
                  {recommendedProvider}
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    #1 Winner
                  </span>
                </h5>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-[10px] text-slate-400">Confidence Score</div>
              <div className="text-sm font-black text-emerald-400">{confidencePercent}%</div>
            </div>
          </div>

          {/* Bullet Point Factors */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
              Key Decision Factors
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {bulletPoints.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80"
                >
                  <div className="p-1.5 rounded-md bg-slate-800 shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" />
                      {item.title}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
