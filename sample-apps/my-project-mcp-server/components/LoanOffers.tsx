'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Badge } from './ui/Badge';
import { VerificationStamp } from './VerificationStamp';
import { formatCurrency } from '@/lib/utils';
import type { LoanOffer, RecommendedOffer } from '@/lib/types';

export function LoanOffers({
  offers,
  recommendedOffer,
}: {
  offers: LoanOffer[];
  recommendedOffer: RecommendedOffer;
}) {
  const [selectedLender, setSelectedLender] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader title="Financing Options" />
      <CardBody className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {offers.map((offer) => {
            const isRecommended =
              !offer.flagged && offer.lenderName === recommendedOffer.lenderName;
            const isSelected = selectedLender === offer.lenderName;

            return (
              <div
                key={offer.lenderName}
                className={`flex flex-col justify-between rounded-xl border backdrop-blur-md p-4 transition-all ${
                  offer.flagged
                    ? 'border-amber-300/50 bg-amber-400/10'
                    : isRecommended
                      ? 'border-teal-400/60 bg-teal-500/10'
                      : 'border-white/50 bg-white/35'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">{offer.lenderName}</p>
                    {offer.flagged && <Badge tone="amber" className="text-[10px]">Flagged</Badge>}
                    {isRecommended && <Badge tone="verified" className="text-[10px] bg-teal-600 text-white border-0">Recommended</Badge>}
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-lg bg-white/40 backdrop-blur-md p-2.5 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold">APR</span>
                      <p className={`font-mono font-bold ${offer.flagged ? 'text-amber-700' : 'text-teal-700'}`}>
                        {offer.apr}%
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Amount</span>
                      <p className="font-mono font-bold text-slate-900">
                        {formatCurrency(offer.amount)}
                      </p>
                    </div>
                  </div>

                  {offer.flagged && offer.flagReason && (
                    <p className="mt-2 text-[11px] text-amber-900">⚠️ {offer.flagReason}</p>
                  )}

                  <div className="mt-2">
                    {offer.flagged ? (
                      <VerificationStamp status="pending" compact />
                    ) : (
                      <VerificationStamp
                        status="verified"
                        verb="Verified"
                        label={isRecommended ? 'lowest cost' : 'terms'}
                        compact
                      />
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  {!offer.flagged && (
                    <button
                      type="button"
                      onClick={() => setSelectedLender(offer.lenderName)}
                      className={`w-full rounded-lg py-1.5 px-3 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-teal-700 text-white'
                          : isRecommended
                            ? 'bg-teal-600 text-white hover:bg-teal-700'
                            : 'border border-white/50 bg-white/40 backdrop-blur-md text-slate-700 hover:bg-white/60'
                      }`}
                    >
                      {isSelected ? '✓ Selected' : 'Select Plan'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
