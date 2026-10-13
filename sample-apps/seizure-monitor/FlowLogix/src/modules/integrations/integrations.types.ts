export interface IVisionService {
  readDeliveryReceipt(base64Image: string, forcedDamagedQty?: number): Promise<{ poId: string; sku: string; damagedQty: number }>;
}

export interface IAirtableService {
  findAlternateSupplier(sku: string, requiredQty: number): Promise<{ supplierId: string; name: string; reliabilityScore: number }>;
  queryErpForPo(vendorName: string, date: string): Promise<{ poId: string; status: string; sku: string }>;
  logQcFailure(supplierId: string, defectType: string, affectedQty: number): Promise<{ previousScore: number; newScore: number }>;
}

export interface ISlackService {
  sendAlert(channel: string, message: string): Promise<boolean>;
}

export interface IGmailService {
  sendEmail(to: string, subject: string, body: string): Promise<boolean>;
}

export interface ITomTomService {
  checkInboundDelays(): Promise<Array<{ truckId: string; expectedArrival: string; delayedArrival: string; vendor: string }>>;
}

export const VISION_SERVICE = 'VISION_SERVICE';
export const AIRTABLE_SERVICE = 'AIRTABLE_SERVICE';
export const SLACK_SERVICE = 'SLACK_SERVICE';
export const GMAIL_SERVICE = 'GMAIL_SERVICE';
export const TOMTOM_SERVICE = 'TOMTOM_SERVICE';
