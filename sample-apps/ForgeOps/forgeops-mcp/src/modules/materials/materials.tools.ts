/**
 * ForgeOps — Materials MCP Server Module
 *
 * Tools:
 *   - get_supplier_lot_info: Supplier details, material specs, intake conditions
 *   - get_material_constraints: Availability, lead times, change freezes, alternatives
 */
import { ToolDecorator as Tool, ExecutionContext, z } from '../../nitrostack.js';
import { SUPPLIER_LOT_INFO, MATERIAL_CONSTRAINTS } from '../../data/incident-data.js';

export class MaterialsTools {
  @Tool({
    name: 'get_supplier_lot_info',
    description: 'Retrieve supplier and lot information including material specs, intake conditions, certifications, and storage requirements.',
    inputSchema: z.object({
      lot_id: z.string().describe('Material lot identifier (e.g. LOT-SUP-2407-88)'),
    }),
  })
  async getSupplierLotInfo(input: { lot_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Materials: Retrieving supplier lot info', { lot_id: input.lot_id });

    const info = SUPPLIER_LOT_INFO[input.lot_id];
    if (info) return info;

    return {
      source: 'materials',
      record_id: `lot:${input.lot_id}`,
      timestamp: new Date().toISOString(),
      lot_id: input.lot_id,
      error: 'Lot not found in system',
    };
  }

  @Tool({
    name: 'get_material_constraints',
    description: 'Retrieve material constraints: availability, lead times, supplier change freezes, alternative suppliers, and costs.',
    inputSchema: z.object({
      material_type: z.string().describe('Type of material (e.g. Bearing Steel)'),
    }),
  })
  async getMaterialConstraints(input: { material_type: string }, ctx: ExecutionContext) {
    ctx.logger.info('Materials: Retrieving material constraints', { material_type: input.material_type });

    const constraints = MATERIAL_CONSTRAINTS[input.material_type];
    if (constraints) return constraints;

    return {
      source: 'materials',
      record_id: `mat:${input.material_type}-constraints`,
      timestamp: new Date().toISOString(),
      material_type: input.material_type,
      error: 'Material type not found in system',
    };
  }
}
