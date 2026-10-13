import { Injectable, OnModuleInit } from '@nitrostack/core';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ApprovalStatus, PurchaseRequestRecord, PurchaseStatus, PurchaseUrgency } from './purchase.types.js';
import { DatabaseService } from '../../services/database.service.js';

@Injectable({ deps: [DatabaseService] })
export class PurchaseRequestService implements OnModuleInit {
  private readonly dataDir = resolve(process.env.FACTORYBRAIN_DATA_DIR ?? join(process.cwd(), 'data'));
  private readonly requestPath = resolve(
    process.env.FACTORYBRAIN_PURCHASE_REQUESTS_CSV ?? join(this.dataDir, 'purchase_requests_FIXED.csv'),
  );
  private requests: PurchaseRequestRecord[] = [];

  constructor(private readonly database: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    this.loadRequests();
    this.requests = await this.database.initializePurchaseRequests(this.requests);
  }

  loadRequests(filePath = this.requestPath): PurchaseRequestRecord[] {
    if (!existsSync(filePath)) {
      this.requests = [];
      return [];
    }

    this.requests = parseCsv(readFileSync(filePath, 'utf8')).map(toPurchaseRequest);
    return this.listRequests();
  }

  listRequests(): PurchaseRequestRecord[] {
    return this.database.listPurchaseRequests();
  }

  async createRequest(input: Omit<PurchaseRequestRecord, 'purchaseRequestId'>): Promise<PurchaseRequestRecord> {
    const request = {
      ...input,
      purchaseRequestId: await this.nextRequestId(),
    };
    await this.database.insertPurchaseRequest(request);
    this.requests.push(request);
    return { ...request };
  }

  private async nextRequestId(): Promise<string> {
    const max = this.requests.reduce((highest, request) => {
      const numeric = Number(request.purchaseRequestId.replace(/\D/g, ''));
      return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest;
    }, 0);
    return this.database.nextPurchaseRequestId(max);
  }
}

function toPurchaseRequest(row: Record<string, string>): PurchaseRequestRecord {
  return {
    purchaseRequestId: row.purchaseRequestId,
    requestDate: row.requestDate,
    inventoryId: row.inventoryId,
    partId: row.partId,
    partName: row.partName,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    requestedQuantity: toNumber(row.requestedQuantity),
    unitCostGbp: toNumber(row.unitCost_GBP),
    totalCostGbp: toNumber(row.totalCost_GBP),
    urgencyLevel: normalizeUrgency(row.urgencyLevel),
    requestReason: row.requestReason,
    expectedDeliveryDate: row.expectedDeliveryDate,
    approvalStatus: normalizeApproval(row.approvalStatus),
    purchaseStatus: normalizePurchaseStatus(row.purchaseStatus),
    requestedBy: row.requestedBy,
    approvedBy: row.approvedBy,
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

function normalizeUrgency(value: string): PurchaseUrgency {
  if (value === PurchaseUrgency.Low) return PurchaseUrgency.Low;
  if (value === PurchaseUrgency.High) return PurchaseUrgency.High;
  if (value === PurchaseUrgency.Critical) return PurchaseUrgency.Critical;
  return PurchaseUrgency.Medium;
}

function normalizeApproval(value: string): ApprovalStatus {
  if (value === ApprovalStatus.Approved) return ApprovalStatus.Approved;
  if (value === ApprovalStatus.Rejected) return ApprovalStatus.Rejected;
  return ApprovalStatus.Pending;
}

function normalizePurchaseStatus(value: string): PurchaseStatus {
  if (value === PurchaseStatus.Ordered) return PurchaseStatus.Ordered;
  if (value === PurchaseStatus.Cancelled) return PurchaseStatus.Cancelled;
  return PurchaseStatus.Requested;
}

function toNumber(value: string | undefined): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}
