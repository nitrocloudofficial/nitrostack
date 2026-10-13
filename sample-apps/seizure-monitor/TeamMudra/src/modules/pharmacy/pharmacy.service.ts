import { PharmacyRepository } from "./pharmacy.repository.js";
import {
  GetPharmacyStatusInput,
  GetPharmacyStatusOutput,
  PharmacyItem,
  PharmacyItemStatus,
  PharmacyStatusSummary,
  StockStatus,
} from "./pharmacy.types.js";

/** Owns pharmacy business logic (stock classification, expiry rules, summaries). */
export class PharmacyService {
  constructor(private readonly repository: PharmacyRepository) {}

  async getStatus(
    input: GetPharmacyStatusInput
  ): Promise<GetPharmacyStatusOutput> {
    const rawItems = await this.repository.findAll({
      category: input.category,
    });

    const itemStatuses = rawItems.map((item) =>
      this.toItemStatus(item, input.expiringWithinDays)
    );

    const summary = this.buildSummary(itemStatuses);

    const items = input.includeNormal
      ? itemStatuses
      : itemStatuses.filter((item) => item.status !== "normal");

    return { summary, items };
  }

  /**
   * Derives the agent-facing status view for a single item.
   * This is the single source of truth for stock-level classification and
   * expiry flagging, so every future tool (recommendations, alerts, etc.)
   * stays consistent with what get_pharmacy_status reports.
   */
  private toItemStatus( 
    item: PharmacyItem,
    expiringWithinDays: number
  ): PharmacyItemStatus {
    const daysUntilExpiry = this.daysUntil(item.expiryDate);

    const isExpired = daysUntilExpiry <= 0;
    const isExpiringSoon =
      !isExpired && daysUntilExpiry <= expiringWithinDays;

    const status: StockStatus = isExpired
      ? "critical"
      : this.classifyStock(item);



    return {
      ...item,
      status,
      daysUntilExpiry,
      isExpired,
      isExpiringSoon,
    };
  }

  private classifyStock(item: PharmacyItem): StockStatus {
    const { currentStock, reorderThreshold, maxCapacity } = item;

    // Critical: at or below half the reorder threshold — needs urgent
    // administrator attention, not just a routine reorder suggestion.
    if (currentStock <= reorderThreshold * 0.5) {
      return "critical";
    }
    if (currentStock <= reorderThreshold) {
      return "low";
    }
    if (currentStock >= maxCapacity) {
      return "overstocked";
    }
    return "normal";
  }

  private daysUntil(isoDate: string): number {
    const target = new Date(isoDate).getTime();
    const now = Date.now();
    return Math.ceil((target - now) / (24 * 60 * 60 * 1000));
  }

  private buildSummary(items: PharmacyItemStatus[]): PharmacyStatusSummary {
    const counts: Record<StockStatus, number> = {
      critical: 0,
      low: 0,
      normal: 0,
      overstocked: 0,
    };

    let expiredCount = 0;
    let expiringSoonCount = 0;

    for (const item of items) {
      counts[item.status] += 1;
      if (item.isExpired) { 
        expiredCount += 1;
      }
      if (item.isExpiringSoon) {
        expiringSoonCount += 1;
      }
    }

    return {
      totalItems: items.length,
      criticalCount: counts.critical,
      lowCount: counts.low,
      normalCount: counts.normal, 
      overstockedCount: counts.overstocked,

      expiredCount: expiredCount,
      expiringSoonCount,
      generatedAt: new Date().toISOString(),
    };
  }
}