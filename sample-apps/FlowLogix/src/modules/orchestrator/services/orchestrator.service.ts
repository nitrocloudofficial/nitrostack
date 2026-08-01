import { Injectable } from '@nitrostack/core';

@Injectable()
export class OrchestratorService {
  /**
   * Retrieves the master RED/AMBER/GREEN status for the warehouse.
   */
  getWarehouseSummary() {
    return {
      status: 'AMBER',
      activeAlerts: [
        'Damaged freight reported at Dock 2',
        'Truck TRK-882 delayed by 120 minutes'
      ],
      metrics: {
        dockUtilization: '85%',
        inboundProcessing: 'Delayed',
        outboundShipping: 'On-Time'
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Reads managerial rules from persistent memory.
   */
  getPersistentMemory() {
    return {
      rules: [
        {
          id: 'RULE-001',
          description: 'Always prioritize Tata Motors orders',
          action: 'Ensure ATP shortfall is zero for Tata Motors. Raise emergency PO if needed.',
          enforced: true,
        },
        {
          id: 'RULE-002',
          description: 'Do not accept partial shipments for Hazmat goods',
          action: 'Reject inbound trucks with missing hazmat goods.',
          enforced: true,
        }
      ],
    };
  }
}
