import { Injectable } from '@nitrostack/core';

@Injectable()
export class GSTVerificationService {
  async validateGST(gstin: string): Promise<boolean> {
    // Mock GST validation
    return gstin.length === 15;
  }
}
