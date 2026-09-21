import { Injectable } from '@nitrostack/core';

@Injectable()
export class LogisticsVerificationService {
  async validateEwayBill(ewayBillNo: string): Promise<boolean> {
    return ewayBillNo.length > 5;
  }
  
  async validateDelivery(trackingNo: string): Promise<boolean> {
    return trackingNo.length > 5;
  }
}
