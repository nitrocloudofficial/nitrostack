import { Injectable } from '@nitrostack/core';

// ─────────────────────────────────────────────
// Mock Vendor / Airtable-style Database
// ─────────────────────────────────────────────

interface Supplier {
  supplierId: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  catalogSkus: string[];
  leadTimeDays: number;
  priceMultiplier: number; // vs. primary supplier (1.0 = same price)
  reliabilityScore: number; // 0.0 – 1.0
  location: string;
}

const MOCK_SUPPLIER_DB: Supplier[] = [
  {
    supplierId: 'SUPP-BACKUP-ALPHA',
    name: 'Alpha Auto Parts Ltd.',
    contactEmail: 'procurement@alphaauto.in',
    contactPhone: '+91-9876543210',
    catalogSkus: ['SKU-BRAKE-PAD-X1', 'SKU-ALTERNATOR-A3'],
    leadTimeDays: 1,
    priceMultiplier: 1.15,
    reliabilityScore: 0.89,
    location: 'Pune, Maharashtra',
  },
  {
    supplierId: 'SUPP-BACKUP-BETA',
    name: 'Beta Components Pvt Ltd.',
    contactEmail: 'sales@betacomp.co.in',
    contactPhone: '+91-9123456789',
    catalogSkus: ['SKU-ENGINE-GASKET-V2', 'SKU-BRAKE-PAD-X1'],
    leadTimeDays: 2,
    priceMultiplier: 1.08,
    reliabilityScore: 0.95,
    location: 'Chennai, Tamil Nadu',
  },
  {
    supplierId: 'SUPP-BACKUP-GAMMA',
    name: 'Gamma Industrial Supply',
    contactEmail: 'orders@gammaindustrial.com',
    contactPhone: '+91-9988776655',
    catalogSkus: ['SKU-ALTERNATOR-A3', 'SKU-ENGINE-GASKET-V2'],
    leadTimeDays: 3,
    priceMultiplier: 1.05,
    reliabilityScore: 0.91,
    location: 'Bengaluru, Karnataka',
  },
];

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────

export interface AlternateSupplierResult {
  found: boolean;
  supplier: Supplier | null;
  estimatedTotalCostUsd: number;
  canMeetSla: boolean;
  recommendation: string;
}

export interface EmergencyPoResult {
  poId: string;
  linkedOriginalPoId: string;
  supplierId: string;
  supplierName: string;
  sku: string;
  qty: number;
  estimatedTotalCostUsd: number;
  estimatedDeliveryDate: string;
  status: 'HITL_PENDING' | 'APPROVED' | 'REJECTED';
  slackPayload: SlackPayload;
  hitlMessage: string;
}

export interface SlackPayload {
  channel: string;
  text: string;
  blocks: object[];
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

@Injectable()
export class SupplierService {
  /**
   * UC1: Find the best alternate supplier for a given SKU and quantity.
   * Ranks by: reliability score DESC, then lead time ASC.
   */
  findAlternate(sku: string, requiredQty: number, baseUnitCostUsd: number): AlternateSupplierResult {
    const eligible = MOCK_SUPPLIER_DB.filter((s) => s.catalogSkus.includes(sku));

    if (eligible.length === 0) {
      return {
        found: false,
        supplier: null,
        estimatedTotalCostUsd: 0,
        canMeetSla: false,
        recommendation: `No alternate supplier found for SKU: ${sku}. Escalate to procurement manager.`,
      };
    }

    // Sort: best reliability first, break ties by shortest lead time
    const ranked = eligible.sort((a, b) => {
      if (b.reliabilityScore !== a.reliabilityScore) {
        return b.reliabilityScore - a.reliabilityScore;
      }
      return a.leadTimeDays - b.leadTimeDays;
    });

    const best = ranked[0];
    const unitPrice = baseUnitCostUsd * best.priceMultiplier;
    const estimatedTotalCostUsd = Math.round(requiredQty * unitPrice * 100) / 100;
    const canMeetSla = best.leadTimeDays <= 2;

    return {
      found: true,
      supplier: best,
      estimatedTotalCostUsd,
      canMeetSla,
      recommendation: canMeetSla
        ? `RECOMMENDED: ${best.name} (${best.location}) can deliver ${requiredQty} units in ${best.leadTimeDays} day(s) at $${estimatedTotalCostUsd}. Reliability: ${(best.reliabilityScore * 100).toFixed(0)}%.`
        : `CAUTION: ${best.name} lead time is ${best.leadTimeDays} days — may exceed SLA. Confirm with manager before raising PO.`,
    };
  }

  /**
   * UC1: Create an emergency PO record.
   * Returns status HITL_PENDING — approval widget must confirm before dispatch.
   */
  raisePo(
    supplierId: string,
    sku: string,
    qty: number,
    linkedOriginalPoId: string,
    estimatedTotalCostUsd: number,
    approved: boolean
  ): EmergencyPoResult {
    const supplier = MOCK_SUPPLIER_DB.find((s) => s.supplierId === supplierId);
    if (!supplier) {
      throw new Error(`Supplier not found: ${supplierId}`);
    }

    const emergencyPoId = `EPO-${Date.now()}`;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + supplier.leadTimeDays);
    const estimatedDeliveryDate = deliveryDate.toISOString().split('T')[0];

    const status = approved ? 'APPROVED' : 'HITL_PENDING';

    // Build mock Slack notification payload
    const slackPayload: SlackPayload = {
      channel: '#warehouse-alerts',
      text: `🚨 Emergency PO ${emergencyPoId} raised for ${sku} × ${qty} units from ${supplier.name}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚨 Emergency Purchase Order Alert' },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*PO ID:*\n${emergencyPoId}` },
            { type: 'mrkdwn', text: `*Linked Original PO:*\n${linkedOriginalPoId}` },
            { type: 'mrkdwn', text: `*Supplier:*\n${supplier.name}` },
            { type: 'mrkdwn', text: `*SKU:*\n${sku} × ${qty} units` },
            { type: 'mrkdwn', text: `*Est. Cost:*\n$${estimatedTotalCostUsd}` },
            { type: 'mrkdwn', text: `*Est. Delivery:*\n${estimatedDeliveryDate}` },
            { type: 'mrkdwn', text: `*Status:*\n${status}` },
          ],
        },
      ],
    };

    const hitlMessage =
      status === 'HITL_PENDING'
        ? `⏸️ HUMAN APPROVAL REQUIRED: Emergency PO ${emergencyPoId} worth $${estimatedTotalCostUsd} is awaiting manager approval before dispatch.`
        : `✅ Emergency PO ${emergencyPoId} APPROVED. Slack notification sent to #warehouse-alerts. Supplier ${supplier.name} notified.`;

    return {
      poId: emergencyPoId,
      linkedOriginalPoId,
      supplierId,
      supplierName: supplier.name,
      sku,
      qty,
      estimatedTotalCostUsd,
      estimatedDeliveryDate,
      status,
      slackPayload,
      hitlMessage,
    };
  }
}
