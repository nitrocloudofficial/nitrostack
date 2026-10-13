import { Injectable } from '@nitrostack/core';
import { ErpAdapter } from '../master-data/erp.adapter.js';

export interface ScreeningResult {
  status: 'CLEAN' | 'FLAGGED' | 'BLOCKED';
  matches: Array<{
    entity_name: string;
    reason: string;
  }>;
}

@Injectable({ deps: [ErpAdapter] })
export class ComplianceService {
  constructor(private readonly erpAdapter: ErpAdapter) {}

  /**
   * Checks if a vendor is on the denied parties list.
   * Performs an exact match for demonstration, could be expanded to fuzzy matching.
   */
  async screenVendor(vendorName: string): Promise<ScreeningResult> {
    const results = await this.erpAdapter.checkDeniedParty(vendorName);
    
    if (results.length > 0) {
      return {
        status: 'BLOCKED',
        matches: results,
      };
    }
    
    return {
      status: 'CLEAN',
      matches: [],
    };
  }
}
