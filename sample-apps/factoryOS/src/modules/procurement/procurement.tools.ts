import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { SupplierService } from '../../services/supplier.service.js';
import { PurchaseOrderService } from '../../services/purchase-order.service.js';

@Injectable({ deps: [SupplierService, PurchaseOrderService] })
export class ProcurementTools {
  constructor(
    private supplierService: SupplierService,
    private purchaseOrderService: PurchaseOrderService
  ) {}

  @Tool({
    name: 'list_suppliers',
    description: 'List Suppliers Tool: Searches the supplier network for vendors providing a specific component, including prices and delivery lead times.',
    inputSchema: z.object({
      partNumber: z.string().describe('The part number or SKU of the required component (e.g. "bearing_X52")')
    })
  })
  async listSuppliers(input: { partNumber: string }, _ctx: ExecutionContext) {
    return await this.supplierService.findSuppliers(input.partNumber);
  }

  @Tool({
    name: 'negotiate_supplier',
    description: 'Negotiate Supplier Tool: Conducts simulated price, quantity, and lead time negotiations with a supplier to reach an agreement.',
    inputSchema: z.object({
      supplierId: z.string().describe('The ID of the supplier (e.g. "SUP-A")'),
      partNumber: z.string().describe('The part number or SKU to negotiate'),
      quantity: z.number().positive().describe('The quantity to order'),
      targetPrice: z.number().positive().describe('Target unit price in USD')
    })
  })
  async negotiateSupplier(
    input: { supplierId: string; partNumber: string; quantity: number; targetPrice: number },
    _ctx: ExecutionContext
  ) {
    return await this.supplierService.negotiatePurchase(
      input.supplierId,
      input.partNumber,
      input.targetPrice,
      input.quantity
    );
  }

  @Tool({
    name: 'create_purchase_order',
    description: 'Create Purchase Order Tool: Records a formal purchase order in the ERP database with the agreed terms.',
    inputSchema: z.object({
      supplierId: z.string().describe('The ID of the supplier'),
      partNumber: z.string().describe('The part SKU or component number'),
      quantity: z.number().positive().describe('The quantity ordered'),
      agreedPrice: z.number().positive().describe('The agreed unit price from negotiations')
    })
  })
  async createPurchaseOrder(
    input: { supplierId: string; partNumber: string; quantity: number; agreedPrice: number },
    _ctx: ExecutionContext
  ) {
    return await this.purchaseOrderService.createPurchaseOrder(
      input.supplierId,
      input.partNumber,
      input.quantity,
      input.agreedPrice
    );
  }
}
