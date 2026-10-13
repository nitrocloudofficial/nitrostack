import { Injectable } from '@nitrostack/core';
import type { PurchaseOrder, GoodsReceipt } from '../../shared/schemas.js';

/**
 * ErpAdapter interface
 * 
 * Defines the contract for fetching master data from an external system.
 * This can be implemented by specific adapters (e.g., SAP, NetSuite, or SQLite for dev).
 */
@Injectable()
export class ErpAdapter {
  async onModuleInit(): Promise<void> { throw new Error('Not implemented'); }
  async findPO(poNumber: string): Promise<PurchaseOrder | null> { throw new Error('Not implemented'); }
  async findBySku(sku: string): Promise<PurchaseOrder | null> { throw new Error('Not implemented'); }
  async getAllPOs(): Promise<PurchaseOrder[]> { throw new Error('Not implemented'); }
  async findGoodsReceipt(poNumber: string, sku: string): Promise<GoodsReceipt | null> { throw new Error('Not implemented'); }
  async findFxRate(currencyPair: string): Promise<number | null> { throw new Error('Not implemented'); }
  async getApprovalThresholds(): Promise<{ min_amount: number; max_amount: number | null; required_approver_role: string }[]> { throw new Error('Not implemented'); }
  async checkDeniedParty(entityName: string): Promise<Array<{ entity_name: string; reason: string }>> { throw new Error('Not implemented'); }
  async recommendHsCode(query: string): Promise<{ hs_code: string; description: string }[]> { throw new Error('Not implemented'); }
}
