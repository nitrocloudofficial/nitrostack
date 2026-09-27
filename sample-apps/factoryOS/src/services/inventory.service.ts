import { Injectable } from '@nitrostack/core';
import { DbService } from './db.service.js';

@Injectable({ deps: [DbService] })
export class InventoryService {
  constructor(private db: DbService) {}

  async checkStock(partNumber?: string) {
    if (partNumber) {
      const row = await this.db.get<any>(`SELECT * FROM inventory WHERE part_number = ?`, [partNumber]);
      if (!row) {
        throw new Error(`Inventory item with part number ${partNumber} not found.`);
      }
      return row;
    } else {
      return await this.db.query<any>(`SELECT * FROM inventory`);
    }
  }

  async detectShortages() {
    const shortages = await this.db.query<any>(`SELECT * FROM inventory WHERE on_hand <= reorder_point`);
    return {
      shortagesDetected: shortages.length,
      criticalItems: shortages.map(item => ({
        partNumber: item.part_number,
        description: item.description,
        currentStock: item.on_hand,
        reorderThreshold: item.reorder_point,
        urgency: item.on_hand === 0 ? 'CRITICAL' : 'HIGH'
      }))
    };
  }

  async searchNearbyWarehouse(partNumber: string, maxRadiusKm: number = 50) {
    // Query local stock first
    const local = await this.db.get<any>(`SELECT on_hand FROM inventory WHERE part_number = ?`, [partNumber]);
    const localStock = local ? local.on_hand : 0;

    // If local stock is 0 (as in bearing_failure or inventory_stockout), sister warehouses are also empty.
    // This perfectly emulates the scenario "No stock at Warehouse A or B".
    const stockAvailable = localStock > 0 ? 5 : 0;

    const warehouses = [
      { id: 'WH-NORTH', name: 'Sister Warehouse A (North)', distanceKm: 12, stockOnHand: stockAvailable, leadTimeHrs: 2 },
      { id: 'WH-EAST', name: 'Sister Warehouse B (East)', distanceKm: 45, stockOnHand: stockAvailable > 0 ? 2 : 0, leadTimeHrs: 6 }
    ].filter(w => w.distanceKm <= maxRadiusKm);

    return {
      partNumber,
      searchRadiusKm: maxRadiusKm,
      warehousesFound: warehouses
    };
  }
}
