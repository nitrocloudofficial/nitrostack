// Generates financing offers for whatever gap is left after an insurer
// decision. Deterministic on the gap size (not random) so re-running a
// demo produces the same story every time.

import type { LoanOffer, RecommendedOffer } from '../types';

const PREDATORY_GAP_THRESHOLD = 100000;

export function generateLoanOffers(gap: number): {
  loanOffers: LoanOffer[];
  recommendedOffer: RecommendedOffer;
} {
  if (gap <= 0) {
    const zero: RecommendedOffer = { lenderName: 'Suraksha Health Finance', apr: 8.9, amount: 0 };
    return { loanOffers: [{ ...zero }], recommendedOffer: zero };
  }

  const recommended: LoanOffer = {
    lenderName: 'Suraksha Health Finance',
    apr: gap > PREDATORY_GAP_THRESHOLD ? 10.75 : 8.9,
    amount: gap,
  };

  const offers: LoanOffer[] = [recommended];

  if (gap > PREDATORY_GAP_THRESHOLD) {
    offers.unshift({
      lenderName: 'QuickCash Medical Credit',
      apr: 34.99,
      amount: gap,
      flagged: true,
      flagReason:
        'APR is significantly above market average for medical financing and includes a prepayment penalty.',
    });
  }

  return {
    loanOffers: offers,
    recommendedOffer: { lenderName: recommended.lenderName, apr: recommended.apr, amount: recommended.amount },
  };
}
