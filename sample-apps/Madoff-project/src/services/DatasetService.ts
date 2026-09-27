import { Injectable } from '@nitrostack/core';
import { MongoService } from './MongoService.js';
import { config } from '../config/index.js';
import { ResourceNotFoundError, DatasetError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface ClaimMetadata {
  claimId: string;
  customerId: string;
  claimText: string;
  imageUrl: string;
  timestamp: string;
  status: string;
  riskScore: number;
  confidence: number;
  reviewStatus: string;
  amount?: number;
  payee?: string;
  location?: { latitude: number; longitude: number; country: string };
}

@Injectable({
  deps: [MongoService]
})
export class DatasetService {
  private cachedClaims: Map<string, ClaimMetadata> | null = null;
  private cacheFetchTime: number = 0;

  constructor(private mongoService: MongoService) {}

  public async discoverClaims(): Promise<Map<string, ClaimMetadata>> {
    const now = Date.now();
    if (this.cachedClaims && (now - this.cacheFetchTime < config.app.cacheDuration)) {
      logger.info('Returning cached claims');
      return this.cachedClaims;
    }

    logger.info('MongoDB Query: Fetching all claims');
    const col = this.mongoService.getDb().collection('claims');
    const dbClaims = await col.find().toArray();
    
    const claimsMap = new Map<string, ClaimMetadata>();
    for (const item of dbClaims) {
      const claim: ClaimMetadata = {
        claimId: item.claimId,
        customerId: item.customerId,
        claimText: item.claimText,
        imageUrl: item.imageUrl,
        timestamp: item.timestamp,
        status: item.status,
        riskScore: item.riskScore || 0,
        confidence: item.confidence || 0,
        reviewStatus: item.reviewStatus || 'NONE',
        amount: item.amount,
        payee: item.payee,
        location: item.location
      };
      claimsMap.set(claim.claimId, claim);
    }

    this.cachedClaims = claimsMap;
    this.cacheFetchTime = now;
    
    await this.validateDataset();
    return claimsMap;
  }

  public async validateDataset(): Promise<boolean> {
    if (!this.cachedClaims) return false;
    for (const [id, claim] of this.cachedClaims.entries()) {
      if (!claim.claimId || !claim.customerId || !claim.claimText || !claim.imageUrl || !claim.timestamp || !claim.status) {
        throw new DatasetError(`Dataset integrity validation failed: Claim "${id}" is missing required database fields.`);
      }
    }
    logger.info('Database claims integrity validated successfully');
    return true;
  }

  public async getClaim(claimId: string): Promise<ClaimMetadata> {
    logger.info(`received claimId: ${claimId}`);
    logger.info(`MongoDB query being executed: claims.findOne({ claimId: "${claimId}" })`);
    const col = this.mongoService.getDb().collection('claims');
    const item = await col.findOne({ claimId });
    if (!item) {
      logger.info(`whether a document was found: false`);
      throw new ResourceNotFoundError(`Claim not found: ${claimId}`);
    }
    logger.info(`whether a document was found: true`);
    return {
      claimId: item.claimId,
      customerId: item.customerId,
      claimText: item.claimText,
      imageUrl: item.imageUrl,
      timestamp: item.timestamp,
      status: item.status,
      riskScore: item.riskScore || 0,
      confidence: item.confidence || 0,
      reviewStatus: item.reviewStatus || 'NONE',
      amount: item.amount,
      payee: item.payee,
      location: item.location
    };
  }

  public async updateClaimStatus(
    claimId: string,
    updates: Partial<Pick<ClaimMetadata, 'status' | 'riskScore' | 'confidence' | 'reviewStatus'>>
  ): Promise<void> {
    logger.info('MongoDB Query: Updating claim status', { claimId, updates });
    const col = this.mongoService.getDb().collection('claims');
    await col.updateOne({ claimId }, { $set: updates });
    this.invalidateCache();
  }

  public async getCustomer(customerId: string): Promise<any> {
    logger.info('MongoDB Query: Fetching customer', { customerId });
    const col = this.mongoService.getDb().collection('customers');
    const customer = await col.findOne({ customerId });
    if (!customer) {
      throw new ResourceNotFoundError(`Customer not found: ${customerId}`);
    }
    return customer;
  }

  public async getCustomerTransactions(customerId: string): Promise<any[]> {
    logger.info('MongoDB Query: Fetching customer transactions', { customerId });
    const col = this.mongoService.getDb().collection('transactions');
    return await col.find({ accountId: customerId }).toArray();
  }

  public async addTimelineEvent(claimId: string, eventName: string, description: string): Promise<void> {
    logger.info('MongoDB Query: Adding timeline event', { claimId, eventName });
    const col = this.mongoService.getDb().collection('investigations');
    await col.updateOne(
      { claimId },
      {
        $push: {
          events: {
            eventName,
            description,
            timestamp: new Date().toISOString()
          }
        }
      } as any,
      { upsert: true }
    );
  }

  public async getTimeline(claimId: string): Promise<any[]> {
    logger.info('MongoDB Query: Fetching timeline', { claimId });
    const col = this.mongoService.getDb().collection('investigations');
    const record = await col.findOne({ claimId });
    return record?.events || [];
  }

  public async saveReviewTask(task: any): Promise<void> {
    logger.info('MongoDB Query: Saving review task', { claimId: task.claimId });
    const col = this.mongoService.getDb().collection('reviews');
    await col.insertOne(task);
  }

  public async getReviewTasks(): Promise<any[]> {
    logger.info('MongoDB Query: Fetching review tasks');
    const col = this.mongoService.getDb().collection('reviews');
    return await col.find().toArray();
  }

  public async getClaimImageBase64(url: string): Promise<{ data: string; mimeType: string }> {
    let targetUrl = url;
    if (url.includes('cloudinary.com')) {
      targetUrl = url.replace(/\.[a-zA-Z0-9]+$/, '.jpg');
    }
    logger.info('Cloudinary Fetch: downloading image', { url: targetUrl });
    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      return {
        data: buffer.toString('base64'),
        mimeType: contentType
      };
    } catch (error) {
      logger.error('Failed to download image from Cloudinary URL', { url: targetUrl, error: (error as Error).message });
      throw new ResourceNotFoundError(`Failed to download image: ${(error as Error).message}`);
    }
  }

  public invalidateCache(): void {
    this.cachedClaims = null;
  }
}
