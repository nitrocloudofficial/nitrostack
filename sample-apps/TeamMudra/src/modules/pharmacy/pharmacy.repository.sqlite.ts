import { prisma } from "../../data/client.js";
import { PharmacyItem } from "./pharmacy.types.js";
import { PharmacyRepository } from "./pharmacy.repository.js";

/**
 * SQLite/Prisma-backed PharmacyRepository.
 *
 * MVP aggregation rules (intentional hackathon decisions — isolated here so
 * they can change without touching PharmacyService/PharmacyTools):
 *  - currentStock: SUM(StockPosition.quantityBaseUnits) across ALL locations,
 *    where stockStatus == "AVAILABLE". Ownership is ignored.
 *  - reorderThreshold: MAX(LocationItemPolicy.reorderThresholdBaseUnits) ac    ross
 *    all locations for the item.
 *  - maxCapacity: MAX(LocationItemPolicy.parLevelBaseUnits) across all locations.
 *  - expiryDate: earliest StockBatch.expiresAt among batches that currently
 *    have AVAILABLE stock (summed quantity > 0). Depleted batches are ignored.
 *  - lastRestockedAt: latest StockBatch.receivedAt among those same
 *    contributing (non-depleted) batches.
 *  - Fallback: if an item has AVAILABLE stock but somehow no qualifying batch,
 *    or has zero available stock entirely, expiryDate/lastRestockedAt fall
 *    back to the most recent batch overall (any status) for that item, since
 *    the PharmacyItem type requires non-null date strings. If the item has no
 *    batches at all, the current timestamp is used as a last-resort default.
 *    This only affects items with no real batch history and should be
 *    revisited if that type is ever made nullable.
 */
export class SQLitePharmacyRepository implements PharmacyRepository {
  async findAll(filter?: { category?: string }): Promise<PharmacyItem[]> {
    const catalogItems = await prisma.catalogItem.findMany({
      include: { category: true },
    });

    const filtered = filter?.category
      ? catalogItems.filter(
          (item) =>
            item.category.name.toLowerCase() === filter.category!.toLowerCase()
        )
      : catalogItems;

    return this.buildPharmacyItems(filtered);
  }

  async findById(id: string): Promise<PharmacyItem | null> {
    const catalogItem = await prisma.catalogItem.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!catalogItem) {
      return null;
    }

    const [item] = await this.buildPharmacyItems([catalogItem]);
    return item ?? null;
  }

  /**
   * Builds PharmacyItem[] for a given set of CatalogItem rows by running
   * grouped aggregate queries once for the whole set (avoids N+1 queries).
   */
  private async buildPharmacyItems(
    catalogItems: Array<{
      id: string;
      name: string;
      baseUnit: string;
      category: { name: string };
    }>
  ): Promise<PharmacyItem[]> {
    if (catalogItems.length === 0) {
      return [];
    }

    const itemIds = catalogItems.map((item) => item.id);

    const [stockSums, policyMaxes, batchTotals, latestBatchAny] =
      await Promise.all([
        prisma.stockPosition.groupBy({
          by: ["itemId"],
          where: { itemId: { in: itemIds }, stockStatus: "AVAILABLE" },
          _sum: { quantityBaseUnits: true },
        }),
        prisma.locationItemPolicy.groupBy({
          by: ["itemId"],
          where: { itemId: { in: itemIds } },
          _sum: {
            reorderThresholdBaseUnits: true,
            parLevelBaseUnits: true,
          },
        }),
        // Available quantity per batch, so we can identify which batches
        // still have stock (sum > 0) and should count toward expiry/restock.
        prisma.stockPosition.groupBy({
          by: ["batchId"],
          where: {
            itemId: { in: itemIds },
            stockStatus: "AVAILABLE",
            batchId: { not: null },
          },
          _sum: { quantityBaseUnits: true },
        }),
        // Fallback source: most recent batch overall per item, used only
        // when an item has no batch with currently-available stock.
        prisma.stockBatch.findMany({
          where: { itemId: { in: itemIds } },
          orderBy: { receivedAt: "desc" },
        }),
      ]);

    const availableBatchIds = new Set(
      batchTotals
        .filter((row) => (row._sum.quantityBaseUnits ?? 0) > 0)
        .map((row) => row.batchId as string)
    );

    const contributingBatches =
      availableBatchIds.size === 0
        ? []
        : await prisma.stockBatch.findMany({
            where: { id: { in: Array.from(availableBatchIds) } },
          });

    const currentStockByItem = new Map<string, number>(
      stockSums.map((row) => [row.itemId, row._sum.quantityBaseUnits ?? 0])
    );

    const policyByItem = new Map<
      string,
      { reorderThreshold: number; maxCapacity: number }
    >(
      policyMaxes.map((row) => [
        row.itemId,
        {
          reorderThreshold: row._sum.reorderThresholdBaseUnits ?? 0,
          maxCapacity: row._sum.parLevelBaseUnits ?? 0,
        },
      ])
    );

    const earliestExpiryByItem = new Map<string, Date>();
    const latestRestockByItem = new Map<string, Date>();

    for (const batch of contributingBatches) {
      if (batch.expiresAt) {
        const current = earliestExpiryByItem.get(batch.itemId);
        if (!current || batch.expiresAt < current) {
          earliestExpiryByItem.set(batch.itemId, batch.expiresAt);
        }
      }
      const currentRestock = latestRestockByItem.get(batch.itemId);
      if (!currentRestock || batch.receivedAt > currentRestock) {
        latestRestockByItem.set(batch.itemId, batch.receivedAt);
      }
    }

    // Fallback map: most recent batch overall per item (any status),
    // used only when no AVAILABLE batch exists for that item.
    const fallbackBatchByItem = new Map<
      string,
      { expiresAt: Date | null; receivedAt: Date }
    >();
    for (const batch of latestBatchAny) {
      if (!fallbackBatchByItem.has(batch.itemId)) {
        fallbackBatchByItem.set(batch.itemId, {
          expiresAt: batch.expiresAt,
          receivedAt: batch.receivedAt,
        });
      }
    }

    const now = new Date();

    return catalogItems.map((item) => {
      const policy = policyByItem.get(item.id) ?? {
        reorderThreshold: 0,
        maxCapacity: 0,
      };
      const fallback = fallbackBatchByItem.get(item.id);

      const expiryDate =
        earliestExpiryByItem.get(item.id) ?? fallback?.expiresAt ?? now;
      const lastRestockedAt =
        latestRestockByItem.get(item.id) ?? fallback?.receivedAt ?? now;

      const pharmacyItem: PharmacyItem = {
        id: item.id,
        name: item.name,
        category: item.category.name,
        currentStock: currentStockByItem.get(item.id) ?? 0,
        reorderThreshold: policy.reorderThreshold,
        maxCapacity: policy.maxCapacity,
        unit: item.baseUnit,
        expiryDate: expiryDate.toISOString(),
        lastRestockedAt: lastRestockedAt.toISOString(),
      };

      return pharmacyItem;
    });
  }
}