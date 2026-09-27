import { Injectable } from '@nitrostack/core';
import mockOffers from '../../data/mock-offers.json' with { type: 'json' };

export interface LoanOffer {
  offerId: string;
  lenderName: string;
  principal: number;
  tenureMonths: number;
  flatInterestRate: number;
  processingFeePct: number;
  isPredatory: boolean;
}

export interface LoanOfferWithTrueCost extends LoanOffer {
  totalRepayable: number;
  effectiveAnnualRate: number;
}

@Injectable()
export class LenderDataService {
  private offers: LoanOffer[] = mockOffers as LoanOffer[];

  getAllOffers(): LoanOfferWithTrueCost[] {
    return this.offers.map((o) => this.withTrueCost(o));
  }

  /**
   * Flat-rate loans understate the real cost — this converts every offer to a
   * comparable "total repayable" and an approximate effective annual rate so
   * a patient can compare apples to apples instead of trusting the flat rate.
   */
  private withTrueCost(offer: LoanOffer): LoanOfferWithTrueCost {
    const interest = offer.principal * offer.flatInterestRate * (offer.tenureMonths / 12);
    const fees = offer.principal * offer.processingFeePct;
    const totalRepayable = offer.principal + interest + fees;
    const effectiveAnnualRate =
      ((totalRepayable - offer.principal) / offer.principal) * (12 / offer.tenureMonths);

    return {
      ...offer,
      totalRepayable: Math.round(totalRepayable),
      effectiveAnnualRate: Math.round(effectiveAnnualRate * 1000) / 1000
    };
  }
}
