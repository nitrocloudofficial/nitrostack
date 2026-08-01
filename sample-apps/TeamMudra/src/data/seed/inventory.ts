import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import {
  at,
  DeterministicRng,
  ICU_ITEM_ID,
  LINEN_ITEM_ID,
  LOCATION_IDS,
  OXYGEN_ITEM_ID,
  positionKey,
  RANDOM_SEED,
  RECALL_ITEM_ID,
  RECEIVING_ITEM_ID,
} from "./constants.js";
import type { CatalogSeedResult, CoreSeedResult, InventorySeedResult } from "./types.js";

function addTransaction(
  transactions: Prisma.InventoryTransactionCreateManyInput[],
  entries: Prisma.InventoryLedgerEntryCreateManyInput[],
  input: {
    id: string;
    type: string;
    occurredAt: Date;
    referenceType: string;
    referenceId: string;
    description: string;
    movements: ReadonlyArray<{
      itemId: string;
      locationId: string;
      batchId: string;
      stockStatus: string;
      quantity: number;
      reservationKey?: string;
    }>;
  },
): void {
  transactions.push({
    id: input.id,
    code: `TX-${input.id.toUpperCase()}`,
    transactionType: input.type,
    occurredAt: input.occurredAt,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    description: input.description,
    createdByType: "SYSTEM",
    createdById: null,
    metadataJson: JSON.stringify({ deterministicSeed: RANDOM_SEED }),
  });
  input.movements.forEach((movement, index) => {
    const reservationKey = movement.reservationKey ?? "UNRESERVED";
    entries.push({
      id: `entry-${input.id}-${String(index + 1).padStart(2, "0")}`,
      transactionId: input.id,
      sequence: index + 1,
      itemId: movement.itemId,
      locationId: movement.locationId,
      batchId: movement.batchId,
      stockStatus: movement.stockStatus,
      ownership: "HOSPITAL",
      reservationKey,
      positionKey: positionKey(movement.itemId, movement.locationId, movement.batchId, movement.stockStatus, "HOSPITAL", reservationKey),
      quantityBaseUnits: movement.quantity,
      unitCostPaise: 5_000,
      occurredAt: input.occurredAt,
    });
  });
}

export async function rebuildStockPositions(client: PrismaClient): Promise<void> {
  const grouped = await client.inventoryLedgerEntry.groupBy({
    by: ["positionKey", "itemId", "locationId", "batchId", "stockStatus", "ownership", "reservationKey"],
    _sum: { quantityBaseUnits: true },
  });
  for (const group of grouped) {
    const quantityBaseUnits = group._sum.quantityBaseUnits ?? 0;
    await client.stockPosition.upsert({
      where: { positionKey: group.positionKey },
      create: {
        id: `position-${group.positionKey}`,
        positionKey: group.positionKey,
        itemId: group.itemId,
        locationId: group.locationId,
        batchId: group.batchId,
        stockStatus: group.stockStatus,
        ownership: group.ownership,
        reservationKey: group.reservationKey,
        quantityBaseUnits,
        updatedAt: at(0),
      },
      update: { quantityBaseUnits, updatedAt: at(0) },
    });
  }
}

export async function seedInventory(
  client: PrismaClient,
  core: CoreSeedResult,
  catalog: CatalogSeedResult,
): Promise<InventorySeedResult> {
  const rng = new DeterministicRng(RANDOM_SEED);
  const batches: Prisma.StockBatchCreateManyInput[] = [];
  const transactions: Prisma.InventoryTransactionCreateManyInput[] = [];
  const entries: Prisma.InventoryLedgerEntryCreateManyInput[] = [];

  for (const itemId of catalog.itemIds) {
    if (itemId === ICU_ITEM_ID) continue;
    for (let batchIndex = 1; batchIndex <= 2; batchIndex += 1) {
      const batchId = `batch-${itemId.slice(-3)}-${String(batchIndex).padStart(2, "0")}`;
      batches.push({
        id: batchId,
        itemId,
        batchNumber: `B${itemId.slice(-3)}-${String(batchIndex).padStart(2, "0")}-26`,
        manufacturerName: `Fictional Manufacturer ${String((Number(itemId.slice(-3)) % 9) + 1).padStart(2, "0")}`,
        manufacturedAt: at(-180 - batchIndex * 10),
        expiresAt: at(120 + ((Number(itemId.slice(-3)) * 13 + batchIndex * 29) % 500)),
        serialNumber: null,
        coldChainEvidenceStatus: "VERIFIED",
        receivedAt: at(-90 + batchIndex),
      });
      const start = (Number(itemId.slice(-3)) + batchIndex) % core.locationIds.length;
      const movements = Array.from({ length: 5 }, (_, movementIndex) => ({
        itemId,
        locationId: core.locationIds[(start + movementIndex * 2) % core.locationIds.length],
        batchId,
        stockStatus: "AVAILABLE",
        quantity: rng.nextInt(20, 90),
      }));
      addTransaction(transactions, entries, {
        id: `opening-${batchId}`,
        type: "OPENING_BALANCE",
        occurredAt: at(-60 + batchIndex),
        referenceType: "SEED_BATCH",
        referenceId: batchId,
        description: "Deterministic opening inventory receipt",
        movements,
      });
    }
  }

  const specialBatches: Prisma.StockBatchCreateManyInput[] = [
    ["batch-icu-near", ICU_ITEM_ID, "ICU-NEAR-26", at(19)],
    ["batch-icu-later", ICU_ITEM_ID, "ICU-LATER-26", at(180)],
    ["batch-icu-quarantine", ICU_ITEM_ID, "ICU-RECALL-26", at(220)],
    ["batch-icu-expired", ICU_ITEM_ID, "ICU-EXPIRED-26", at(-1)],
    ["batch-recall-a", RECALL_ITEM_ID, "RECALL-A-26", at(250)],
    ["batch-recall-b", RECALL_ITEM_ID, "RECALL-B-26", at(300)],
    ["batch-linen-flow", LINEN_ITEM_ID, "LINEN-FLOW-26", at(700)],
    ["batch-oxygen-flow", OXYGEN_ITEM_ID, "OXY-FLOW-26", at(900)],
    ["batch-receipt-001", RECEIVING_ITEM_ID, "GR-MISMATCH-26", at(100)],
  ].map(([id, itemId, batchNumber, expiresAt]) => ({
    id: String(id),
    itemId: String(itemId),
    batchNumber: String(batchNumber),
    manufacturerName: "CareFlow Fictional Manufacturing Collective",
    manufacturedAt: at(-120),
    expiresAt: expiresAt instanceof Date ? expiresAt : null,
    serialNumber: null,
    coldChainEvidenceStatus: "VERIFIED",
    receivedAt: at(-45),
  }));
  for (let itemNumber = 111; itemNumber <= 115; itemNumber += 1) {
    const itemId = `item-${itemNumber}`;
    specialBatches.push({
      id: `batch-serial-${itemNumber}`,
      itemId,
      batchNumber: `SERIAL-${itemNumber}-26`,
      manufacturerName: "Fictional Precision Biomedical Works",
      manufacturedAt: at(-150),
      expiresAt: null,
      serialNumber: `CF-SERIAL-${itemNumber}-0001`,
      coldChainEvidenceStatus: "NOT_REQUIRED",
      receivedAt: at(-45),
    });
    addTransaction(transactions, entries, {
      id: `opening-serial-${itemNumber}`,
      type: "OPENING_BALANCE",
      occurredAt: at(-40),
      referenceType: "SERIALIZED_STOCK",
      referenceId: `CF-SERIAL-${itemNumber}-0001`,
      description: "Individually serialized biomedical accessory opening balance",
      movements: [
        { itemId, locationId: LOCATION_IDS.biomedical, batchId: `batch-serial-${itemNumber}`, stockStatus: "AVAILABLE", quantity: 1 },
      ],
    });
  }
  batches.push(...specialBatches);

  addTransaction(transactions, entries, {
    id: "opening-icu-scenario",
    type: "OPENING_BALANCE",
    occurredAt: at(-40),
    referenceType: "SCENARIO",
    referenceId: "SCN-ICU-REDISTRIBUTION",
    description: "Opening dimensions for ICU redistribution demonstration",
    movements: [
      { itemId: ICU_ITEM_ID, locationId: LOCATION_IDS.icu, batchId: "batch-icu-later", stockStatus: "AVAILABLE", quantity: 20 },
      { itemId: ICU_ITEM_ID, locationId: LOCATION_IDS.central, batchId: "batch-icu-near", stockStatus: "AVAILABLE", quantity: 45 },
      { itemId: ICU_ITEM_ID, locationId: LOCATION_IDS.central, batchId: "batch-icu-later", stockStatus: "AVAILABLE", quantity: 40 },
      { itemId: ICU_ITEM_ID, locationId: LOCATION_IDS.central, batchId: "batch-icu-later", stockStatus: "RESERVED", quantity: 15, reservationKey: "RES-OTHER-001" },
      { itemId: ICU_ITEM_ID, locationId: LOCATION_IDS.central, batchId: "batch-icu-quarantine", stockStatus: "AVAILABLE", quantity: 50 },
      { itemId: ICU_ITEM_ID, locationId: LOCATION_IDS.pharmacy, batchId: "batch-icu-near", stockStatus: "AVAILABLE", quantity: 25 },
      { itemId: ICU_ITEM_ID, locationId: LOCATION_IDS.pharmacy, batchId: "batch-icu-later", stockStatus: "AVAILABLE", quantity: 30 },
      { itemId: ICU_ITEM_ID, locationId: LOCATION_IDS.pharmacy, batchId: "batch-icu-expired", stockStatus: "AVAILABLE", quantity: 10 },
    ],
  });
  addTransaction(transactions, entries, {
    id: "quarantine-icu-50",
    type: "STATUS_CHANGE",
    occurredAt: at(-5),
    referenceType: "QUARANTINE_ACTION",
    referenceId: "qa-icu-50",
    description: "Move recalled ICU kit batch from available to quarantine",
    movements: [
      { itemId: ICU_ITEM_ID, locationId: LOCATION_IDS.central, batchId: "batch-icu-quarantine", stockStatus: "AVAILABLE", quantity: -50 },
      { itemId: ICU_ITEM_ID, locationId: LOCATION_IDS.central, batchId: "batch-icu-quarantine", stockStatus: "QUARANTINED", quantity: 50 },
    ],
  });
  addTransaction(transactions, entries, {
    id: "opening-recall-batches",
    type: "OPENING_BALANCE",
    occurredAt: at(-35),
    referenceType: "SCENARIO",
    referenceId: "SCN-RECALL",
    description: "Opening stock later affected by recall and investigation",
    movements: [
      { itemId: RECALL_ITEM_ID, locationId: LOCATION_IDS.central, batchId: "batch-recall-a", stockStatus: "AVAILABLE", quantity: 35 },
      { itemId: RECALL_ITEM_ID, locationId: LOCATION_IDS.pharmacy, batchId: "batch-recall-a", stockStatus: "AVAILABLE", quantity: 20 },
      { itemId: RECALL_ITEM_ID, locationId: LOCATION_IDS.wardA, batchId: "batch-recall-b", stockStatus: "AVAILABLE", quantity: 18 },
    ],
  });
  addTransaction(transactions, entries, {
    id: "issue-recall-history-01",
    type: "ISSUE",
    occurredAt: at(-8),
    referenceType: "DISPENSING_HISTORY",
    referenceId: "fictional-issue-001",
    description: "Prior non-clinical stock issue history for recall exposure tracing",
    movements: [
      { itemId: RECALL_ITEM_ID, locationId: LOCATION_IDS.central, batchId: "batch-recall-a", stockStatus: "AVAILABLE", quantity: -5 },
    ],
  });
  for (const [suffix, locationId, batchId, quantity] of [
    ["central", LOCATION_IDS.central, "batch-recall-a", 30],
    ["pharmacy", LOCATION_IDS.pharmacy, "batch-recall-a", 20],
    ["ward-a", LOCATION_IDS.wardA, "batch-recall-b", 18],
  ] as const) {
    addTransaction(transactions, entries, {
      id: `quarantine-recall-${suffix}`,
      type: "STATUS_CHANGE",
      occurredAt: at(-3),
      referenceType: "QUARANTINE_ACTION",
      referenceId: `qa-recall-${suffix}`,
      description: "Recall quarantine status movement",
      movements: [
        { itemId: RECALL_ITEM_ID, locationId, batchId, stockStatus: "AVAILABLE", quantity: -quantity },
        { itemId: RECALL_ITEM_ID, locationId, batchId, stockStatus: "QUARANTINED", quantity },
      ],
    });
  }
  addTransaction(transactions, entries, {
    id: "linen-cycle-01",
    type: "LINEN_CYCLE",
    occurredAt: at(-2),
    referenceType: "SCENARIO",
    referenceId: "SCN-LINEN",
    description: "Clean linen issue, soiled return, laundry processing and loss",
    movements: [
      { itemId: LINEN_ITEM_ID, locationId: LOCATION_IDS.linen, batchId: "batch-linen-flow", stockStatus: "CLEAN", quantity: 200 },
      { itemId: LINEN_ITEM_ID, locationId: LOCATION_IDS.linen, batchId: "batch-linen-flow", stockStatus: "CLEAN", quantity: -80 },
      { itemId: LINEN_ITEM_ID, locationId: LOCATION_IDS.wardA, batchId: "batch-linen-flow", stockStatus: "ISSUED", quantity: 80 },
      { itemId: LINEN_ITEM_ID, locationId: LOCATION_IDS.wardA, batchId: "batch-linen-flow", stockStatus: "ISSUED", quantity: -70 },
      { itemId: LINEN_ITEM_ID, locationId: LOCATION_IDS.linen, batchId: "batch-linen-flow", stockStatus: "SOILED", quantity: 70 },
      { itemId: LINEN_ITEM_ID, locationId: LOCATION_IDS.linen, batchId: "batch-linen-flow", stockStatus: "SOILED", quantity: -70 },
      { itemId: LINEN_ITEM_ID, locationId: LOCATION_IDS.linen, batchId: "batch-linen-flow", stockStatus: "LAUNDERING", quantity: 65 },
      { itemId: LINEN_ITEM_ID, locationId: LOCATION_IDS.linen, batchId: "batch-linen-flow", stockStatus: "REJECTED_LOST", quantity: 5 },
    ],
  });
  addTransaction(transactions, entries, {
    id: "oxygen-cycle-01",
    type: "GAS_CYLINDER_CYCLE",
    occurredAt: at(-1),
    referenceType: "SCENARIO",
    referenceId: "SCN-OXYGEN",
    description: "Full oxygen allocation and empty-cylinder return",
    movements: [
      { itemId: OXYGEN_ITEM_ID, locationId: LOCATION_IDS.gas, batchId: "batch-oxygen-flow", stockStatus: "FULL_AVAILABLE", quantity: 40 },
      { itemId: OXYGEN_ITEM_ID, locationId: LOCATION_IDS.gas, batchId: "batch-oxygen-flow", stockStatus: "FULL_AVAILABLE", quantity: -12 },
      { itemId: OXYGEN_ITEM_ID, locationId: LOCATION_IDS.icu, batchId: "batch-oxygen-flow", stockStatus: "ALLOCATED_FULL", quantity: 12 },
      { itemId: OXYGEN_ITEM_ID, locationId: LOCATION_IDS.icu, batchId: "batch-oxygen-flow", stockStatus: "ALLOCATED_FULL", quantity: -5 },
      { itemId: OXYGEN_ITEM_ID, locationId: LOCATION_IDS.gas, batchId: "batch-oxygen-flow", stockStatus: "EMPTY_RETURNED", quantity: 5 },
      { itemId: OXYGEN_ITEM_ID, locationId: LOCATION_IDS.gas, batchId: "batch-oxygen-flow", stockStatus: "SAFETY_HOLD", quantity: 2 },
    ],
  });
  addTransaction(transactions, entries, {
    id: "receipt-accepted-001",
    type: "GOODS_RECEIPT",
    occurredAt: at(-10),
    referenceType: "GOODS_RECEIPT",
    referenceId: "receipt-001",
    description: "Accepted portion of discrepant goods receipt",
    movements: [
      { itemId: RECEIVING_ITEM_ID, locationId: LOCATION_IDS.central, batchId: "batch-receipt-001", stockStatus: "AVAILABLE", quantity: 80 },
    ],
  });

  const existingBatchIds = new Set((await client.stockBatch.findMany({ where: { id: { in: batches.map(({ id }) => id) } }, select: { id: true } })).map(({ id }) => id));
  const missingBatches = batches.filter(({ id }) => !existingBatchIds.has(id));
  if (missingBatches.length > 0) await client.stockBatch.createMany({ data: missingBatches });
  const existingTransactionIds = new Set((await client.inventoryTransaction.findMany({ where: { id: { in: transactions.map(({ id }) => id) } }, select: { id: true } })).map(({ id }) => id));
  const missingTransactions = transactions.filter(({ id }) => !existingTransactionIds.has(id));
  if (missingTransactions.length > 0) await client.inventoryTransaction.createMany({ data: missingTransactions });
  const existingEntryIds = new Set((await client.inventoryLedgerEntry.findMany({ where: { id: { in: entries.map(({ id }) => id) } }, select: { id: true } })).map(({ id }) => id));
  const missingEntries = entries.filter(({ id }) => !existingEntryIds.has(id));
  for (let index = 0; index < missingEntries.length; index += 400) {
    await client.inventoryLedgerEntry.createMany({ data: missingEntries.slice(index, index + 400) });
  }
  await rebuildStockPositions(client);
  return { batchIds: batches.map(({ id }) => id), ledgerEntryCount: entries.length };
}
