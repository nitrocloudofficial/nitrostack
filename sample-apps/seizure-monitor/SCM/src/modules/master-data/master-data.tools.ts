import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { MasterDataService } from './master-data.service.js';
import { PurchaseOrderSchema } from '../../shared/schemas.js';

/** Canned HS code mock — replace with real Claude call in Phase 2 */
const HS_MOCK: Record<string, { hsCode: string; description: string }> = {
  laptop:   { hsCode: '8471.30', description: 'Portable automatic data processing machines' },
  battery:  { hsCode: '8507.60', description: 'Lithium-ion accumulators' },
  monitor:  { hsCode: '8528.52', description: 'LCD monitors' },
  chair:    { hsCode: '9401.30', description: 'Swivel seats with variable height adjustment' },
  cable:    { hsCode: '8544.42', description: 'Electric conductors, voltage ≤80 V' },
  ssd:      { hsCode: '8471.70', description: 'Solid state storage devices' },
  keyboard: { hsCode: '8471.60', description: 'Input units for ADP machines' },
  mouse:    { hsCode: '8471.60', description: 'Input units for ADP machines' },
  desk:     { hsCode: '9403.10', description: 'Metal furniture for offices' },
};

@Controller('master_data')
export class MasterDataTools {
  constructor(private readonly svc: MasterDataService) {}

  // ── validate_against_master_data ─────────────────────────────────────────

  @Tool({
    name: 'validate_against_master_data',
    description:
      'Check whether a SKU / PO number pair exists in the master data store (SQLite Cloud). Pure lookup — no AI.',
    inputSchema: z.object({
      sku:      z.string().describe('Product SKU to look up'),
      poNumber: z.string().describe('Purchase order number to look up'),
    }),
    outputSchema: z.object({
      exists:   z.boolean(),
      poRecord: PurchaseOrderSchema.nullable(),
    }),
  })
  async validateAgainstMasterData(
    input: { sku: string; poNumber: string },
    _ctx: ExecutionContext,
  ) {
    const po = await this.svc.findPO(input.poNumber);
    return {
      exists:   po !== null,
      poRecord: po,
    };
  }

  // ── recommend_hs_code ────────────────────────────────────────────────────

  @Tool({
    name: 'recommend_hs_code',
    description:
      'Return a recommended HS tariff code for a product. STUBBED — returns canned values. Real Claude call is Phase 2.',
    inputSchema: z.object({
      productDescription: z.string().describe('Free-text product description'),
    }),
    outputSchema: z.object({
      hsCode:      z.string(),
      confidence:  z.number().min(0).max(1),
      description: z.string(),
    }),
  })
  async recommendHsCode(
    input: { productDescription: string },
    _ctx: ExecutionContext,
  ) {
    const lower = input.productDescription.toLowerCase();
    for (const [keyword, result] of Object.entries(HS_MOCK)) {
      if (lower.includes(keyword)) {
        return { ...result, confidence: 0.85 };
      }
    }
    return { hsCode: 'Not found', confidence: 0, description: 'No match in stub map' };
  }
}
