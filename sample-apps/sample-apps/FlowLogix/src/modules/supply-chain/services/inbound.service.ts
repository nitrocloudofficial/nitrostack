import { Injectable } from '@nitrostack/core';

// ─────────────────────────────────────────────
// Mock Data Store (replaces real DB / OCR API)
// ─────────────────────────────────────────────

interface PurchaseOrder {
  poId: string;
  sku: string;
  itemName: string;
  orderedQty: number;
  customerOrderId: string;
  customerName: string;
  slaDeliveryDays: number; // days until SLA breach
  unitCostUsd: number;
}

interface CustomerOrder {
  customerOrderId: string;
  customerName: string;
  requiredQty: number;
  slaDeadlineDate: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface QcRecord {
  itemId: string;
  supplierId: string;
  supplierReliabilityScore: number; // 0.0 – 1.0
}

const MOCK_PO_DB: PurchaseOrder[] = [
  {
    poId: 'PO-2024-001',
    sku: 'SKU-BRAKE-PAD-X1',
    itemName: 'Brake Pad Assembly X1',
    orderedQty: 200,
    customerOrderId: 'CO-TATA-007',
    customerName: 'Tata Motors',
    slaDeliveryDays: 2,
    unitCostUsd: 45.0,
  },
  {
    poId: 'PO-2024-002',
    sku: 'SKU-ENGINE-GASKET-V2',
    itemName: 'Engine Gasket V2',
    orderedQty: 500,
    customerOrderId: 'CO-MARUTI-003',
    customerName: 'Maruti Suzuki',
    slaDeliveryDays: 5,
    unitCostUsd: 12.5,
  },
  {
    poId: 'PO-2024-003',
    sku: 'SKU-ALTERNATOR-A3',
    itemName: 'Alternator Unit A3',
    orderedQty: 80,
    customerOrderId: 'CO-TATA-008',
    customerName: 'Tata Motors',
    slaDeliveryDays: 1,
    unitCostUsd: 220.0,
  },
];

const MOCK_CUSTOMER_ORDERS: CustomerOrder[] = [
  {
    customerOrderId: 'CO-TATA-007',
    customerName: 'Tata Motors',
    requiredQty: 180,
    slaDeadlineDate: '2024-08-02',
    priority: 'HIGH',
  },
  {
    customerOrderId: 'CO-MARUTI-003',
    customerName: 'Maruti Suzuki',
    requiredQty: 450,
    slaDeadlineDate: '2024-08-05',
    priority: 'MEDIUM',
  },
  {
    customerOrderId: 'CO-TATA-008',
    customerName: 'Tata Motors',
    requiredQty: 75,
    slaDeadlineDate: '2024-08-01',
    priority: 'HIGH',
  },
];

const MOCK_QC_RECORDS: QcRecord[] = [
  { itemId: 'SKU-BRAKE-PAD-X1', supplierId: 'SUPP-APEX-001', supplierReliabilityScore: 0.92 },
  { itemId: 'SKU-ENGINE-GASKET-V2', supplierId: 'SUPP-DELTA-002', supplierReliabilityScore: 0.78 },
  { itemId: 'SKU-ALTERNATOR-A3', supplierId: 'SUPP-NOVA-003', supplierReliabilityScore: 0.85 },
];

// In-memory mutable store for QC scores
const qcScoreStore: Map<string, number> = new Map(
  MOCK_QC_RECORDS.map((r) => [r.itemId, r.supplierReliabilityScore])
);

// ─────────────────────────────────────────────
// OCR Result Interface
// ─────────────────────────────────────────────

export interface OcrExtractionResult {
  poId: string;
  sku: string;
  itemName: string;
  damagedQty: number;
  totalQty: number;
  damagePercentage: number;
  imageProcessedAt: string;
  confidence: number; // 0.0 – 1.0 mock OCR confidence
}

// ─────────────────────────────────────────────
// ATP Result Interface
// ─────────────────────────────────────────────

export interface AtpCheckResult {
  poId: string;
  customerOrderId: string;
  customerName: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  orderedQty: number;
  damagedQty: number;
  survivingQty: number;
  requiredQty: number;
  shortfallQty: number;
  slaDeliveryDays: number;
  slaBreached: boolean;
  riskLevel: 'RED' | 'AMBER' | 'GREEN';
  recommendedAction: string;
  financialExposureUsd: number;
}

// ─────────────────────────────────────────────
// QC / RMA Interfaces
// ─────────────────────────────────────────────

export interface QcFailureRecord {
  itemId: string;
  defectType: string;
  affectedQty: number;
  previousScore: number;
  newScore: number;
  penaltyApplied: number;
  loggedAt: string;
  supplierId: string;
}

export interface RmaDocument {
  rmaId: string;
  poId: string;
  itemId: string;
  qty: number;
  reason: string;
  returnInstruction: string;
  createdAt: string;
  status: 'PENDING_DISPATCH' | 'DISPATCHED' | 'RECEIVED';
  estimatedCreditUsd: number;
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

@Injectable()
export class InboundService {
  /**
   * UC1: Mock OCR extraction from a delivery photo (base64).
   * Deterministically returns damage data keyed on a mock PO database.
   */
  extractOcrData(base64Image: string, forceDamagedQty?: number): OcrExtractionResult {
    // In production: call a vision API. Here we mock based on the first PO.
    const po = MOCK_PO_DB[0]; // Default: PO-2024-001 (Tata Motors, Brake Pads)
    const damagedQty = forceDamagedQty ?? 50;

    return {
      poId: po.poId,
      sku: po.sku,
      itemName: po.itemName,
      damagedQty,
      totalQty: po.orderedQty,
      damagePercentage: Math.round((damagedQty / po.orderedQty) * 100 * 10) / 10,
      imageProcessedAt: new Date().toISOString(),
      confidence: 0.94,
    };
  }

  /**
   * UC1: Available-to-Promise (ATP) math.
   * Formula: survivingQty = orderedQty - damagedQty
   *          shortfall    = max(0, requiredQty - survivingQty)
   *          slaBreached  = shortfall > 0 AND slaDeliveryDays <= 2
   */
  calculateATP(poId: string, damagedQty: number): AtpCheckResult {
    const po = MOCK_PO_DB.find((p) => p.poId === poId);
    if (!po) {
      throw new Error(`PO not found: ${poId}`);
    }

    const co = MOCK_CUSTOMER_ORDERS.find((c) => c.customerOrderId === po.customerOrderId);
    if (!co) {
      throw new Error(`Customer order not found for PO: ${poId}`);
    }

    const survivingQty = po.orderedQty - damagedQty;
    const shortfallQty = Math.max(0, co.requiredQty - survivingQty);
    const slaBreached = shortfallQty > 0 && po.slaDeliveryDays <= 2;

    let riskLevel: 'RED' | 'AMBER' | 'GREEN';
    let recommendedAction: string;

    if (slaBreached) {
      riskLevel = 'RED';
      recommendedAction = `CRITICAL: ${shortfallQty} units short. Raise emergency PO immediately — SLA breach in ${po.slaDeliveryDays} day(s).`;
    } else if (shortfallQty > 0) {
      riskLevel = 'AMBER';
      recommendedAction = `WARNING: ${shortfallQty} units short but SLA allows ${po.slaDeliveryDays} days. Source replacement stock.`;
    } else {
      riskLevel = 'GREEN';
      recommendedAction = `OK: Surviving stock (${survivingQty}) covers customer requirement (${co.requiredQty}). Proceed to putaway.`;
    }

    const financialExposureUsd = shortfallQty * po.unitCostUsd;

    return {
      poId,
      customerOrderId: co.customerOrderId,
      customerName: co.customerName,
      priority: co.priority,
      orderedQty: po.orderedQty,
      damagedQty,
      survivingQty,
      requiredQty: co.requiredQty,
      shortfallQty,
      slaDeliveryDays: po.slaDeliveryDays,
      slaBreached,
      riskLevel,
      recommendedAction,
      financialExposureUsd: Math.round(financialExposureUsd * 100) / 100,
    };
  }

  /**
   * UC4: Log a QC failure and apply a Bayesian reliability penalty.
   * Formula: newScore = currentScore × (1 - penaltyRate)^affectedQty
   * penaltyRate = 0.01 per unit (capped at reducing score by 30% max per event)
   */
  logQcFailureRecord(itemId: string, defectType: string, affectedQty: number): QcFailureRecord {
    const qcRecord = MOCK_QC_RECORDS.find((r) => r.itemId === itemId);
    if (!qcRecord) {
      throw new Error(`QC record not found for item: ${itemId}`);
    }

    const previousScore = qcScoreStore.get(itemId) ?? qcRecord.supplierReliabilityScore;
    const penaltyRate = 0.01;
    const cappedQty = Math.min(affectedQty, 30); // cap so one event can't zero out a supplier
    const penaltyApplied = Math.pow(1 - penaltyRate, cappedQty);
    const newScore = Math.round(previousScore * penaltyApplied * 10000) / 10000;

    // Persist updated score
    qcScoreStore.set(itemId, newScore);

    return {
      itemId,
      defectType,
      affectedQty,
      previousScore,
      newScore,
      penaltyApplied: Math.round((1 - penaltyApplied) * 10000) / 10000,
      loggedAt: new Date().toISOString(),
      supplierId: qcRecord.supplierId,
    };
  }

  /**
   * UC4: Generate a Return Merchandise Authorization (RMA) document.
   */
  generateRmaRecord(
    poId: string,
    itemId: string,
    qty: number,
    reason: string
  ): RmaDocument {
    const po = MOCK_PO_DB.find((p) => p.poId === poId);
    const unitCost = po?.unitCostUsd ?? 0;
    const rmaId = `RMA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return {
      rmaId,
      poId,
      itemId,
      qty,
      reason,
      returnInstruction: `Pack items in original packaging. Affix RMA label "${rmaId}". Ship to Supplier Returns Dock C within 48 hours.`,
      createdAt: new Date().toISOString(),
      status: 'PENDING_DISPATCH',
      estimatedCreditUsd: Math.round(qty * unitCost * 100) / 100,
    };
  }
}
