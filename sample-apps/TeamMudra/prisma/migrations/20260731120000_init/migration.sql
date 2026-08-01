-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationType" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "Location_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "approvalLimitPaise" INTEGER NOT NULL,
    CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "locationId" TEXT,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "UserAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "ItemCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "baseUnit" TEXT NOT NULL,
    "trackingMode" TEXT NOT NULL,
    "storageRequirement" TEXT NOT NULL,
    "coldChainMinCentiCelsius" INTEGER,
    "coldChainMaxCentiCelsius" INTEGER,
    "shelfLifeDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "CatalogItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CatalogItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ItemCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocationItemPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "parLevelBaseUnits" INTEGER NOT NULL,
    "safetyStockBaseUnits" INTEGER NOT NULL,
    "reorderThresholdBaseUnits" INTEGER NOT NULL,
    "transferEligible" BOOLEAN NOT NULL,
    "minimumRemainingShelfLifeDays" INTEGER NOT NULL,
    CONSTRAINT "LocationItemPolicy_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LocationItemPolicy_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxIdentifier" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "complianceStatus" TEXT NOT NULL,
    "performanceScoreBasisPoints" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "portalTokenHash" TEXT,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SupplierContact_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "supplierSku" TEXT NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "gstBasisPoints" INTEGER NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "minimumOrderBaseUnits" INTEGER NOT NULL,
    "availableBaseUnits" INTEGER NOT NULL,
    "compliant" BOOLEAN NOT NULL,
    CONSTRAINT "SupplierItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "manufacturerName" TEXT NOT NULL,
    "manufacturedAt" DATETIME,
    "expiresAt" DATETIME,
    "serialNumber" TEXT,
    "coldChainEvidenceStatus" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL,
    CONSTRAINT "StockBatch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdByType" TEXT NOT NULL,
    "createdById" TEXT,
    "metadataJson" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "InventoryLedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "batchId" TEXT,
    "stockStatus" TEXT NOT NULL,
    "ownership" TEXT NOT NULL,
    "reservationKey" TEXT NOT NULL,
    "positionKey" TEXT NOT NULL,
    "quantityBaseUnits" INTEGER NOT NULL,
    "unitCostPaise" INTEGER,
    "occurredAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryLedgerEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "InventoryTransaction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryLedgerEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryLedgerEntry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryLedgerEntry_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "positionKey" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "batchId" TEXT,
    "stockStatus" TEXT NOT NULL,
    "ownership" TEXT NOT NULL,
    "reservationKey" TEXT NOT NULL,
    "quantityBaseUnits" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockPosition_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockPosition_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockPosition_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "requiredBaseUnits" INTEGER NOT NULL,
    "fulfilledLocallyBaseUnits" INTEGER NOT NULL,
    "fulfilledByTransferBaseUnits" INTEGER NOT NULL,
    "procurementGapBaseUnits" INTEGER NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "neededBy" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "Requirement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Requirement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Requirement_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "requirementId" TEXT,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "batchId" TEXT,
    "quantityBaseUnits" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reservedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME,
    CONSTRAINT "Reservation_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "sourceLocationId" TEXT NOT NULL,
    "destinationLocationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL,
    "dispatchedAt" DATETIME,
    "receivedAt" DATETIME,
    CONSTRAINT "Transfer_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transfer_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransferLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferId" TEXT NOT NULL,
    "requirementId" TEXT,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT,
    "quantityBaseUnits" INTEGER NOT NULL,
    CONSTRAINT "TransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransferLine_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransferLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcurementNeed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "quantityBaseUnits" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "ProcurementNeed_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rfq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL,
    "closesAt" DATETIME NOT NULL,
    "notes" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RfqLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rfqId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "procurementNeedId" TEXT NOT NULL,
    "requestedBaseUnits" INTEGER NOT NULL,
    CONSTRAINT "RfqLine_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RfqLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RfqLine_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RfqLine_procurementNeedId_fkey" FOREIGN KEY ("procurementNeedId") REFERENCES "ProcurementNeed" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL,
    "validUntil" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "complianceStatus" TEXT NOT NULL,
    "performanceScoreBasisPoints" INTEGER NOT NULL,
    "totalPaise" INTEGER NOT NULL,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "comparisonRank" INTEGER NOT NULL,
    "tradeoffSummary" TEXT NOT NULL,
    CONSTRAINT "Quote_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quote_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuoteLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "rfqLineId" TEXT NOT NULL,
    "offeredBaseUnits" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "gstBasisPoints" INTEGER NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "availableBaseUnits" INTEGER NOT NULL,
    "compliant" BOOLEAN NOT NULL,
    "lineTotalPaise" INTEGER NOT NULL,
    CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuoteLine_rfqLineId_fkey" FOREIGN KEY ("rfqLineId") REFERENCES "RfqLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "quoteId" TEXT,
    "status" TEXT NOT NULL,
    "orderedAt" DATETIME NOT NULL,
    "expectedAt" DATETIME NOT NULL,
    "subtotalPaise" INTEGER NOT NULL,
    "gstPaise" INTEGER NOT NULL,
    "totalPaise" INTEGER NOT NULL,
    CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "orderedBaseUnits" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "gstBasisPoints" INTEGER NOT NULL,
    "lineSubtotalPaise" INTEGER NOT NULL,
    CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrderLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL,
    "deliveryNote" TEXT NOT NULL,
    CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoodsReceiptLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goodsReceiptId" TEXT NOT NULL,
    "purchaseOrderLineId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "orderedBaseUnits" INTEGER NOT NULL,
    "receivedBaseUnits" INTEGER NOT NULL,
    "acceptedBaseUnits" INTEGER NOT NULL,
    "rejectedBaseUnits" INTEGER NOT NULL,
    CONSTRAINT "GoodsReceiptLine_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GoodsReceiptLine_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "PurchaseOrderLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GoodsReceiptLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReceivingDiscrepancy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "goodsReceiptId" TEXT NOT NULL,
    "goodsReceiptLineId" TEXT NOT NULL,
    "discrepancyType" TEXT NOT NULL,
    "quantityBaseUnits" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "ReceivingDiscrepancy_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReceivingDiscrepancy_goodsReceiptLineId_fkey" FOREIGN KEY ("goodsReceiptLineId") REFERENCES "GoodsReceiptLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecallNotice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL,
    "investigationNotes" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RecallBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recallNoticeId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "affected" BOOLEAN NOT NULL,
    "priorIssuedBaseUnits" INTEGER NOT NULL,
    CONSTRAINT "RecallBatch_recallNoticeId_fkey" FOREIGN KEY ("recallNoticeId") REFERENCES "RecallNotice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecallBatch_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuarantineAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "recallNoticeId" TEXT,
    "batchId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantityBaseUnits" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "quarantinedAt" DATETIME NOT NULL,
    CONSTRAINT "QuarantineAction_recallNoticeId_fkey" FOREIGN KEY ("recallNoticeId") REFERENCES "RecallNotice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuarantineAction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuarantineAction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuarantineRelease" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quarantineActionId" TEXT NOT NULL,
    "disposition" TEXT NOT NULL,
    "quantityBaseUnits" INTEGER NOT NULL,
    "decidedAt" DATETIME NOT NULL,
    "notes" TEXT NOT NULL,
    CONSTRAINT "QuarantineRelease_quarantineActionId_fkey" FOREIGN KEY ("quarantineActionId") REFERENCES "QuarantineAction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "itemId" TEXT,
    "locationId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "manufacturerName" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "commissionedAt" DATETIME NOT NULL,
    "nextMaintenanceAt" DATETIME,
    CONSTRAINT "Asset_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "allocatedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "allocatedAt" DATETIME NOT NULL,
    "returnedAt" DATETIME,
    "purpose" TEXT NOT NULL,
    CONSTRAINT "AssetAllocation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssetAllocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssetAllocation_allocatedByUserId_fkey" FOREIGN KEY ("allocatedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "notes" TEXT NOT NULL,
    CONSTRAINT "MaintenanceRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "minimumAmountPaise" INTEGER NOT NULL,
    "maximumAmountPaise" INTEGER,
    "requiredRoleCode" TEXT NOT NULL,
    "requiredApprovals" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "workflowType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "correlationId" TEXT NOT NULL,
    CONSTRAINT "WorkflowRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PreparedAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "requesterType" TEXT NOT NULL,
    "requesterId" TEXT,
    "status" TEXT NOT NULL,
    "amountPaise" INTEGER,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "evidenceJson" TEXT NOT NULL,
    "reasoningSummary" TEXT NOT NULL,
    "preparedAt" DATETIME NOT NULL,
    CONSTRAINT "PreparedAction_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "preparedActionId" TEXT NOT NULL,
    "approvalPolicyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    CONSTRAINT "ApprovalRequest_preparedActionId_fkey" FOREIGN KEY ("preparedActionId") REFERENCES "PreparedAction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRequest_approvalPolicyId_fkey" FOREIGN KEY ("approvalPolicyId") REFERENCES "ApprovalPolicy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "approvalRequestId" TEXT NOT NULL,
    "approverUserId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "decidedAt" DATETIME NOT NULL,
    CONSTRAINT "ApprovalDecision_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalDecision_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActionExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "preparedActionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "resultType" TEXT,
    "resultId" TEXT,
    "errorMessage" TEXT,
    CONSTRAINT "ActionExecution_preparedActionId_fkey" FOREIGN KEY ("preparedActionId") REFERENCES "PreparedAction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "detailsJson" TEXT NOT NULL,
    CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Location_code_key" ON "Location"("code");

-- CreateIndex
CREATE INDEX "Location_organizationId_idx" ON "Location"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeCode_key" ON "User"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserAssignment_userId_roleId_locationId_key" ON "UserAssignment"("userId", "roleId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCategory_code_key" ON "ItemCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_sku_key" ON "CatalogItem"("sku");

-- CreateIndex
CREATE INDEX "CatalogItem_categoryId_idx" ON "CatalogItem"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationItemPolicy_locationId_itemId_key" ON "LocationItemPolicy"("locationId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_taxIdentifier_key" ON "Supplier"("taxIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierContact_portalTokenHash_key" ON "SupplierContact"("portalTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierContact_supplierId_email_key" ON "SupplierContact"("supplierId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierItem_supplierId_itemId_key" ON "SupplierItem"("supplierId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "StockBatch_serialNumber_key" ON "StockBatch"("serialNumber");

-- CreateIndex
CREATE INDEX "StockBatch_itemId_expiresAt_idx" ON "StockBatch"("itemId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockBatch_itemId_batchNumber_key" ON "StockBatch"("itemId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_code_key" ON "InventoryTransaction"("code");

-- CreateIndex
CREATE INDEX "InventoryTransaction_referenceType_referenceId_idx" ON "InventoryTransaction"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "InventoryLedgerEntry_positionKey_idx" ON "InventoryLedgerEntry"("positionKey");

-- CreateIndex
CREATE INDEX "InventoryLedgerEntry_itemId_locationId_stockStatus_idx" ON "InventoryLedgerEntry"("itemId", "locationId", "stockStatus");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLedgerEntry_transactionId_sequence_key" ON "InventoryLedgerEntry"("transactionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "StockPosition_positionKey_key" ON "StockPosition"("positionKey");

-- CreateIndex
CREATE INDEX "StockPosition_itemId_locationId_stockStatus_idx" ON "StockPosition"("itemId", "locationId", "stockStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Requirement_code_key" ON "Requirement"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_code_key" ON "Reservation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_code_key" ON "Transfer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementNeed_code_key" ON "ProcurementNeed"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Rfq_code_key" ON "Rfq"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RfqLine_rfqId_lineNumber_key" ON "RfqLine"("rfqId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_code_key" ON "Quote"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_rfqId_supplierId_key" ON "Quote"("rfqId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteLine_quoteId_rfqLineId_key" ON "QuoteLine"("quoteId", "rfqLineId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_code_key" ON "PurchaseOrder"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderLine_purchaseOrderId_lineNumber_key" ON "PurchaseOrderLine"("purchaseOrderId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_code_key" ON "GoodsReceipt"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivingDiscrepancy_code_key" ON "ReceivingDiscrepancy"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RecallNotice_code_key" ON "RecallNotice"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RecallBatch_recallNoticeId_batchId_key" ON "RecallBatch"("recallNoticeId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "QuarantineAction_code_key" ON "QuarantineAction"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_code_key" ON "Asset"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_serialNumber_key" ON "Asset"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalPolicy_code_key" ON "ApprovalPolicy"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowRun_code_key" ON "WorkflowRun"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowRun_correlationId_key" ON "WorkflowRun"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "PreparedAction_code_key" ON "PreparedAction"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_code_key" ON "ApprovalRequest"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalDecision_approvalRequestId_approverUserId_key" ON "ApprovalDecision"("approvalRequestId", "approverUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionExecution_code_key" ON "ActionExecution"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_sequence_key" ON "AuditEvent"("sequence");

-- CreateIndex
CREATE INDEX "AuditEvent_subjectType_subjectId_idx" ON "AuditEvent"("subjectType", "subjectId");
