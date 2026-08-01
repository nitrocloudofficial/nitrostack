import { readFile } from "node:fs/promises";
import { prisma } from "../client.js";
import { at, ICU_ITEM_ID, LOCATION_IDS, ORGANIZATION_ID } from "../seed/constants.js";

const failures: string[] = [];

function check(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

async function validateCounts(): Promise<Record<string, number>> {
  const [organizations, locations, roles, activeUsers, items, suppliers, batches, assets, ledgerEntries] = await Promise.all([
    prisma.organization.count({ where: { id: ORGANIZATION_ID } }),
    prisma.location.count({ where: { organizationId: ORGANIZATION_ID, active: true } }),
    prisma.role.count({ where: { organizationId: ORGANIZATION_ID } }),
    prisma.user.count({ where: { organizationId: ORGANIZATION_ID, active: true } }),
    prisma.catalogItem.count({ where: { organizationId: ORGANIZATION_ID, active: true } }),
    prisma.supplier.count({ where: { organizationId: ORGANIZATION_ID, active: true } }),
    prisma.stockBatch.count(),
    prisma.asset.count(),
    prisma.inventoryLedgerEntry.count(),
  ]);
  check(organizations === 1, `Expected one CareFlow organization, found ${organizations}`);
  check(locations === 12, `Expected exactly 12 operational locations, found ${locations}`);
  check(roles >= 5 && roles <= 7, `Expected 5-7 roles, found ${roles}`);
  check(activeUsers === 15, `Expected exactly 15 active users, found ${activeUsers}`);
  check(items === 120, `Expected exactly 120 catalogue items, found ${items}`);
  check(suppliers >= 10 && suppliers <= 15, `Expected 10-15 suppliers, found ${suppliers}`);
  check(batches >= 200 && batches <= 300, `Expected 200-300 batches, found ${batches}`);
  check(assets >= 30 && assets <= 50, `Expected 30-50 assets, found ${assets}`);
  check(ledgerEntries >= 1_000 && ledgerEntries <= 2_000, `Expected 1,000-2,000 ledger entries, found ${ledgerEntries}`);

  const categories = await prisma.itemCategory.findMany({
    where: { organizationId: ORGANIZATION_ID },
    select: { id: true, _count: { select: { items: true } } },
  });
  const expectedDistribution = new Map([
    ["cat-pharma", 35], ["cat-surgical", 20], ["cat-medical", 20], ["cat-lab", 12], ["cat-ppe", 10],
    ["cat-linen", 8], ["cat-gas", 5], ["cat-biomed", 5], ["cat-admin", 5],
  ]);
  for (const category of categories) {
    check(category._count.items === expectedDistribution.get(category.id), `Category ${category.id} has unexpected item count ${category._count.items}`);
  }
  return { organizations, locations, roles, activeUsers, items, suppliers, batches, assets, ledgerEntries };
}

async function validateUniqueness(): Promise<void> {
  const codeSets = await Promise.all([
    prisma.location.findMany({ select: { code: true } }),
    prisma.role.findMany({ select: { code: true } }),
    prisma.catalogItem.findMany({ select: { sku: true } }),
    prisma.supplier.findMany({ select: { code: true } }),
    prisma.inventoryTransaction.findMany({ select: { code: true } }),
    prisma.purchaseOrder.findMany({ select: { code: true } }),
  ]);
  for (const records of codeSets) {
    const values = records.map((record) => Object.values(record)[0]);
    check(values.length === new Set(values).size, "Duplicate unique business code detected");
  }
}

async function validateLedger(): Promise<void> {
  const grouped = await prisma.inventoryLedgerEntry.groupBy({
    by: ["positionKey"],
    _sum: { quantityBaseUnits: true },
  });
  const positions = await prisma.stockPosition.findMany({ select: { positionKey: true, quantityBaseUnits: true, stockStatus: true } });
  const positionMap = new Map(positions.map((position) => [position.positionKey, position.quantityBaseUnits]));
  for (const group of grouped) {
    check(positionMap.get(group.positionKey) === (group._sum.quantityBaseUnits ?? 0), `Ledger and StockPosition differ for ${group.positionKey}`);
  }
  check(grouped.length === positions.length, "StockPosition contains a row not represented by the ledger");
  const negativePositions = positions.filter((position) => position.quantityBaseUnits < 0);
  check(negativePositions.length === 0, `Found ${negativePositions.length} negative stock positions`);

  const transactions = await prisma.inventoryTransaction.findMany({ include: { entries: true } });
  for (const transaction of transactions) {
    check(transaction.entries.length > 0, `Transaction ${transaction.code} has no ledger entries`);
    check(transaction.entries.every((entry) => entry.quantityBaseUnits !== 0), `Transaction ${transaction.code} contains a zero movement`);
    const net = sum(transaction.entries.map((entry) => entry.quantityBaseUnits));
    if (transaction.transactionType === "STATUS_CHANGE") check(net === 0, `Status transaction ${transaction.code} does not balance to zero`);
    if (transaction.transactionType === "OPENING_BALANCE" || transaction.transactionType === "GOODS_RECEIPT") check(net > 0, `Receipt/opening transaction ${transaction.code} is not positive`);
    if (transaction.transactionType === "ISSUE") check(net < 0, `Issue transaction ${transaction.code} is not negative`);
  }

  const reservations = await prisma.reservation.findMany({ where: { status: "ACTIVE" } });
  for (const reservation of reservations) {
    const reservedPosition = await prisma.stockPosition.findFirst({
      where: { itemId: reservation.itemId, locationId: reservation.locationId, batchId: reservation.batchId, reservationKey: reservation.code },
    });
    check((reservedPosition?.quantityBaseUnits ?? 0) >= reservation.quantityBaseUnits, `Reservation ${reservation.code} exceeds its reserved stock dimension`);
  }
  const serializedItems = await prisma.catalogItem.findMany({ where: { trackingMode: "SERIAL" }, include: { batches: true } });
  check(serializedItems.every((item) => item.batches.some((batch) => batch.serialNumber !== null)), "A serialized item lacks an individually identified stock record");
}

async function validateIcuScenario(): Promise<Record<string, number>> {
  const requirement = await prisma.requirement.findUniqueOrThrow({ where: { id: "requirement-icu-001" } });
  const positions = await prisma.stockPosition.findMany({
    where: { itemId: ICU_ITEM_ID, quantityBaseUnits: { gt: 0 } },
    include: { batch: true },
  });
  const policies = await prisma.locationItemPolicy.findMany({ where: { itemId: ICU_ITEM_ID } });
  const policyMap = new Map(policies.map((policy) => [policy.locationId, policy]));
  const minimumExpiry = at(14);
  const eligibleAt = (locationId: string): number => sum(
    positions
      .filter((position) => position.locationId === locationId)
      .filter((position) => position.stockStatus === "AVAILABLE" && position.reservationKey === "UNRESERVED")
      .filter((position) => {
        const expiresAt = position.batch?.expiresAt;
        return expiresAt !== null && expiresAt !== undefined && expiresAt >= minimumExpiry;
      })
      .map((position) => position.quantityBaseUnits),
  );
  const icuAvailable = eligibleAt(LOCATION_IDS.icu);
  const centralTransferable = Math.max(0, eligibleAt(LOCATION_IDS.central) - (policyMap.get(LOCATION_IDS.central)?.safetyStockBaseUnits ?? 0));
  const pharmacyTransferable = Math.max(0, eligibleAt(LOCATION_IDS.pharmacy) - (policyMap.get(LOCATION_IDS.pharmacy)?.safetyStockBaseUnits ?? 0));
  const centralProtected = eligibleAt(LOCATION_IDS.central) - centralTransferable;
  const pharmacyProtected = eligibleAt(LOCATION_IDS.pharmacy) - pharmacyTransferable;
  const internalFulfilment = icuAvailable + centralTransferable + pharmacyTransferable;
  const residual = requirement.requiredBaseUnits - internalFulfilment;
  check(requirement.requiredBaseUnits === 120, "ICU requirement is not 120 units");
  check(icuAvailable === 20, `ICU eligible availability should be 20, found ${icuAvailable}`);
  check(centralTransferable === 45, `Central transferable quantity should be 45, found ${centralTransferable}`);
  check(pharmacyTransferable === 25, `Pharmacy transferable quantity should be 25, found ${pharmacyTransferable}`);
  check(centralProtected === 40 && pharmacyProtected === 30, "Safety-stock-protected quantities do not reconcile to 40 and 30 units");
  check(internalFulfilment === 90, `Internal fulfilment should be 90, found ${internalFulfilment}`);
  check(residual === 30 && requirement.procurementGapBaseUnits === 30, `Residual procurement gap should be 30, found ${residual}`);
  const quarantined = positions.find((position) => position.batchId === "batch-icu-quarantine" && position.stockStatus === "QUARANTINED");
  check(quarantined?.quantityBaseUnits === 50, "The rejected ICU recall batch is not quarantined at 50 units");
  const reserved = positions.find((position) => position.reservationKey === "RES-OTHER-001");
  check(reserved?.quantityBaseUnits === 15, "The 15-unit reserved stock exclusion is missing");
  const expired = positions.find((position) => position.batchId === "batch-icu-expired");
  const expiredAt = expired?.batch?.expiresAt;
  check(expired?.quantityBaseUnits === 10 && expiredAt !== null && expiredAt !== undefined && expiredAt < at(0), "Expired stock exclusion is missing");
  const centralFefo = positions
    .filter((position) => position.locationId === LOCATION_IDS.central && position.stockStatus === "AVAILABLE" && position.quantityBaseUnits > 0)
    .filter((position) => {
      const expiresAt = position.batch?.expiresAt;
      return expiresAt !== null && expiresAt !== undefined && expiresAt >= minimumExpiry;
    })
    .sort((left, right) => (left.batch?.expiresAt?.getTime() ?? 0) - (right.batch?.expiresAt?.getTime() ?? 0))[0];
  check(centralFefo?.batchId === "batch-icu-near", `FEFO selected ${centralFefo?.batchId ?? "nothing"} instead of batch-icu-near`);
  return { required: 120, icuAvailable, centralTransferable, pharmacyTransferable, centralProtected, pharmacyProtected, internalFulfilment, residual };
}

async function validateProcurementAndReceiving(): Promise<Record<string, number>> {
  const rfqLine = await prisma.rfqLine.findUniqueOrThrow({ where: { id: "rfq-line-icu-001" }, include: { procurementNeed: true, requirement: true } });
  check(rfqLine.requirementId === "requirement-icu-001" && rfqLine.procurementNeed.requirementId === rfqLine.requirementId, "RFQ line is not traceable to the originating requirement");
  check(rfqLine.requestedBaseUnits === rfqLine.requirement.procurementGapBaseUnits, "RFQ quantity does not equal the residual procurement gap");
  const quotes = await prisma.quote.findMany({ where: { rfqId: "rfq-icu-001" }, include: { lines: true } });
  check(quotes.length === 4, `Expected exactly four quotes, found ${quotes.length}`);
  check(quotes.every((quote) => quote.lines.length === 1), "A procurement quote is not comparable on the RFQ line");
  check(quotes.filter((quote) => quote.recommended).length === 1 && quotes.find((quote) => quote.recommended)?.id === "quote-icu-02", "Recommended quote is not deterministic or unique");
  const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: "po-icu-001" }, include: { lines: true } });
  check(po.lines[0]?.orderedBaseUnits === 30 && po.subtotalPaise === 163_500 && po.gstPaise === 19_620 && po.totalPaise === 183_120, "ICU purchase order arithmetic does not reconcile");

  const receiptLine = await prisma.goodsReceiptLine.findUniqueOrThrow({ where: { id: "receipt-line-001" }, include: { discrepancies: true } });
  const shortQuantity = receiptLine.orderedBaseUnits - receiptLine.receivedBaseUnits;
  check(receiptLine.receivedBaseUnits === receiptLine.acceptedBaseUnits + receiptLine.rejectedBaseUnits, "Received does not equal accepted plus rejected");
  check(shortQuantity === 8, `Expected an 8-unit short shipment, found ${shortQuantity}`);
  const rejectedDiscrepancies = receiptLine.discrepancies.filter((item) => item.discrepancyType !== "SHORT_SHIPMENT");
  check(sum(rejectedDiscrepancies.map((item) => item.quantityBaseUnits)) === receiptLine.rejectedBaseUnits, "Rejected discrepancy quantities do not reconcile");
  const receivedLedger = await prisma.inventoryLedgerEntry.aggregate({ where: { transaction: { referenceType: "GOODS_RECEIPT", referenceId: "receipt-001" } }, _sum: { quantityBaseUnits: true } });
  check(receivedLedger._sum.quantityBaseUnits === receiptLine.acceptedBaseUnits, "Accepted receipt quantity is not recorded in the inventory ledger");
  return { ordered: 100, received: 92, accepted: 80, rejected: 12, short: 8 };
}

async function validateRecalls(): Promise<void> {
  const recalls = await prisma.recallNotice.findMany({ include: { affectedBatches: true, quarantineActions: true } });
  check(recalls.some((recall) => recall.classification === "CONFIRMED"), "Confirmed recall is missing");
  check(recalls.some((recall) => recall.classification === "PROBABLE"), "Probable recall/investigation is missing");
  for (const recall of recalls) {
    check(recall.affectedBatches.length > 0, `Recall ${recall.code} has no affected batch`);
    for (const action of recall.quarantineActions) {
      const position = await prisma.stockPosition.findFirst({ where: { batchId: action.batchId, locationId: action.locationId, stockStatus: "QUARANTINED" } });
      check((position?.quantityBaseUnits ?? 0) >= action.quantityBaseUnits, `Quarantine ${action.code} disagrees with its stock position`);
    }
  }
  const priorIssue = await prisma.inventoryTransaction.findFirst({ where: { referenceType: "DISPENSING_HISTORY" }, include: { entries: true } });
  check(priorIssue !== null && priorIssue.entries.some((entry) => entry.quantityBaseUnits < 0), "Prior issue history for recall exposure is missing");
}

async function validateWorkflowsAndAssets(): Promise<void> {
  const actions = await prisma.preparedAction.findMany({ include: { approvalRequests: { include: { decisions: true } }, executions: true } });
  for (const action of actions) {
    const approved = action.approvalRequests.some((request) => request.status === "APPROVED" && request.decisions.some((decision) => decision.decision === "APPROVED"));
    if (action.executions.length > 0) check(approved, `Action ${action.code} executed without a satisfied approval`);
    if (!approved) check(action.executions.length === 0, `Unapproved action ${action.code} has an execution`);
  }
  check(actions.some((action) => action.status === "EXECUTED" && action.executions.some((execution) => execution.status === "SUCCEEDED")), "Approved and executed action example is missing");
  check(actions.some((action) => action.status === "PENDING_APPROVAL" && action.executions.length === 0), "Pending approval example is missing");
  check(actions.some((action) => action.status === "REJECTED" && action.executions.length === 0), "Rejected action example is missing");
  check(actions.some((action) => action.executions.some((execution) => execution.status === "FAILED")), "Failed execution example is missing");
  check(new Set(actions.map((action) => action.requesterType)).size === 3, "Prepared actions do not demonstrate USER, AGENT, and SYSTEM requesters");
  const purchaseOrders = await prisma.purchaseOrder.findMany();
  for (const purchaseOrder of purchaseOrders) {
    const supportingExecution = actions.some((action) => action.executions.some((execution) => execution.status === "SUCCEEDED" && execution.resultType === "PURCHASE_ORDER" && execution.resultId === purchaseOrder.id));
    check(supportingExecution, `Purchase order ${purchaseOrder.code} lacks a successful, approved workflow execution`);
  }

  const assets = await prisma.asset.findMany({ include: { allocations: { where: { status: "ACTIVE" } }, maintenance: true } });
  check(assets.some((asset) => asset.status === "AVAILABLE" && asset.allocations.length === 0), "Available/idle asset is missing");
  check(assets.filter((asset) => asset.status === "IN_USE").every((asset) => asset.allocations.length === 1), "An in-use asset lacks one active allocation");
  check(assets.some((asset) => asset.status === "MAINTENANCE_OVERDUE" && asset.nextMaintenanceAt !== null && asset.nextMaintenanceAt < at(0)), "Overdue-maintenance asset is missing");
  check(assets.some((asset) => asset.status === "QUARANTINED" || asset.status === "UNAVAILABLE"), "Unavailable/quarantined asset is missing");
}

async function validateOperationalLogistics(): Promise<void> {
  const transfers = await prisma.transferLine.findMany({ where: { requirementId: "requirement-icu-001" } });
  check(sum(transfers.map((line) => line.quantityBaseUnits)) === 70, "Prepared transfer lines do not reconcile to 70 units");

  const linen = await prisma.stockPosition.findMany({ where: { batchId: "batch-linen-flow", quantityBaseUnits: { gt: 0 } } });
  const linenByStatus = new Map(linen.map((position) => [position.stockStatus, position.quantityBaseUnits]));
  check(linenByStatus.get("CLEAN") === 120, "Linen clean balance should be 120");
  check(linenByStatus.get("ISSUED") === 10, "Linen issued balance should be 10");
  check(linenByStatus.get("LAUNDERING") === 65, "Linen laundering balance should be 65");
  check(linenByStatus.get("REJECTED_LOST") === 5, "Linen rejected/lost balance should be 5");
  check(sum(linen.map((position) => position.quantityBaseUnits)) === 200, "Linen cycle does not conserve its 200-piece opening quantity");

  const oxygen = await prisma.stockPosition.findMany({ where: { batchId: "batch-oxygen-flow", quantityBaseUnits: { gt: 0 } } });
  const oxygenByStatus = new Map(oxygen.map((position) => [position.stockStatus, position.quantityBaseUnits]));
  check(oxygenByStatus.get("FULL_AVAILABLE") === 28, "Medical-gas store should have 28 full available cylinders");
  check(oxygenByStatus.get("ALLOCATED_FULL") === 7, "ICU should have 7 allocated full cylinders");
  check(oxygenByStatus.get("EMPTY_RETURNED") === 5, "Medical-gas store should have 5 returned empties");
  check(oxygenByStatus.get("SAFETY_HOLD") === 2, "Medical-gas safety hold should contain 2 cylinders");
  check(sum(oxygen.map((position) => position.quantityBaseUnits)) === 42, "Medical oxygen cylinder cycle does not conserve 42 cylinders");
}

async function validateScopeExclusions(): Promise<void> {
  const schema = await readFile("prisma/schema.prisma", "utf8");
  check(!/^model\s+(Forecast|Prediction|Diagnosis|TreatmentRecommendation)\b/m.test(schema), "Forbidden predictive or clinical-decision model found in schema");
  const forbiddenRecords = await prisma.workflowRun.count({ where: { OR: [{ workflowType: { contains: "FORECAST" } }, { workflowType: { contains: "PREDICT" } }, { workflowType: { contains: "DIAGNOS" } }] } });
  check(forbiddenRecords === 0, "Forbidden predictive or diagnostic workflow record found");
}

async function main(): Promise<void> {
  const counts = await validateCounts();
  await validateUniqueness();
  await validateLedger();
  const icu = await validateIcuScenario();
  const receiving = await validateProcurementAndReceiving();
  await validateRecalls();
  await validateWorkflowsAndAssets();
  await validateOperationalLogistics();
  await validateScopeExclusions();

  if (failures.length > 0) {
    throw new Error(`CareFlow validation failed:\n- ${failures.join("\n- ")}`);
  }
  console.log(JSON.stringify({ valid: true, counts, scenarios: { icuRedistribution: icu, receivingDiscrepancy: receiving } }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
