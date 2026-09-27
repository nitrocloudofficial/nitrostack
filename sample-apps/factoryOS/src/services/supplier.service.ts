import { Injectable } from '@nitrostack/core';
import { DbService } from './db.service.js';

@Injectable({ deps: [DbService] })
export class SupplierService {
  constructor(private db: DbService) {}

  async findSuppliers(partNumber: string) {
    const rows = await this.db.query<any>(
      `SELECT * FROM suppliers WHERE part_number = ? ORDER BY price ASC`,
      [partNumber]
    );
    return {
      partNumber,
      suppliers: rows.map(r => ({
        supplierId: r.id,
        name: r.name,
        rating: r.rating,
        leadTimeHours: r.delivery_time_hrs,
        unitPrice: r.price
      }))
    };
  }

  async negotiatePurchase(supplierId: string, partNumber: string, targetPrice: number, quantity: number) {
    const supplier = await this.db.get<any>(
      `SELECT * FROM suppliers WHERE id = ? AND part_number = ?`,
      [supplierId, partNumber]
    );

    if (!supplier) {
      throw new Error(`Supplier ${supplierId} does not supply part ${partNumber}`);
    }

    const basePrice = supplier.price;
    const leadTime = supplier.delivery_time_hrs;

    let accepted = false;
    let offeredPrice = basePrice;
    let message = '';

    // Simple negotiation rules
    if (targetPrice >= basePrice) {
      accepted = true;
      offeredPrice = targetPrice;
      message = 'Target price accepted immediately.';
    } else if (targetPrice >= basePrice * 0.90) {
      accepted = true;
      // Offer a slight discount but not as low as target
      offeredPrice = Number((basePrice - (basePrice - targetPrice) * 0.5).toFixed(2));
      message = 'Supplier counter-offered with a volume discount.';
    } else {
      accepted = false;
      offeredPrice = Number((basePrice * 0.98).toFixed(2));
      message = 'Target price too low. Supplier rejected target but offered minimum margin price.';
    }

    return {
      negotiationId: `NEG-${Date.now()}`,
      supplierId,
      supplierName: supplier.name,
      partNumber,
      requestedQuantity: quantity,
      targetUnitPrice: targetPrice,
      offeredUnitPrice: offeredPrice,
      accepted,
      agreedLeadTimeHours: leadTime,
      status: accepted ? 'AGREED' : 'COUNTER_OFFER',
      message
    };
  }
}
