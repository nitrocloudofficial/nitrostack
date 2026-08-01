export interface CoreSeedResult {
  organizationId: string;
  locationIds: readonly string[];
  roleIds: readonly string[];
  userIds: readonly string[];
}

export interface CatalogSeedResult {
  itemIds: readonly string[];
  categoryIds: readonly string[];
}

export interface SupplierSeedResult {
  supplierIds: readonly string[];
}

export interface InventorySeedResult {
  batchIds: readonly string[];
  ledgerEntryCount: number;
}

export interface ScenarioSeedResult {
  requirementId: string;
  rfqId: string;
  receiptId: string;
  recallIds: readonly string[];
}
