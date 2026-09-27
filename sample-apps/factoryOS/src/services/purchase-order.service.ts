import { Injectable } from '@nitrostack/core';
import { DbService } from './db.service.js';

@Injectable({ deps: [DbService] })
export class PurchaseOrderService {
  constructor(private db: DbService) {}

  async createPurchaseOrder(supplierId: string, partNumber: string, quantity: number, agreedPrice: number) {
    const supplier = await this.db.get<any>(
      `SELECT name, delivery_time_hrs FROM suppliers WHERE id = ?`,
      [supplierId]
    );

    const supplierName = supplier ? supplier.name : 'Unknown Supplier';
    const etaHours = supplier ? supplier.delivery_time_hrs : 24;

    const poNumber = `PO-${5000 + Math.floor(Math.random() * 1000)}`;
    const totalAmount = Number((quantity * agreedPrice).toFixed(2));
    const status = 'ISSUED';
    const createdAt = new Date().toISOString();

    await this.db.run(
      `INSERT INTO purchase_orders 
       (po_number, supplier_id, part_number, quantity, agreed_price, total_amount, status, eta_hours, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [poNumber, supplierId, partNumber, quantity, agreedPrice, totalAmount, status, etaHours, createdAt]
    );

    // Also update inventory so that the replenishment quantity reflects in DB (either in a "pending/reserved" state or we can increase on_hand if simulated)
    // For now, let's keep it as is, or we can update a metadata field.

    return {
      poNumber,
      supplierId,
      supplierName,
      partNumber,
      quantity,
      agreedPrice,
      totalAmount,
      currency: 'USD',
      status,
      etaHours,
      createdAt
    };
  }
}
