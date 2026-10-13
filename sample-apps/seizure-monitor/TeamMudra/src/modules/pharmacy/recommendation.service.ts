import { PharmacyService } from "./pharmacy.service.js";
import { PharmacyItemStatus } from "./pharmacy.types.js";
import {
  PharmacyRecommendation,
  RecommendationPriority,
  RecommendPharmacyReorderInput,
  RecommendPharmacyReorderOutput,
} from "./pharmacy.recommendations.js";

/**
 * Derives reorder/action recommendations from PharmacyService's existing
 * stock classification and expiry logic. Contains no data access of its
 * own — it only reasons over what PharmacyService already returns.
 */
export class RecommendationService {
  constructor(private readonly pharmacyService: PharmacyService) {}

  async recommendReorders(
    input: RecommendPharmacyReorderInput
  ): Promise<RecommendPharmacyReorderOutput> {
    const status = await this.pharmacyService.getStatus({
      category: input.category,
      includeNormal: false,
      expiringWithinDays: input.expiringWithinDays ?? 30,
    });

    const recommendations = status.items.map((item) =>
      this.toRecommendation(item)
    );

    const filtered = input.includeLowPriority
      ? recommendations
      : recommendations.filter((r) => r.priority !== "LOW");

    return { recommendations: filtered };
  }

  private toRecommendation(item: PharmacyItemStatus): PharmacyRecommendation {
    const { priority, reason, recommendedAction } = this.classify(item);

    return {
      priority,
      itemId: item.id,
      itemName: item.name,
      reason,
      recommendedAction,
      suggestedOrderQuantity: Math.max(0, item.maxCapacity - item.currentStock),
    };
  }

  private classify(
    item: PharmacyItemStatus
  ): {
    priority: RecommendationPriority;
    reason: string;
    recommendedAction: string;
  } {
    if (item.isExpired) {
      return {
        priority: "HIGH",
        reason: "Item has expired and can no longer be safely dispensed.",
        recommendedAction: "Quarantine the expired stock immediately and place a purchase order.",
      };
    }

    if (item.status === "critical") {
      return {  
        priority: "HIGH",
        reason: "Current inventory is critically below the configured threshold.",
        recommendedAction: "Place a purchase order immediately to avoid stock depletion.",
      };
    }

    if (item.status === "low") {
      return {
        priority: "MEDIUM",
        reason: "Inventory has fallen below the preferred reorder threshold.",
        recommendedAction: "Schedule replenishment before stock becomes critical.",
      };
    }

    if (item.isExpiringSoon) {
      return {
        priority: "MEDIUM",
        reason: "The available stock is approaching its expiry date.",
        recommendedAction: "Prioritize dispensing this batch before newer inventory.",
      };
    }

    if (item.status === "overstocked") {
      return {
        priority: "LOW",
        reason: "Inventory exceeds the preferred stock level.",
        recommendedAction: "Delay future purchasing or redistribute excess inventory to other locations.",
      };
    }

    throw new Error(`Unhandled pharmacy status: ${item.status}`);
  }
}