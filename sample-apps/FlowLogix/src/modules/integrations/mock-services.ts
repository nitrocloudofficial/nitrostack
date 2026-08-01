import { Injectable, Logger } from '@nitrostack/core';
import { 
  IVisionService, 
  IAirtableService, 
  ISlackService, 
  IGmailService, 
  ITomTomService 
} from './integrations.types.js';

@Injectable()
export class MockVisionService implements IVisionService {
  constructor(private readonly logger: Logger) {}

  async readDeliveryReceipt(base64Image: string, forcedDamagedQty?: number) {
    this.logger.info('MockVisionService: Analyzing delivery receipt image...');
    return {
      poId: 'PO-9941',
      sku: 'SKU-001',
      damagedQty: forcedDamagedQty || 50
    };
  }
}

@Injectable()
export class MockAirtableService implements IAirtableService {
  constructor(private readonly logger: Logger) {}

  async findAlternateSupplier(sku: string, requiredQty: number) {
    this.logger.info(`MockAirtableService: Finding alternate supplier for ${sku}`);
    return {
      supplierId: 'SUPP-BACKUP-ALPHA',
      name: 'Alpha Global Supplies',
      reliabilityScore: 98
    };
  }

  async queryErpForPo(vendorName: string, date: string) {
    this.logger.info(`MockAirtableService: Querying ERP for PO from ${vendorName} on ${date}`);
    return {
      poId: 'PO-4422',
      status: 'PENDING_DELIVERY',
      sku: 'SKU-FASTENERS-99'
    };
  }

  async logQcFailure(supplierId: string, defectType: string, affectedQty: number) {
    this.logger.info(`MockAirtableService: Logging QC Failure for ${supplierId}`);
    return {
      previousScore: 98,
      newScore: 92
    };
  }
}

@Injectable()
export class MockSlackService implements ISlackService {
  constructor(private readonly logger: Logger) {}

  async sendAlert(channel: string, message: string) {
    this.logger.info(`MockSlackService: Sending alert to ${channel}: ${message}`);
    return true;
  }
}

@Injectable()
export class MockGmailService implements IGmailService {
  constructor(private readonly logger: Logger) {}

  async sendEmail(to: string, subject: string, body: string) {
    this.logger.info(`MockGmailService: Sending email to ${to}: ${subject}`);
    return true;
  }
}

@Injectable()
export class MockTomTomService implements ITomTomService {
  constructor(private readonly logger: Logger) {}

  async checkInboundDelays() {
    this.logger.info('MockTomTomService: Checking GPS for inbound delays...');
    return [
      {
        truckId: 'TRK-882',
        vendor: 'Beta Heavy Industries',
        expectedArrival: '14:00',
        delayedArrival: '16:00'
      }
    ];
  }
}
