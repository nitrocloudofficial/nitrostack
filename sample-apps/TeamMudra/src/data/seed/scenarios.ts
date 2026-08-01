import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import {
  at,
  ICU_ITEM_ID,
  LOCATION_IDS,
  ORGANIZATION_ID,
  RECEIVING_ITEM_ID,
} from "./constants.js";
import type { CoreSeedResult, ScenarioSeedResult, SupplierSeedResult } from "./types.js";

async function seedRedistribution(client: PrismaClient): Promise<void> {
  await client.requirement.upsert({
    where: { id: "requirement-icu-001" },
    create: {
      id: "requirement-icu-001",
      code: "REQ-ICU-2026-001",
      itemId: ICU_ITEM_ID,
      locationId: LOCATION_IDS.icu,
      requestedByUserId: "user-02",
      requiredBaseUnits: 120,
      fulfilledLocallyBaseUnits: 20,
      fulfilledByTransferBaseUnits: 70,
      procurementGapBaseUnits: 30,
      priority: "CRITICAL",
      status: "REDISTRIBUTION_PLANNED",
      neededBy: at(2),
      createdAt: at(-1),
    },
    update: {
      requiredBaseUnits: 120,
      fulfilledLocallyBaseUnits: 20,
      fulfilledByTransferBaseUnits: 70,
      procurementGapBaseUnits: 30,
      status: "REDISTRIBUTION_PLANNED",
    },
  });
  await client.reservation.upsert({
    where: { id: "reservation-other-001" },
    create: {
      id: "reservation-other-001",
      code: "RES-OTHER-001",
      requirementId: null,
      itemId: ICU_ITEM_ID,
      locationId: LOCATION_IDS.central,
      batchId: "batch-icu-later",
      quantityBaseUnits: 15,
      status: "ACTIVE",
      reservedAt: at(-2),
      expiresAt: at(3),
    },
    update: { quantityBaseUnits: 15, status: "ACTIVE" },
  });
  for (const [id, code, sourceLocationId, quantity, batchId] of [
    ["transfer-icu-cms", "TRF-ICU-CMS-001", LOCATION_IDS.central, 45, "batch-icu-near"],
    ["transfer-icu-pha", "TRF-ICU-PHA-001", LOCATION_IDS.pharmacy, 25, "batch-icu-near"],
  ] as const) {
    await client.transfer.upsert({
      where: { id },
      create: {
        id,
        code,
        sourceLocationId,
        destinationLocationId: LOCATION_IDS.icu,
        status: "PREPARED",
        requestedAt: at(0, 8),
      },
      update: { status: "PREPARED" },
    });
    await client.transferLine.upsert({
      where: { id: `${id}-line-1` },
      create: {
        id: `${id}-line-1`,
        transferId: id,
        requirementId: "requirement-icu-001",
        itemId: ICU_ITEM_ID,
        batchId,
        quantityBaseUnits: quantity,
      },
      update: { batchId, quantityBaseUnits: quantity },
    });
  }
}

async function seedProcurement(client: PrismaClient, suppliers: SupplierSeedResult): Promise<void> {
  await client.procurementNeed.upsert({
    where: { id: "procurement-need-icu-001" },
    create: {
      id: "procurement-need-icu-001",
      code: "NEED-ICU-2026-001",
      requirementId: "requirement-icu-001",
      quantityBaseUnits: 30,
      status: "RFQ_COMPLETED",
      createdAt: at(0, 9),
    },
    update: { quantityBaseUnits: 30, status: "RFQ_COMPLETED" },
  });
  await client.rfq.upsert({
    where: { id: "rfq-icu-001" },
    create: {
      id: "rfq-icu-001",
      code: "RFQ-ICU-2026-001",
      status: "EVALUATED",
      issuedAt: at(0, 10),
      closesAt: at(1, 10),
      notes: "Fictional competitive request for the deterministic ICU residual gap",
    },
    update: { status: "EVALUATED" },
  });
  await client.rfqLine.upsert({
    where: { id: "rfq-line-icu-001" },
    create: {
      id: "rfq-line-icu-001",
      rfqId: "rfq-icu-001",
      lineNumber: 1,
      itemId: ICU_ITEM_ID,
      requirementId: "requirement-icu-001",
      procurementNeedId: "procurement-need-icu-001",
      requestedBaseUnits: 30,
    },
    update: { requestedBaseUnits: 30 },
  });

  const quoteInputs = [
    { suffix: "01", supplierId: suppliers.supplierIds[0], unitPrice: 5_200, lead: 3, available: 30, compliant: true, score: 9_000, rank: 2, recommended: false, summary: "Balanced price and strong historic fulfilment" },
    { suffix: "02", supplierId: suppliers.supplierIds[1], unitPrice: 5_450, lead: 1, available: 30, compliant: true, score: 8_850, rank: 1, recommended: true, summary: "Fastest compliant full-quantity offer; recommended for critical need" },
    { suffix: "03", supplierId: suppliers.supplierIds[2], unitPrice: 4_800, lead: 6, available: 20, compliant: true, score: 9_250, rank: 3, recommended: false, summary: "Lowest compliant price but insufficient availability and slower delivery" },
    { suffix: "04", supplierId: suppliers.supplierIds[3], unitPrice: 4_500, lead: 2, available: 30, compliant: false, score: 7_900, rank: 4, recommended: false, summary: "Low price rejected because compliance status is conditional" },
  ] as const;
  for (const quoteInput of quoteInputs) {
    const quoteId = `quote-icu-${quoteInput.suffix}`;
    const totalPaise = quoteInput.unitPrice * 30;
    await client.quote.upsert({
      where: { id: quoteId },
      create: {
        id: quoteId,
        code: `QUO-ICU-2026-${quoteInput.suffix}`,
        rfqId: "rfq-icu-001",
        supplierId: quoteInput.supplierId,
        submittedAt: at(1, Number(quoteInput.suffix)),
        validUntil: at(15),
        status: "SUBMITTED",
        complianceStatus: quoteInput.compliant ? "COMPLIANT" : "CONDITIONAL",
        performanceScoreBasisPoints: quoteInput.score,
        totalPaise,
        recommended: quoteInput.recommended,
        comparisonRank: quoteInput.rank,
        tradeoffSummary: quoteInput.summary,
      },
      update: {
        totalPaise,
        recommended: quoteInput.recommended,
        comparisonRank: quoteInput.rank,
        tradeoffSummary: quoteInput.summary,
      },
    });
    await client.quoteLine.upsert({
      where: { id: `quote-line-icu-${quoteInput.suffix}` },
      create: {
        id: `quote-line-icu-${quoteInput.suffix}`,
        quoteId,
        rfqLineId: "rfq-line-icu-001",
        offeredBaseUnits: Math.min(30, quoteInput.available),
        unitPricePaise: quoteInput.unitPrice,
        gstBasisPoints: 1_200,
        leadTimeDays: quoteInput.lead,
        availableBaseUnits: quoteInput.available,
        compliant: quoteInput.compliant,
        lineTotalPaise: totalPaise,
      },
      update: {
        offeredBaseUnits: Math.min(30, quoteInput.available),
        unitPricePaise: quoteInput.unitPrice,
        leadTimeDays: quoteInput.lead,
        availableBaseUnits: quoteInput.available,
        compliant: quoteInput.compliant,
        lineTotalPaise: totalPaise,
      },
    });
  }

  await client.purchaseOrder.upsert({
    where: { id: "po-icu-001" },
    create: {
      id: "po-icu-001",
      code: "PO-ICU-2026-001",
      supplierId: suppliers.supplierIds[1],
      quoteId: "quote-icu-02",
      status: "ISSUED",
      orderedAt: at(2, 12),
      expectedAt: at(3, 12),
      subtotalPaise: 163_500,
      gstPaise: 19_620,
      totalPaise: 183_120,
    },
    update: { status: "ISSUED", subtotalPaise: 163_500, gstPaise: 19_620, totalPaise: 183_120 },
  });
  await client.purchaseOrderLine.upsert({
    where: { id: "po-line-icu-001" },
    create: {
      id: "po-line-icu-001",
      purchaseOrderId: "po-icu-001",
      lineNumber: 1,
      itemId: ICU_ITEM_ID,
      orderedBaseUnits: 30,
      unitPricePaise: 5_450,
      gstBasisPoints: 1_200,
      lineSubtotalPaise: 163_500,
    },
    update: { orderedBaseUnits: 30, lineSubtotalPaise: 163_500 },
  });
}

async function seedReceiving(client: PrismaClient, suppliers: SupplierSeedResult): Promise<void> {
  await client.purchaseOrder.upsert({
    where: { id: "po-receiving-001" },
    create: {
      id: "po-receiving-001",
      code: "PO-GR-2026-001",
      supplierId: suppliers.supplierIds[0],
      quoteId: null,
      status: "PARTIALLY_RECEIVED",
      orderedAt: at(-20),
      expectedAt: at(-12),
      subtotalPaise: 250_000,
      gstPaise: 30_000,
      totalPaise: 280_000,
    },
    update: { status: "PARTIALLY_RECEIVED" },
  });
  await client.purchaseOrderLine.upsert({
    where: { id: "po-line-receiving-001" },
    create: {
      id: "po-line-receiving-001",
      purchaseOrderId: "po-receiving-001",
      lineNumber: 1,
      itemId: RECEIVING_ITEM_ID,
      orderedBaseUnits: 100,
      unitPricePaise: 2_500,
      gstBasisPoints: 1_200,
      lineSubtotalPaise: 250_000,
    },
    update: { orderedBaseUnits: 100 },
  });
  await client.goodsReceipt.upsert({
    where: { id: "receipt-001" },
    create: {
      id: "receipt-001",
      code: "GRN-2026-001",
      purchaseOrderId: "po-receiving-001",
      status: "DISCREPANCY_RECORDED",
      receivedAt: at(-10),
      deliveryNote: "Fictional delivery note DN-EXAMPLE-001",
    },
    update: { status: "DISCREPANCY_RECORDED" },
  });
  await client.goodsReceiptLine.upsert({
    where: { id: "receipt-line-001" },
    create: {
      id: "receipt-line-001",
      goodsReceiptId: "receipt-001",
      purchaseOrderLineId: "po-line-receiving-001",
      itemId: RECEIVING_ITEM_ID,
      batchNumber: "GR-MISMATCH-26",
      orderedBaseUnits: 100,
      receivedBaseUnits: 92,
      acceptedBaseUnits: 80,
      rejectedBaseUnits: 12,
    },
    update: { orderedBaseUnits: 100, receivedBaseUnits: 92, acceptedBaseUnits: 80, rejectedBaseUnits: 12 },
  });
  const discrepancies = [
    ["disc-short", "DISC-GR-SHORT", "SHORT_SHIPMENT", 8, "Eight units were not delivered"],
    ["disc-damaged", "DISC-GR-DAMAGED", "DAMAGED", 5, "Five received units had damaged seals"],
    ["disc-expiry", "DISC-GR-EXPIRY", "EXPIRY_BELOW_THRESHOLD", 4, "Four units failed minimum remaining shelf-life policy"],
    ["disc-cold", "DISC-GR-COLD", "COLD_CHAIN_EVIDENCE_FAILURE", 3, "Three units lacked complete temperature evidence"],
  ] as const;
  for (const [id, code, discrepancyType, quantityBaseUnits, description] of discrepancies) {
    await client.receivingDiscrepancy.upsert({
      where: { id },
      create: {
        id,
        code,
        goodsReceiptId: "receipt-001",
        goodsReceiptLineId: "receipt-line-001",
        discrepancyType,
        quantityBaseUnits,
        description,
        status: "OPEN",
      },
      update: { quantityBaseUnits, description, status: "OPEN" },
    });
  }
}

async function seedRecalls(client: PrismaClient): Promise<void> {
  for (const input of [
    { id: "recall-confirmed-001", code: "REC-2026-001", title: "Confirmed particulate investigation", classification: "CONFIRMED", status: "ACTIVE", issuedAt: at(-4), notes: "Confirmed fictional recall; affected stock quarantined across stores" },
    { id: "recall-probable-001", code: "REC-2026-002", title: "Probable packaging-integrity investigation", classification: "PROBABLE", status: "INVESTIGATING", issuedAt: at(-3), notes: "Probable fictional compliance investigation pending final disposition" },
  ] as const) {
    await client.recallNotice.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        code: input.code,
        title: input.title,
        classification: input.classification,
        status: input.status,
        issuedAt: input.issuedAt,
        investigationNotes: input.notes,
      },
      update: { status: input.status, investigationNotes: input.notes },
    });
  }
  for (const [id, recallNoticeId, batchId, priorIssuedBaseUnits] of [
    ["recall-batch-a", "recall-confirmed-001", "batch-recall-a", 5],
    ["recall-batch-icu", "recall-confirmed-001", "batch-icu-quarantine", 0],
    ["recall-batch-b", "recall-probable-001", "batch-recall-b", 3],
  ] as const) {
    await client.recallBatch.upsert({
      where: { id },
      create: { id, recallNoticeId, batchId, affected: true, priorIssuedBaseUnits },
      update: { affected: true, priorIssuedBaseUnits },
    });
  }
  for (const [id, code, recallNoticeId, batchId, locationId, quantity] of [
    ["qa-icu-50", "QA-ICU-050", "recall-confirmed-001", "batch-icu-quarantine", LOCATION_IDS.central, 50],
    ["qa-recall-central", "QA-REC-CMS", "recall-confirmed-001", "batch-recall-a", LOCATION_IDS.central, 30],
    ["qa-recall-pharmacy", "QA-REC-PHA", "recall-confirmed-001", "batch-recall-a", LOCATION_IDS.pharmacy, 20],
    ["qa-recall-ward-a", "QA-REC-GWA", "recall-probable-001", "batch-recall-b", LOCATION_IDS.wardA, 18],
  ] as const) {
    await client.quarantineAction.upsert({
      where: { id },
      create: {
        id,
        code,
        recallNoticeId,
        batchId,
        locationId,
        quantityBaseUnits: quantity,
        reason: "Recall or compliance investigation hold",
        status: "ACTIVE",
        quarantinedAt: at(-3),
      },
      update: { quantityBaseUnits: quantity, status: "ACTIVE" },
    });
  }
  await client.quarantineRelease.upsert({
    where: { id: "release-probable-partial" },
    create: {
      id: "release-probable-partial",
      quarantineActionId: "qa-recall-ward-a",
      disposition: "RETAINED_PENDING_INVESTIGATION",
      quantityBaseUnits: 0,
      decidedAt: at(-1),
      notes: "No physical release; status retained while investigation continues",
    },
    update: { disposition: "RETAINED_PENDING_INVESTIGATION" },
  });
}

async function seedAssets(client: PrismaClient, core: CoreSeedResult): Promise<void> {
  const assets: Prisma.AssetCreateManyInput[] = [];
  const allocations: Prisma.AssetAllocationCreateManyInput[] = [];
  const maintenance: Prisma.MaintenanceRecordCreateManyInput[] = [];
  for (let index = 1; index <= 40; index += 1) {
    const id = `asset-${String(index).padStart(3, "0")}`;
    let status = index <= 10 ? "AVAILABLE" : index <= 30 ? "IN_USE" : index === 31 ? "MAINTENANCE_OVERDUE" : index <= 35 ? "QUARANTINED" : "UNAVAILABLE";
    assets.push({
      id,
      code: `CFA-${String(index).padStart(4, "0")}`,
      itemId: null,
      locationId: core.locationIds[index % core.locationIds.length],
      assetType: index % 3 === 0 ? "INFUSION_PUMP" : index % 3 === 1 ? "PATIENT_MONITOR" : "MOBILE_TROLLEY",
      manufacturerName: `Fictional Biomedical Works ${(index % 4) + 1}`,
      modelName: `Demo Model ${100 + index}`,
      serialNumber: `CF-DEMO-SN-${String(index).padStart(5, "0")}`,
      status,
      commissionedAt: at(-700 + index),
      nextMaintenanceAt: index === 31 ? at(-30) : at(30 + index),
    });
    maintenance.push({
      id: `maintenance-${String(index).padStart(3, "0")}`,
      assetId: id,
      maintenanceType: "PREVENTIVE",
      status: index === 31 ? "OVERDUE" : "SCHEDULED",
      scheduledAt: index === 31 ? at(-30) : at(30 + index),
      completedAt: null,
      notes: index === 31 ? "Overdue preventive maintenance; asset unavailable" : "Future deterministic maintenance schedule",
    });
    if (index >= 11 && index <= 30) {
      allocations.push({
        id: `allocation-${String(index).padStart(3, "0")}`,
        assetId: id,
        locationId: core.locationIds[(index + 2) % core.locationIds.length],
        allocatedByUserId: core.userIds[index % core.userIds.length],
        status: "ACTIVE",
        allocatedAt: at(-index),
        returnedAt: null,
        purpose: "Operational allocation for fictional demonstration workload",
      });
    }
  }
  const existingAssetIds = new Set((await client.asset.findMany({ where: { id: { in: assets.map(({ id }) => id) } }, select: { id: true } })).map(({ id }) => id));
  const missingAssets = assets.filter(({ id }) => !existingAssetIds.has(id));
  if (missingAssets.length > 0) await client.asset.createMany({ data: missingAssets });
  const existingAllocationIds = new Set((await client.assetAllocation.findMany({ where: { id: { in: allocations.map(({ id }) => id) } }, select: { id: true } })).map(({ id }) => id));
  const missingAllocations = allocations.filter(({ id }) => !existingAllocationIds.has(id));
  if (missingAllocations.length > 0) await client.assetAllocation.createMany({ data: missingAllocations });
  const existingMaintenanceIds = new Set((await client.maintenanceRecord.findMany({ where: { id: { in: maintenance.map(({ id }) => id) } }, select: { id: true } })).map(({ id }) => id));
  const missingMaintenance = maintenance.filter(({ id }) => !existingMaintenanceIds.has(id));
  if (missingMaintenance.length > 0) await client.maintenanceRecord.createMany({ data: missingMaintenance });
}

async function seedWorkflows(client: PrismaClient): Promise<void> {
  const policies = [
    ["policy-transfer", "APPROVE_TRANSFER", 0, 500_000, "INVENTORY_OFFICER", 1],
    ["policy-purchase-low", "CREATE_PURCHASE_ORDER", 0, 500_000, "PROCUREMENT_OFFICER", 1],
    ["policy-purchase-high", "CREATE_PURCHASE_ORDER", 500_001, null, "FINANCE_APPROVER", 2],
    ["policy-quarantine", "QUARANTINE_STOCK", 0, null, "COMPLIANCE_OFFICER", 1],
    ["policy-asset", "ALLOCATE_ASSET", 0, null, "OPERATIONS_ADMIN", 1],
  ] as const;
  for (const [id, actionType, minimumAmountPaise, maximumAmountPaise, requiredRoleCode, requiredApprovals] of policies) {
    await client.approvalPolicy.upsert({
      where: { id },
      create: { id, code: `AP-${id.toUpperCase()}`, actionType, minimumAmountPaise, maximumAmountPaise, requiredRoleCode, requiredApprovals, active: true },
      update: { minimumAmountPaise, maximumAmountPaise, requiredRoleCode, requiredApprovals, active: true },
    });
  }

  const workflows = [
    ["workflow-po", "WF-PO-001", "PROCUREMENT", "COMPLETED"],
    ["workflow-transfer", "WF-TRF-001", "REDISTRIBUTION", "WAITING_APPROVAL"],
    ["workflow-quarantine", "WF-QA-001", "COMPLIANCE", "REJECTED"],
    ["workflow-asset", "WF-ASSET-001", "ASSET_ALLOCATION", "FAILED"],
    ["workflow-receiving-po", "WF-PO-GR-001", "PROCUREMENT", "COMPLETED"],
  ] as const;
  for (const [id, code, workflowType, status] of workflows) {
    await client.workflowRun.upsert({
      where: { id },
      create: { id, organizationId: ORGANIZATION_ID, code, workflowType, status, startedAt: at(-2), completedAt: ["COMPLETED", "REJECTED", "FAILED"].includes(status) ? at(-1) : null, correlationId: `corr-${id}` },
      update: { status, completedAt: ["COMPLETED", "REJECTED", "FAILED"].includes(status) ? at(-1) : null },
    });
  }

  const actions = [
    { id: "action-po", workflowRunId: "workflow-po", actionType: "CREATE_PURCHASE_ORDER", requesterType: "AGENT", requesterId: "careflow-procurement-agent", status: "EXECUTED", amountPaise: 183_120, targetType: "QUOTE", targetId: "quote-icu-02", policyId: "policy-purchase-low", requestStatus: "APPROVED", approver: "user-03", decision: "APPROVED", executionStatus: "SUCCEEDED", resultType: "PURCHASE_ORDER", resultId: "po-icu-001", error: null },
    { id: "action-transfer", workflowRunId: "workflow-transfer", actionType: "APPROVE_TRANSFER", requesterType: "AGENT", requesterId: "careflow-redistribution-agent", status: "PENDING_APPROVAL", amountPaise: null, targetType: "REQUIREMENT", targetId: "requirement-icu-001", policyId: "policy-transfer", requestStatus: "PENDING", approver: null, decision: null, executionStatus: null, resultType: null, resultId: null, error: null },
    { id: "action-quarantine", workflowRunId: "workflow-quarantine", actionType: "QUARANTINE_STOCK", requesterType: "SYSTEM", requesterId: "recall-monitor", status: "REJECTED", amountPaise: null, targetType: "STOCK_BATCH", targetId: "batch-recall-b", policyId: "policy-quarantine", requestStatus: "REJECTED", approver: "user-05", decision: "REJECTED", executionStatus: null, resultType: null, resultId: null, error: null },
    { id: "action-asset", workflowRunId: "workflow-asset", actionType: "ALLOCATE_ASSET", requesterType: "USER", requesterId: "user-06", status: "EXECUTION_FAILED", amountPaise: null, targetType: "ASSET", targetId: "asset-031", policyId: "policy-asset", requestStatus: "APPROVED", approver: "user-06", decision: "APPROVED", executionStatus: "FAILED", resultType: null, resultId: null, error: "Asset blocked because preventive maintenance is overdue" },
    { id: "action-receiving-po", workflowRunId: "workflow-receiving-po", actionType: "CREATE_PURCHASE_ORDER", requesterType: "USER", requesterId: "user-03", status: "EXECUTED", amountPaise: 280_000, targetType: "PROCUREMENT_CASE", targetId: "receiving-demo-procurement", policyId: "policy-purchase-low", requestStatus: "APPROVED", approver: "user-03", decision: "APPROVED", executionStatus: "SUCCEEDED", resultType: "PURCHASE_ORDER", resultId: "po-receiving-001", error: null },
  ] as const;
  for (const action of actions) {
    await client.preparedAction.upsert({
      where: { id: action.id },
      create: {
        id: action.id,
        code: `PA-${action.id.toUpperCase()}`,
        workflowRunId: action.workflowRunId,
        actionType: action.actionType,
        requesterType: action.requesterType,
        requesterId: action.requesterId,
        status: action.status,
        amountPaise: action.amountPaise,
        targetType: action.targetType,
        targetId: action.targetId,
        payloadJson: JSON.stringify({ targetType: action.targetType, targetId: action.targetId }),
        evidenceJson: JSON.stringify({ deterministic: true, source: "ledger-and-policy-query" }),
        reasoningSummary: "Prepared from deterministic balances, policy thresholds, and scenario evidence; no prediction used.",
        preparedAt: at(-2, 2),
      },
      update: { status: action.status, evidenceJson: JSON.stringify({ deterministic: true, source: "ledger-and-policy-query" }) },
    });
    const approvalRequestId = `approval-${action.id}`;
    await client.approvalRequest.upsert({
      where: { id: approvalRequestId },
      create: { id: approvalRequestId, code: `AR-${action.id.toUpperCase()}`, preparedActionId: action.id, approvalPolicyId: action.policyId, status: action.requestStatus, requestedAt: at(-2, 3), resolvedAt: action.requestStatus === "PENDING" ? null : at(-2, 5) },
      update: { status: action.requestStatus, resolvedAt: action.requestStatus === "PENDING" ? null : at(-2, 5) },
    });
    if (action.approver !== null && action.decision !== null) {
      await client.approvalDecision.upsert({
        where: { id: `decision-${action.id}` },
        create: { id: `decision-${action.id}`, approvalRequestId, approverUserId: action.approver, decision: action.decision, rationale: action.decision === "APPROVED" ? "Evidence and policy checks satisfied" : "Investigation evidence insufficient for requested disposition", decidedAt: at(-2, 5) },
        update: { decision: action.decision },
      });
    }
    if (action.executionStatus !== null) {
      await client.actionExecution.upsert({
        where: { id: `execution-${action.id}` },
        create: { id: `execution-${action.id}`, code: `EX-${action.id.toUpperCase()}`, preparedActionId: action.id, status: action.executionStatus, startedAt: at(-2, 6), completedAt: at(-2, 7), resultType: action.resultType, resultId: action.resultId, errorMessage: action.error },
        update: { status: action.executionStatus, resultType: action.resultType, resultId: action.resultId, errorMessage: action.error },
      });
    }
  }
}

async function seedAuditEvents(client: PrismaClient): Promise<void> {
  const subjects = [
    ["REQUIREMENT_CREATED", "REQUIREMENT", "requirement-icu-001"],
    ["REDISTRIBUTION_CALCULATED", "REQUIREMENT", "requirement-icu-001"],
    ["TRANSFER_PREPARED", "TRANSFER", "transfer-icu-cms"],
    ["TRANSFER_PREPARED", "TRANSFER", "transfer-icu-pha"],
    ["PROCUREMENT_NEED_CREATED", "PROCUREMENT_NEED", "procurement-need-icu-001"],
    ["RFQ_ISSUED", "RFQ", "rfq-icu-001"],
    ["QUOTES_COMPARED", "RFQ", "rfq-icu-001"],
    ["ACTION_PREPARED", "PREPARED_ACTION", "action-po"],
    ["APPROVAL_REQUESTED", "APPROVAL_REQUEST", "approval-action-po"],
    ["APPROVAL_GRANTED", "APPROVAL_REQUEST", "approval-action-po"],
    ["ACTION_EXECUTED", "PREPARED_ACTION", "action-po"],
    ["PURCHASE_ORDER_CREATED", "PURCHASE_ORDER", "po-icu-001"],
    ["RECALL_CONFIRMED", "RECALL_NOTICE", "recall-confirmed-001"],
    ["RECALL_INVESTIGATION_OPENED", "RECALL_NOTICE", "recall-probable-001"],
    ["STOCK_QUARANTINED", "QUARANTINE_ACTION", "qa-recall-central"],
    ["STOCK_QUARANTINED", "QUARANTINE_ACTION", "qa-recall-pharmacy"],
    ["STOCK_QUARANTINED", "QUARANTINE_ACTION", "qa-recall-ward-a"],
    ["GOODS_RECEIVED", "GOODS_RECEIPT", "receipt-001"],
    ["RECEIVING_DISCREPANCY_RECORDED", "GOODS_RECEIPT", "receipt-001"],
    ["ASSET_ALLOCATION_REVIEWED", "ASSET", "asset-031"],
    ["EXECUTION_FAILED", "PREPARED_ACTION", "action-asset"],
    ["LINEN_CYCLE_RECORDED", "INVENTORY_TRANSACTION", "linen-cycle-01"],
    ["GAS_CYLINDER_CYCLE_RECORDED", "INVENTORY_TRANSACTION", "oxygen-cycle-01"],
    ["APPROVAL_PENDING", "PREPARED_ACTION", "action-transfer"],
    ["APPROVAL_REJECTED", "PREPARED_ACTION", "action-quarantine"],
  ] as const;
  const events: Prisma.AuditEventCreateManyInput[] = subjects.map(([eventType, subjectType, subjectId], index) => ({
    id: `audit-${String(index + 1).padStart(3, "0")}`,
    organizationId: ORGANIZATION_ID,
    sequence: index + 1,
    eventType,
    actorType: index % 3 === 0 ? "AGENT" : index % 3 === 1 ? "USER" : "SYSTEM",
    actorId: index % 3 === 1 ? `user-${String((index % 15) + 1).padStart(2, "0")}` : null,
    subjectType,
    subjectId,
    occurredAt: at(-2, index),
    detailsJson: JSON.stringify({ deterministic: true, eventType, subjectId }),
  }));
  const existingEventIds = new Set((await client.auditEvent.findMany({ where: { id: { in: events.map(({ id }) => id) } }, select: { id: true } })).map(({ id }) => id));
  const missingEvents = events.filter(({ id }) => !existingEventIds.has(id));
  if (missingEvents.length > 0) await client.auditEvent.createMany({ data: missingEvents });
}

export async function seedScenarios(
  client: PrismaClient,
  core: CoreSeedResult,
  suppliers: SupplierSeedResult,
): Promise<ScenarioSeedResult> {
  await seedRedistribution(client);
  await seedProcurement(client, suppliers);
  await seedReceiving(client, suppliers);
  await seedRecalls(client);
  await seedAssets(client, core);
  await seedWorkflows(client);
  await seedAuditEvents(client);
  return {
    requirementId: "requirement-icu-001",
    rfqId: "rfq-icu-001",
    receiptId: "receipt-001",
    recallIds: ["recall-confirmed-001", "recall-probable-001"],
  };
}
