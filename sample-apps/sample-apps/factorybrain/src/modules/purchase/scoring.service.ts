import { Injectable } from '@nitrostack/core';
import { PurchaseUrgency, Supplier, SupplierScore } from './purchase.types.js';

@Injectable()
export class ScoringService {
  rankSuppliers(input: {
    suppliers: Supplier[];
    urgency: PurchaseUrgency;
    requestedQuantity: number;
    unitCostGbp?: number;
    requestDate?: Date;
  }): SupplierScore[] {
    if (input.suppliers.length === 0) {
      return [];
    }

    const maxLeadTime = Math.max(...input.suppliers.map((supplier) => supplier.averageLeadTimeDays), 1);
    const maxEstimatedCost = Math.max(
      ...input.suppliers.map((supplier) => this.estimatedUnitCost(input.unitCostGbp, supplier) * Math.max(input.requestedQuantity, supplier.minimumOrderQuantity)),
      1,
    );
    const weights = this.weightsFor(input.urgency);

    return input.suppliers
      .map((supplier) => {
        const recommendedQuantity = Math.max(input.requestedQuantity, supplier.minimumOrderQuantity);
        const estimatedUnitCostGbp = this.estimatedUnitCost(input.unitCostGbp, supplier);
        const estimatedTotalCostGbp = roundMoney(estimatedUnitCostGbp * recommendedQuantity);
        const priceScore = 1 - estimatedTotalCostGbp / maxEstimatedCost;
        const deliveryScore = 1 - supplier.averageLeadTimeDays / maxLeadTime;
        const reliabilityScore = (supplier.supplierRating / 5 + supplier.onTimeDeliveryRate) / 2;
        const statusScore = supplier.supplierStatus === 'Preferred' ? 1 : 0.78;
        const score = roundScore(
          priceScore * weights.price +
          deliveryScore * weights.delivery +
          reliabilityScore * weights.reliability +
          statusScore * weights.status,
        );

        return {
          supplier,
          rank: 0,
          score,
          priceScore: roundScore(priceScore),
          deliveryScore: roundScore(deliveryScore),
          reliabilityScore: roundScore(reliabilityScore),
          statusScore,
          estimatedUnitCostGbp,
          recommendedQuantity,
          estimatedTotalCostGbp,
          expectedDeliveryDate: addDays(input.requestDate ?? new Date(), supplier.averageLeadTimeDays),
          rationale: this.rationale(input.urgency, supplier),
        };
      })
      .sort((left, right) => right.score - left.score)
      .map((score, index) => ({ ...score, rank: index + 1 }));
  }

  private weightsFor(urgency: PurchaseUrgency): { price: number; delivery: number; reliability: number; status: number } {
    if (urgency === 'Critical') {
      return { delivery: 0.48, reliability: 0.28, status: 0.14, price: 0.1 };
    }
    if (urgency === 'High') {
      return { delivery: 0.4, reliability: 0.28, status: 0.12, price: 0.2 };
    }
    if (urgency === 'Medium') {
      return { delivery: 0.28, reliability: 0.3, status: 0.12, price: 0.3 };
    }
    return { delivery: 0.05, reliability: 0.2, status: 0.1, price: 0.65 };
  }

  private estimatedUnitCost(baseUnitCostGbp: number | undefined, supplier: Supplier): number {
    const base = baseUnitCostGbp && baseUnitCostGbp > 0 ? baseUnitCostGbp : 100;
    const preferredDiscount = supplier.supplierStatus === 'Preferred' ? 0.97 : 1;
    const reliabilityPremium = supplier.supplierRating >= 4.7 ? 1.03 : 1;
    return roundMoney(base * preferredDiscount * reliabilityPremium);
  }

  private rationale(urgency: PurchaseUrgency, supplier: Supplier): string {
    const urgencyReason = urgency === 'Critical' || urgency === 'High'
      ? 'delivery speed and reliability weighted above price'
      : 'price, reliability, and delivery balanced';
    return `${supplier.supplierName}: ${supplier.averageLeadTimeDays} day lead time, ${(supplier.onTimeDeliveryRate * 100).toFixed(0)}% on-time delivery, ${urgencyReason}.`;
  }
}

function addDays(date: Date, days: number): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString().slice(0, 10);
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
