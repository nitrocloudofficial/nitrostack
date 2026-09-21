import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class ProcurementResources {
  @Resource({
    uri: 'factoryos://procurement/active-orders',
    name: 'Active Purchase Orders',
    description: 'List of active, pending, and fulfilled supplier purchase orders',
    mimeType: 'application/json'
  })
  async getActiveOrders(_ctx: ExecutionContext) {
    return {
      orders: [
        { poNumber: 'PO-8801', supplier: 'Apex Industrial Parts', amount: '$4,250.00', status: 'SHIPPED' },
        { poNumber: 'PO-8802', supplier: 'Global Component Supply', amount: '$12,800.00', status: 'PENDING_APPROVAL' }
      ]
    };
  }
}
