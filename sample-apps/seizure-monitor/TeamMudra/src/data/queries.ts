import type { PrismaClient } from "../generated/prisma/client.js";
import { at, positionKey } from "./seed/constants.js";

export async function getInventoryAvailability(client: PrismaClient, itemId: string, locationId?: string) {
  return client.stockPosition.findMany({
    where: {
      itemId,
      locationId,
      quantityBaseUnits: { gt: 0 },
    },
    include: { batch: true, location: true, item: true },
    orderBy: [{ locationId: "asc" }, { batch: { expiresAt: "asc" } }],
  });
}

export async function getEligibleRedistributionSources(client: PrismaClient, requirementId: string) {
  const requirement = await client.requirement.findUniqueOrThrow({ where: { id: requirementId } });
  const minimumExpiry = at(14);
  const positions = await client.stockPosition.findMany({
    where: {
      itemId: requirement.itemId,
      stockStatus: "AVAILABLE",
      reservationKey: "UNRESERVED",
      quantityBaseUnits: { gt: 0 },
      batch: { expiresAt: { gte: minimumExpiry } },
      location: { policies: { some: { itemId: requirement.itemId, transferEligible: true } } },
    },
    include: { batch: true, location: { include: { policies: { where: { itemId: requirement.itemId } } } } },
    orderBy: [{ batch: { expiresAt: "asc" } }, { locationId: "asc" }],
  });
  return positions;
}

export async function getExpiringBatches(client: PrismaClient, withinDays: number) {
  return client.stockPosition.findMany({
    where: {
      quantityBaseUnits: { gt: 0 },
      stockStatus: "AVAILABLE",
      batch: { expiresAt: { gte: at(0), lte: at(withinDays) } },
    },
    include: { batch: true, item: true, location: true },
    orderBy: { batch: { expiresAt: "asc" } },
  });
}

export async function getRecallExposure(client: PrismaClient, recallNoticeId: string) {
  return client.recallNotice.findUniqueOrThrow({
    where: { id: recallNoticeId },
    include: {
      affectedBatches: { include: { batch: true } },
      quarantineActions: { include: { batch: true, location: true, releases: true } },
    },
  });
}

export async function getQuoteComparison(client: PrismaClient, rfqId: string) {
  return client.quote.findMany({
    where: { rfqId },
    include: { supplier: true, lines: { include: { rfqLine: true } } },
    orderBy: { comparisonRank: "asc" },
  });
}

export async function getPurchaseOrderStatus(client: PrismaClient, purchaseOrderId: string) {
  return client.purchaseOrder.findUniqueOrThrow({
    where: { id: purchaseOrderId },
    include: { supplier: true, lines: true, receipts: { include: { lines: true, discrepancies: true } } },
  });
}

export async function getReceivingDiscrepancies(client: PrismaClient) {
  return client.receivingDiscrepancy.findMany({
    include: { goodsReceipt: { include: { purchaseOrder: true } }, goodsReceiptLine: true },
    orderBy: { code: "asc" },
  });
}

export async function getAssetAvailability(client: PrismaClient) {
  return client.asset.findMany({
    include: { allocations: true, maintenance: true, location: true },
    orderBy: { code: "asc" },
  });
}

export async function getPendingApprovals(client: PrismaClient) {
  return client.approvalRequest.findMany({
    where: { status: "PENDING" },
    include: { preparedAction: true, approvalPolicy: true, decisions: true },
    orderBy: { requestedAt: "asc" },
  });
}

export async function getAuditTrail(client: PrismaClient, subjectType: string, subjectId: string) {
  return client.auditEvent.findMany({ where: { subjectType, subjectId }, orderBy: { sequence: "asc" } });
}

export { positionKey };
