import { Injectable, OnModuleInit } from '@nitrostack/core';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Supplier, SupplierStatus } from './purchase.types.js';

@Injectable()
export class SupplierService implements OnModuleInit {
  private readonly dataDir = resolve(process.env.FACTORYBRAIN_DATA_DIR ?? join(process.cwd(), 'data'));
  private readonly supplierPath = resolve(
    process.env.FACTORYBRAIN_SUPPLIERS_CSV ?? join(this.dataDir, 'suppliers_FIXED.csv'),
  );
  private suppliers: Supplier[] = [];

  async onModuleInit(): Promise<void> {
    this.loadSuppliers();
  }

  loadSuppliers(filePath = this.supplierPath): Supplier[] {
    if (!existsSync(filePath)) {
      throw new Error(`Suppliers CSV not found at ${filePath}`);
    }

    this.suppliers = parseCsv(readFileSync(filePath, 'utf8')).map(toSupplier);
    return this.listSuppliers();
  }

  listSuppliers(): Supplier[] {
    return this.suppliers.map(cloneSupplier);
  }

  findSuppliersForPart(partName: string): Supplier[] {
    const normalizedPart = normalize(partName);
    return this.suppliers
      .filter((supplier) => supplier.supplierStatus !== 'Inactive')
      .filter((supplier) => supplier.suppliedParts.some((part) => normalize(part) === normalizedPart))
      .map(cloneSupplier);
  }
}

function toSupplier(row: Record<string, string>): Supplier {
  return {
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    supplierCategory: row.supplierCategory,
    contactPerson: row.contactPerson,
    email: row.email,
    phoneNumber: row.phoneNumber,
    city: row.city,
    country: row.country,
    suppliedParts: row.suppliedParts.split(';').map((part) => part.trim()).filter(Boolean),
    averageLeadTimeDays: toNumber(row.averageLeadTimeDays),
    minimumOrderQuantity: toNumber(row.minimumOrderQuantity),
    supplierRating: toNumber(row.supplierRating),
    onTimeDeliveryRate: toPercent(row.onTimeDeliveryRate),
    paymentTerms: row.paymentTerms,
    supplierStatus: normalizeStatus(row.supplierStatus),
    lastOrderDate: row.lastOrderDate,
  };
}

function parseCsv(source: string): Record<string, string>[] {
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  const [headerLine, ...dataLines] = lines;
  if (!headerLine) return [];
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

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeStatus(value: string): SupplierStatus {
  if (value === SupplierStatus.Preferred) return SupplierStatus.Preferred;
  if (value === SupplierStatus.Inactive) return SupplierStatus.Inactive;
  return SupplierStatus.Active;
}

function toNumber(value: string | undefined): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toPercent(value: string | undefined): number {
  return toNumber(value?.replace('%', '')) / 100;
}

function cloneSupplier(supplier: Supplier): Supplier {
  return {
    ...supplier,
    suppliedParts: [...supplier.suppliedParts],
  };
}
