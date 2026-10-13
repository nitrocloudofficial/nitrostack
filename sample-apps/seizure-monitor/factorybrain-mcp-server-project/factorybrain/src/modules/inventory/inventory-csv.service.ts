import { Injectable, OnModuleInit } from '@nitrostack/core';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { InventoryItem, InventoryStatus, Reservation } from './inventory.types.js';
import { DatabaseService } from '../../services/database.service.js';

@Injectable({ deps: [DatabaseService] })
export class InventoryCsvService implements OnModuleInit {
  private readonly dataDir = resolve(process.env.FACTORYBRAIN_DATA_DIR ?? join(process.cwd(), 'data'));
  private readonly inventoryPath = resolve(
    process.env.FACTORYBRAIN_INVENTORY_CSV ?? join(this.dataDir, 'inventory_FIXED.csv'),
  );
  private readonly items = new Map<string, InventoryItem>();
  private readonly reservations: Reservation[] = [];

  constructor(private readonly database: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    this.loadInventory();
    const durableState = await this.database.initializeInventory(this.listItems());
    this.items.clear();
    for (const item of durableState.items) this.items.set(item.partId, item);
    this.reservations.splice(0, this.reservations.length, ...durableState.reservations);
  }

  loadInventory(filePath = this.inventoryPath): InventoryItem[] {
    if (!existsSync(filePath)) {
      throw new Error(`Inventory CSV not found at ${filePath}`);
    }

    this.items.clear();
    for (const row of parseCsv(readFileSync(filePath, 'utf8'))) {
      const item = toInventoryItem(row);
      this.items.set(item.partId, item);
    }

    return this.listItems();
  }

  listItems(): InventoryItem[] {
    return [...this.items.values()].map(cloneItem);
  }

  findItem(partIdOrName: string): InventoryItem | undefined {
    const normalizedInput = normalize(partIdOrName);
    const direct = this.items.get(partIdOrName);
    if (direct) {
      return cloneItem(direct);
    }

    const match = [...this.items.values()].find(
      (item) => normalize(item.partId) === normalizedInput || normalize(item.partName) === normalizedInput,
    );
    return match ? cloneItem(match) : undefined;
  }

  async reserve(partId: string, reservation: Omit<Reservation, 'partId' | 'partName' | 'status' | 'createdAt'>): Promise<Reservation> {
    const item = this.items.get(partId);
    if (!item) {
      throw new Error(`Cannot reserve unknown inventory part: ${partId}`);
    }
    if (item.availableQuantity < reservation.quantity) {
      throw new Error(`Insufficient stock for ${item.partName}: requested ${reservation.quantity}, available ${item.availableQuantity}`);
    }

    const savedReservation: Reservation = {
      ...reservation,
      partId: item.partId,
      partName: item.partName,
      status: 'Reserved',
      createdAt: new Date().toISOString(),
    };

    if (this.database.hasDurableStore()) {
      const updated = await this.database.reserveInventoryAtomically(partId, reservation.quantity, savedReservation);
      this.items.set(partId, updated);
    } else {
      item.reservedQuantity += reservation.quantity;
      item.availableQuantity = Math.max(0, item.quantityAvailable - item.reservedQuantity);
      item.inventoryStatus = this.statusFor(item);
      item.lastUpdated = savedReservation.createdAt;
    }
    this.reservations.push(savedReservation);
    return savedReservation;
  }

  async markPendingPurchase(partId: string, reservation: Omit<Reservation, 'partId' | 'partName' | 'status' | 'createdAt'>): Promise<Reservation | undefined> {
    const item = this.items.get(partId);
    if (!item) {
      return undefined;
    }

    item.inventoryStatus = item.availableQuantity === 0 ? 'Out of Stock' : 'Low Stock';
    item.lastUpdated = new Date().toISOString();

    const pending: Reservation = {
      ...reservation,
      partId: item.partId,
      partName: item.partName,
      status: 'Pending Purchase',
      createdAt: item.lastUpdated,
    };
    await this.database.savePendingReservation(item, pending);
    this.reservations.push(pending);
    return pending;
  }

  listReservations(ticketId?: string): Reservation[] {
    const rows = ticketId
      ? this.reservations.filter((reservation) => reservation.ticketId === ticketId)
      : this.reservations;
    return rows.map((reservation) => ({ ...reservation }));
  }

  saveInventory(filePath = this.inventoryPath): void {
    const headers = [
      'inventoryId',
      'partId',
      'partName',
      'category',
      'compatibleMachineType',
      'compatibleMachineIds',
      'supplierId',
      'quantityAvailable',
      'reorderLevel',
      'unitCost_GBP',
      'warehouseLocation',
      'leadTimeDays',
      'lastRestocked',
      'inventoryStatus',
      'reservedQuantity',
      'availableQuantity',
      'expiryDate',
      'lastUpdated',
    ];
    const rows = this.listItems().map((item) => [
      item.inventoryId,
      item.partId,
      item.partName,
      item.category,
      item.compatibleMachineType,
      item.compatibleMachineIds.join(','),
      item.supplierId,
      item.quantityAvailable,
      item.reorderLevel,
      item.unitCostGbp,
      item.warehouseLocation,
      item.leadTimeDays,
      item.lastRestocked,
      item.inventoryStatus,
      item.reservedQuantity,
      item.availableQuantity,
      item.expiryDate ?? '',
      item.lastUpdated,
    ]);

    writeFileSync(filePath, [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n'));
  }

  private statusFor(item: InventoryItem): InventoryStatus {
    if (item.availableQuantity <= 0) {
      return 'Out of Stock';
    }
    if (item.availableQuantity <= item.reorderLevel) {
      return 'Low Stock';
    }
    return item.reservedQuantity > 0 ? 'Reserved' : 'Available';
  }
}

function toInventoryItem(row: Record<string, string>): InventoryItem {
  return {
    inventoryId: row.inventoryId,
    partId: row.partId,
    partName: row.partName,
    category: row.category,
    compatibleMachineType: row.compatibleMachineType,
    compatibleMachineIds: splitList(row.compatibleMachineIds),
    supplierId: row.supplierId,
    quantityAvailable: toNumber(row.quantityAvailable),
    reorderLevel: toNumber(row.reorderLevel),
    unitCostGbp: toNumber(row.unitCost_GBP),
    warehouseLocation: row.warehouseLocation,
    leadTimeDays: toNumber(row.leadTimeDays),
    lastRestocked: row.lastRestocked,
    inventoryStatus: normalizeStatus(row.inventoryStatus),
    reservedQuantity: toNumber(row.reservedQuantity),
    availableQuantity: toNumber(row.availableQuantity),
    expiryDate: row.expiryDate || undefined,
    lastUpdated: row.lastUpdated,
  };
}

function parseCsv(source: string): Record<string, string>[] {
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  const [headerLine, ...dataLines] = lines;
  if (!headerLine) {
    return [];
  }

  const headers = splitCsvLine(headerLine);
  return dataLines.map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function splitList(value: string): string[] {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeStatus(value: string): InventoryStatus {
  if (value === 'Available' || value === 'Low Stock' || value === 'Out of Stock' || value === 'Reserved' || value === 'Pending Purchase') {
    return value;
  }
  return 'Available';
}

function toNumber(value: string | number | undefined): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function cloneItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    compatibleMachineIds: [...item.compatibleMachineIds],
  };
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
